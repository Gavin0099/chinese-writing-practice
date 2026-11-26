import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeExam } from '../examData.mjs';
import { defaultChildId, gradeExam, lookupWordReviews, makeReviewExam, pendingWords, readActiveChild,
    readAttempts, readChildren, recentWrongTerms, recordPaperWord, saveActiveChild, saveAttempt, saveChild } from '../reviewData.mjs';
import { makeBook, makeWord } from '../vocabularyData.mjs';

const book = makeBook({ id: 'class', name: '驗收班', publisher: '康軒', year: 115, grade: 2, semester: 1, edition: '' });
const word = (id, lesson, text, pronunciation) => makeWord({ id, bookId: book.id, lesson, word: text, pronunciation, blanks: [1], confirmed: true });
const sky = word('sky', 1, '天空', 'ㄊㄧㄢ ㄎㄨㄥ');
const weather = word('weather', 2, '天氣', 'ㄊㄧㄢ ㄑㄧˋ');
const mountain = word('mountain', 3, '山路', 'ㄕㄢ ㄌㄨˋ');
const mark = (id, day) => ({ id, at: `2026-11-${day}T01:00:00.000Z` });
const oldExam = makeExam({ id: 'saved-exam', createdAt: mark('a', 10).at, book, words: [sky, weather], from: 1, to: 2, count: 2, seed: 'original' });

test('grading stores separate attempts and distinguishes the same character in different words', () => {
    const skyNumber = oldExam.questions.findIndex(question => question.word === '天空') + 1;
    const first = gradeExam(oldExam, [skyNumber], mark('first', 11));
    assert.deepEqual(pendingWords([first], book.id).map(item => item.word), ['天空']);
    const second = gradeExam(oldExam, [], mark('second', 12));
    assert.deepEqual(pendingWords([first, second], book.id), []);
    assert.equal(first.items.find(item => item.word === '天空').wrong, true);
    assert.throws(() => gradeExam(oldExam, [3], mark('third', 12)), /有效題號/);
});

test('grading saved zhuyin and mixed exams keeps the existing wrong-word record by question number', () => {
    const { id, createdAt, from, to, count, seed } = oldExam;
    const options = { id, createdAt, book, words: [sky, weather], from, to, count, seed };
    const grade = mark('same-grade', 11);
    const expected = gradeExam(oldExam, [2], grade);
    for (const examType of ['zhuyin', 'mixed']) {
        const exam = makeExam({ ...options, examType });
        assert.deepEqual(gradeExam(exam, [2], grade), expected);
    }
});

test('paper mistakes can be mixed with new lesson questions without repeating the same prompt', () => {
    const attempt = recordPaperWord(sky, mark('paper', 12));
    const opts = { id: 'retake', createdAt: mark('a', 12).at, seed: 'repeatable', book, attempts: [attempt],
        words: [sky, weather, mountain], from: 3, to: 3, wrongCount: 1, newCount: 1 };
    const exam = makeReviewExam(opts);
    assert.deepEqual(exam.questions.map(item => item.word).sort(), ['天空', '山路']);
    assert.deepEqual(makeReviewExam(opts), exam);
    assert.deepEqual(makeReviewExam({ ...opts, newCount: 0 }).questions.map(item => item.word), ['天空']);
    assert.throws(() => makeReviewExam({ ...opts, wrongCount: 2 }), /只有 1 題/);
});

