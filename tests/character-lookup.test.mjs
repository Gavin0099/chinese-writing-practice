import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lookupCharacters } from '../characterLookup.mjs';

const edition = { academicYear: 115, publisher: '測試版', grade: 2, semester: 1, sourceVersion: 'test-115-A' };
const source = 'synthetic-fixture';
const lessons = [
    { number: 1, title: '測試一', status: 'verified', source, characters: [{ character: '晴', kind: 'recognition' }] },
    { number: 2, title: '測試二', status: 'verified', source, characters: [
        { character: '晴', kind: 'writing' }, { character: '勇', kind: 'writing' }, { character: '𠮷', kind: 'writing' }
    ] }
];
const course = { ...edition, expectedLessons: [1, 2], coverageComplete: true, lessons };
const confirmed = { ...edition, lesson: 1, confirmed: true };
const options = { curricula: [course], progress: [confirmed], historyComplete: true };
const statuses = results => results.map(({ teachingStatus }) => teachingStatus);

test('groups repeated Han characters and keeps positions, source, and separate writing status', () => {
    const [sunny, brave, rare, absent] = lookupCharacters('晴🙂勇晴𠮷ㄩ貓', {
        ...options, writingStatuses: { 晴: 'uses_zhuyin', 勇: 'can_write', 貓: 'invalid' }
    });
    assert.deepEqual([sunny.char, brave.char, rare.char, absent.char], ['晴', '勇', '𠮷', '貓']);
    assert.deepEqual([sunny.positions, brave.positions, rare.positions, absent.positions], [[0, 4], [3], [5], [8]]);
    assert.deepEqual(sunny.curriculum.firstOccurrence, { ...edition, lesson: 1, title: '測試一', type: 'recognition', source });
    assert.deepEqual(sunny.curriculum.occurrences.map(entry => entry.type), ['recognition', 'writing']);
    assert.equal(sunny.curriculum.type, 'recognition');
    assert.equal(sunny.curriculum.sourceVersion, edition.sourceVersion);
    assert.deepEqual(absent.curriculum, { firstOccurrence: null, occurrences: [], type: 'unknown', sourceVersion: null });
    assert.deepEqual(statuses([sunny, brave, rare, absent]), ['taught', 'not_yet_taught', 'not_yet_taught', 'not_yet_taught']);
    assert.deepEqual([sunny.writingStatus, brave.writingStatus, rare.writingStatus, absent.writingStatus],
        ['uses_zhuyin', 'can_write', 'not_assessed', 'not_assessed']);
    assert.deepEqual(lookupCharacters('🙂ㄩㄥˇ 123'), []);
});

test('requires confirmed progress in the exact curriculum edition', () => {
    for (const progress of [[], [{ lastLesson: 8 }], [{ ...confirmed, confirmed: false }],
        [{ ...confirmed, sourceVersion: 'test-113-A' }], [{ ...confirmed, publisher: '其他版' }],
        [{ ...confirmed, lesson: 9 }], [confirmed, { ...confirmed, lesson: 2 }]]) {
        assert.deepEqual(statuses(lookupCharacters('晴勇', { ...options, progress })),
            ['insufficient_data', 'insufficient_data']);
    }
    assert.deepEqual(statuses(lookupCharacters('晴勇', { ...options, progress: [{ ...confirmed, lesson: 0 }] })),
        ['not_yet_taught', 'not_yet_taught']);
    assert.deepEqual(statuses(lookupCharacters('晴勇', { ...options, historyComplete: false })),
        ['taught', 'insufficient_data']);
});

test('isolates missing, unresolved, duplicate, or malformed lessons', () => {
    for (const later of [[], [{ ...lessons[1], status: 'isolated_unresolved' }], [lessons[1], lessons[1]],
        [{ ...lessons[1], characters: [{ character: '勇', kind: 'unknown' }] }]]) {
        const curricula = [{ ...course, lessons: [lessons[0], ...later] }];
        const [sunny, brave] = lookupCharacters('晴勇', { ...options, curricula });
        assert.equal(sunny.teachingStatus, 'taught');
        assert.equal(brave.curriculum.firstOccurrence, null);
        assert.equal(brave.teachingStatus, 'insufficient_data');
    }
    const curricula = [{ ...course, coverageComplete: false }];
    assert.deepEqual(statuses(lookupCharacters('晴勇', { ...options, curricula })), ['taught', 'insufficient_data']);
});

test('orders earlier terms and requires a continuous, unambiguous history for negative results', () => {
    const prior = { ...edition, academicYear: 114, grade: 1, semester: 2, sourceVersion: 'test-114-B' };
    const previous = { ...prior, expectedLessons: [1], lessons: [lessons[0]], coverageComplete: true };
    const previousProgress = { ...prior, lesson: 1, confirmed: true };
    const result = lookupCharacters('晴勇', {
        ...options, curricula: [course, previous], progress: [confirmed, previousProgress]
    });
    assert.equal(result[0].curriculum.firstOccurrence.academicYear, 114);
    assert.deepEqual(statuses(result), ['taught', 'not_yet_taught']);
    const earlier = { ...previous, semester: 1 };
    assert.deepEqual(statuses(lookupCharacters('晴勇', {
        ...options, curricula: [course, earlier], progress: [confirmed, { ...previousProgress, semester: 1 }]
    })), ['taught', 'insufficient_data']);
    assert.deepEqual(statuses(lookupCharacters('晴勇', {
        ...options, curricula: [course, { ...course, sourceVersion: 'alternate' }]
    })), ['insufficient_data', 'insufficient_data']);
});
