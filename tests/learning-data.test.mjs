import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lookupCharacters } from '../characterLookup.mjs';
import { confirmCourse, importCourses, lookupReferenceLessons, lookupScope, readProgress } from '../learningData.mjs';

const url = number => `https://pedia.cloud.edu.tw/Bookmark/TCollection?TextNameId=99${number}`;
const source = { sha256: 'a'.repeat(64), file: 'synthetic.xlsx' };
const lesson = (number, character, kind, status = 'match') => ({
    number, characters: [{ character, kind }], pedia: { title: `測試第${number}課`, url: url(number), status }
});
const year = 115;
const first = { academic_year: year, publisher: '測試', grade: 1, semester: 1,
    lessons: [lesson(1, '晴', 'recognition'), lesson(2, '晴', 'writing')] };
const second = { ...first, semester: 2, lessons: [lesson(1, '勇', 'writing'), lesson(2, '密', 'recognition')] };
const candidate = (editions, workbook = source) => ({ schema_version: 1, status: 'candidate', source: workbook, editions });
const report = (editions, workbook = source) => ({ workbook, results: editions.flatMap(edition => edition.lessons.map(entry => ({
    academic_year: edition.academic_year, publisher: edition.publisher, grade: edition.grade, semester: edition.semester,
    lesson: entry.number, detail_url: entry.pedia.url, status: entry.pedia.status
}))) });

test('imports real-shaped local data with separate writing and recognition evidence', () => {
    const [course] = importCourses(candidate([first]), [report([first])]);
    assert.equal(course.coverageComplete, true);
    assert.deepEqual(course.expectedLessons, [1, 2]);
    const [result] = lookupCharacters('晴晴', lookupScope(course, [course], readProgress(null)));
    assert.deepEqual(result.positions, [0, 1]);
    assert.deepEqual(result.curriculum.occurrences.map(entry => [entry.lesson, entry.type, entry.source]),
        [[1, 'recognition', url(1)], [2, 'writing', url(2)]]);
    assert.equal(result.teachingStatus, 'insufficient_data');
});

test('keeps unmatched, conflicting and unnumbered lessons out of query evidence', () => {
    const partial = { ...first, lessons: [first.lessons[0], lesson(2, '花', 'writing', 'different'), lesson(null, '密', 'writing')] };
    const comparison = report([partial]);
    comparison.results.push({ ...comparison.results[0], lesson: 3, status: 'missing_from_workbook' });
    const [course] = importCourses(candidate([partial]), [comparison]);
    assert.equal(course.coverageComplete, false);
    assert.deepEqual(course.expectedLessons, [1, 2, 3]);
    assert.deepEqual(course.lessons.map(entry => entry.number), [1]);
    const confirmed = confirmCourse(readProgress(null), course, 3);
    const results = lookupCharacters('晴花密', lookupScope(course, [course], confirmed));
    assert.deepEqual(results.map(result => result.teachingStatus), ['taught', 'insufficient_data', 'insufficient_data']);
    assert.equal(results[1].curriculum.firstOccurrence, null);
    assert.equal(results[2].curriculum.firstOccurrence, null);
});

test('requires a matching catalogue report before claiming coverage is complete', () => {
    assert.equal(importCourses(candidate([first]))[0].coverageComplete, false);
    assert.equal(importCourses(candidate([first]), [report([first], { ...source, sha256: 'b'.repeat(64) })])[0].coverageComplete, false);
    const conflicting = report([first]);
    conflicting.results[1].status = 'different';
    assert.deepEqual(importCourses(candidate([first]), [conflicting])[0].lessons.map(entry => entry.number), [1]);
    assert.throws(() => importCourses(candidate([{ ...first, lessons: [first.lessons[0], first.lessons[0]] }])), /重複的課次/);
    const untrusted = { ...first.lessons[0], pedia: { ...first.lessons[0].pedia, url: 'https://example.org' } };
    assert.throws(() => importCourses(candidate([{ ...first, lessons: [untrusted] }])), /沒有可查詢/);
});

test('accumulates confirmed earlier terms and requires confirmation again after a source version change', () => {
    const courses = importCourses(candidate([first, second]), [report([first, second])]);
    const [earlier, current] = courses;
    const newSource = { ...source, sha256: 'b'.repeat(64) };
    const [replacement] = importCourses(candidate([second], newSource), [report([second], newSource)]);
    const earlierProgress = confirmCourse(readProgress({ lastLesson: 8 }), earlier, 2);
    const progress = confirmCourse(earlierProgress, current, 1);
    const statuses = scope => lookupCharacters('晴勇密', scope).map(result => result.teachingStatus);
    assert.deepEqual(statuses(lookupScope(current, courses, progress)), ['taught', 'taught', 'not_yet_taught']);
    const available = [...courses, replacement];
    assert.deepEqual(statuses(lookupScope(replacement, available, progress)), ['taught', 'insufficient_data', 'insufficient_data']);
    const confirmed = confirmCourse(progress, replacement, 0);
    assert.deepEqual(statuses(lookupScope(replacement, available, confirmed)), ['taught', 'not_yet_taught', 'not_yet_taught']);
    assert.equal(confirmed.records.length, 2);
    assert.equal(confirmed.records[1].sourceVersion, newSource.sha256);
    assert.throws(() => confirmCourse(confirmed, replacement, 8), /有效的課次/);
});

test('finds the earlier grade and lesson without assuming that the child used that edition', () => {
    const prior = { ...first, academic_year: 114, lessons: [lesson(1, '雨', 'writing'), lesson(2, '晴', 'writing')] };
    const otherPublisher = { ...prior, publisher: '其他', lessons: [lesson(1, '密', 'writing')] };
    const current = { ...first, grade: 2, lessons: [lesson(1, '勇', 'writing'), lesson(2, '風', 'writing')] };
    const editions = [prior, first, current, otherPublisher];
    const courses = importCourses(candidate(editions), [report(editions)]);
    const [earlier, sameYear, active, alternative] = courses;
    const progress = confirmCourse(readProgress(null), active, 1);
    const referencesFor = (available, saved = progress) =>
        lookupReferenceLessons('晴密', lookupScope(active, available, saved).references);
    const lessonsFor = hits => hits.get('晴')?.map(({ occurrence, otherYear }) =>
        [occurrence.academicYear, occurrence.grade, occurrence.semester, occurrence.lesson, otherYear]);

    assert.deepEqual(lessonsFor(referencesFor(courses)), [[114, 1, 1, 2, false]]);
    assert.equal(referencesFor(courses).has('密'), false);
    const [unconfirmed] = lookupCharacters('晴', lookupScope(active, courses, progress));
    assert.equal(unconfirmed.teachingStatus, 'insufficient_data');

    assert.deepEqual(lessonsFor(referencesFor([sameYear, active])), [[115, 1, 1, 1, true], [115, 1, 1, 2, true]]);
    assert.equal(referencesFor([...courses, { ...earlier, sourceVersion: 'another-edition' }]).size, 0);
    assert.equal(referencesFor(courses, confirmCourse(progress, alternative, 1)).size, 0);

    const confirmed = confirmCourse(confirmCourse(progress, earlier, 2), active, 1);
    assert.equal(referencesFor(courses, confirmed).size, 0);
    const [known] = lookupCharacters('晴', lookupScope(active, courses, confirmed));
    assert.equal(known.teachingStatus, 'taught');
    assert.equal(known.curriculum.firstOccurrence.lesson, 2);
});
