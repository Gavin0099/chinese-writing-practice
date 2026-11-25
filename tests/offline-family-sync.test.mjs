import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupSections } from '../backupData.mjs';
import { openOfflineFamilyStorage } from '../offlineFamilySync.mjs';

const when = '2026-11-24T07:00:00.000Z';
const writing = backupSections.writingRecords;
const vocabulary = backupSections.vocabulary;
const practice = char => ({ [char]: [{ status: 'can_write', at: when }] });
const words = { books: [{ id: 'class-1', name: '一年甲班', publisher: '康軒', year: 113,
    grade: 1, semester: 1, edition: '上冊' }], words: [], exams: [] };
const backup = (writingRecords = {}, other = {}) => ({
    format: 'chinese-writing-practice-backup', version: 1, exportedAt: when,
    vocabulary: { books: [], words: [], exams: [] }, teachingProgress: { activeKey: null, records: [] },
    writingRecords, ...other
});
const unavailable = () => Object.assign(new Error('Network unavailable'), { retryable: true });
const section = (family, key = writing) => JSON.parse(family.getItem(key));
const edit = (family, data, key = writing) => family.setItem(key, JSON.stringify(data));

function fixture() {
    const records = new Map();
    const writes = [];
    const reads = [];
    let timestamp = Date.parse(when);
    let id = 0;
    let read = () => ({ revision: 3, backup: backup() });
    let save = ({ expectedRevision }) => ({ revision: expectedRevision + 1 });
    let storageReadError;
    let storageWriteError;
    const storage = {
        async getItem(key) {
            if (storageReadError) throw storageReadError;
            return records.get(key);
        },
        async setItem(key, value) {
            if (storageWriteError) {
                const error = storageWriteError;
                storageWriteError = undefined;
                throw error;
            }
            records.set(key, value);
        }
    };
    const options = {
        ownerId: 'family-a', storage, now: () => timestamp, newId: () => `edit-${++id}`, baseDelayMs: 100,
        readBackup(ownerId) { reads.push(ownerId); return read(ownerId); },
        saveBackup(request) { writes.push(structuredClone(request)); return save(request); }
    };
    return {
        records, writes, reads, options,
        open: overrides => openOfflineFamilyStorage({ ...options, ...overrides }),
        advance: milliseconds => { timestamp += milliseconds; },
        readWith: callback => { read = callback; },
        saveWith: callback => { save = callback; },
        failRead: error => { storageReadError = error; },
        failWrite: error => { storageWriteError = error; }
    };
}

test('opens from a validated server snapshot and sends only persisted full backups', async () => {
    const f = fixture();
    const family = await f.open();
    assert.equal(family.ownerId, 'family-a');
    assert.equal(family.getItem('unknown'), null);
    const updated = practice('天');
    f.saveWith(request => {
        const stored = JSON.parse(f.records.values().next().value);
        assert.equal(stored.confirmed.revision, 3);
        assert.deepEqual(stored.queue.pending.map(entry => entry.id), ['edit-1']);
        request.backup.writingRecords = {};
        return { revision: 4 };
    });
    assert.deepEqual(await edit(family, updated), { status: 'synced', revision: 4 });
    assert.deepEqual(f.writes, [{ ownerId: 'family-a', id: 'edit-1', expectedRevision: 3, backup: backup(updated) }]);
    assert.deepEqual(section(family), updated);
    await family.close();

    f.readWith(() => { throw unavailable(); });
    const reopened = await f.open();
    assert.deepEqual(section(reopened), updated);
    assert.deepEqual(await reopened.sync(), { status: 'offline', revision: 4 });
    await reopened.close();
});

