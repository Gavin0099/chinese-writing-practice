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
    assert.deepEqual(bookWritingLessons(tied, [other, selected]), [{ number: 7, characters: ['春'] }]);
    assert.deepEqual(bookWritingLessons(tied, [other, wrongGrade]), []);
    assert.deepEqual(bookWritingLessons(book, [other, selected]), []);
    assert.deepEqual(bookWritingLessons(book, [other, selected], other), [{ number: 7, characters: ['河'] }]);
});

test('a 113 class requires a verified writing catalog entry just like later years', () => {
    const olderBook = { ...book, year: 113 };
    const olderCourse = { ...version, academicYear: 113, lessons: [lesson(7, '春')] };
    assert.deepEqual(bookWritingLessons(olderBook, []), []);
    assert.deepEqual(bookWritingLessons(olderBook, [olderCourse]), [{ number: 7, characters: ['春'] }]);
});
