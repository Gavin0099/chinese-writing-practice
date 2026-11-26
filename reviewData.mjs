import { makeExam, questionKey, questionPool } from './examData.mjs';
import { makeWord } from './vocabularyData.mjs';

export const defaultChildId = 'default';
const childIdPattern = /^[\w-]{1,64}$/;

export function normalizeChildId(childId) {
    if (childId == null || childId === '' || childId === defaultChildId) return defaultChildId;
    if (typeof childId !== 'string' || !childIdPattern.test(childId)) {
        throw new Error('孩子的識別資料有誤。');
    }
    return childId;
}

export function validateAttempt(attempt) {
    if (typeof attempt?.id !== 'string' || !/^[\w-]+$/.test(attempt.id) ||
        typeof attempt.bookId !== 'string' || !attempt.bookId || !Number.isFinite(Date.parse(attempt.at)) ||
        !['exam', 'paper'].includes(attempt.source) ||
        (attempt.source === 'exam' && (typeof attempt.examId !== 'string' || !attempt.examId)) ||
        !Array.isArray(attempt.items) || !attempt.items.length || attempt.items.length > 60) {
        throw new Error('這筆錯題紀錄的資料不完整。');
    }
    const normalizedChild = attempt.childId === undefined ? defaultChildId : normalizeChildId(attempt.childId);
    const items = attempt.items.map(item => {
        if (typeof item?.wrong !== 'boolean' || !Array.isArray(item.pronunciation) || !Array.isArray(item.blanks)) {
            throw new Error('這筆作答紀錄的題目資料不完整。');
        }
        const word = makeWord({ ...item, bookId: attempt.bookId, pronunciation: item.pronunciation.join(' '), confirmed: true });
        return { lesson: word.lesson, word: word.word, pronunciation: word.pronunciation, blanks: word.blanks, wrong: item.wrong };
    });
    const record = { id: attempt.id, bookId: attempt.bookId, at: attempt.at, source: attempt.source,
        examId: attempt.source === 'exam' ? attempt.examId : null, items };
    if (normalizedChild !== defaultChildId) record.childId = normalizedChild;
    return record;
}

export function gradeExam(exam, wrongNumbers, { id, at, childId }) {
    if (!Array.isArray(exam?.questions) || !Array.isArray(wrongNumbers) || wrongNumbers.some(number =>
        !Number.isInteger(number) || number < 1 || number > exam.questions.length)) {
        throw new Error('請選擇已儲存的考卷和有效題號。');
    }
    const wrong = new Set(wrongNumbers);
    return validateAttempt({ id, at, childId, bookId: exam.book.id, source: 'exam', examId: exam.id,
        items: exam.questions.map((question, index) => ({ ...question, lesson: question.sources[0]?.lesson, wrong: wrong.has(index + 1) })) });
}

export function recordPaperWord(word, { id, at, childId }) {
    return validateAttempt({ id, at, childId, bookId: word.bookId, source: 'paper', items: [{ ...word, wrong: true }] });
}

const reviewPrefix = owner => `write_practice_review_v1:${encodeURIComponent(owner)}:`;
const childrenKey = owner => `write_practice_children_v1:${encodeURIComponent(owner)}`;
const activeChildKey = owner => `write_practice_active_child_v1:${encodeURIComponent(owner)}`;
export const compareAttempts = (a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id);

export function readChildren(storage, owner, attempts = []) {
    const byId = new Map([[defaultChildId, { id: defaultChildId, name: '預設孩子' }]]);
    try {
        const raw = storage?.getItem?.(childrenKey(owner));
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                for (const entry of parsed) {
                    if (typeof entry?.id === 'string' && childIdPattern.test(entry.id) &&
                        typeof entry?.name === 'string' && entry.name.trim()) {
                        byId.set(entry.id, { id: entry.id, name: entry.name.trim().slice(0, 20) });
                    }
                }
            }
        }
    } catch {
        // Malformed local profile list falls back to default child without losing attempts.
    }
    for (const attempt of attempts) {
        const cid = normalizeChildId(attempt?.childId);
        if (!byId.has(cid)) {
            byId.set(cid, { id: cid, name: `孩子 ${cid.slice(0, 8)}` });
        }
    }
    return [...byId.values()];
}