test('offline edits survive reopening, keep backoff, and replay the full local sequence', async () => {
    const f = fixture();
    let family = await f.open();
    f.saveWith(() => { throw unavailable(); });
    const first = practice('天');
    const retry = { status: 'queued', revision: 3, nextRetryAt: Date.parse(when) + 100 };
    assert.deepEqual(await edit(family, first), retry);
    assert.deepEqual(await edit(family, words, vocabulary), retry);
    assert.equal(f.writes.length, 1);
    await family.close();

    f.readWith(() => assert.fail('read the remote snapshot before replay'));
    family = await f.open();
    assert.deepEqual(section(family), first);
    assert.deepEqual(section(family, vocabulary), words);
    assert.deepEqual(await family.sync(), retry);
    f.saveWith(({ expectedRevision }) => expectedRevision === 3 ? { revision: 4 } : { retryable: true });
    f.advance(100);
    assert.equal((await family.sync()).revision, 4);
    const second = practice('地');
    assert.equal((await edit(family, second)).status, 'queued');
    f.advance(100);
    f.saveWith(({ expectedRevision }) => ({ revision: expectedRevision + 1 }));
    assert.deepEqual(await family.sync(), { status: 'synced', revision: 6 });
    assert.deepEqual(f.writes.map(({ id, expectedRevision }) => [id, expectedRevision]),
        [['edit-1', 3], ['edit-1', 3], ['edit-2', 4], ['edit-2', 4], ['edit-3', 5]]);
    assert.deepEqual(f.writes.at(-1).backup, backup(second, { vocabulary: words,
        exportedAt: '2026-11-24T07:00:00.100Z' }));
    await family.close();
});

for (const [label, conflict] of [['HTTP 409', { status: 409 }], ['PT409', { code: 'PT409' }], ['40001', { code: '40001' }]]) {
    test(`${label} preserves a durable conflict draft and suspends automatic writes`, async () => {
        const f = fixture();
        let family = await f.open();
        f.saveWith(() => { throw unavailable(); });
        const first = practice('天');
        await edit(family, first);
        await edit(family, words, vocabulary);
        f.saveWith(() => conflict);
        f.advance(100);
        const result = await family.sync();
        assert.equal(result.status, 'conflict');
        assert.equal(result.conflictDraft.id, 'edit-1');
        assert.equal(result.conflictDraft.expectedRevision, 3);
        assert.deepEqual(result.conflictDraft.payload, backup(first));
        result.conflictDraft.payload.writingRecords = {};
        await family.close();
        family = await f.open();
        assert.deepEqual(family.conflictDraft.payload, backup(first));
        assert.deepEqual(section(family, vocabulary), words);
        assert.equal((await family.sync()).status, 'conflict');
        await assert.rejects(edit(family, {}), /Resolve.*conflict/);
        assert.equal(f.writes.length, 2);
        await family.close();
    });
}

test('discard requires a confirmed remote backup and removes the reviewed draft without sending it', async () => {
    const f = fixture();
    const family = await f.open();
    f.saveWith(() => { throw Object.assign(new Error('Remote changed'), { code: 'PT409' }); });
    await edit(family, practice('天'));
    const resolution = { action: 'discard', expectedConflictId: 'edit-1' };
    await assert.rejects(family.resolveConflict({ ...resolution, expectedConflictId: 'other' }), /id does not match/);
    f.readWith(() => { throw unavailable(); });
    await assert.rejects(family.resolveConflict(resolution), /Network unavailable/);
    f.readWith(() => ({ revision: 2, backup: backup() }));
    await assert.rejects(family.resolveConflict(resolution), /revision/);
    f.readWith(() => ({ revision: 7, backup: {} }));
    await assert.rejects(family.resolveConflict(resolution));
    assert.equal(family.conflictDraft.id, 'edit-1');
    const remote = { revision: 7, backup: backup(practice('地')) };
    f.readWith(() => remote);
    assert.deepEqual(await family.readLatest(), remote);
    assert.deepEqual(section(family), practice('天'));
    assert.deepEqual(await family.resolveConflict({ ...resolution, latestRevision: 7 }), remote);
    assert.equal(family.conflictDraft, null);
    assert.deepEqual(section(family), practice('地'));
    assert.equal(f.writes.length, 1);
    await family.close();

    f.readWith(() => { throw unavailable(); });
    const reopened = await f.open();
    assert.deepEqual(section(reopened), practice('地'));
    assert.equal(reopened.conflictDraft, null);
    await reopened.close();
});

