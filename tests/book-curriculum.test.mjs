import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bookWritingLessons, matchingBookCourses } from '../bookCurriculum.mjs';

const book = { year: 115, publisher: '康軒', grade: 2, semester: 1, edition: '' };
const version = { academicYear: 115, publisher: '康軒', grade: 2, semester: 1,
    sourceVersion: 'test-version', versionLabel: '測試教材', expectedLessons: [7, 8, 9, 10] };

const lesson = (number, character, kind = 'writing', status = 'verified') => ({
    number, status, source: 'test catalog', characters: [{ character, kind }]
});

test('lesson writing characters come from the exact authorized edition and verified lesson', () => {
    const selected = { ...version, lessons: [
        { ...lesson(7, '春'), characters: [{ character: '春', kind: 'writing' }, { character: '風', kind: 'recognition' }] },
        lesson(8, '雨', 'writing', 'unverified'), lesson(9, '山'), lesson(9, '河'), lesson(11, '雲')
    ] };
    const other = { ...selected, sourceVersion: 'other-edition', lessons: [lesson(7, '河')] };
    const wrongGrade = { ...selected, grade: 3, sourceVersion: 'wrong-grade' };
    const tied = { ...book, edition: '舊版備註', curriculumSourceVersion: selected.sourceVersion };
    assert.deepEqual(matchingBookCourses(book, [other, wrongGrade, selected]), [other, selected]);
    assert.deepEqual(bookWritingLessons(tied, [other, selected], null), [{ number: 7, characters: ['春'] }]);
    assert.deepEqual(bookWritingLessons(tied, [other, wrongGrade], null), []);
    assert.deepEqual(bookWritingLessons(book, [other, selected], null), []);
    assert.deepEqual(bookWritingLessons(book, [other, selected], null, other), [{ number: 7, characters: ['河'] }]);
});

test('only an unbound matching 113 class can fall back to the bundled lessons', () => {
    const legacy = { 2: { A: [{ lesson: 7, vocab: ['春', '春', '風', 'A'] }] } };
    const legacyBook = { ...book, year: 113 };
    assert.deepEqual(bookWritingLessons(legacyBook, [], legacy), [{ number: 7, characters: ['春', '風'] }]);
    assert.deepEqual(bookWritingLessons({ ...legacyBook, curriculumSourceVersion: 'unavailable' }, [], legacy), []);
    assert.deepEqual(bookWritingLessons(book, [], legacy), []);
});
