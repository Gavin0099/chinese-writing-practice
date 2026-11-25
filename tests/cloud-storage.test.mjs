import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openFamilyStorage } from '../cloudStorage.mjs';
import { exportBackup } from '../backupData.mjs';
import { writingStorageKey } from '../learningData.mjs';

function fixtureClient() {
    let session = { access_token: 'fixture-a', user: { id: 'a' } };
    let onChange;
    let revision = 0;
    let backup = null;
    let initialImport;
    const requests = [];
    const client = {
        auth: {
            async getSession() { return { data: { session }, error: null }; },
            onAuthStateChange(callback) {
                onChange = callback;
                return { data: { subscription: { unsubscribe() { onChange = null; } } } };
            }
        },
        rpc(name, args) {
            return { async setHeader(header, value) {
                requests.push({ name, header, value, args });
                if (name === 'read_family_backup') return { data: { revision, backup }, error: null };
                if (name === 'import_family_backup') {
                    const { exportedAt, ...content } = args.p_backup;
                    const fingerprint = JSON.stringify(content);
                    if (fingerprint === initialImport) return { data: 'already_imported', error: null };
                    if (revision) return { data: null, error: { message: 'family_already_has_data' } };
                    initialImport = fingerprint;
                    backup = args.p_backup;
                    revision++;
                    return { data: 'imported', error: null };
                }
                if (args.p_expected_revision !== revision) return { data: null, error: { code: 'PT409' } };
                backup = args.p_backup;
                revision++;
                return { data: revision, error: null };
            } };
        }
    };
    return { client, requests, advance: () => revision++, switchAccount() {
        session = { access_token: 'fixture-b', user: { id: 'b' } };
        onChange?.('SIGNED_IN', session);
    } };
}

test('cloud writes bind to one account and keep the last confirmed state on a revision conflict', async () => {
    const fixture = fixtureClient();
    const drafts = [];
    const store = await openFamilyStorage(fixture.client, undefined, draft => drafts.push(draft));
    const original = { 天: [{ status: 'can_write', at: '2026-11-11T00:00:00Z' }] };
    await store.setItem(writingStorageKey, JSON.stringify(original));
    fixture.advance();
    const edited = { ...original, 雲: [{ status: 'cannot_write', at: '2026-11-11T00:00:00Z' }] };
    await assert.rejects(store.setItem(writingStorageKey, JSON.stringify(edited)), /另一個裝置/);
    await assert.rejects(store.setItem(writingStorageKey, '{}'), /下載未同步備份/);
    assert.deepEqual(JSON.parse(store.getItem(writingStorageKey)), original);
    assert.equal(drafts.length, 1);
    assert.deepEqual(drafts[0].writingRecords, edited);
    assert.deepEqual(fixture.requests.map(request => request.value), ['Bearer fixture-a', 'Bearer fixture-a', 'Bearer fixture-a']);
    assert.equal(fixture.requests[1].args.p_expected_revision, 0);
    assert.equal(fixture.requests[2].args.p_expected_revision, 1);
});

test('first import is idempotent, preserves later edits and rejects a different backup', async () => {
    const fixture = fixtureClient();
    let lost = false;
    const store = await openFamilyStorage(fixture.client, () => { lost = true; });
    const backup = exportBackup({ getItem: () => null });
    assert.equal(await store.importBackup({ ...backup, curriculum: { restricted: true } }), 'imported');
    assert.equal(Object.hasOwn(fixture.requests[1].args.p_backup, 'curriculum'), false);
    const writingRecords = { 天: [{ status: 'can_write', at: '2026-11-11T00:00:00Z' }] };
    await store.setItem(writingStorageKey, JSON.stringify(writingRecords));
    assert.equal(await store.importBackup({ ...backup, exportedAt: '2026-12-01T00:00:00Z' }), 'already_imported');
    assert.equal(await store.importBackup({ ...backup, writingRecords }), 'cloud_has_data');
    assert.deepEqual(JSON.parse(store.getItem(writingStorageKey)), writingRecords);
    const requestCount = fixture.requests.length;
    fixture.switchAccount();
    assert.equal(lost, true);
    assert.equal(store.getItem(writingStorageKey), null);
    await assert.rejects(store.importBackup(backup), /登入已變更/);
    assert.equal(fixture.requests.length, requestCount);
});

