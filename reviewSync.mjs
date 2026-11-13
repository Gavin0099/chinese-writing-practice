import { compareAttempts, readAttempts, saveAttempt, validateAttempt } from './reviewData.mjs';

export function mergeReviewAttempts(...lists) {
    const byId = new Map();
    for (const list of lists) {
        for (const input of list) {
            const attempt = validateAttempt(input);
            const existing = byId.get(attempt.id);
            if (existing && JSON.stringify(existing) !== JSON.stringify(attempt)) {
                throw new Error('同一筆批改紀錄有不同內容。請保留此瀏覽器的紀錄並重新同步。');
            }
            byId.set(attempt.id, attempt);
        }
    }
    return [...byId.values()].sort(compareAttempts);
}

export async function syncReviewAttempts(local, cloud) {
    const remote = await cloud.readReviewAttempts();
    const merged = mergeReviewAttempts(remote, local);
    const remoteIds = new Set(remote.map(attempt => attempt.id));
    const missing = merged.filter(attempt => !remoteIds.has(attempt.id));
    const batchSize = 25;
    for (let start = 0; start < missing.length; start += batchSize) {
        await cloud.appendReviewAttempts(missing.slice(start, start + batchSize));
    }
    return merged;
}

export function splitLocalReviewAttempts(storage, bookIds) {
    const available = new Set(bookIds);
    const matched = [];
    const unmatched = [];
    for (const attempt of readAttempts(storage, 'local')) {
        (available.has(attempt.bookId) ? matched : unmatched).push(attempt);
    }
    return { matched, unmatched };
}

export function copyReviewAttempts(storage, owner, source, remote) {
    const saved = readAttempts(storage, owner);
    mergeReviewAttempts(saved, source, remote);
    const savedIds = new Set(saved.map(attempt => attempt.id));
    for (const attempt of source) {
        if (!savedIds.has(attempt.id)) saveAttempt(storage, owner, attempt);
    }
}
