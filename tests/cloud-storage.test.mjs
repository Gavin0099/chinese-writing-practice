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
