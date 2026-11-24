const version = 1;
const isCounter = value => Number.isSafeInteger(value) && value >= 0;
const isKey = value => typeof value === 'string' && value.trim().length > 0;
const isRecord = value => value !== null && typeof value === 'object' &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value));
const hasWork = state => state.pending.length > 0 || state.conflictDraft !== null;

function copyPayload(value, ancestors = new Set()) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (Number.isFinite(value)) return value === 0 ? 0 : value;
    if ((!Array.isArray(value) && !isRecord(value)) || ancestors.has(value)) {
        throw new TypeError('Offline operation payload must be JSON data.');
    }

    const array = Array.isArray(value);
    const keys = Object.keys(value);
    if (Reflect.ownKeys(value).length !== keys.length + Number(array) ||
        (array && (keys.length !== value.length || keys.some((key, index) => key !== String(index))))) {
        throw new TypeError('Offline operation payload must be JSON data.');
    }
    ancestors.add(value);
    if (!array) keys.sort();
    const entries = keys.map(key => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!Object.hasOwn(descriptor, 'value')) throw new TypeError('Offline operation payload must be JSON data.');
        return [key, copyPayload(descriptor.value, ancestors)];
    });
    ancestors.delete(value);
    return array ? entries.map(([, item]) => item) : Object.fromEntries(entries);
}

function readOperation(input) {
    if (!isRecord(input) || !isKey(input.id) || !isKey(input.resource) || !isCounter(input.baseRevision)) {
        throw new TypeError('Invalid offline operation id, resource or base revision.');
    }
    return { id: input.id, resource: input.resource, baseRevision: input.baseRevision, payload: copyPayload(input.payload) };
}

function readEntry(input) {
    const operation = readOperation(input);
    const { timestamp, expectedRevision, retryCount, nextRetryAt } = input;
    if (!isCounter(timestamp) || !isCounter(expectedRevision) || expectedRevision < operation.baseRevision ||
        !isCounter(retryCount) || (retryCount === 0 ? nextRetryAt !== null : !isCounter(nextRetryAt))) {
        throw new TypeError('Invalid offline operation metadata.');
    }
    return { ...operation, timestamp, expectedRevision, retryCount, nextRetryAt };
}

function readState(serialized, key) {
    if (typeof serialized !== 'string') throw new TypeError('Offline queue snapshot must be JSON text.');
    const input = JSON.parse(serialized);
    if (!isRecord(input) || input.version !== version || input.queueKey !== key ||
        (input.latestRevision !== null && !isCounter(input.latestRevision)) || !Array.isArray(input.pending)) {
        throw new TypeError('Invalid offline queue snapshot.');
    }

    const { latestRevision } = input;
    const pending = input.pending.map(readEntry);
    const conflictDraft = input.conflictDraft === null ? null : readEntry(input.conflictDraft);
    const entries = conflictDraft ? [conflictDraft, ...pending] : pending;
    if (new Set(entries.map(entry => entry.id)).size !== entries.length || entries.some((entry, index) =>
        (index > 0 && entry.retryCount !== 0) ||
        (entry.expectedRevision !== entry.baseRevision && (index > 0 || entry.expectedRevision !== latestRevision)))) {
        throw new TypeError('Invalid offline queue order or duplicate operation id.');
    }
    return { version, queueKey: key, latestRevision, pending, conflictDraft };
}

function sendFailure(result) {
    if (result?.status === 409 || ['PT409', '40001'].includes(result?.code)) return 'conflict';
    if (result?.retryable === true || [408, 429, 500, 502, 503, 504].includes(result?.status)) return 'retry';
    return null;
}

/**
 * Use a family-scoped storage key and one active instance per key.
 * Storage getItem/setItem accept a key and read/write JSON text (sync or async).
 * getItem may return null or undefined for a missing key.
 * setItem must replace atomically and reject on failure. now() supplies epoch milliseconds.
 * An operation uses a caller-supplied stable id, a resource key and a JSON payload.
 * Equal ids deduplicate active operations. Distinct ids retain FIFO order.
 * Consecutive edits authored on the same base form a local write sequence.
 */
