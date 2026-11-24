import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOfflineQueue } from '../offlineQueue.mjs';

const key = 'offline:family-test';
const write = (id, fields = {}) => ({ id, resource: 'lesson:8', baseRevision: 4, payload: { word: '天空' }, ...fields });

function fixture() {
    const records = new Map();
    let clock = 1000;
    let nextSaveError;
    const storage = {
        async getItem(key) { return records.get(key) ?? null; },
        async setItem(key, value) {
            if (nextSaveError) {
                const error = nextSaveError;
                nextSaveError = undefined;
                throw error;
            }
            records.set(key, value);
        }
    };
    const options = { storage, key, now: () => clock, baseDelayMs: 100, maxDelayMs: 250 };
    return {
        open: overrides => createOfflineQueue({ ...options, ...overrides }),
        setTime: value => { clock = value; },
        stored: () => records.get(key),
        failSave: error => { nextSaveError = error; }
    };
}

test('enqueue persists independent edits in order and deduplicates only matching operation ids', async () => {
    const context = fixture();
    const queue = await context.open();
    const input = write('first', { payload: { word: '天空', blanks: [1] } });
    assert.equal(await queue.enqueue(input), true);
    input.payload.blanks.push(2);
    context.setTime(1001);
    assert.equal(await queue.enqueue(write('first', { payload: { blanks: [1], word: '天空' } })), false);
    await assert.rejects(queue.enqueue(input), /different content/);
    assert.equal(await queue.enqueue(write('second', { payload: { word: '天氣' } })), true);

    const expected = { version: 1, queueKey: key, latestRevision: null, conflictDraft: null, pending: [
        { ...write('first', { payload: { blanks: [1], word: '天空' } }), timestamp: 1000,
            expectedRevision: 4, retryCount: 0, nextRetryAt: null },
        { ...write('second', { payload: { word: '天氣' } }), timestamp: 1001,
            expectedRevision: 4, retryCount: 0, nextRetryAt: null }
    ] };
    assert.deepEqual(await queue.snapshot(), expected);
    assert.deepEqual(JSON.parse(context.stored()), expected);
});

test('flush applies FIFO writes across resources and persists the last confirmed revision', async () => {
    const context = fixture();
    const queue = await context.open();
    await queue.enqueue(write('first'));
    await queue.enqueue(write('second', { resource: 'lesson:7' }));
    const sent = [];
    const revisions = [5, 6];
    assert.deepEqual(await queue.flush(entry => {
        sent.push([entry.id, entry.baseRevision, entry.expectedRevision]);
        return { revision: revisions[sent.length - 1] };
    }), { status: 'drained', revision: 6 });
    assert.deepEqual(sent, [['first', 4, 4], ['second', 4, 5]]);
    const reopened = await context.open();
    assert.deepEqual(await reopened.snapshot(), { version: 1, queueKey: key, latestRevision: 6, pending: [], conflictDraft: null });
    assert.deepEqual(await reopened.flush(() => assert.fail('sent from an empty queue')), { status: 'drained', revision: 6 });
});

test('flush persists retries, waits until due, caps backoff and retains later writes', async () => {
    const context = fixture();
    let queue = await context.open();
    await queue.enqueue(write('first'));
    await queue.enqueue(write('second'));
    const sent = [];
    const unavailable = entry => {
        sent.push(entry.id);
        throw Object.assign(new Error('connection lost'), { retryable: true });
    };
    assert.deepEqual(await queue.flush(unavailable), { status: 'retry', revision: null, nextRetryAt: 1100 });
    queue = await context.open();
    context.setTime(1099);
    assert.equal((await queue.flush(unavailable)).nextRetryAt, 1100);
    assert.deepEqual(sent, ['first']);
    context.setTime(1100);
    assert.equal((await queue.flush(unavailable)).nextRetryAt, 1300);
    context.setTime(1300);
    assert.equal((await queue.flush(unavailable)).nextRetryAt, 1550);
    context.setTime(1550);
    assert.equal((await queue.flush(unavailable)).nextRetryAt, 1800);
    assert.deepEqual(sent, ['first', 'first', 'first', 'first']);
    assert.deepEqual(JSON.parse(context.stored()).pending.map(({ id, retryCount, nextRetryAt }) =>
        [id, retryCount, nextRetryAt]), [['first', 4, 1800], ['second', 0, null]]);

    context.setTime(1800);
    const revisions = new Map([['first', 5], ['second', 6]]);
    assert.deepEqual(await queue.flush(entry => ({ revision: revisions.get(entry.id) })), { status: 'drained', revision: 6 });
    assert.deepEqual((await queue.snapshot()).pending, []);
});

