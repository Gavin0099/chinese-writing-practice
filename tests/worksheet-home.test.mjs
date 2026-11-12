import assert from 'node:assert/strict';
import { test } from 'node:test';
import { courseKey } from '../characterLookup.mjs';
import { resolveWorksheetCourse } from '../worksheetHome.mjs';

const identity = { academicYear: 115, publisher: '南一', grade: 2, semester: 1, sourceVersion: 'test-v1' };
const lesson = {
    number: 8, status: 'verified', source: 'synthetic-test',
    characters: [{ character: '晴', kind: 'writing' }, { character: '霞', kind: 'recognition' }]
};
const course = { ...identity, expectedLessons: [1, 8, 9], lessons: [lesson] };
const progress = (record = {}, activeKey = courseKey(identity)) => ({
    activeKey,
    records: [{ ...identity, lesson: 8, confirmed: true, ...record }]
});

test('the saved publisher and edition determine the writing characters for the confirmed lesson', () => {
    const otherPublisher = { ...course, publisher: '康軒', lessons: [] };
    const oldEdition = { ...course, academicYear: 113, lessons: [] };
    const result = resolveWorksheetCourse(progress(), [otherPublisher, oldEdition, course]);
    assert.equal(result.course, course);
    assert.equal(result.progress.lesson, 8);
    assert.deepEqual(result.lessons, [
        { number: 1, verified: false, writing: '' },
        { number: 8, verified: true, title: '', writing: '晴' },
        { number: 9, verified: false, writing: '' }
    ]);
});

test('a different source revision or publisher cannot replace a missing confirmed edition', () => {
    const result = resolveWorksheetCourse(progress(), [
        { ...course, sourceVersion: 'test-v2' },
        { ...course, publisher: '翰林' }
    ]);
    assert.equal(result.progress.lesson, 8);
    assert.equal(result.course, undefined);
    assert.deepEqual(result.lessons, []);
});

test('only a single verified lesson can be used, even if unverified and duplicate rows have characters', () => {
    const ambiguous = { ...course, lessons: [lesson, lesson, { ...lesson, number: 9, status: 'candidate' }] };
    assert.equal(resolveWorksheetCourse(progress(), [ambiguous]).lessons.every(row => row.writing === ''), true);
});

test('not-started and unconfirmed progress do not imply a default lesson', () => {
    const notStarted = resolveWorksheetCourse(progress({ lesson: 0 }), [course]);
    assert.equal(notStarted.progress.lesson, 0);
    assert.ok(notStarted.lessons.some(row => row.number === 8 && row.writing));
    assert.equal(resolveWorksheetCourse(progress({ confirmed: false }), [course]).progress, null);
    assert.equal(resolveWorksheetCourse(progress({}, 'missing-key'), [course]).progress, null);
});
