import { makeBook, makeWord, wordIdentity } from './vocabularyData.mjs';

const format = 'chinese-writing-practice-vocabulary';
const version = 1;
const maxWords = 2000;
export const vocabularyShareMaxBytes = 2_000_000;

const wordFields = ({ lesson, word, pronunciation, blanks }) => ({ lesson, word, pronunciation, blanks });
const editionKey = ({ publisher, year, grade, semester, edition }) => JSON.stringify([publisher, year, grade, semester, edition]);
const sameQuestion = (first, second) => JSON.stringify(wordFields(first)) === JSON.stringify(wordFields(second));

function validateShare(input) {
    if (input?.format !== format || input.version !== version || !Array.isArray(input.words) ||
        !input.words.length || input.words.length > maxWords) {
        throw new Error(`請選擇本站匯出的詞庫分享檔，每份須包含 1 至 ${maxWords} 個詞語。`);
    }
    try {
        const { name, publisher, year, grade, semester, edition } = makeBook(input.source);
        const words = input.words.map(entry => {
            if (!Array.isArray(entry?.pronunciation) || !entry.pronunciation.every(value => typeof value === 'string') ||
                !Array.isArray(entry.blanks)) throw new Error('詞語欄位格式有誤。');
            return wordFields(makeWord({ ...entry, pronunciation: entry.pronunciation.join(' '), confirmed: false }));
        });
        if (new Set(words.map(wordIdentity)).size !== words.length) throw new Error('分享檔內有同課的重複詞語。');
        return { format, version, source: { name, publisher, year, grade, semester, edition }, words };
    } catch (error) {
        if (error instanceof TypeError) throw new Error('分享檔內的班級或詞語欄位格式有誤。', { cause: error });
        throw error;
    }
}

export function createVocabularyShare(book, entries) {
    if (!book || entries.some(entry => entry.bookId !== book.id)) throw new Error('請選取同一個班級的詞語。');
    return validateShare({ format, version, source: book, words: entries.map(wordFields) });
}

export function parseVocabularyShare(text) {
    let value;
    try {
        value = JSON.parse(text.replace(/^\uFEFF/u, ''));
    } catch {
        throw new Error('無法讀取詞庫分享檔的 JSON 格式。');
    }
    return validateShare(value);
}

export function compatibleShareBooks(share, books) {
    return books.filter(book => editionKey(book) === editionKey(share.source));
}

export function previewVocabularyShare(state, share, destination) {
    let book;
    if (destination.id) {
        book = compatibleShareBooks(share, state.books).find(book => book.id === destination.id);
        if (!book) throw new Error('請選擇相同教材版次的班級。');
    } else {
        book = makeBook({ ...share.source, name: destination.name });
    }
    const existing = new Map(state.words.filter(word => book.id && word.bookId === book.id)
        .map(word => [wordIdentity(word), word]));
    const rows = share.words.map(word => {
        const current = existing.get(wordIdentity({ ...word, bookId: book.id }));
        const status = !current ? 'new' : sameQuestion(current, word) ? 'duplicate' : 'conflict';
        return { word, status, existing: current ? wordFields(current) : null };
    });
    return { book, rows };
}

export function applyVocabularyShare(state, share, preview, { confirmReadings = false, nextId }) {
    const current = previewVocabularyShare(state, share, preview.book);
    if (JSON.stringify(current) !== JSON.stringify(preview)) throw new Error('詞庫已變更，請重新核對匯入預覽。');
    const additions = current.rows.filter(row => row.status === 'new');
    if (!additions.length) throw new Error('沒有可新增的詞語。');
    const book = current.book.id ? current.book : { ...current.book, id: nextId() };
    if (!current.book.id && state.books.some(existing => existing.id === book.id)) throw new Error('請重新匯入詞庫。');
    const words = additions.map(({ word }) => ({
        ...word, id: nextId(), bookId: book.id, confirmed: confirmReadings && word.pronunciation.length > 0
    }));
    const ids = new Set(state.words.map(word => word.id));
    for (const word of words) {
        if (ids.has(word.id)) throw new Error('請重新匯入詞庫。');
        ids.add(word.id);
    }
    if (!current.book.id) state.books.push(book);
    state.words.push(...words);
    return { book, count: words.length };
}
