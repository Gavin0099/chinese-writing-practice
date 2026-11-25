import { backupSections, validateBackup } from './backupData.mjs';
import { createIndexedDbQueueStorage } from './indexedDbQueueStorage.mjs';
import { createOfflineQueue } from './offlineQueue.mjs';

const sections = new Map(Object.entries(backupSections).map(([section, key]) => [key, section]));
const isRevision = value => Number.isSafeInteger(value) && value >= 0;
const isUnavailable = error => error?.retryable === true || [408, 429, 500, 502, 503, 504].includes(error?.status);
const hasWork = queue => queue?.pending.length > 0 || Boolean(queue?.conflictDraft);
const activeOwners = new WeakMap();

function readSnapshot(value, ownerId, minimumRevision = 0) {
    if (!isRevision(value?.revision) || value.revision < minimumRevision ||
        (value.ownerId !== undefined && value.ownerId !== ownerId)) {
        throw new Error('Invalid family backup owner or revision.');
    }
    return { revision: value.revision, backup: validateBackup(value.backup) };
}

/**
 * Open one handle per owner and backing store. The caller binds the cloud adapter to the
 * authenticated owner, and closes the handle before switching accounts or opening another tab.
 * readBackup(ownerId) returns { revision, backup }. saveBackup({ ownerId, expectedRevision,
 * backup, id }) returns { revision } or reports a conflict or retry as in createOfflineQueue.
 * Only explicitly retryable read failures can fall back to the saved owner snapshot.
 * setItem and sync report synced, queued or conflict. A refresh from cache reports offline.
 * readLatest previews the server backup. resolveConflict rereads it before applying the
 * decision, optionally checking the previewed revision. Requeued writes wait for sync.
 */
