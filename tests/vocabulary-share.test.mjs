import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeBook, makeWord, updateVocabulary, readVocabulary } from '../vocabularyData.mjs';
import { applyVocabularyShare, compatibleShareBooks, createVocabularyShare, parseVocabularyShare,
    previewVocabularyShare } from '../vocabularyShare.mjs';

const source = makeBook({ id: 'source-id', name: '來源班級', publisher: '康軒', year: 115, grade: 2, semester: 1, edition: '修訂版' });
const target = { ...source, id: 'destination-id', name: '接收班級' };
const entry = (bookId, id, fields = {}) => makeWord({ id, bookId, lesson: 3, word: '晴天',
    pronunciation: 'ㄑㄧㄥˊ ㄊㄧㄢ', blanks: [1], confirmed: true, ...fields });
const sky = entry(source.id, 'sky', { word: '天空', pronunciation: 'ㄊㄧㄢ ㄎㄨㄥ' });
const ungraded = entry(source.id, 'unknown', { word: '雨天', pronunciation: '', confirmed: false });
const ids = () => {
    let counter = 0;
    return () => `new-${++counter}`;
};

test('a share round trip contains only selected entries and public-facing class metadata', () => {
    const chosen = { ...sky, childId: 'private-child', photo: 'private-image', results: [true] };
    const exported = createVocabularyShare({ ...source, ownerId: 'private-owner' }, [chosen]);
    assert.deepEqual(exported.source, { name: '來源班級', publisher: '康軒', year: 115, grade: 2, semester: 1, edition: '修訂版' });
    assert.deepEqual(exported.words, [{ lesson: 3, word: '天空', pronunciation: ['ㄊㄧㄢ', 'ㄎㄨㄥ'], blanks: [1] }]);
    const json = JSON.stringify(exported);
    assert.doesNotMatch(json, /private-|source-id|confirmed|exams|reviewAttempts/);
    assert.deepEqual(parseVocabularyShare('\uFEFF' + json), exported);
    assert.throws(() => createVocabularyShare(source, [entry(target.id, 'other')]), /同一個班級/);
    assert.throws(() => createVocabularyShare(source, []), /1 至 2000/);
});

test('preview reports exact duplicates and conflicts, then adds only new words to a matching class', () => {
    const original = entry(target.id, 'original');
    const conflict = entry(target.id, 'conflict', { word: '天空', pronunciation: 'ㄊㄧㄢ ㄎㄨㄥ', blanks: [2] });
    const different = { ...target, id: 'different', edition: '不同版' };
    const otherClass = { ...target, id: 'other' };
    const otherWord = entry(otherClass.id, 'separate', { word: '雨天', pronunciation: 'ㄩˇ ㄊㄧㄢ' });
    const exam = { id: 'existing-exam' };
    const state = { books: [target, different, otherClass], words: [original, conflict, otherWord], exams: [exam] };
    const share = createVocabularyShare(source, [entry(source.id, 'first'), sky, ungraded]);
    assert.deepEqual(compatibleShareBooks(share, state.books), [target, otherClass]);
    assert.throws(() => previewVocabularyShare(state, share, { id: different.id }), /相同教材版次/);
    const preview = previewVocabularyShare(state, share, { id: target.id });
    assert.deepEqual(preview.rows.map(row => row.status), ['duplicate', 'conflict', 'new']);
    assert.deepEqual(preview.rows[1].existing.blanks, [2]);
    assert.equal(state.words.length, 3);
    assert.deepEqual(applyVocabularyShare(state, share, preview, { confirmReadings: true, nextId: ids() }),
        { book: target, count: 1 });
    assert.deepEqual(state.words.slice(0, 3), [original, conflict, otherWord]);
    assert.deepEqual(state.exams, [exam]);
    assert.equal(state.words.at(-1).bookId, target.id);
    assert.equal(state.words.at(-1).confirmed, false);
});

test('new-class import assigns new IDs and keeps readings pending until the recipient confirms them', () => {
    const share = createVocabularyShare(source, [sky]);
    for (const confirmReadings of [false, true]) {
        const state = { books: [], words: [], exams: [] };
        const preview = previewVocabularyShare(state, share, { name: '新班級' });
        const { book } = applyVocabularyShare(state, share, preview, { confirmReadings, nextId: ids() });
        assert.equal(book.id, 'new-1');
        assert.equal(book.name, '新班級');
        assert.deepEqual(state.words, [{ ...sky, id: 'new-2', bookId: 'new-1', confirmed: confirmReadings }]);
    }
});

test('malformed files and a changed preview cannot partially write vocabulary', () => {
    const share = createVocabularyShare(source, [sky, ungraded]);
    assert.throws(() => parseVocabularyShare('['), /JSON/);
    assert.throws(() => parseVocabularyShare(JSON.stringify({ ...share, version: 9 })), /本站匯出/);
    assert.throws(() => parseVocabularyShare(JSON.stringify({ ...share, words: [share.words[0], share.words[0]] })), /重複詞語/);
    assert.throws(() => parseVocabularyShare(JSON.stringify({ ...share, words: [{ ...share.words[0], blanks: [9] }] })), /挖空字/);
    const values = new Map();
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, data) => values.set(key, data) };
    updateVocabulary(state => state.books.push(target), storage);
    const preview = previewVocabularyShare(readVocabulary(storage), share, { id: target.id });
    updateVocabulary(state => state.words.push(entry(target.id, 'new-from-another-tab',
        { word: '天空', pronunciation: 'ㄊㄧㄢ ㄎㄨㄥ', blanks: [2] })), storage);
    const changed = readVocabulary(storage);
    assert.throws(() => updateVocabulary(state => applyVocabularyShare(state, share, preview, { nextId: ids() }), storage), /重新核對/);
    assert.deepEqual(readVocabulary(storage), changed);
});