test('openFamilyStorage with offline mode queues writes while offline, recovers on reopen, syncs online and resolves PT409 conflicts', async () => {
    const records = new Map();
    let offline = false;
    let session = { access_token: 'fixture-a', user: { id: 'a' } };
    let revision = 1;
    let backup = exportBackup({ getItem: () => null });
    let onChange;
    const client = {
        auth: {
            async getSession() { return { data: { session }, error: null }; },
            onAuthStateChange(cb) {
                onChange = cb;
                return { data: { subscription: { unsubscribe() { onChange = null; } } } };
            }
        },
        rpc(name, args) {
            return {
                async setHeader() {
                    if (offline) return { data: null, error: Object.assign(new Error('Failed to fetch'), { status: 503 }) };
                    if (name === 'read_family_backup') return { data: { revision, backup }, error: null };
                    if (name === 'save_family_backup') {
                        if (args.p_expected_revision !== revision) return { data: null, error: { code: 'PT409' } };
                        backup = args.p_backup;
                        revision++;
                        return { data: revision, error: null };
                    }
                    throw new Error(`Unexpected rpc: ${name}`);
                }
            };
        }
    };
    const makeStorage = () => ({
        async getItem(k) { return records.get(k); },
        async setItem(k, v) { records.set(k, v); }
    });
    const locks = { request: (_n, _o, cb) => (typeof _o === 'function' ? _o() : cb()) };
    let nowMs = Date.parse('2026-11-25T00:00:00.000Z');
    let seq = 0;

    let store = await openFamilyStorage(client, undefined, undefined, {
        offline: true, storage: makeStorage(), locks, now: () => nowMs, newId: () => `op-${++seq}`, baseDelayMs: 50
    });
    offline = true;
    const edit1 = { 天: [{ status: 'can_write', at: '2026-11-25T00:00:00.000Z' }] };
    const queued = await store.setItem(writingStorageKey, JSON.stringify(edit1));
    assert.equal(queued.status, 'queued');
    await store.close();

    // Reopen while still offline: pending edit is restored from durable storage.
    store = await openFamilyStorage(client, undefined, undefined, {
        offline: true, storage: makeStorage(), locks, now: () => nowMs, newId: () => `op-${++seq}`, baseDelayMs: 50
    });
    assert.deepEqual(JSON.parse(store.getItem(writingStorageKey)), edit1);

    // Network returns: sync flushes queued edit to cloud.
    offline = false;
    nowMs += 100;
    const synced = await store.sync();
    assert.equal(synced.status, 'synced');
    assert.equal(synced.revision, 2);

    // Another device advances cloud revision -> PT409 conflict throws OFFLINE_CONFLICT, invokes onUnconfirmedSave, and preserves conflictDraft.
    const unconfirmed = [];
    await store.close();
    store = await openFamilyStorage(client, undefined, (payload, entry) => unconfirmed.push({ payload, entry }), {
        offline: true, storage: makeStorage(), locks, now: () => nowMs, newId: () => `op-${++seq}`, baseDelayMs: 50
    });
    revision = 3;
    const edit2 = { ...edit1, 地: [{ status: 'can_write', at: '2026-11-25T00:01:00.000Z' }] };
    await assert.rejects(
        store.setItem(writingStorageKey, JSON.stringify(edit2)),
        err => err?.code === 'OFFLINE_CONFLICT'
    );
    assert.equal(unconfirmed.length, 1);
    assert.ok(store.conflictDraft);

    // Resolve conflict by requeuing on top of latest revision 3 and syncing to 4.
    const latest = await store.readLatest();
    assert.equal(latest.revision, 3);
    await store.resolveConflict({
        action: 'requeue',
        expectedConflictId: store.conflictDraft.id,
        latestRevision: latest.revision
    });
    const afterResolve = await store.sync();
    assert.equal(afterResolve.status, 'synced');
    assert.equal(afterResolve.revision, 4);

    // Session loss immediately closes offline store.
    onChange?.('SIGNED_OUT', null);
    assert.equal(store.getItem(writingStorageKey), null);
});

test('openFamilyStorage offline mode cleans up offlineStore if session is lost during open and does not treat programming TypeError as retryable', async () => {
    const records = new Map();
    const sharedStorage = {
        async getItem(k) { return records.get(k); },
        async setItem(k, v) { records.set(k, v); }
    };
    let session = { access_token: 'fixture-a', user: { id: 'a' } };
    let onChange;
    let triggerLossOnRead = false;
    let throwProgrammingTypeError = false;
    const client = {
        auth: {
            async getSession() { return { data: { session }, error: null }; },
            onAuthStateChange(cb) {
                onChange = cb;
                return { data: { subscription: { unsubscribe() { onChange = null; } } } };
            }
        },
        rpc() {
            return {
                async setHeader() {
                    if (throwProgrammingTypeError) throw new TypeError('Cannot read properties of undefined');
                    if (triggerLossOnRead) {
                        triggerLossOnRead = false;
                        onChange?.('SIGNED_OUT', null);
                    }
                    return { data: { revision: 1, backup: exportBackup({ getItem: () => null }) }, error: null };
                }
            };
        }
    };
    const locks = { request: (_n, _o, cb) => (typeof _o === 'function' ? _o() : cb()) };

    // 1) Session lost mid-open must abort and release offlineStore so reopening does not leak activeOwners.
    triggerLossOnRead = true;
    await assert.rejects(
        openFamilyStorage(client, undefined, undefined, {
            offline: true, storage: sharedStorage, locks, now: () => 1000, newId: () => 'id-1'
        }),
        /登入已變更/
    );
    const reopened = await openFamilyStorage(client, undefined, undefined, {
        offline: true, storage: sharedStorage, locks, now: () => 1000, newId: () => 'id-2'
    });
    await reopened.close();

    // 2) Programming TypeError (non-network) must NOT fall back to cached snapshot.
    throwProgrammingTypeError = true;
    await assert.rejects(
        openFamilyStorage(client, undefined, undefined, {
            offline: true, storage: sharedStorage, locks, now: () => 1000, newId: () => 'id-3'
        }),
        /Cannot read properties of undefined/
    );
});
