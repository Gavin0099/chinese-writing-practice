import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeBook, makeWord, previewBatch, readVocabulary, saveWord, updateVocabulary } from '../vocabularyData.mjs';
import { makeExam, questionPool } from '../examData.mjs';

const book = makeBook({ id: 'room-a', name: '二年三班', publisher: '康軒', year: 115, grade: 2, semester: 1, edition: '' });
const entry = fields => makeWord({ id: 'word-1', bookId: book.id, lesson: 1, word: '晴天',
    pronunciation: 'ㄑㄧㄥˊ ㄊㄧㄢ', blanks: [1], confirmed: true, ...fields });

test('word identity is scoped to class and lesson, with edit and batch duplicate protection', () => {
    const other = { ...book, id: 'room-b' };
    const data = { books: [book, other], words: [] };
    saveWord(data, entry());
    saveWord(data, entry({ id: 'word-2', lesson: 8 }));
    saveWord(data, entry({ id: 'word-3', bookId: other.id }));
    assert.throws(() => saveWord(data, entry({ id: 'duplicate' })), /已有這個詞語/);
    saveWord(data, entry({ word: '放晴', pronunciation: 'ㄈㄤˋ ㄑㄧㄥˊ', blanks: [2], confirmed: false }));
    const preview = previewBatch('放晴\n下雨\tㄒㄧㄚˋ ㄩˇ\t2\n下雨\n好嗎\n123', book.id, 1, data.words);
    assert.deepEqual(preview.map(row => Boolean(row.entry)), [false, true, false, true, false]);
    assert.deepEqual(preview[1].entry.blanks, [2]);
    assert.equal(preview[1].entry.confirmed, false);
    assert.deepEqual(preview[3].entry.pronunciation, []);
    assert.equal(data.words.length, 3);
});

test('confirmation requires one structurally valid contextual reading per Unicode character', () => {
    assert.throws(() => entry({ pronunciation: 'ㄑㄧㄥˊ' }), /每個國字/);
    assert.throws(() => entry({ pronunciation: '˙ ㄊㄧㄢ' }), /每個國字/);
    assert.throws(() => entry({ pronunciation: 'ㄑㄧㄥˊ ㄊㄧㄢ', blanks: [3] }), /挖空字/);
    assert.deepEqual(entry({ word: '好嗎', pronunciation: 'ㄏㄠˇ ㄇㄚ˙', blanks: [2] }).pronunciation, ['ㄏㄠˇ', '˙ㄇㄚ']);
    assert.deepEqual(entry({ word: '𠮷天', pronunciation: 'ㄐㄧˊ ㄊㄧㄢ', blanks: [2] }).blanks, [2]);
});

test('explicit first-tone marks from mobile input are omitted from saved readings', () => {
    const fields = { word: '紙風車', blanks: [1, 2, 3] };
    for (const mark of ['\u00af', '\u02c9', '\u0304', '\uffe3']) {
        const pronunciation = `ㄓˇ ㄈㄥ${mark} ㄔㄜ${mark}`;
        assert.deepEqual(entry({ ...fields, pronunciation }).pronunciation, ['ㄓˇ', 'ㄈㄥ', 'ㄔㄜ']);
        assert.deepEqual(previewBatch(`紙風車\t${pronunciation}`, book.id, 8, [])[0].entry.pronunciation,
            ['ㄓˇ', 'ㄈㄥ', 'ㄔㄜ']);
    }
    assert.throws(() => entry({ ...fields, pronunciation: 'ㄓˇˉ ㄈㄥ ㄔㄜ' }), /多打了其他符號/);
    assert.throws(() => entry({ ...fields, pronunciation: 'ㄓˇ ˉ ㄔㄜ' }), /多打了其他符號/);
});

test('book and exam storage survives reopen and does not write a failed mutation', () => {
    const values = new Map();
    const storage = { getItem: name => values.get(name) ?? null, setItem: (name, data) => values.set(name, data) };
    assert.deepEqual(readVocabulary(storage), { books: [], words: [], exams: [] });
    updateVocabulary(data => { data.books.push(book); saveWord(data, entry()); }, storage);
    assert.throws(() => updateVocabulary(data => {
        data.words.push(entry({ id: 'temporary' }));
        throw new Error('failed mutation');
    }, storage), /failed mutation/);
    assert.deepEqual(readVocabulary(storage).words.map(word => word.id), ['word-1']);
});

test('pool deduplicates identical prompts across lessons, records their sources, and excludes ambiguous or draft prompts', () => {
    const words = [entry(), entry({ id: 'word-2', lesson: 8 }), entry({ id: 'draft', word: '雨天',
        pronunciation: 'ㄩˇ ㄊㄧㄢ', confirmed: false }), entry({ id: 'other', bookId: 'room-b' }),
    entry({ id: 'is', word: '是', pronunciation: 'ㄕˋ' }), entry({ id: 'thing', word: '事', pronunciation: 'ㄕˋ' })];
    const { available, ambiguous } = questionPool(words, book.id, 1, 8);
    assert.equal(ambiguous, 1);
    assert.equal(available.length, 1);
    assert.deepEqual(available[0].sources, [{ id: 'word-1', lesson: 1 }, { id: 'word-2', lesson: 8 }]);
    assert.equal(questionPool(words, book.id, 8, 8).available[0].entry.id, 'word-2');
});

test('30 eligible prompts produce 15 unique snapshot questions with a repeatable order and exact blank positions', () => {
    const words = Array.from({ length: 30 }, (_, index) => entry({ id: `word-${index}`,
        word: `晴${String.fromCodePoint(0x4E00 + index)}`, lesson: index % 8 + 1 }));
    const options = { id: 'exam-1', createdAt: '2026-11-11T00:00:00Z', book, words, from: 1, to: 8, count: 15, seed: 'fixed-115' };
    const exam = makeExam(options);
    assert.equal(exam.questions.length, 15);
    assert.equal(new Set(exam.questions.map(question => question.word)).size, 15);
    assert.deepEqual(exam.questions, makeExam({ ...options, words: words.slice().reverse() }).questions);
    const reimported = words.map((word, index) => ({ ...word, id: `reimport-${30 - index}` }));
    assert.deepEqual(exam.questions.map(question => question.word), makeExam({ ...options, words: reimported }).questions.map(question => question.word));
    assert.notDeepEqual(exam.questions, makeExam({ ...options, seed: 'fixed-116' }).questions);
    const first = exam.questions[0];
    const firstSource = words.find(word => word.id === first.sources[0].id);
    assert.deepEqual(first.blanks, [1]);
    assert.equal(Array.from(first.word)[first.blanks[0] - 1], '晴');
    firstSource.blanks[0] = 2;
    firstSource.pronunciation[0] = 'ㄩˇ';
    assert.deepEqual(first.blanks, [1]);
    assert.equal(first.pronunciation[0], 'ㄑㄧㄥˊ');
    assert.throws(() => makeExam({ ...options, words: words.slice(0, 10) }), /只有 10 題/);
    assert.throws(() => makeExam({ ...options, from: 8, to: 1 }), /課次範圍/);
});