test('a distinct base revision is preserved and HTTP 409 blocks the whole family queue', async () => {
    const context = fixture();
    const queue = await context.open();
    await queue.enqueue(write('saved'));
    await queue.enqueue(write('stale', { baseRevision: 3, payload: { word: '舊稿' } }));
    await queue.enqueue(write('waiting', { resource: 'lesson:9' }));
    const sent = [];
    assert.deepEqual(await queue.flush(entry => {
        sent.push([entry.id, entry.expectedRevision]);
        if (entry.id === 'saved') return { revision: 5 };
        entry.payload.word = 'sender mutation';
        return { status: 409, revision: 6 };
    }), { status: 'conflict', revision: 5 });
    assert.deepEqual(sent, [['saved', 4], ['stale', 3]]);
    const reopened = await context.open();
    assert.deepEqual((await reopened.snapshot()).conflictDraft, {
        ...write('stale', { baseRevision: 3, payload: { word: '舊稿' } }), timestamp: 1000,
        expectedRevision: 3, retryCount: 0, nextRetryAt: null
    });
    assert.deepEqual((await reopened.snapshot()).pending.map(entry => entry.id), ['waiting']);
    assert.equal(await reopened.enqueue(write('stale', { baseRevision: 3, payload: { word: '舊稿' } })), false);
    assert.deepEqual(await reopened.flush(() => assert.fail('sent after conflict')), { status: 'conflict', revision: 5 });
});

test('a thrown version conflict preserves the failed write and its retry metadata through export and restore', async () => {
    const source = fixture();
    const queue = await source.open();
    await queue.enqueue(write('saved'));
    await queue.enqueue(write('draft', { payload: { word: '風雨' } }));
    await queue.enqueue(write('waiting'));
    assert.deepEqual(await queue.flush(entry => entry.id === 'saved' ? { revision: 5 } : { status: 503 }),
        { status: 'retry', revision: 5, nextRetryAt: 1100 });
    source.setTime(1100);
    assert.deepEqual(await queue.flush(() => { throw Object.assign(new Error('conflict'), { code: 'PT409' }); }),
        { status: 'conflict', revision: 5 });

    const snapshot = await queue.snapshot();
    assert.deepEqual(snapshot.conflictDraft, { ...write('draft', { payload: { word: '風雨' } }), timestamp: 1000,
        expectedRevision: 5, retryCount: 1, nextRetryAt: 1100 });
    const destination = fixture();
    const restored = await destination.open();
    await restored.restore(JSON.stringify(snapshot));
    snapshot.conflictDraft.payload.word = 'changed after export';
    const reopened = await destination.open();
    assert.equal((await reopened.snapshot()).conflictDraft.payload.word, '風雨');
    assert.deepEqual((await reopened.snapshot()).pending.map(entry => entry.id), ['waiting']);
    assert.deepEqual(await reopened.flush(() => assert.fail('sent from restored conflict')), { status: 'conflict', revision: 5 });
    await assert.rejects(restored.restore(JSON.stringify({ ...snapshot, pending: [], conflictDraft: null })), /no unresolved writes/);
});

test('restore only accepts the original queue key and can resume a pending write', async () => {
    const queue = await fixture().open();
    await queue.enqueue(write('first'));
    const serialized = JSON.stringify(await queue.snapshot());
    const destination = fixture();
    const otherFamily = await destination.open({ key: 'offline:other-test' });
    await assert.rejects(otherFamily.restore(serialized), /Invalid offline queue snapshot/);
    assert.deepEqual((await otherFamily.snapshot()).pending, []);

    const restored = await destination.open();
    await restored.restore(serialized);
    assert.equal((await restored.snapshot()).pending[0].id, 'first');
    assert.deepEqual(await restored.flush(() => ({ revision: 5 })), { status: 'drained', revision: 5 });
    assert.deepEqual(JSON.parse(destination.stored()).pending, []);
});

test('unexpected sender errors and unconfirmed revisions leave the operation persisted', async () => {
    const context = fixture();
    const queue = await context.open();
    await queue.enqueue(write('first'));
    const before = context.stored();
    const denied = new Error('unauthorized');
    await assert.rejects(queue.flush(() => { throw denied; }), error => error === denied);
    for (const result of [undefined, { revision: 4 }, { revision: 6 }, { revision: 5, status: 400 }]) {
        await assert.rejects(queue.flush(() => result), /revision was not confirmed/);
        assert.equal(context.stored(), before);
    }
    assert.equal((await queue.snapshot()).pending[0].retryCount, 0);
});

