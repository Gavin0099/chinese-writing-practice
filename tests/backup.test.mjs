import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupCounts, exportBackup, parseBackup, readBackupTarget, restoreBackup } from '../backupData.mjs';
import { makeExam } from '../examData.mjs';
import { confirmCourse, curriculumStorageKey, progressStorageKey, readProgress, writingStorageKey } from '../learningData.mjs';
import { makeBook, makeWord, vocabularyStorageKey } from '../vocabularyData.mjs';

const at = '2026-11-11T03:20:00.000Z';

function mockStorage(initial = {}) {
    const values = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key) };
}

function sampleRecords() {
    const book = makeBook({ id: 'room', name: '備份驗收班', publisher: '康軒', year: 115, grade: 2, semester: 1, edition: '測試版' });
    const words = Array.from({ length: 30 }, (_, index) => makeWord({ id: `word-${index}`, bookId: book.id,
        lesson: index % 8 + 1, word: `${String.fromCodePoint(0x4e00 + index)}天`, pronunciation: 'ㄨ ㄊㄧㄢ',
        blanks: [2], confirmed: true }));
    const exam = makeExam({ id: 'exam', createdAt: at, book, words, from: 1, to: 8, count: 15, seed: 'recovery' });
    const course = { academicYear: 115, publisher: '康軒', grade: 2, semester: 1, sourceVersion: 'fixture', expectedLessons: [8] };
    const progress = confirmCourse(readProgress(null), course, 8);
    return { [vocabularyStorageKey]: { books: [book], words, exams: [exam] }, [progressStorageKey]: progress,
        [writingStorageKey]: { 天: [{ status: 'missing_strokes', at }, { status: 'can_write', at }] } };
}

test('backup round trip restores 30 words, the saved 15-question exam, progress and writing history', () => {
    const original = sampleRecords();
    const firstSource = original[vocabularyStorageKey].exams[0].questions[0].sources[0].id;
    const changed = original[vocabularyStorageKey].words.find(entry => entry.id === firstSource);
    changed.id = 'replacement-word';
    const from = mockStorage({ ...original, [curriculumStorageKey]: [{ contents: 'local textbook data' }] });
    const backup = exportBackup(from);
    assert.deepEqual(backupCounts(backup), { books: 1, words: 30, exams: 1, progress: 1, writing: 2 });
    const file = JSON.stringify(backup);
    assert.doesNotMatch(file, /local textbook data/);
    const to = mockStorage({ [curriculumStorageKey]: [{ contents: 'existing textbook data' }] });
    restoreBackup(parseBackup(file), readBackupTarget(to), to);
    for (const [key, value] of Object.entries(original)) assert.deepEqual(JSON.parse(to.getItem(key)), value);
    assert.deepEqual(JSON.parse(to.getItem(curriculumStorageKey)), [{ contents: 'existing textbook data' }]);
});

test('rejects a bad version, incorrect blank position and dangling class before touching storage', () => {
    const storage = mockStorage(sampleRecords());
    const before = readBackupTarget(storage);
    const backup = exportBackup(storage);
    assert.throws(() => parseBackup(JSON.stringify({ ...backup, version: 100 })), /相容備份檔/);
    assert.throws(() => parseBackup('{'), /無法讀取/);
    const invalidQuestion = structuredClone(backup);
    invalidQuestion.vocabulary.exams[0].questions[0].blanks = [3];
    assert.throws(() => restoreBackup(invalidQuestion, before, storage), /挖空字/);
    const invalidBook = structuredClone(backup);
    invalidBook.vocabulary.words[0].bookId = 'missing';
    assert.throws(() => restoreBackup(invalidBook, before, storage), /無法對應/);
    assert.deepEqual(readBackupTarget(storage), before);
});

test('a failed restore rolls back an earlier successful write and keeps unrelated data', () => {
    const original = sampleRecords();
    const target = mockStorage({ ...original, [curriculumStorageKey]: [{ contents: 'separate' }] });
    const before = readBackupTarget(target);
    const backup = exportBackup(mockStorage());
    const write = target.setItem;
    let count = 0;
    target.setItem = (key, value) => {
        if (++count === 2) throw new Error('simulated quota limit');
        write(key, value);
    };
    assert.throws(() => restoreBackup(backup, before, target), /原有資料已保留/);
    assert.deepEqual(readBackupTarget(target), before);
    assert.deepEqual(JSON.parse(target.getItem(curriculumStorageKey)), [{ contents: 'separate' }]);
});

test('refuses to replace records written after the restore preview', () => {
    const target = mockStorage();
    const before = readBackupTarget(target);
    const backup = exportBackup(mockStorage(sampleRecords()));
    target.setItem(writingStorageKey, JSON.stringify({ 天: [{ status: 'can_write', at }] }));
    assert.throws(() => restoreBackup(backup, before, target), /本機資料已變更/);
    assert.equal(target.getItem(vocabularyStorageKey), null);
    assert.deepEqual(JSON.parse(target.getItem(writingStorageKey)), { 天: [{ status: 'can_write', at }] });
});