test('requeue keeps the reviewed draft and leaves later stale snapshots for their own conflict decision', async () => {
    const f = fixture();
    const family = await f.open();
    f.saveWith(() => { throw unavailable(); });
    await edit(family, practice('天'));
    await edit(family, words, vocabulary);
    f.advance(100);
    f.saveWith(() => ({ status: 409, revision: 7 }));
    await family.sync();
    f.readWith(() => ({ revision: 7, backup: backup(practice('地')) }));
    const options = { action: 'requeue', expectedConflictId: 'edit-1' };
    await assert.rejects(family.resolveConflict({ ...options, latestRevision: 6 }), /revision changed/);
    f.failWrite(new Error('Cannot persist resolution'));
    await assert.rejects(family.resolveConflict(options), /Cannot persist resolution/);
    assert.equal(family.conflictDraft.id, 'edit-1');

    await family.resolveConflict({ ...options, latestRevision: 7 });
    assert.equal(family.conflictDraft, null);
    assert.equal(f.writes.length, 2);
    f.saveWith(({ expectedRevision }) => expectedRevision === 7 ? { revision: 8 } : { code: '40001' });
    const result = await family.sync();
    assert.equal(result.status, 'conflict');
    assert.equal(result.revision, 8);
    assert.equal(result.conflictDraft.id, 'edit-2');
    assert.deepEqual(f.writes.slice(2).map(({ id, expectedRevision }) => [id, expectedRevision]),
        [['edit-1', 7], ['edit-2', 3]]);
    await family.close();
});

test('different owners cannot open another owner’s cached backup or queue', async () => {
    const f = fixture();
    f.readWith(ownerId => ({ revision: 0, backup: backup(practice(ownerId === 'family-a' ? '天' : '地')) }));
    const a = await f.open();
    const b = await f.open({ ownerId: 'family-b' });
    await assert.rejects(f.open(), /already open/);
    f.saveWith(() => { throw unavailable(); });
    await edit(a, practice('山'));
    assert.deepEqual(section(b), practice('地'));
    assert.equal(f.writes[0].ownerId, 'family-a');
    await Promise.all([a.close(), b.close()]);

    f.readWith(() => { throw unavailable(); });
    await assert.rejects(f.open({ ownerId: 'family-c' }), /Network unavailable/);
    const [aKey, bKey] = f.records.keys();
    f.records.set(bKey, f.records.get(aKey));
    await assert.rejects(f.open({ ownerId: 'family-b' }), /Invalid offline family snapshot/);
    assert.deepEqual(f.reads, ['family-a', 'family-b', 'family-c']);
    const reopened = await f.open();
    assert.deepEqual(section(reopened), practice('山'));
    await reopened.close();
});

test('fails closed on local storage failures, malformed data, and unconfirmed cloud writes', async () => {
    const f = fixture();
    f.failRead(new Error('Storage unavailable'));
    await assert.rejects(f.open(), /Storage unavailable/);
    assert.deepEqual(f.reads, []);
    f.failRead(undefined);
    f.failWrite(new Error('Could not cache server backup'));
    await assert.rejects(f.open(), /Could not cache server backup/);

    const family = await f.open();
    await assert.rejects(edit(family, {}, 'unknown'), /Unknown family backup section/);
    await assert.rejects(family.setItem(writing, '{'), SyntaxError);
    await assert.rejects(edit(family, { '天': [] }));
    f.failWrite(new Error('Quota exceeded'));
    await assert.rejects(edit(family, practice('天')), /Quota exceeded/);
    assert.deepEqual(section(family), {});
    assert.deepEqual(f.writes, []);
    f.saveWith(() => ({ revision: 6 }));
    await assert.rejects(edit(family, practice('天')), /revision was not confirmed/);
    assert.deepEqual(section(family), practice('天'));
    const stored = () => JSON.parse(f.records.values().next().value);
    assert.equal(stored().confirmed.revision, 3);
    assert.equal(stored().queue.pending.length, 1);
    f.saveWith(() => {
        f.failWrite(new Error('Acknowledgment persistence failed'));
        return { revision: 4 };
    });
    await assert.rejects(family.sync(), /Acknowledgment persistence failed/);
    assert.equal(stored().confirmed.revision, 3);
    assert.equal(stored().queue.pending.length, 1);
    await family.close();

    const [key, value] = f.records.entries().next().value;
    f.records.set(key, 'not JSON');
    await assert.rejects(f.open(), SyntaxError);
    const corrupted = JSON.parse(value);
    corrupted.queue.pending[0].resource = 'family-b';
    f.records.set(key, JSON.stringify(corrupted));
    await assert.rejects(f.open(), /does not match/);
    assert.equal(f.reads.length, 2);
});