test('a failed storage write does not advance state or drop an acknowledged operation', async () => {
    const context = fixture();
    const queue = await context.open();
    const failed = new Error('storage unavailable');
    context.failSave(failed);
    await assert.rejects(queue.enqueue(write('first')), error => error === failed);
    assert.deepEqual((await queue.snapshot()).pending, []);
    await queue.enqueue(write('first'));
    await queue.enqueue(write('second'));
    const before = context.stored();
    context.failSave(failed);
    await assert.rejects(queue.flush(() => ({ revision: 5 })), error => error === failed);
    assert.equal(context.stored(), before);
    assert.deepEqual(await queue.snapshot(), JSON.parse(before));
    assert.deepEqual(await queue.flush(() => ({ status: 409 })), { status: 'conflict', revision: null });
    assert.equal((await queue.snapshot()).conflictDraft.id, 'first');
});

test('enqueue during send survives acknowledgment and an overlapping flush cannot send again', async () => {
    const context = fixture();
    const queue = await context.open();
    await queue.enqueue(write('first'));
    let start;
    let finish;
    const started = new Promise(resolve => { start = resolve; });
    const response = new Promise(resolve => { finish = resolve; });
    const flush = queue.flush(entry => {
        if (entry.id === 'first') {
            start();
            return response;
        }
        assert.equal(entry.expectedRevision, 5);
        return { revision: 6 };
    });
    await started;
    await assert.rejects(queue.flush(() => assert.fail('concurrent send')), /already flushing/);
    await queue.enqueue(write('second'));
    assert.deepEqual(JSON.parse(context.stored()).pending.map(entry => entry.id), ['first', 'second']);
    finish({ revision: 5 });
    assert.deepEqual(await flush, { status: 'drained', revision: 6 });
    assert.deepEqual(JSON.parse(context.stored()).pending, []);
});

test('invalid operations and configuration fail before persisting an edit', async () => {
    const context = fixture();
    const queue = await context.open();
    const cyclic = {};
    cyclic.self = cyclic;
    const hidden = { [Symbol('ignored by JSON')]: true };
    const hole = new Array(1);
    for (const input of [null, write(' '), write('id', { resource: '' }), write('id', { baseRevision: -1 }),
        write('id', { baseRevision: Number.MAX_SAFE_INTEGER + 1 }), ...[undefined, { empty: undefined }, NaN, new Date(0),
            cyclic, hidden, hole].map(payload => write('id', { payload }))]) {
        await assert.rejects(queue.enqueue(input), TypeError);
    }
    await assert.rejects(context.open({ baseDelayMs: 0 }), /configuration/);
    await assert.rejects(context.open({ maxDelayMs: 99 }), /configuration/);
    await assert.rejects(queue.flush(null), /sender/);
    context.setTime(-1);
    await assert.rejects(queue.enqueue(write('id')), /clock/);
    assert.equal(context.stored(), undefined);
    assert.deepEqual((await queue.snapshot()).pending, []);
});

test('restore rejects malformed or internally inconsistent snapshots without replacing stored state', async () => {
    const context = fixture();
    const queue = await context.open();
    await queue.enqueue(write('saved'));
    await queue.flush(() => ({ revision: 5 }));
    const before = context.stored();
    const empty = JSON.parse(before);
    const valid = { ...write('first'), timestamp: 1000, expectedRevision: 4, retryCount: 0, nextRetryAt: null };
    const badStates = [null, { ...empty, version: 2 }, { ...empty, latestRevision: -1 },
        { ...empty, pending: [valid, valid] }, { ...empty, pending: [valid], conflictDraft: valid },
        { ...empty, pending: [{ ...valid, timestamp: -1 }] }, { ...empty, pending: [{ ...valid, expectedRevision: 6 }] },
        { ...empty, pending: [{ ...valid, retryCount: 1 }] },
        { ...empty, pending: [valid, { ...valid, id: 'second', retryCount: 1, nextRetryAt: 1100 }] }];
    await assert.rejects(queue.restore('malformed'), SyntaxError);
    await assert.rejects(queue.restore(empty), TypeError);
    for (const state of badStates) await assert.rejects(queue.restore(JSON.stringify(state)), TypeError);
    assert.equal(context.stored(), before);
    assert.deepEqual(await queue.snapshot(), empty);
    await assert.rejects(context.open({ storage: { getItem: () => 'corrupt', setItem: () => assert.fail('overwrote storage') } }),
        SyntaxError);
});