test('attempts are isolated by owner and saving the same attempt cannot overwrite it', () => {
    const values = new Map();
    const storage = { get length() { return values.size; }, key: index => [...values.keys()][index],
        getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const first = recordPaperWord(sky, mark('one', 11));
    const second = recordPaperWord(weather, mark('two', 12));
    saveAttempt(storage, 'owner-a', second);
    saveAttempt(storage, 'owner-a', first);
    saveAttempt(storage, 'owner-b', second);
    assert.deepEqual(readAttempts(storage, 'owner-a'), [first, second]);
    assert.deepEqual(readAttempts(storage, 'owner-b'), [second]);
    assert.throws(() => saveAttempt(storage, 'owner-a', first), /已記錄/);
});

test('lookup reports past and recent grading separately for different words containing the same character', () => {
    const skyNumber = oldExam.questions.findIndex(question => question.word === '天空') + 1;
    const first = gradeExam(oldExam, [skyNumber], mark('first', 10));
    const second = gradeExam(oldExam, [], mark('second', 11));
    const sunny = word('sunny', 3, '晴天', 'ㄑㄧㄥˊ ㄊㄧㄢ');
    const hits = lookupWordReviews(['天', '空', '氣', '山'], [sunny, mountain, sky], [second, first]);
    const rows = char => hits.get(char).map(({ word, everWrong, lastWrong }) => [word, everWrong, lastWrong]);
    assert.deepEqual(rows('天'), [['天空', true, false], ['天氣', false, false], ['晴天', false, null]]);
    assert.deepEqual(rows('空'), [['天空', true, false]]);
    assert.deepEqual(rows('氣'), [['天氣', false, false]]);
    assert.deepEqual(rows('山'), [['山路', false, null]]);
});

test('lookup counts a word with any wrong question on the most recent attempt as wrong', () => {
    const otherBlank = makeWord({ ...sky, id: 'other-blank', pronunciation: 'ㄊㄧㄢ ㄎㄨㄥ', blanks: [2] });
    const repeated = makeExam({ id: 'two-blanks', createdAt: mark('a', 12).at, book, words: [sky, otherBlank],
        from: 1, to: 1, count: 2, seed: 'two-questions' });
    const attempt = gradeExam(repeated, [1], mark('graded', 12));
    const rows = lookupWordReviews('天', [], [attempt]).get('天');
    assert.deepEqual(rows.map(({ word, everWrong, lastWrong }) => [word, everWrong, lastWrong]), [['天空', true, true]]);
});

test('lookup keeps empty results and ignores invalid vocabulary entries without losing valid recorded words', () => {
    const repeatedChar = word('daily', 1, '天天', 'ㄊㄧㄢ ㄊㄧㄢ');
    const attempt = recordPaperWord(repeatedChar, mark('daily-paper', 12));
    const hits = lookupWordReviews(['天', '無'], [null, {}, { word: 1 }, repeatedChar], [attempt]);
    assert.deepEqual(hits.get('天').map(entry => entry.word), ['天天']);
    assert.deepEqual(hits.get('無'), []);
    assert.equal(lookupWordReviews('', [repeatedChar], [attempt]).size, 0);
});

test('recent and historical exams distinguish recovered words, correct-only words and ungraded words', () => {
    const skyNumber = oldExam.questions.findIndex(question => question.word === '天空') + 1;
    const first = gradeExam(oldExam, [skyNumber], mark('first', 10));
    const corrected = gradeExam(oldExam, [], mark('corrected', 11));
    const error = recordPaperWord(mountain, mark('mountain', 12));
    const fresh = word('fresh', 4, '春天', 'ㄔㄨㄣ ㄊㄧㄢ');
    const opts = { id: 'retake', createdAt: mark('a', 13).at, seed: 'same-seed', book,
        attempts: [error, corrected, first], words: [sky, weather, mountain, fresh] };
    const terms = exam => exam.questions.map(question => question.word).sort();

    assert.deepEqual(terms(makeReviewExam({ ...opts, mode: 'recent', size: '15' })), ['山路']);
    assert.deepEqual(terms(makeReviewExam({ ...opts, mode: 'history', size: 1 })), ['山路']);
    assert.deepEqual(terms(makeReviewExam({ ...opts, mode: 'history' })), ['天空', '山路']);
    assert.deepEqual(terms(makeReviewExam({ ...opts, mode: 'mixed', wrongCount: 1, newCount: 1, from: 4, to: 4 })),
        ['山路', '春天']);
    assert.throws(() => makeReviewExam({ ...opts, mode: 'recent', attempts: [first, corrected] }), /沒有可出卷/);
    assert.throws(() => makeReviewExam({ ...opts, mode: 'history', size: 'invalid' }), /有效的抽題數量/);
    assert.throws(() => makeReviewExam({ ...opts, mode: 'mixed', wrongCount: 1, newCount: 1, from: 4, to: 3 }), /有效的課次/);
});

test('retake uses one question per word, keeps the wrong snapshot and leaves other classes out', () => {
    const skyLast = makeWord({ ...sky, id: 'second-blank', pronunciation: 'ㄊㄧㄢ ㄎㄨㄥ', blanks: [2] });
    const other = makeWord({ ...weather, id: 'other-class', bookId: 'other', pronunciation: 'ㄊㄧㄢ ㄑㄧˋ' });
    const attempts = [
        recordPaperWord(sky, mark('old-sky', 10)),
        recordPaperWord(skyLast, mark('recent-sky', 11)),
        recordPaperWord(other, mark('other-class', 11)),
        recordPaperWord(mountain, mark('mountain', 12)),
        recordPaperWord(word('peace', 4, '早安', 'ㄗㄠˇ ㄢ'), mark('peace', 12))
    ];
    const args = { id: 'retake', createdAt: mark('a', 13).at, seed: 'repeatable', book,
        attempts, words: [sky, weather, mountain], mode: 'recent', size: '15' };
    const exam = makeReviewExam(args);
    assert.equal(exam.count, 3);
    assert.deepEqual(exam.questions.map(question => question.word).sort(), ['天空', '山路', '早安']);
    const skyQuestion = exam.questions.find(question => question.word === '天空');
    assert.deepEqual(skyQuestion.blanks, [2]);
    assert.deepEqual(skyQuestion.pronunciation, ['ㄊㄧㄢ', 'ㄎㄨㄥ']);
    assert.deepEqual(makeReviewExam(args), exam);
});

test('retake leaves out different answers that would produce the same printed prompt', () => {
    const clear = word('clear', 3, '晴天', 'ㄑㄧㄥˊ ㄊㄧㄢ');
    const fond = word('fond', 3, '情天', 'ㄑㄧㄥˊ ㄊㄧㄢ');
    const attempts = [recordPaperWord(clear, mark('clear', 11)), recordPaperWord(fond, mark('fond', 12)),
        recordPaperWord(mountain, mark('mountain', 12))];
    const exam = makeReviewExam({ id: 'retake', createdAt: mark('a', 13).at, seed: 'repeatable', book,
        attempts, words: [], mode: 'recent' });
    assert.deepEqual(exam.questions.map(question => question.word), ['山路']);
});

test('two children sharing one class book keep isolated wrong-word priority and review exams', () => {
    const legacyDefault = recordPaperWord(sky, mark('legacy', 10));
    const childA = recordPaperWord(weather, { ...mark('child-a-1', 11), childId: 'child-a' });
    const childB = recordPaperWord(mountain, { ...mark('child-b-1', 12), childId: 'child-b' });
    const allAttempts = [legacyDefault, childA, childB];

    // Legacy attempts without childId belong to defaultChildId only.
    assert.deepEqual([...recentWrongTerms(allAttempts, book.id, defaultChildId)], ['天空']);
    assert.deepEqual([...recentWrongTerms(allAttempts, book.id, 'child-a')], ['天氣']);
    assert.deepEqual([...recentWrongTerms(allAttempts, book.id, 'child-b')], ['山路']);

    assert.deepEqual(pendingWords(allAttempts, book.id, 'child-a').map(w => w.word), ['天氣']);
    assert.deepEqual(pendingWords(allAttempts, book.id, 'child-b').map(w => w.word), ['山路']);

    const examA = makeReviewExam({
        id: 'exam-a', createdAt: mark('a', 13).at, seed: 'same-seed', book,
        attempts: allAttempts, words: [sky, weather, mountain], mode: 'recent', childId: 'child-a'
    });
    const examB = makeReviewExam({
        id: 'exam-b', createdAt: mark('b', 13).at, seed: 'same-seed', book,
        attempts: allAttempts, words: [sky, weather, mountain], mode: 'recent', childId: 'child-b'
    });
    assert.deepEqual(examA.questions.map(q => q.word), ['天氣']);
    assert.deepEqual(examB.questions.map(q => q.word), ['山路']);

    // Lookup also isolates per child when childId is provided.
    const hitsA = lookupWordReviews(['天', '山'], [sky, weather, mountain], allAttempts, 'child-a');
    assert.equal(hitsA.get('天').find(r => r.word === '天氣').lastWrong, true);
    assert.equal(hitsA.get('天').find(r => r.word === '天空').lastWrong, null);
    assert.equal(hitsA.get('山').find(r => r.word === '山路').lastWrong, null);
});

test('child profile storage persists per owner, rejects invalid names, and discovers synced childIds', () => {
    const values = new Map();
    const storage = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value)
    };
    assert.deepEqual(readChildren(storage, 'owner-a'), [{ id: defaultChildId, name: '預設孩子' }]);
    assert.equal(readActiveChild(storage, 'owner-a'), defaultChildId);

    const added = saveChild(storage, 'owner-a', { id: 'child-a', name: '哥哥' });
    assert.deepEqual(added, { id: 'child-a', name: '哥哥' });
    saveActiveChild(storage, 'owner-a', 'child-a');
    assert.equal(readActiveChild(storage, 'owner-a'), 'child-a');
    assert.throws(() => saveChild(storage, 'owner-a', { id: 'child-b', name: '   ' }), /名稱/);
    assert.throws(() => saveChild(storage, 'owner-a', { id: 'bad id!', name: '妹妹' }), /識別/);

    // Discovers a childId present in synced attempts even if not yet named locally.
    const syncedAttempt = recordPaperWord(mountain, { ...mark('sync-1', 14), childId: 'child-remote' });
    const list = readChildren(storage, 'owner-a', [syncedAttempt]);
    assert.deepEqual(list.map(c => c.id), [defaultChildId, 'child-a', 'child-remote']);
});
