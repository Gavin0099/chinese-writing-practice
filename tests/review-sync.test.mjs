import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pendingWords, readAttempts, saveAttempt } from '../reviewData.mjs';
import { copyReviewAttempts, splitLocalReviewAttempts, syncReviewAttempts } from '../reviewSync.mjs';

const fixture = (id, day, overrides = {}) => ({
    id, at: `2026-11-${day}T00:00:00.000Z`, bookId: 'class-a', source: 'exam', examId: 'exam',
    items: [{ lesson: 1, word: '天空', pronunciation: ['ㄊㄧㄢ', 'ㄎㄨㄥ'], blanks: [1], wrong: true }],
    ...overrides
});

function browserStorage() {
    const records = new Map();
    return { get length() { return records.size; }, key: index => [...records.keys()][index],
        getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) };
}

test('a clean device sees prior and new grading in order without a duplicate retry', async () => {
    const before = fixture('before', '10');
    const after = fixture('after', '11', { items: [{ ...before.items[0], wrong: false }] });
    const browser = browserStorage();
    saveAttempt(browser, 'owner', before);
    const uploaded = [];
    const cloud = { readReviewAttempts: async () => [...uploaded],
        appendReviewAttempts: async attempts => uploaded.push(...attempts) };

    await syncReviewAttempts(readAttempts(browser, 'owner'), cloud);
    await syncReviewAttempts(readAttempts(browser, 'owner'), cloud);
    await syncReviewAttempts([after], cloud);
    const history = await syncReviewAttempts([], cloud);
    assert.deepEqual(uploaded, [before, after]);
    assert.deepEqual(history, [before, after]);
    assert.deepEqual(pendingWords(history, 'class-a'), []);
    assert.deepEqual(readAttempts(browser, 'owner'), [before]);
});

test('an interrupted upload leaves existing records available and resumes without reuploading the confirmed batch', async () => {
    const browser = browserStorage();
    const original = Array.from({ length: 26 }, (_, index) => fixture(`record-${index}`, '10'));
    original.forEach(record => saveAttempt(browser, 'owner', record));
    const uploaded = [];
    const cloud = { readReviewAttempts: async () => [...uploaded],
        appendReviewAttempts: async batch => {
            if (batch.length === 1) throw new Error('connection lost');
            uploaded.push(...batch);
        } };
    const saved = readAttempts(browser, 'owner');
    await assert.rejects(syncReviewAttempts(saved, cloud), /connection lost/);
    assert.equal(uploaded.length, 25);
    assert.deepEqual(readAttempts(browser, 'owner'), saved);
    cloud.appendReviewAttempts = async batch => {
        assert.equal(batch.length, 1);
        uploaded.push(...batch);
    };
    assert.deepEqual(await syncReviewAttempts(saved, cloud), saved);
    assert.equal(new Set(uploaded.map(record => record.id)).size, 26);
});

test('a same-ID disagreement rejects instead of replacing either copy', async () => {
    const first = fixture('one', '10');
    const other = fixture('one', '11');
    const browser = browserStorage();
    saveAttempt(browser, 'owner', first);
    const cloud = { readReviewAttempts: async () => [other],
        appendReviewAttempts: async () => assert.fail('A conflicting ID must never be uploaded') };
    await assert.rejects(syncReviewAttempts(readAttempts(browser, 'owner'), cloud), /不同內容/);
    assert.deepEqual(readAttempts(browser, 'owner'), [first]);
});

test('explicit import only copies eligible local records and leaves both original scopes intact', () => {
    const browser = browserStorage();
    const eligible = fixture('eligible', '10');
    const otherClass = fixture('other-class', '11', { bookId: 'class-b' });
    const otherOwner = fixture('other-owner', '12');
    saveAttempt(browser, 'local', eligible);
    saveAttempt(browser, 'local', otherClass);
    saveAttempt(browser, 'other-owner', otherOwner);
    assert.deepEqual(readAttempts(browser, 'owner'), []);
    const { matched, unmatched } = splitLocalReviewAttempts(browser, ['class-a']);
    assert.deepEqual(unmatched, [otherClass]);
    copyReviewAttempts(browser, 'owner', matched, []);
    copyReviewAttempts(browser, 'owner', matched, [eligible]);
    assert.deepEqual(readAttempts(browser, 'owner'), [eligible]);
    assert.deepEqual(readAttempts(browser, 'local'), [eligible, otherClass]);
    assert.deepEqual(readAttempts(browser, 'other-owner'), [otherOwner]);
});
