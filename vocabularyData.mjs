export const vocabularyStorageKey = 'write_practice_vocabulary_v1';
const han = /^\p{Script=Han}{1,10}$/u;
const zhuyin = /^(?:˙[ㄅ-ㄙ]?[ㄧ-ㄩ]?[ㄚ-ㄦ]?|[ㄅ-ㄙ]?[ㄧ-ㄩ]?[ㄚ-ㄦ]?[ˊˇˋ˙]?)$/u;
const explicitFirstTone = /([ㄅ-ㄩ])[\u00af\u02c9\u0304\uffe3]$/u;

export function readVocabulary(storage = localStorage) {
    const raw = storage.getItem(vocabularyStorageKey);
    if (raw === null) return { books: [], words: [], exams: [] };
    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        throw new Error('無法讀取已儲存的詞庫，請保留瀏覽器資料以便復原。');
    }
    if (![data?.books, data?.words, data?.exams].every(Array.isArray)) {
        throw new Error('無法讀取已儲存的詞庫，請保留瀏覽器資料以便復原。');
    }
    return data;
}

export function updateVocabulary(update, storage = localStorage) {
    const data = readVocabulary(storage);
    update(data);
    storage.setItem(vocabularyStorageKey, JSON.stringify(data));
    return data;
}

const integerIn = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

export function makeBook({ id, name, publisher, year, grade, semester, edition }) {
    const book = { id, name: name.trim(), publisher: publisher.trim(), year: Number(year), grade: Number(grade),
        semester: Number(semester), edition: edition.trim() };
    if (!book.name || book.name.length > 40 || !book.publisher || book.publisher.length > 24 || book.edition.length > 40 ||
        !integerIn(book.year, 1, 999) || !integerIn(book.grade, 1, 6) || !integerIn(book.semester, 1, 2)) {
        throw new Error('請填寫班級名稱、出版社、學年度、年級與學期。');
    }
    return book;
}

export function bookLabel(book) {
    return `${book.name} · ${book.year} 學年度 ${book.publisher} ${book.grade} 年級${book.semester === 1 ? '上' : '下'}學期${book.edition ? ` · ${book.edition}` : ''}`;
}

export function makeWord({ id, bookId, lesson, word, pronunciation, blanks, confirmed }) {
    const text = word.trim();
    const characters = Array.from(text);
    if (!han.test(text)) throw new Error('詞語請輸入 1 至 10 個國字。');
    const lessonNumber = Number(lesson);
    if (!integerIn(lessonNumber, 1, 60)) throw new Error('請輸入 1 至 60 之間的課次。');
    const targets = [...new Set(blanks)].sort((a, b) => a - b);
    if (!targets.length || targets.some(position => !integerIn(position, 1, characters.length))) {
        throw new Error('請選擇至少一個挖空字，位置須在詞語內。');
    }

    const reading = pronunciation.trim();
    const syllables = reading ? reading.split(/\s+/u).map(syllable => syllable.replace(explicitFirstTone, '$1')) : [];
    if ((syllables.length || confirmed) && syllables.length !== characters.length) {
        throw new Error('每個國字需要一組注音，請用空格分開，例如 ㄑㄧㄥˊ ㄊㄧㄢ。');
    }
    if (syllables.some(syllable => !zhuyin.test(syllable) || !/[ㄅ-ㄩ]/u.test(syllable))) {
        throw new Error('每個國字的注音只能包含注音符號與聲調，請檢查是否多打了其他符號。');
    }
    return { id, bookId, lesson: lessonNumber, word: text,
        pronunciation: syllables.map(syllable => syllable.endsWith('˙') ? `˙${syllable.slice(0, -1)}` : syllable),
        blanks: targets, confirmed: Boolean(confirmed) };
}

export const wordIdentity = entry => JSON.stringify([entry.bookId, entry.lesson, entry.word]);

export function saveWord(data, entry) {
    if (!data.books.some(book => book.id === entry.bookId)) throw new Error('請重新選擇班級詞庫。');
    if (data.words.some(other => other.id !== entry.id && wordIdentity(other) === wordIdentity(entry))) {
        throw new Error('同一班級和課次已有這個詞語，請編輯原本的詞語。');
    }
    const index = data.words.findIndex(other => other.id === entry.id);
    if (index < 0) data.words.push(entry);
    else data.words[index] = entry;
}

export function previewBatch(text, bookId, lesson, words) {
    const seen = new Set(words.map(wordIdentity));
    return text.split(/\r?\n/u).flatMap((line, index) => {
        if (!line.trim()) return [];
        const columns = line.split('\t');
        const [word, pronunciation = '', positions = ''] = columns;
        try {
            if (columns.length > 3) throw new Error('每行最多三欄，請檢查 Tab 分隔。');
            const blanks = positions.trim() ? positions.trim().split(/[、,，\s]+/u).map(Number) : [1];
            const entry = makeWord({ bookId, lesson, word, pronunciation, blanks, confirmed: false });
            const identity = wordIdentity(entry);
            if (seen.has(identity)) throw new Error('這課已有相同詞語。');
            seen.add(identity);
            return [{ line: index + 1, word: entry.word, entry }];
        } catch (error) {
            return [{ line: index + 1, word: word.trim(), error: error.message }];
        }
    });
}