export function saveChild(storage, owner, { id, name }) {
    const normalizedId = normalizeChildId(id);
    if (normalizedId === defaultChildId) throw new Error('不能覆寫預設孩子識別碼。');
    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!cleanName || cleanName.length > 20) throw new Error('請輸入 1 至 20 字的孩子名稱。');
    const existing = readChildren(storage, owner).filter(entry => entry.id !== defaultChildId);
    const updated = [...existing.filter(entry => entry.id !== normalizedId), { id: normalizedId, name: cleanName }];
    storage.setItem(childrenKey(owner), JSON.stringify(updated));
    return { id: normalizedId, name: cleanName };
}

export function readActiveChild(storage, owner) {
    try {
        const saved = storage?.getItem?.(activeChildKey(owner));
        return saved ? normalizeChildId(saved) : defaultChildId;
    } catch {
        return defaultChildId;
    }
}

export function saveActiveChild(storage, owner, childId) {
    const normalized = normalizeChildId(childId);
    storage?.setItem?.(activeChildKey(owner), normalized);
    return normalized;
}

export function readAttempts(storage, owner) {
    const prefix = reviewPrefix(owner);
    const records = [];
    for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);
        if (key?.startsWith(prefix)) {
            const value = validateAttempt(JSON.parse(storage.getItem(key)));
            if (key !== prefix + value.id) throw new Error('這筆錯題紀錄的識別資料有誤。');
            records.push(value);
        }
    }
    return records.sort(compareAttempts);
}

export function saveAttempt(storage, owner, attempt) {
    const value = validateAttempt(attempt);
    const key = reviewPrefix(owner) + value.id;
    if (storage.getItem(key) !== null) throw new Error('這次批改已記錄。');
    storage.setItem(key, JSON.stringify(value));
    return value;
}

function summarizeGrading(attempts, bookId, childId) {
    const targetChild = childId === undefined ? undefined : normalizeChildId(childId);
    const words = new Map();
    for (const attempt of [...attempts].sort(compareAttempts)) {
        if (bookId !== undefined && attempt.bookId !== bookId) continue;
        if (targetChild !== undefined && normalizeChildId(attempt.childId) !== targetChild) continue;
        for (const [index, item] of attempt.items.entries()) {
            const grade = words.get(item.word) ?? { lastWrong: false, attemptId: null, lastMistake: null };
            grade.lastWrong = grade.attemptId === attempt.id ? grade.lastWrong || item.wrong : item.wrong;
            grade.attemptId = attempt.id;
            if (item.wrong) {
                grade.lastMistake = { ...item, id: `${attempt.id}:${index}`, bookId: attempt.bookId, confirmed: true };
            }
            words.set(item.word, grade);
        }
    }
    return words;
}

export function recentWrongTerms(attempts, bookId, childId) {
    return new Set([...summarizeGrading(attempts, bookId, childId)]
        .filter(([, grade]) => grade.lastWrong).map(([word]) => word));
}

export function lookupWordReviews(characters, words, attempts, childId) {
    const hits = new Map([...characters].map(char => [char, []]));
    const matchingWords = new Map();

    function include(word) {
        if (typeof word !== 'string' || !word) return null;
        if (matchingWords.has(word)) return matchingWords.get(word);
        const matches = [...new Set(word)].filter(char => hits.has(char));
        const result = matches.length ? { word, everWrong: false, lastWrong: null } : null;
        matchingWords.set(word, result);
        if (result) for (const char of matches) hits.get(char).push(result);
        return result;
    }

    for (const entry of words) include(entry?.word);
    for (const [word, grade] of summarizeGrading(attempts, undefined, childId)) {
        const result = include(word);
        if (!result) continue;
        result.everWrong = grade.lastMistake !== null;
        result.lastWrong = grade.lastWrong;
    }

    const rank = result => result.everWrong ? 0 : result.lastWrong === null ? 2 : 1;
    for (const rows of hits.values()) {
        rows.sort((a, b) => rank(a) - rank(b) || a.word.localeCompare(b.word, 'zh-Hant'));
    }
    return hits;
}

