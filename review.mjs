import { cloudPageUrl, openPageStorage } from './cloudStorage.mjs';
import { gradeExam, makeReviewExam, readAttempts, recordPaperWord, reviewWordPools, saveAttempt } from './reviewData.mjs';
import { copyReviewAttempts, mergeReviewAttempts, splitLocalReviewAttempts, syncReviewAttempts } from './reviewSync.mjs';
import { bookLabel, makeWord, readVocabulary, vocabularyStorageKey } from './vocabularyData.mjs';

const byId = id => document.getElementById(id);
const bookPicker = byId('reviewBook');
const examPicker = byId('reviewExam');
const date = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' });
const now = () => ({ id: crypto.randomUUID(), at: new Date().toISOString() });

function notice(message, error = false) {
    const target = byId('reviewNotice');
    target.textContent = message;
    target.toggleAttribute('data-error', error);
}

try {
    const access = await openPageStorage();
    const cloud = access && !access.isGuest ? access : null;
    const records = cloud ?? localStorage;
    const owner = cloud?.ownerId ?? 'local';
    const vocabulary = readVocabulary(records);
    const requested = new URL(location.href).searchParams.get('exam');
    const initialExam = vocabulary.exams.find(exam => exam.id === requested);
    let attempts = readAttempts(localStorage, owner);
    let synced = [];
    let syncQueue = Promise.resolve();
    let waiting = 0;
    let creatingExam = false;
    const syncStatus = byId('reviewSyncStatus');
    const retry = byId('retryReviewSync');
    const importLocal = byId('importLocalReview');
    const retake = byId('retakeSubmit');
    const reviewMode = byId('reviewMode');
    let availableReviewCount = 0;

    function updateRetakeButton() {
        retake.disabled = Boolean(waiting) || creatingExam || (reviewMode.value !== 'mixed' && !availableReviewCount);
    }

    function renderReviewOptions() {
        const mode = reviewMode.value;
        const mixed = mode === 'mixed';
        byId('reviewMixed').hidden = byId('reviewMixed').disabled = !mixed;
        byId('reviewPreset').hidden = byId('reviewPreset').disabled = mixed;
        const { recent, recovered } = reviewWordPools(attempts, bookPicker.value, mode);
        const candidates = [...recent, ...recovered];
        availableReviewCount = candidates.length;
        const list = candidates.slice(0, 8).map(item => item.word).join('、');
        const countText = mode === 'history' ? '曾經答錯' : '最近答錯';
        byId('pendingReview').textContent = candidates.length
            ? `${countText}可抽 ${candidates.length} 題 · ${list}${candidates.length > 8 ? '等' : ''}`
            : `目前沒有${countText}的詞語可出卷。`;
        updateRetakeButton();
    }

    function showSyncStatus(message, error = false) {
        syncStatus.textContent = message;
        syncStatus.toggleAttribute('data-error', error);
    }

    function localImport() {
        const { matched, unmatched } = splitLocalReviewAttempts(localStorage, vocabulary.books.map(book => book.id));
        const alreadySynced = new Set(synced.map(attempt => JSON.stringify(attempt)));
        return { candidates: matched.filter(attempt => !alreadySynced.has(JSON.stringify(attempt))), unmatched };
    }

    function showImport() {
        try {
            const { candidates, unmatched } = localImport();
            importLocal.hidden = candidates.length === 0;
            byId('unmatchedLocalReview').hidden = unmatched.length === 0;
        } catch {
            importLocal.hidden = true;
            notice('此瀏覽器有無法讀取的未登入紀錄。原始紀錄仍保留。', true);
        }
    }

    function refreshAttempts() {
        attempts = mergeReviewAttempts(synced, readAttempts(localStorage, owner));
        renderHistory();
    }

    function queueSync() {
        if (!cloud) return true;
        waiting++;
        retry.disabled = importLocal.disabled = retake.disabled = true;
        showSyncStatus('正在同步錯題與批改紀錄…');
        syncQueue = syncQueue.then(async () => {
            try {
                synced = await syncReviewAttempts(readAttempts(localStorage, owner), cloud);
                refreshAttempts();
                showSyncStatus('錯題與批改紀錄已同步。');
                return true;
            } catch (error) {
                showSyncStatus(`${error.message} 此瀏覽器的紀錄仍保留。可使用「重新同步紀錄」重試。`, true);
                return false;
            } finally {
                waiting--;
                retry.disabled = importLocal.disabled = Boolean(waiting);
                updateRetakeButton();
                if (!waiting) showImport();
            }
        });
        return syncQueue;
    }

    function renderQuestions() {
        byId('saveReviewGrade').disabled = false;
        byId('gradeAgain').hidden = true;
        const exam = vocabulary.exams.find(item => item.id === examPicker.value);
        if (exam) {
            const path = `exam.html?${new URLSearchParams({ id: exam.id })}`;
            byId('reviewExamPreview').href = cloud ? cloudPageUrl(path) : path;
        }
        byId('reviewQuestions').replaceChildren(...(exam?.questions ?? []).map((question, index) => {
            const label = document.createElement('label');
            const check = document.createElement('input');
            check.type = 'checkbox';
            check.name = 'wrong';
            check.value = index + 1;
            label.append(check, ` 第 ${index + 1} 題　${question.word}`);
            return label;
        }));
    }

    function renderBook(preferredExam) {
        const exams = vocabulary.exams.filter(exam => exam.book.id === bookPicker.value)
            .slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        examPicker.replaceChildren(...exams.map(exam =>
            new Option(`${date.format(new Date(exam.createdAt))} · 第 ${exam.from}～${exam.to} 課 · ${exam.count} 題`, exam.id)));
        if (exams.some(exam => exam.id === preferredExam)) examPicker.value = preferredExam;
        byId('gradeExamForm').hidden = !exams.length;
        byId('noReviewExams').hidden = Boolean(exams.length);
        renderQuestions();
        renderHistory();
    }

    function renderHistory() {
        renderReviewOptions();
        const history = attempts.filter(item => item.bookId === bookPicker.value).slice().reverse();
        byId('noReviewHistory').hidden = Boolean(history.length);
        byId('reviewHistory').replaceChildren(...history.map(item => {
            const row = document.createElement('li');
            const wrong = item.items.filter(question => question.wrong);
            row.textContent = `${date.format(new Date(item.at))} · ${item.source === 'paper' ? '紙本考卷' : '已存考卷'} · ${wrong.length ? '錯題 ' + wrong.map(question => question.word).join('、') : '全對'}`;
            return row;
        }));
    }

    function record(attempt) {
        saveAttempt(localStorage, owner, attempt);
        refreshAttempts();
        notice('已將這次紀錄儲存在此瀏覽器。');
        queueSync();
    }

    byId('noReviewBooks').hidden = Boolean(vocabulary.books.length);
    byId('reviewWorkspace').hidden = !vocabulary.books.length;
    bookPicker.replaceChildren(...vocabulary.books.map(book => new Option(bookLabel(book), book.id)));
    if (initialExam && vocabulary.books.some(book => book.id === initialExam.book.id)) bookPicker.value = initialExam.book.id;
    renderBook(initialExam?.id);
    if (cloud) {
        byId('reviewSyncActions').hidden = syncStatus.hidden = false;
        retry.addEventListener('click', queueSync);
        importLocal.addEventListener('click', () => {
            try {
                copyReviewAttempts(localStorage, owner, localImport().candidates, synced);
                refreshAttempts();
                queueSync();
            } catch (error) { notice(error.message, true); }
        });
        window.addEventListener('online', queueSync);
        queueSync();
    }
    bookPicker.addEventListener('change', () => renderBook());
    reviewMode.addEventListener('change', renderReviewOptions);
    examPicker.addEventListener('change', renderQuestions);
    byId('gradeAgain').addEventListener('click', () => {
        renderQuestions();
        byId('reviewQuestions').querySelector('input')?.focus();
    });

    byId('gradeExamForm').addEventListener('submit', event => {
        event.preventDefault();
        if (byId('saveReviewGrade').disabled) return;
        try {
            const exam = vocabulary.exams.find(item => item.id === examPicker.value && item.book.id === bookPicker.value);
            const wrong = new FormData(event.currentTarget).getAll('wrong').map(Number);
            record(gradeExam(exam, wrong, now()));
            byId('saveReviewGrade').disabled = true;
            byId('gradeAgain').hidden = false;
        } catch (error) { notice(error.message, true); }
    });

    byId('paperReviewForm').addEventListener('submit', event => {
        event.preventDefault();
        const form = event.currentTarget;
        try {
            const attempt = now();
            const input = Object.fromEntries(new FormData(form));
            const word = makeWord({ ...input, id: attempt.id, bookId: bookPicker.value, confirmed: true,
                blanks: input.blanks.trim().split(/[\s,、]+/u).map(Number) });
            record(recordPaperWord(word, attempt));
            form.reset();
        } catch (error) { notice(error.message, true); }
    });

    byId('retakeForm').addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget;
        if (retake.disabled) return;
        creatingExam = true;
        updateRetakeButton();
        try {
            const input = Object.fromEntries(new FormData(form));
            const bookId = bookPicker.value;
            if (cloud && !(await queueSync())) throw new Error('請先同步最新批改紀錄，再產生考卷。');
            const data = readVocabulary(records);
            const book = data.books.find(item => item.id === bookId);
            if (!book) throw new Error('請重新選擇班級。');
            const attempt = now();
            const exam = makeReviewExam({ id: attempt.id, createdAt: attempt.at, seed: crypto.randomUUID(), book, words: data.words,
                attempts, mode: input.mode, size: input.size, wrongCount: Number(input.wrong), newCount: Number(input.fresh),
                from: Number(input.from), to: Number(input.to) });
            await records.setItem(vocabularyStorageKey, JSON.stringify({ ...data, exams: [...data.exams, exam] }));
            const path = `exam.html?${new URLSearchParams({ id: exam.id })}`;
            location.href = cloud ? cloudPageUrl(path) : path;
        } catch (error) { notice(error.message, true); }
        finally {
            creatingExam = false;
            updateRetakeButton();
        }
    });
} catch (error) {
    notice(error.message, true);
}