export async function createOfflineQueue({ storage, key, now, baseDelayMs = 1000, maxDelayMs = 60000 }) {
    if (!isKey(key) || typeof storage?.getItem !== 'function' || typeof storage?.setItem !== 'function' ||
        typeof now !== 'function' || !isCounter(baseDelayMs) || baseDelayMs === 0 ||
        !isCounter(maxDelayMs) || maxDelayMs < baseDelayMs) {
        throw new TypeError('Invalid offline queue configuration.');
    }

    const serialized = await storage.getItem(key);
    let state = serialized === null || serialized === undefined
        ? { version, queueKey: key, latestRevision: null, pending: [], conflictDraft: null }
        : readState(serialized, key);
    let stateOperations = Promise.resolve();
    let flushing = false;

    function withState(operation) {
        const result = stateOperations.then(operation);
        stateOperations = result.catch(() => {});
        return result;
    }

    async function persist(next) {
        await storage.setItem(key, JSON.stringify(next));
        state = next;
    }

    function clockTime() {
        const timestamp = now();
        if (!isCounter(timestamp)) throw new TypeError('Invalid offline queue clock value.');
        return timestamp;
    }

    async function enqueue(input) {
        const operation = readOperation(input);
        return withState(async () => {
            const existing = [state.conflictDraft, ...state.pending].find(entry => entry?.id === operation.id);
            if (existing) {
                if (existing.resource !== operation.resource || existing.baseRevision !== operation.baseRevision ||
                    JSON.stringify(existing.payload) !== JSON.stringify(operation.payload)) {
                    throw new TypeError('Offline operation id already has different content.');
                }
                return false;
            }
            const entry = { ...operation, timestamp: clockTime(), expectedRevision: operation.baseRevision,
                retryCount: 0, nextRetryAt: null };
            await persist({ ...state, pending: [...state.pending, entry] });
            return true;
        });
    }

    function snapshot() {
        return withState(() => JSON.parse(JSON.stringify(state)));
    }

    // Import into an empty queue with the original key to preserve family isolation and existing edits.
    function restore(serialized) {
        return withState(() => {
            if (flushing || hasWork(state)) throw new Error('Restore requires an idle offline queue with no unresolved writes.');
            return persist(readState(serialized, key));
        });
    }

    /**
     * sender(entry) uses expectedRevision for the conditional write and may use id for idempotency.
     * Acknowledgment is { revision: expectedRevision + 1 }. Return or throw a conflict
     * status/code or { retryable: true } for a temporary network failure.
     * This method stops at the first unresolved write. The caller schedules the next attempt.
     */
    async function flush(sender) {
        if (typeof sender !== 'function') throw new TypeError('Offline queue sender must be a function.');
        if (flushing) throw new Error('Offline queue is already flushing.');
        flushing = true;
        try {
            for (;;) {
                const current = await withState(() => state);
                const revision = current.latestRevision;
                if (current.conflictDraft) return { status: 'conflict', revision };
                const [entry] = current.pending;
                if (!entry) return { status: 'drained', revision };
                if (entry.nextRetryAt !== null && clockTime() < entry.nextRetryAt) {
                    return { status: 'retry', revision, nextRetryAt: entry.nextRetryAt };
                }

                let result;
                try {
                    result = await sender({ ...entry, payload: copyPayload(entry.payload) });
                } catch (error) {
                    if (!sendFailure(error)) throw error;
                    result = error;
                }

                const failure = sendFailure(result);
                if (failure === 'conflict') {
                    await withState(() => persist({ ...state, pending: state.pending.slice(1), conflictDraft: entry }));
                    return { status: 'conflict', revision };
                }
                if (failure === 'retry') {
                    const retryCount = Math.min(entry.retryCount + 1, Number.MAX_SAFE_INTEGER);
                    const delay = Math.min(baseDelayMs * 2 ** (retryCount - 1), maxDelayMs);
                    const nextRetryAt = Math.min(clockTime() + delay, Number.MAX_SAFE_INTEGER);
                    await withState(() => persist({ ...state, pending: [
                        { ...entry, retryCount, nextRetryAt }, ...state.pending.slice(1)
                    ] }));
                    return { status: 'retry', revision, nextRetryAt };
                }

                const savedRevision = result?.revision;
                if (!isCounter(savedRevision) || savedRevision !== entry.expectedRevision + 1 ||
                    (revision !== null && savedRevision <= revision) ||
                    (result.status !== undefined &&
                        (!Number.isInteger(result.status) || result.status < 200 || result.status >= 300))) {
                    throw new Error('Offline write revision was not confirmed.');
                }
                await withState(() => {
                    const pending = state.pending.slice(1);
                    // Only advance the next write in the same local sequence. Preserve a different base for conflict checking.
                    if (pending[0]?.baseRevision === entry.baseRevision) {
                        pending[0] = { ...pending[0], expectedRevision: savedRevision };
                    }
                    return persist({ ...state, pending, latestRevision: savedRevision });
                });
            }
        } finally {
            flushing = false;
        }
    }

    return { enqueue, flush, snapshot, restore };
}