test('a non-retryable or cross-owner cloud read cannot fall back to a cached session', async () => {
    const f = fixture();
    await (await f.open()).close();
    f.readWith(() => { throw Object.assign(new Error('Session expired'), { status: 401 }); });
    await assert.rejects(f.open(), /Session expired/);
    f.readWith(() => ({ ownerId: 'family-b', revision: 7, backup: backup(practice('天')) }));
    await assert.rejects(f.open(), /owner or revision/);
});

test('an injected IndexedDB factory persists family state and releases owned connections', async () => {
    const f = fixture();
    const lifecycle = [];
    const indexedDB = {
        open(name, version) {
            lifecycle.push([name, version]);
            const request = { result: {
                close() { lifecycle.push('closed'); },
                objectStoreNames: { contains: () => true },
                transaction() {
                    const transaction = { objectStore: () => ({
                        get(key) {
                            queueMicrotask(() => transaction.oncomplete());
                            return { result: f.records.get(key) };
                        },
                        put(value, key) {
                            f.records.set(key, value);
                            queueMicrotask(() => transaction.oncomplete());
                            return {};
                        }
                    }) };
                    return transaction;
                }
            } };
            queueMicrotask(() => request.onsuccess());
            return request;
        }
    };
    const open = () => f.open({ storage: undefined, indexedDB });
    const family = await open();
    f.saveWith(() => { throw unavailable(); });
    await edit(family, practice('天'));
    await family.close();
    f.readWith(() => assert.fail('read from the network with a pending edit'));
    const reopened = await open();
    assert.deepEqual(section(reopened), practice('天'));
    await reopened.close();
    assert.deepEqual(lifecycle, [['offline-queue', 1], 'closed', ['offline-queue', 1], 'closed']);
});

test('close hides data immediately, rejects queued calls and ignores late cloud acknowledgments', async () => {
    const f = fixture();
    const family = await f.open();
    const entered = Promise.withResolvers();
    const response = Promise.withResolvers();
    f.saveWith(() => { entered.resolve(); return response.promise; });
    const save = edit(family, practice('天'));
    await Promise.race([entered.promise, save]);
    const another = edit(family, practice('地'));
    const closing = family.close();
    assert.equal(family.close(), closing);
    assert.equal(family.getItem(writing), null);
    assert.equal(family.conflictDraft, null);
    const checks = [save, another, family.sync(), family.readLatest(), family.resolveConflict()].map(operation =>
        assert.rejects(operation, /closed/));
    response.resolve({ revision: 4 });
    await Promise.all([...checks, closing]);
    assert.equal(f.writes.length, 1);
    const reopened = await f.open();
    assert.deepEqual(section(reopened), practice('天'));
    assert.equal(JSON.parse(f.records.values().next().value).confirmed.revision, 3);
    await reopened.close();
});

function createMemoryLocks() {
    const tails = new Map();
    const events = [];
    return {
        events,
        request(name, optionsOrCallback, maybeCallback) {
            const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback;
            const prev = tails.get(name) ?? Promise.resolve();
            const run = prev.then(async () => {
                events.push(['acquire', name]);
                try {
                    return await callback({ name });
                } finally {
                    events.push(['release', name]);
                }
            });
            tails.set(name, run.catch(() => {}));
            return run;
        }
    };
}

function createSharedStorage(records) {
    return {
        async getItem(key) { return records.get(key); },
        async setItem(key, value) { records.set(key, value); }
    };
}

