import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createIndexedDbQueueStorage } from '../indexedDbQueueStorage.mjs';
import { createOfflineQueue } from '../offlineQueue.mjs';

function mockIndexedDB() {
    const stores = new Map();
    const events = [];
    const db = {
        objectStoreNames: { contains: name => stores.has(name) },
        createObjectStore(name) {
            assert.equal(stores.has(name), false);
            stores.set(name, new Map());
            events.push(['create', name]);
        },
        transaction(name, mode) {
            const records = stores.get(name);
            assert.ok(records);
            const transaction = { error: null };
            function request(operation, key, value) {
                const result = {};
                events.push([mode, operation, key]);
                const failure = nextFailure;
                nextFailure = undefined;
                queueMicrotask(() => {
                    if (failure?.type === 'error') {
                        result.error = failure.error;
                        transaction.onerror({ target: result });
                    } else {
                        result.result = operation === 'get' ? records.get(key) : undefined;
                        result.onsuccess?.();
                    }
                    queueMicrotask(() => {
                        if (failure) {
                            transaction.error = failure.error;
                            transaction.onabort();
                            return;
                        }
                        if (operation === 'put') records.set(key, value);
                        if (operation === 'delete') records.delete(key);
                        transaction.oncomplete();
                    });
                });
                return result;
            }
            transaction.objectStore = store => {
                assert.equal(store, name);
                return {
                    get: key => request('get', key),
                    put: (value, key) => request('put', key, value),
                    delete: key => request('delete', key)
                };
            };
            return transaction;
        }
    };

    let initialized = false;
    let nextFailure;
    return {
        events,
        failNext(type, error) { nextFailure = { type, error }; },
        open(name, version) {
            const request = { result: db };
            events.push(['open', name, version]);
            queueMicrotask(() => {
                if (!initialized) {
                    request.onupgradeneeded();
                    initialized = true;
                }
                request.onsuccess();
            });
            return request;
        }
    };
}

const openStorage = indexedDB => createIndexedDbQueueStorage({ indexedDB, dbName: 'test-db', storeName: 'snapshots' });

test('creates the store and reads, replaces and removes independent keys', async () => {
    const indexedDB = mockIndexedDB();
    const storage = openStorage(indexedDB);
    assert.equal(await storage.getItem('first'), null);
    await storage.setItem('first', 'old');
    await storage.setItem('second', '');
    await storage.setItem('first', 'new');
    assert.equal(await openStorage(indexedDB).getItem('first'), 'new');
    await storage.removeItem('first');
    assert.equal(await storage.getItem('first'), null);
    assert.equal(await storage.getItem('second'), '');
    assert.deepEqual(indexedDB.events, [
        ['open', 'test-db', 1], ['create', 'snapshots'], ['readonly', 'get', 'first'],
        ['readwrite', 'put', 'first'], ['readwrite', 'put', 'second'], ['readwrite', 'put', 'first'],
        ['open', 'test-db', 1], ['readonly', 'get', 'first'], ['readwrite', 'delete', 'first'],
        ['readonly', 'get', 'first'], ['readonly', 'get', 'second']
    ]);
});

test('rejects when a successful request is followed by an abort or a request errors', async () => {
    const indexedDB = mockIndexedDB();
    const storage = openStorage(indexedDB);
    await storage.setItem('key', 'original');
    indexedDB.failNext('abort', null);
    await assert.rejects(storage.setItem('key', 'aborted'), /transaction aborted/);
    assert.equal(await storage.getItem('key'), 'original');

    const failure = new Error('request failed');
    indexedDB.failNext('error', failure);
    await assert.rejects(storage.removeItem('key'), failure);
    assert.equal(await storage.getItem('key'), 'original');
});

test('rejects invalid factories and reports open failures while allowing a later attempt', async () => {
    assert.throws(() => openStorage(undefined), /IndexedDB factory/);
    const mock = mockIndexedDB();
    const error = new Error('open failed');
    const storage = openStorage({
        open(...args) {
            if (mock.events.length) return mock.open(...args);
            mock.events.push(['failed open']);
            const request = { error };
            queueMicrotask(() => request.onerror());
            return request;
        }
    });
    await assert.rejects(storage.getItem('key'), error);
    assert.equal(await storage.getItem('key'), null);
});

test('IndexedDB rollback after an aborted flush preserves pending data across queue reopen', async () => {
    const indexedDB = mockIndexedDB();
    const openQueue = () => createOfflineQueue({ storage: openStorage(indexedDB), key: 'family:test', now: () => 0 });
    const queue = await openQueue();
    await queue.enqueue({ id: 'edit', resource: 'lesson:8', baseRevision: 0, payload: { count: 1 } });
    const reopened = await openQueue();
    const abort = new Error('disk failure');
    indexedDB.failNext('abort', abort);
    const send = entry => {
        assert.equal(entry.id, 'edit');
        assert.equal(entry.expectedRevision, 0);
        return { revision: 1 };
    };
    await assert.rejects(reopened.flush(send), abort);
    assert.deepEqual(await reopened.snapshot(), await (await openQueue()).snapshot());
    assert.deepEqual(await reopened.flush(send), { status: 'drained', revision: 1 });
    const saved = await openQueue();
    assert.deepEqual(await saved.snapshot(), {
        version: 1, queueKey: 'family:test', latestRevision: 1, pending: [], conflictDraft: null
    });
});
