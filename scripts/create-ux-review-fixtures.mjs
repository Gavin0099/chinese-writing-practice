import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { validateBackup } from '../backupData.mjs';
import { courseKey } from '../characterLookup.mjs';
import { confirmCourse, importCourses, readProgress } from '../learningData.mjs';
import { makeBook, makeWord } from '../vocabularyData.mjs';

// Invented lesson groupings and ordinary example words for UX review.
const entries = [
    ['春雨', 'ㄔㄨㄣ ㄩˇ'], ['白雲', 'ㄅㄞˊ ㄩㄣˊ'], ['青草', 'ㄑㄧㄥ ㄘㄠˇ'],
    ['小鳥', 'ㄒㄧㄠˇ ㄋㄧㄠˇ'], ['風箏', 'ㄈㄥ ㄓㄥ'], ['天空', 'ㄊㄧㄢ ㄎㄨㄥ'],
    ['花朵', 'ㄏㄨㄚ ㄉㄨㄛˇ'], ['泥土', 'ㄋㄧˊ ㄊㄨˇ'], ['露珠', 'ㄌㄨˋ ㄓㄨ'],
    ['雨傘', 'ㄩˇ ㄙㄢˇ'], ['水滴', 'ㄕㄨㄟˇ ㄉㄧ'], ['樹葉', 'ㄕㄨˋ ㄧㄝˋ'],
    ['河流', 'ㄏㄜˊ ㄌㄧㄡˊ'], ['彩虹', 'ㄘㄞˇ ㄏㄨㄥˊ'], ['池塘', 'ㄔˊ ㄊㄤˊ'],
    ['山坡', 'ㄕㄢ ㄆㄛ'], ['石頭', 'ㄕˊ ㄊㄡ˙'], ['松鼠', 'ㄙㄨㄥ ㄕㄨˇ']
];
const identity = { academic_year: 115, publisher: '合成教材', grade: 1, semester: 1 };
const lessons = [[1, '春', '習寫'], [2, '傘', '認讀']].map(([number, character, type]) => ({
    number,
    characters: [{ character, kind: type === '習寫' ? 'writing' : 'recognition' }],
    pedia: { status: 'match', title: `合成第 ${number} 課`,
        url: `https://pedia.cloud.edu.tw/Bookmark/TCollection?TextNameId=9999999999${number}` }
}));
const source = { file: 'UX-review-synthetic', sha256: createHash('sha256').update(JSON.stringify(lessons)).digest('hex') };
const candidate = { schema_version: 1, status: 'candidate', source, editions: [{ ...identity, lessons }] };
const comparison = { workbook: source, results: lessons.map(lesson => ({
    ...identity, lesson: lesson.number, status: 'match', detail_url: lesson.pedia.url
})) };
const [course] = importCourses(candidate, [comparison]);
const book = makeBook({ id: 'ux-review-class', name: '示範班', publisher: identity.publisher,
    year: identity.academic_year, grade: identity.grade, semester: identity.semester, edition: '' });
const words = entries.map(([word, pronunciation], index) => makeWord({ id: `example-${index + 1}`,
    bookId: book.id, lesson: index < 9 ? 1 : 2, word, pronunciation, blanks: [1], confirmed: true }));
const now = new Date().toISOString();
const backup = validateBackup({ format: 'chinese-writing-practice-backup', version: 1, exportedAt: now,
    vocabulary: { books: [book], words, exams: [] },
    teachingProgress: confirmCourse(readProgress(null), course, 1),
    writingRecords: { 春: [{ status: 'missing_strokes', at: now }] } });

const output = new URL('../artifacts/runtime/ux-review/', import.meta.url);
await mkdir(output, { recursive: true });
for (const [name, value] of [['sample-backup.json', backup], ['sample-candidate.json', candidate],
    ['sample-comparison.json', comparison]]) {
    await writeFile(new URL(name, output), `${JSON.stringify(value, null, 2)}\n`);
}
const sqlLiteral = value => "'" + value.replaceAll("'", "''") + "'";
await writeFile(new URL('sample-catalog.sql', output), `-- Synthetic UX fixture for a separate review database.
insert into public.curriculum_catalog (course_key, course, approval_reference)
values (${sqlLiteral(courseKey(course))}, ${sqlLiteral(JSON.stringify(course))}::jsonb, 'Synthetic UX fixture')
on conflict (course_key) do nothing;
`);
console.log('Review fixtures written to artifacts/runtime/ux-review/.');