test('multi-tab offline edits on different sections serialize via Web Locks without lost updates', async () => {
    const f = fixture();
    const locks = createMemoryLocks();
    const tabA = await f.open({ storage: createSharedStorage(f.records), locks });
    const tabB = await f.open({ storage: createSharedStorage(f.records), locks });

    f.saveWith(() => { throw unavailable(); });
    const [resA, resB] = await Promise.all([
        edit(tabA, practice('天'), writing),
        edit(tabB, words, vocabulary)
    ]);
    assert.equal(resA.status, 'queued');
    assert.equal(resB.status, 'queued');

    // Sync from tabA after network returns: both tabA's writingRecords and tabB's vocabulary must be preserved.
    f.advance(100);
    f.saveWith(({ expectedRevision }) => ({ revision: expectedRevision + 1 }));
    const synced = await tabA.sync();
    assert.equal(synced.status, 'synced');
    assert.equal(synced.revision, 5);
    assert.deepEqual(f.writes.at(-1).backup.writingRecords, practice('天'));
    assert.deepEqual(f.writes.at(-1).backup.vocabulary, words);

    await tabA.close();
    await tabB.close();
});

test('multi-tab offline edit on the same section fails closed instead of silently overwriting another tab', async () => {
    const f = fixture();
    const locks = createMemoryLocks();
    let tabBNotified = 0;
    const tabA = await f.open({ storage: createSharedStorage(f.records), locks });
    const tabB = await f.open({
        storage: createSharedStorage(f.records),
        locks,
        onStateChange: () => { tabBNotified++; }
    });

    f.saveWith(() => { throw unavailable(); });
    assert.equal((await edit(tabA, practice('天'), writing)).status, 'queued');

    // tabB has not refreshed yet and tries to overwrite the same writingRecords section with stale view.
    await assert.rejects(
        edit(tabB, practice('地'), writing),
        error => error?.code === 'STALE_TAB_SECTION'
    );
    // tabB refreshes its local view to include tabA's edit and preserves '天' without lost update.
    assert.deepEqual(section(tabB, writing), practice('天'));
    assert.ok(tabBNotified >= 1);

    await tabA.close();
    await tabB.close();
});

test('requireLocks fails closed when Web Locks API is unavailable', async () => {
    const f = fixture();
    await assert.rejects(
        f.open({ locks: null, requireLocks: true }),
        /Web Locks API is required/
    );
});

test('BroadcastChannel background reload still blocks stale same-section write until tab re-reads via getItem', async () => {
    const f = fixture();
    const locks = createMemoryLocks();
    const peers = new Set();
    const makeChannel = () => {
        const listeners = new Set();
        const ch = {
            postMessage(data) {
                for (const peer of peers) {
                    if (peer !== ch) peer.dispatch(data);
                }
            },
            addEventListener(_type, fn) { listeners.add(fn); },
            removeEventListener(_type, fn) { listeners.delete(fn); },
            dispatch(data) { for (const fn of listeners) fn({ data }); },
            close() { peers.delete(ch); }
        };
        peers.add(ch);
        return ch;
    };
    let tabBNotified = 0;
    const tabA = await f.open({ storage: createSharedStorage(f.records), locks, channel: makeChannel() });
    const tabB = await f.open({
        storage: createSharedStorage(f.records),
        locks,
        channel: makeChannel(),
        onStateChange: () => { tabBNotified++; }
    });

    f.saveWith(() => { throw unavailable(); });
    assert.equal((await edit(tabA, practice('天'), writing)).status, 'queued');
    // Allow BroadcastChannel background reload on tabB to finish before tabB attempts stale write.
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.ok(tabBNotified >= 1);

    await assert.rejects(
        edit(tabB, practice('地'), writing),
        error => error?.code === 'STALE_TAB_SECTION'
    );
    // Once tabB explicitly re-reads via getItem, it sees '天' and can merge and save '天'+'地'.
    const seen = section(tabB, writing);
    assert.deepEqual(seen, practice('天'));
    const merged = { ...seen, ...practice('地') };
    assert.equal((await edit(tabB, merged, writing)).status, 'queued');
    assert.deepEqual(section(tabB, writing), merged);

    await tabA.close();
    await tabB.close();
});