export async function openOfflineFamilyStorage({
    ownerId, storage, indexedDB, readBackup, saveBackup, now, newId, baseDelayMs, maxDelayMs
} = {}) {
    if (typeof ownerId !== 'string' || !ownerId.trim() || typeof readBackup !== 'function' ||
        typeof saveBackup !== 'function' || typeof now !== 'function' || typeof newId !== 'function' ||
        (storage != null && indexedDB != null)) {
        throw new TypeError('Invalid offline family storage configuration.');
    }
    const ownsStorage = storage == null;
    const backend = storage ?? createIndexedDbQueueStorage({ indexedDB });
    if (typeof backend.getItem !== 'function' || typeof backend.setItem !== 'function') {
        throw new TypeError('Invalid offline family storage adapter.');
    }
    const key = `offline-family-sync:${ownerId}`;
    const backingStore = storage ?? indexedDB;
    const owners = activeOwners.get(backingStore) ?? new Set();
    if (owners.has(ownerId)) throw new Error('Offline family storage is already open for this owner.');
    owners.add(ownerId);
    activeOwners.set(backingStore, owners);

    let record;
    let nextConfirmed;
    let queue;
    let closed = false;
    let operations = Promise.resolve();
    let closing;

    function requireOpen() {
        if (closed) throw new Error('Offline family storage is closed.');
    }

    function run(operation) {
        const result = operations.then(() => {
            requireOpen();
            return operation();
        });
        operations = result.catch(() => {});
        return result;
    }

    async function persist(confirmed, queueState = record.queue) {
        requireOpen();
        // Commit the confirmed backup and queue transition together, including remote acknowledgments.
        const next = { ownerId, confirmed, queue: queueState };
        await backend.setItem(key, JSON.stringify(next));
        record = next;
        requireOpen();
    }

    async function fetchLatest(minimumRevision = record.confirmed?.revision ?? 0) {
        const value = await readBackup(ownerId);
        requireOpen();
        return readSnapshot(value, ownerId, minimumRevision);
    }

    function draft() {
        const entry = record.queue?.conflictDraft;
        return entry ? structuredClone(entry) : null;
    }

    async function flush() {
        try {
            return await queue.flush(async ({ id, expectedRevision, payload }) => {
                requireOpen();
                const result = await saveBackup({ ownerId, id, expectedRevision, backup: structuredClone(payload) });
                requireOpen();
                // The queue validates the acknowledgment before invoking its storage adapter.
                if (result?.revision === expectedRevision + 1 && result.revision > record.confirmed.revision) {
                    nextConfirmed = { revision: result.revision, backup: payload };
                }
                return result;
            });
        } finally {
            nextConfirmed = undefined;
        }
    }

    async function refresh() {
        let latest;
        try {
            latest = await fetchLatest();
        } catch (error) {
            requireOpen();
            if (isUnavailable(error) && record.confirmed) return false;
            throw error;
        }
        await persist(latest);
        return true;
    }

    function syncOutcome(result) {
        requireOpen();
        const revision = record.confirmed.revision;
        if (result.status === 'conflict') return { status: 'conflict', revision, conflictDraft: draft() };
        if (result.status === 'retry') return { status: 'queued', revision, nextRetryAt: result.nextRetryAt };
        return { status: 'synced', revision };
    }

    try {
        const serialized = await backend.getItem(key);
        if (serialized == null) {
            record = { ownerId, confirmed: null, queue: null };
        } else {
            if (typeof serialized !== 'string') throw new TypeError('Offline family snapshot must be JSON text.');
            const saved = JSON.parse(serialized);
            if (saved?.ownerId !== ownerId || !Object.hasOwn(saved, 'queue') ||
                (saved.queue !== null && typeof saved.queue !== 'object')) {
                throw new Error('Invalid offline family snapshot.');
            }
            record = { ownerId, confirmed: readSnapshot(saved.confirmed, ownerId), queue: saved.queue };
        }
        queue = await createOfflineQueue({ key, now, baseDelayMs, maxDelayMs, storage: {
            getItem: () => record.queue === null ? null : JSON.stringify(record.queue),
            setItem(_key, value) {
                const state = JSON.parse(value);
                const confirmed = nextConfirmed?.revision === state.latestRevision
                    ? nextConfirmed : record.confirmed;
                nextConfirmed = undefined;
                return persist(confirmed, state);
            }
        } });
        if (record.queue) {
            const { pending, conflictDraft, latestRevision } = await queue.snapshot();
            const entries = conflictDraft ? [conflictDraft, ...pending] : pending;
            const { revision } = record.confirmed;
            if (latestRevision > revision || entries.some(entry => entry.resource !== key || entry.expectedRevision > revision)) {
                throw new Error('Offline queue does not match the confirmed family snapshot.');
            }
            for (const entry of entries) validateBackup(entry.payload);
        }
        if (!hasWork(record.queue)) await refresh();
    } catch (error) {
        owners.delete(ownerId);
        if (ownsStorage) backend.close();
        throw error;
    }

    return {
        ownerId,
        getItem(key) {
            const section = sections.get(key);
            if (closed || !section) return null;
            const current = record.queue?.pending.at(-1) ?? record.queue?.conflictDraft;
            return JSON.stringify((current?.payload ?? record.confirmed.backup)[section]);
        },
        setItem(sectionKey, value) {
            return run(async () => {
                const section = sections.get(sectionKey);
                if (!section) throw new Error('Unknown family backup section.');
                if (record.queue?.conflictDraft) throw new Error('Resolve the offline family conflict before editing.');
                if (typeof value !== 'string') throw new TypeError('Family backup section must be JSON text.');
                const pending = record.queue?.pending.at(-1);
                const current = pending?.payload ?? record.confirmed.backup;
                const payload = validateBackup({ ...current, [section]: JSON.parse(value),
                    exportedAt: new Date(now()).toISOString() });
                const baseRevision = pending?.baseRevision ?? record.confirmed.revision;
                await queue.enqueue({ id: newId(), resource: key, baseRevision, payload });
                return syncOutcome(await flush());
            });
        },
        sync() {
            return run(async () => {
                if (hasWork(record.queue)) return syncOutcome(await flush());
                const online = await refresh();
                requireOpen();
                return { status: online ? 'synced' : 'offline', revision: record.confirmed.revision };
            });
        },
        get conflictDraft() { return closed ? null : draft(); },
        readLatest() {
            return run(() => fetchLatest());
        },
        resolveConflict(options = {}) {
            return run(async () => {
                const { action, expectedConflictId, latestRevision } = options;
                const entry = record.queue?.conflictDraft;
                if (!entry || entry.id !== expectedConflictId) throw new Error('Offline conflict id does not match.');
                if (action !== 'discard' && action !== 'requeue') throw new TypeError('Invalid offline conflict action.');
                const latest = await fetchLatest(Math.max(record.confirmed.revision, entry.expectedRevision));
                if (latestRevision !== undefined && latestRevision !== latest.revision) {
                    throw new Error('Cloud revision changed since the conflict was reviewed.');
                }
                nextConfirmed = latest;
                try {
                    await queue.resolveConflict({ action, expectedConflictId, latestRevision: latest.revision });
                } finally {
                    nextConfirmed = undefined;
                }
                requireOpen();
                return structuredClone(latest);
            });
        },
        close() {
            if (!closing) {
                closed = true;
                closing = operations.then(() => {
                    owners.delete(ownerId);
                    record = null;
                    if (ownsStorage) backend.close();
                });
            }
            return closing;
        }
    };
}
