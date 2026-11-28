import { localLocks } from './helpers/local-locks.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeBook, makeWord, previewBatch, readVocabulary, saveWord, updateVocabulary as updateLocalVocabulary } from '../vocabularyData.mjs';
import { makeExam, questionPool } from '../examData.mjs';
import { recentWrongTerms } from '../reviewData.mjs';
const updateVocabulary = (update, storage) => updateLocalVocabulary(update, storage, localLocks);

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

test('book and exam storage survives reopen and does not write a failed mutation', async () => {
    const values = new Map();
    const storage = { getItem: name => values.get(name) ?? null, setItem: (name, data) => values.set(name, data) };
    assert.deepEqual(readVocabulary(storage), { books: [], words: [], exams: [] });
    await updateVocabulary(data => { data.books.push(book); saveWord(data, entry()); }, storage);
    await assert.rejects(() => updateVocabulary(data => {
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

test('priority includes current mistakes across selected lessons once and fills the remaining seats from vocabulary', () => {
    const words = [
        entry(), entry({ id: 'sky-variant', lesson: 8, blanks: [2] }),
        entry({ id: 'rain', lesson: 7, word: '雨天', pronunciation: 'ㄩˇ ㄊㄧㄢ' }),
        entry({ id: 'cloud', lesson: 3, word: '白雲', pronunciation: 'ㄅㄞˊ ㄩㄣˊ' }),
        entry({ id: 'outside', lesson: 9, word: '陰天', pronunciation: 'ㄧㄣ ㄊㄧㄢ' }),
        entry({ id: 'draft', lesson: 6, word: '晴空', pronunciation: 'ㄑㄧㄥˊ ㄎㄨㄥ', confirmed: false })
    ];
    const attempt = (id, bookId, day, grades) => ({
        id, bookId, at: `2026-11-${day}T00:00:00Z`, items: grades.map(([word, wrong]) => ({ word, wrong }))
    });
    const history = [
        attempt('latest', book.id, 12, [['白雲', false], ['晴天', true], ['雨天', true]]),
        attempt('other', 'room-b', 13, [['白雲', true], ['晴天', false]]),
        attempt('prior', book.id, 11, [['白雲', true], ['陰天', true], ['晴空', true]])
    ];
    const priorityWords = recentWrongTerms(history, book.id);
    assert.deepEqual([...priorityWords].sort(), ['晴天', '晴空', '陰天', '雨天'].sort());
    const options = { id: 'priority', createdAt: '2026-11-12T00:00:00Z', book, words, from: 1, to: 8, seed: 'priority', priorityWords };
    const selected = makeExam({ ...options, count: 2 });
    assert.deepEqual(selected.questions.map(question => question.word).sort(), ['晴天', '雨天']);
    const filled = makeExam({ ...options, count: 3 });
    assert.deepEqual(filled.questions.map(question => question.word).sort(), ['晴天', '白雲', '雨天'].sort());
    assert.deepEqual(filled, makeExam({ ...options, count: 3, words: words.slice().reverse() }));
    assert.throws(() => makeExam({ ...options, count: 4 }), /只有 3 題/);
});

test('exam blank modes write only the snapshot and count Unicode characters correctly', () => {
    const words = [
        entry({ word: '𠮷天', pronunciation: 'ㄐㄧˊ ㄊㄧㄢ', blanks: [2] }),
        entry({ id: 'single', word: '晴', pronunciation: 'ㄑㄧㄥˊ' })
    ];
    const options = { id: 'layout', createdAt: '2026-11-19T00:00:00Z', book, words,
        from: 1, to: 1, count: 2, seed: 'fixed-masks' };
    const blanksByWord = exam => Object.fromEntries(exam.questions.map(question => [question.word, question.blanks]));
    const original = structuredClone(words);
    assert.deepEqual(blanksByWord(makeExam(options)), { '𠮷天': [2], '晴': [1] });
    assert.deepEqual(makeExam(options), makeExam({ ...options, blankMode: 'vocabulary' }));
    assert.deepEqual(blanksByWord(makeExam({ ...options, blankMode: 'all' })), { '𠮷天': [1, 2], '晴': [1] });
    const single = blanksByWord(makeExam({ ...options, blankMode: 'single' }));
    assert.deepEqual(single['晴'], [1]);
    assert.equal(single['𠮷天'].length, 1);
    assert.ok([1, 2].includes(single['𠮷天'][0]));
    assert.deepEqual(single, blanksByWord(makeExam({ ...options, blankMode: 'single', seed: 'new-order' })));
    assert.deepEqual(words, original);
    assert.throws(() => makeExam({ ...options, blankMode: 'invalid' }), /挖空方式/);
});

test('the default and explicit character exam keep the original snapshot shape', () => {
    const options = { id: 'legacy', createdAt: '2026-11-11T00:00:00Z', book, words: [entry()],
        from: 1, to: 1, count: 1, seed: 'legacy' };
    const expected = { id: 'legacy', createdAt: options.createdAt, book, from: 1, to: 1, count: 1, seed: 'legacy',
        questions: [{ word: '晴天', pronunciation: ['ㄑㄧㄥˊ', 'ㄊㄧㄢ'], blanks: [1], sources: [{ id: 'word-1', lesson: 1 }] }] };
    assert.deepEqual(makeExam(options), expected);
    assert.deepEqual(makeExam({ ...options, examType: 'character' }), expected);
});

test('zhuyin exams preserve all answer data and the chosen blank positions', () => {
    const words = [entry({ word: '𠮷天', pronunciation: 'ㄐㄧˊ ㄊㄧㄢ', blanks: [2] })];
    const options = { id: 'zhuyin', book, words, from: 1, to: 1, count: 1, seed: 'reading', examType: 'zhuyin' };
    const exam = makeExam(options);
    assert.equal(exam.examType, 'zhuyin');
    assert.deepEqual(exam.questions, [
        { word: '𠮷天', pronunciation: ['ㄐㄧˊ', 'ㄊㄧㄢ'], blanks: [2], sources: [{ id: 'word-1', lesson: 1 }] }
    ]);
    assert.deepEqual(makeExam({ ...options, blankMode: 'all' }).questions[0].blanks, [1, 2]);
});

test('mixed exams assign repeatable targets without changing the seeded question draw', () => {
    const words = [entry(), entry({ id: 'rain', word: '下雨', pronunciation: 'ㄒㄧㄚˋ ㄩˇ', blanks: [2] }),
        entry({ id: 'cloud', word: '白雲', pronunciation: 'ㄅㄞˊ ㄩㄣˊ' })];
    const options = { id: 'mixed', book, words, from: 1, to: 1, count: 3, seed: 'mixed-0' };
    const exam = makeExam({ ...options, examType: 'mixed' });
    assert.equal(exam.examType, 'mixed');
    assert.deepEqual(exam, makeExam({ ...options, words: words.toReversed(), examType: 'mixed' }));
    assert.deepEqual(exam.questions.map(({ target, ...question }) => question), makeExam(options).questions);
    assert.deepEqual(new Set(exam.questions.map(question => question.target)), new Set(['character', 'zhuyin']));

    const firstTargets = new Set();
    const singleTargets = new Set();
    for (let index = 0; index < 32; index++) {
        const settings = { ...options, seed: `mixed-${index}`, examType: 'mixed' };
        const pair = makeExam({ ...settings, count: 2 }).questions.map(question => question.target);
        assert.deepEqual(new Set(pair), new Set(['character', 'zhuyin']));
        firstTargets.add(pair[0]);
        singleTargets.add(makeExam({ ...settings, count: 1 }).questions[0].target);
    }
    assert.deepEqual(firstTargets, new Set(['character', 'zhuyin']));
    assert.deepEqual(singleTargets, new Set(['character', 'zhuyin']));
});

test('the single-blank mode leaves one target slot per word in a mixed exam', () => {
    const words = [entry({ blanks: [1, 2] }),
        entry({ id: 'rain', word: '下雨', pronunciation: 'ㄒㄧㄚˋ ㄩˇ', blanks: [1, 2] })];
    const exam = makeExam({ id: 'mixed-single', book, words, from: 1, to: 1, count: 2,
        seed: 'mixed-single', examType: 'mixed', blankMode: 'single' });
    assert.deepEqual(new Set(exam.questions.map(question => question.target)), new Set(['character', 'zhuyin']));
    for (const question of exam.questions) {
        assert.equal(question.blanks.length, 1);
        assert.ok([1, 2].includes(question.blanks[0]));
    }
});

test('exam generation rejects invalid exam type values in Traditional Chinese', () => {
    const options = { id: 'invalid', book, words: [entry()], from: 1, to: 1, count: 1, seed: 'invalid' };
    for (const examType of ['other', '', null, ['zhuyin'], 'constructor']) {
        assert.throws(() => makeExam({ ...options, examType }), /請選擇有效的測驗類型/);
    }
});

test('the selected mask controls prompt ambiguity and deduplication before drawing', () => {
    const words = [
        entry({ id: 'authority', word: '權力', pronunciation: 'ㄑㄩㄢˊ ㄌㄧˋ', blanks: [2] }),
        entry({ id: 'effort', word: '全力', pronunciation: 'ㄑㄩㄢˊ ㄌㄧˋ', blanks: [2] })
    ];
    assert.equal(questionPool(words, book.id, 1, 1).available.length, 2);
    assert.deepEqual(questionPool(words, book.id, 1, 1, false, 'all'), { available: [], ambiguous: 1 });
    assert.throws(() => makeExam({ id: 'ambiguous', book, words, from: 1, to: 1, count: 1,
        seed: 'ambiguous-masks', blankMode: 'all' }), /只有 0 題/);

    const duplicates = [entry(), entry({ id: 'same-term', lesson: 2, blanks: [2] })];
    assert.equal(questionPool(duplicates, book.id, 1, 2).available.length, 2);
    for (const mode of ['all', 'single']) {
        const { available } = questionPool(duplicates, book.id, 1, 2, false, mode);
        assert.equal(available.length, 1);
        assert.deepEqual(available[0].sources.map(source => source.lesson), [1, 2]);
    }
});

test('lesson mode selects from each source lesson, covers different characters and skips missing material', () => {
    const words = [
        entry({ id: 'spring-wind', word: '春風', lesson: 7, pronunciation: 'ㄔㄨㄣ ㄈㄥ' }),
        entry({ id: 'strong-wind', word: '大風', lesson: 7, pronunciation: 'ㄉㄚˋ ㄈㄥ' }),
        entry({ id: 'spring-rain', word: '春雨', lesson: 8, pronunciation: 'ㄔㄨㄣ ㄩˇ' }),
        entry({ id: 'wrong-lesson', word: '清風', lesson: 8, pronunciation: 'ㄑㄧㄥ ㄈㄥ' }),
        entry({ id: 'unknown-material', word: '雨天', lesson: 9, pronunciation: 'ㄩˇ ㄊㄧㄢ' })
    ];
    const lessonCharacters = new Map([[7, new Set('春風')], [8, new Set('雨')]]);
    const original = structuredClone(words);
    const options = { id: 'lesson-exam', createdAt: '2026-11-19T00:00:00Z', book, words, from: 7, to: 9,
        count: 3, blankMode: 'lesson', lessonCharacters };
    const pool = questionPool(words, book.id, 7, 9, false, 'lesson', lessonCharacters);
    assert.equal(pool.available.length, 3);
    assert.deepEqual(pool.missingLessons, [9]);
    assert.equal(pool.noMatchingCharacter, 1);
    for (const seed of ['lesson-a', 'lesson-b', 'lesson-c']) {
        const exam = makeExam({ ...options, seed });
        const maskByTerm = Object.fromEntries(exam.questions.map(question => [question.word, question.blanks]));
        assert.deepEqual(maskByTerm, { 春風: [1], 大風: [2], 春雨: [2] });
        assert.deepEqual(exam, makeExam({ ...options, seed, words: words.slice().reverse() }));
    }
    const wrongFirst = makeExam({ ...options, seed: 'wrong-first', count: 2, priorityWords: new Set(['大風']) });
    assert.ok(wrongFirst.questions.some(question => question.word === '大風'));
    assert.equal(new Set(wrongFirst.questions.map(({ word, blanks }) => [...word][blanks[0] - 1])).size, 2);
    assert.deepEqual(words, original);
    assert.throws(() => makeExam({ ...options, seed: 'missing', from: 9, to: 9, count: 1 }), /只有 0 題/);
    assert.throws(() => makeExam({ ...options, seed: 'too-many', count: 4 }), /只有 3 題/);
});

test('lesson mode keeps viable alternate prompts and attributes them to the matching source', () => {
    const words = [
        entry({ id: 'power-7', word: '權力', lesson: 7, pronunciation: 'ㄑㄩㄢˊ ㄌㄧˋ' }),
        entry({ id: 'effort-7', word: '全力', lesson: 7, pronunciation: 'ㄑㄩㄢˊ ㄌㄧˋ' }),
        entry({ id: 'power-8', word: '權力', lesson: 8, pronunciation: 'ㄑㄩㄢˊ ㄌㄧˋ' })
    ];
    const lessonCharacters = new Map([[7, new Set('權全力')], [8, new Set('權')]]);
    const pool = questionPool(words, book.id, 7, 8, false, 'lesson', lessonCharacters);
    assert.equal(pool.ambiguous, 1);
    assert.equal(pool.available.length, 2);
    for (const group of pool.available) {
        assert.equal(group.variants.length, 1);
        assert.deepEqual(group.variants[0].entry.blanks, [2]);
        assert.deepEqual(group.variants[0].sources.map(source => source.lesson), [7]);
    }
    const exam = makeExam({ id: 'single-lesson', book, words, from: 8, to: 8, count: 1, seed: 'one',
        blankMode: 'lesson', lessonCharacters });
    assert.deepEqual(exam.questions[0].blanks, [1]);
    assert.deepEqual(exam.questions[0].sources, [{ id: 'power-8', lesson: 8 }]);
});

test('lesson-preferred uses each term’s lesson and gives the remaining terms a single blank', () => {
    const words = [
        entry({ id: 'wind-7', word: '春風', lesson: 7, pronunciation: 'ㄔㄨㄣ ㄈㄥ', blanks: [2] }),
        entry({ id: 'wind-8', word: '大風', lesson: 8, pronunciation: 'ㄉㄚˋ ㄈㄥ', blanks: [1, 2] }),
        entry({ id: 'sky-8', lesson: 8, blanks: [1, 2] }),
        entry({ id: 'rain-9', word: '雨天', lesson: 9, pronunciation: 'ㄩˇ ㄊㄧㄢ', blanks: [1, 2] }),
        entry({ id: 'draft', word: '清風', lesson: 7, pronunciation: 'ㄑㄧㄥ ㄈㄥ', confirmed: false })
    ];
    const lessonCharacters = new Map([[7, new Set('春大')], [8, new Set('風')]]);
    const original = structuredClone(words);
    const options = { id: 'preferred-exam', book, words, from: 7, to: 9, count: 4, seed: 'mixed-lessons',
        blankMode: 'lesson-preferred', lessonCharacters };
    const pool = questionPool(words, book.id, 7, 9, false, 'lesson-preferred', lessonCharacters);
    assert.equal(pool.available.length, 4);
    assert.deepEqual(pool.missingLessons, [9]);
    assert.equal(pool.noMatchingCharacter, 1);
    const exam = makeExam(options);
    const masks = Object.fromEntries(exam.questions.map(({ word, blanks }) => [word, blanks]));
    assert.deepEqual(Object.keys(masks).sort(), ['大風', '春風', '晴天', '雨天'].sort());
    assert.deepEqual(masks.春風, [1]);
    assert.deepEqual(masks.大風, [2]);
    for (const word of ['晴天', '雨天']) {
        assert.equal(masks[word].length, 1);
        assert.ok([1, 2].includes(masks[word][0]));
    }
    assert.deepEqual(exam, makeExam({ ...options, words: words.toReversed() }));
    const priority = makeExam({ ...options, count: 1, priorityWords: new Set(['晴天']) });
    assert.equal(priority.questions[0].word, '晴天');
    assert.deepEqual(words, original);
    assert.throws(() => makeExam({ ...options, count: 5 }), /只有 4 題可抽。請減少題數/);
});

test('lesson-preferred still rejects a prompt with two possible answers', () => {
    const words = [
        entry({ id: 'merit', word: '功', lesson: 7, pronunciation: 'ㄍㄨㄥ' }),
        entry({ id: 'work', word: '工', lesson: 7, pronunciation: 'ㄍㄨㄥ' })
    ];
    const lessonCharacters = new Map([[7, new Set('功')]]);
    const pool = questionPool(words, book.id, 7, 7, false, 'lesson-preferred', lessonCharacters);
    assert.equal(pool.available.length, 0);
    assert.equal(pool.ambiguous, 1);
});
