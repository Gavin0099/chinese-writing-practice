import { courseKey } from './characterLookup.mjs';
import { isWritingHistory, progressStorageKey, readProgress, writingStorageKey } from './learningData.mjs';
import { makeBook, makeWord, readVocabulary, vocabularyStorageKey, wordIdentity } from './vocabularyData.mjs';

const format = 'chinese-writing-practice-backup';
const version = 1;
export const backupSections = {
    vocabulary: vocabularyStorageKey,
    teachingProgress: progressStorageKey,
    writingRecords: writingStorageKey
};
const isId = value => typeof value === 'string' && value.trim().length > 0;
const isDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const integerIn = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const unique = values => new Set(values).size === values.length;

function readBook(book) {
    if (!isId(book?.id)) throw new Error('詞庫缺少班級識別資料。');
    return makeBook(book);
}

function readWord(entry) {
    if (!Array.isArray(entry?.pronunciation) || !entry.pronunciation.every(item => typeof item === 'string') ||
        !Array.isArray(entry.blanks) || !unique(entry.blanks) || typeof entry.confirmed !== 'boolean') {
        throw new Error('詞語缺少注音、挖空位置或確認狀態。');
    }
    return makeWord({ ...entry, pronunciation: entry.pronunciation.join(' ') });
}

function readExam(exam, bookIds) {
    if (!isId(exam?.id) || !isDate(exam.createdAt) || !bookIds.has(exam.book?.id) ||
        !integerIn(exam.from, 1, 60) || !integerIn(exam.to, exam.from, 60) || !integerIn(exam.count, 1, 60) ||
        !isId(exam.seed) || exam.seed.length > 48 || !Array.isArray(exam.questions) || exam.questions.length !== exam.count) {
        throw new Error('考卷的班級、課次或題數有誤。');
    }
    const questions = exam.questions.map(question => {
        if (!Array.isArray(question?.sources) || !question.sources.length || question.sources.some(source =>
            !isId(source?.id) || !integerIn(source.lesson, exam.from, exam.to))) {
            throw new Error('考卷缺少題目來源。');
        }
        const { word, pronunciation, blanks } = readWord({ ...question, lesson: question.sources[0].lesson, confirmed: true });
        const sources = question.sources.map(({ id, lesson }) => ({ id, lesson }));
        return { word, pronunciation, blanks, sources };
    });
    return { id: exam.id, createdAt: exam.createdAt, book: readBook(exam.book), from: exam.from, to: exam.to,
        count: exam.count, seed: exam.seed, questions };
}

function readBackupVocabulary(data) {
    if (![data?.books, data?.words, data?.exams].every(Array.isArray)) throw new Error('備份缺少班級、詞語或考卷清單。');
    const books = data.books.map(readBook);
    const bookIds = new Set(books.map(book => book.id));
    if (bookIds.size !== books.length || data.words.some(word => !isId(word?.id) || !bookIds.has(word.bookId))) {
        throw new Error('詞庫有重複班級或無法對應的詞語。');
    }
    const words = data.words.map(readWord);
    if (!unique(words.map(word => word.id)) || !unique(words.map(wordIdentity))) throw new Error('備份有重複的詞語。');
    const exams = data.exams.map(exam => readExam(exam, bookIds));
    if (!unique(exams.map(exam => exam.id))) throw new Error('備份有重複的考卷。');
    return { books, words, exams };
}

function readBackupProgress(data) {
    if (!Array.isArray(data?.records)) throw new Error('備份缺少教學進度清單。');
    const { records, activeKey } = readProgress(data);
    const keys = records.map(courseKey);
    if (records.length !== data.records.length || !unique(keys) || (keys.length ? !keys.includes(activeKey) : activeKey !== null)) {
        throw new Error('備份的教學進度有誤。');
    }
    return { activeKey, records: records.map(({ academicYear, publisher, grade, semester, sourceVersion, lesson }) =>
        ({ academicYear, publisher, grade, semester, sourceVersion, lesson, confirmed: true })) };
}

function readBackupWriting(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.entries(data).some(([char, history]) =>
        !isWritingHistory(char, history))) throw new Error('備份的習寫紀錄有誤。');
    return Object.fromEntries(Object.entries(data).map(([char, history]) =>
        [char, history.map(({ status, at }) => ({ status, at }))]));
}

export function validateBackup(data) {
    if (data?.format !== format || data.version !== version || !isDate(data.exportedAt)) {
        throw new Error('請選擇由本站匯出的相容備份檔。');
    }
    try {
        return { format, version, exportedAt: data.exportedAt, vocabulary: readBackupVocabulary(data.vocabulary),
            teachingProgress: readBackupProgress(data.teachingProgress), writingRecords: readBackupWriting(data.writingRecords) };
    } catch (error) {
        if (error instanceof TypeError) throw new Error('備份含有格式不正確的欄位。', { cause: error });
        throw error;
    }
}

export function downloadBackupFile(backup, draft = false) {
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date(backup.exportedAt).toISOString().slice(0, 10);
    link.href = url;
    link.download = `chinese-writing-practice_backup_${draft ? 'draft_' : ''}${date}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportBackup(storage = localStorage) {
    const savedProgress = JSON.parse(storage.getItem(progressStorageKey));
    const teachingProgress = savedProgress === null ? readProgress(null) : Array.isArray(savedProgress?.records)
        ? savedProgress : { activeKey: courseKey(savedProgress), records: [savedProgress] };
    return validateBackup({ format, version, exportedAt: new Date().toISOString(), vocabulary: readVocabulary(storage),
        teachingProgress,
        writingRecords: JSON.parse(storage.getItem(writingStorageKey)) ?? {} });
}

export function parseBackup(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('無法讀取這個 JSON 檔。請重新選擇備份檔。');
    }
    return validateBackup(data);
}

export function backupCounts(backup) {
    return { books: backup.vocabulary.books.length, words: backup.vocabulary.words.length,
        exams: backup.vocabulary.exams.length, progress: backup.teachingProgress.records.length,
        writing: Object.values(backup.writingRecords).reduce((total, records) => total + records.length, 0) };
}

export function readBackupTarget(storage = localStorage) {
    return Object.fromEntries(Object.values(backupSections).map(key => [key, storage.getItem(key)]));
}

export function restoreBackup(backup, expected, storage = localStorage) {
    const data = validateBackup(backup);
    const before = readBackupTarget(storage);
    if (Object.keys(before).some(key => before[key] !== expected[key])) {
        throw new Error('選擇備份後，本機資料已變更。請重新選檔再確認還原。');
    }

    const updates = Object.entries(backupSections).map(([section, key]) => ({ key, previous: before[key], next: JSON.stringify(data[section]) }))
        .filter(update => update.previous !== update.next);
    // Free space first, so restoring a smaller backup works even near the storage limit.
    updates.sort((left, right) => (left.next.length - (left.previous?.length ?? 0)) -
        (right.next.length - (right.previous?.length ?? 0)));
    const saved = [];
    try {
        for (const update of updates) {
            storage.setItem(update.key, update.next);
            saved.push(update);
        }
    } catch (error) {
        try {
            for (const { key, previous } of saved.reverse()) {
                if (previous === null) storage.removeItem(key);
                else storage.setItem(key, previous);
            }
        } catch (rollbackError) {
            throw new Error('瀏覽器拒絕還原原有資料。請保留備份檔，重新開啟網站後核對資料。', { cause: rollbackError });
        }
        throw new Error('還原失敗，原有資料已保留。請檢查瀏覽器儲存空間。', { cause: error });
    }
}
