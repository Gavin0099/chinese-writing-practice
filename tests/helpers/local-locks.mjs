import assert from 'node:assert/strict';

// FIFO, origin-shared LockManager double. Explicit barriers in tests schedule
// contention; this models the API contract, not browser implementation evidence.
export function createLocks() {
    const tails = new Map();
    return { request(name, options, callback) {
        assert.equal(options.mode, 'exclusive');
        const next = (tails.get(name) ?? Promise.resolve()).then(() => callback({ name }));
        tails.set(name, next.catch(() => {}));
        return next;
    } };
}

export const localLocks = createLocks();