export function reviewWordPools(attempts, bookId, mode, childId) {
    const recent = [];
    const recovered = [];
    for (const grade of summarizeGrading(attempts, bookId, childId).values()) {
        if (!grade.lastMistake) continue;
        const pool = grade.lastWrong ? recent : recovered;
        pool.push(grade.lastMistake);
    }
    const candidates = mode === 'history' ? [...recent, ...recovered] : recent;
    const available = new Set(questionPool(candidates, bookId, 1, 60).available.map(group => group.entry.word));
    return {
        recent: recent.filter(entry => available.has(entry.word)),
        recovered: recovered.filter(entry => available.has(entry.word)),
        mistakes: [...recent, ...recovered]
    };
}

export function pendingWords(attempts, bookId, childId) {
    return reviewWordPools(attempts, bookId, 'recent', childId).recent;
}

export function makeReviewExam({ id, createdAt, seed, book, attempts, words, mode = 'mixed', size = 'all',
    wrongCount, newCount, from, to, childId }) {
    if (!['recent', 'history', 'mixed'].includes(mode)) throw new Error('請選擇複習範圍。');
    if (typeof seed !== 'string' || !seed.trim() || seed.length > 48) throw new Error('請重新產生考卷。');
    const { recent, recovered, mistakes } = reviewWordPools(attempts, book.id, mode, childId);
    const args = { id, createdAt, book };
    function draw(entries, count, suffix) {
        if (count === 0) return [];
        return makeExam({ ...args, words: entries, from: 1, to: 60, count, seed: seed.slice(0, 46) + suffix }).questions
            .flatMap(question => question.sources.map(source => ({ ...question, ...source, bookId: book.id, confirmed: true })));
    }

    let selected;
    if (mode === 'mixed') {
        if (![wrongCount, newCount].every(count => Number.isInteger(count) && count >= 0) ||
            wrongCount + newCount < 1 || wrongCount + newCount > 60) {
            throw new Error('錯題與一般詞庫合計須為 1 至 60 題。');
        }
        let fresh = [];
        if (newCount) {
            const priorWords = new Set(mistakes.map(entry => entry.word));
            const priorPrompts = new Set(mistakes.map(questionKey));
            const eligible = words.filter(entry => !priorWords.has(entry.word) && !priorPrompts.has(questionKey(entry)));
            const distinct = new Map();
            for (const { entry } of questionPool(eligible, book.id, from, to).available) {
                if (!distinct.has(entry.word)) distinct.set(entry.word, entry);
            }
            fresh = [...distinct.values()];
        }
        selected = [...draw(recent, wrongCount, '-r'), ...draw(fresh, newCount, '-n')];
    } else {
        const limit = size === 'all' ? 60 : Number(size);
        if (!Number.isInteger(limit) || limit < 1 || limit > 60) throw new Error('請選擇有效的抽題數量。');
        const count = Math.min(limit, recent.length + recovered.length);
        if (!count) throw new Error('這個範圍目前沒有可出卷的錯題。');
        const recentCount = Math.min(count, recent.length);
        selected = [...draw(recent, recentCount, '-r'), ...draw(recovered, count - recentCount, '-h')];
    }
    const lessons = selected.map(word => word.lesson);
    return makeExam({ ...args, words: selected, from: Math.min(...lessons), to: Math.max(...lessons),
        count: selected.length, seed });
}
