// Produces an internal review import in the ignored local runtime directory.
// Applying this SQL and granting access are separate operator steps.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { courseKey } from '../characterLookup.mjs';
import { importCourses } from '../learningData.mjs';

const folder = new URL('../artifacts/runtime/curriculum-115/', import.meta.url);
const read = name => readFile(new URL(name, folder));
const parse = async name => JSON.parse(await read(name));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const [candidate, comparison, resolution, workbook, comparisonBytes] = await Promise.all([
    parse('candidate-115-1.json'), parse('comparison-115-1.json'), parse('resolution-115-1.json'),
    read('sinica-20260723.xlsx'), read('comparison-115-1.json')
]);
const sourceVersion = sha256(workbook);
assert.equal(candidate.source.sha256, sourceVersion);
assert.equal(comparison.workbook.sha256, sourceVersion);
assert.equal(resolution.workbook.sha256, sourceVersion);
assert.equal(resolution.comparison_sha256, sha256(comparisonBytes));
assert.equal(resolution.isolated_count, 8);

const courses = importCourses(candidate, [comparison]);
const expected = { 康軒: 64, 南一: 67, 翰林: 63 };
assert.equal(courses.length, 18);
assert(courses.every(course => course.academicYear === 115 && course.semester === 1 &&
    Object.hasOwn(expected, course.publisher)));
for (const [publisher, count] of Object.entries(expected)) {
    const editions = courses.filter(course => course.publisher === publisher);
    assert.deepEqual(editions.map(course => course.grade).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
    assert.equal(editions.reduce((total, course) => total + course.lessons.length, 0), count);
}
const rowKey = (year, publisher, grade, semester, lesson) => JSON.stringify([year, publisher, grade, semester, lesson]);
const matched = comparison.results.filter(row => row.status === 'match');
const imported = courses.flatMap(course => course.lessons.map(lesson =>
    rowKey(course.academicYear, course.publisher, course.grade, course.semester, lesson.number)));
assert.deepEqual(imported.sort(), matched.map(row =>
    rowKey(row.academic_year, row.publisher, row.grade, row.semester, row.lesson)).sort());

const quote = value => "'" + value.replaceAll("'", "''") + "'";
const batch = `115-1:${sourceVersion}`;
const rows = courses.map(course => {
    const narrowed = { ...course, versionLabel: '115 上・生字表（內部測試）',
        lessons: course.lessons.map(({ title, ...lesson }) => lesson) };
    return `(${quote(batch)}, ${quote(courseKey(narrowed))}, ${quote(JSON.stringify(narrowed))}::jsonb)`;
});
await writeFile(new URL('stage-115-1.sql', folder), `
begin;
insert into curriculum_internal.staged_courses (batch, course_key, course)
values
${rows.join(',\n')}
on conflict (batch, course_key) do update set course = excluded.course;
commit;
`);
console.log(JSON.stringify({ batch, editions: courses.length, matchedLessons: expected, isolated: resolution.isolated_count }));
