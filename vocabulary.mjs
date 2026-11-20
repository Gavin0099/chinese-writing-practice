import { bookLabel, makeBook, makeWord, previewBatch, readVocabulary, saveWord, updateVocabulary, vocabularyStorageKey } from './vocabularyData.mjs';
import { makeExam, questionPool } from './examData.mjs';
import { cloudPageUrl, openPageStorage } from './cloudStorage.mjs';
import { readAttempts, recentWrongTerms } from './reviewData.mjs';
import { mergeReviewAttempts } from './reviewSync.mjs';
import { applyVocabularyShare, compatibleShareBooks, createVocabularyShare, parseVocabularyShare,
    previewVocabularyShare, vocabularyShareMaxBytes } from './vocabularyShare.mjs';
import { initPhotoImport } from './photoImport.mjs';
import { deploymentCloud } from './cloudConfig.mjs';

const cloud = await openPageStorage();

const byId = id => document.getElementById(id);
const bookForm = byId('bookForm');
const bookSelect = byId('bookSelect');
const wordForm = byId('wordForm');
const wordFields = wordForm.elements;
const batchForm = byId('batchForm');
const examForm = byId('examForm');
const shareExportForm = byId('shareExportForm');
const shareFile = byId('shareFile');
const shareTarget = byId('shareTarget');
const shareName = byId('shareName');
const dateFormat = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'short', timeStyle: 'short' });
const filter = byId('lessonFilter');
const query = new URL(location.href);
const main = document.querySelector('main');
let data = { books: [], words: [], exams: [] };
let activeId = query.searchParams.get('book');
let editingId = null;
let batch = [];
let dirty = false;
let workspaceView = 'exam';
let sharedVocabulary = null;
let importPreview = null;
let creatingExam = false;

byId('vocabularyMode').textContent = cloud
    ? '雲端資料 · 詞庫與考卷同步到此帳號'
    : '本機資料 · 詞庫與考卷儲存在此瀏覽器';

function notice(id, message = '', error = false) {
    const element = byId(id);
    element.textContent = message;
    element.toggleAttribute('data-error', error);
}

async function persist(update, messageId) {
    try {
        if (cloud) {
            main.inert = true;
            main.setAttribute('aria-busy', 'true');
            const next = readVocabulary(cloud);
            update(next);
            await cloud.setItem(vocabularyStorageKey, JSON.stringify(next));
            data = next;
        } else {
            data = updateVocabulary(update);
        }
        return true;
    } catch (error) {
        notice(messageId, error instanceof DOMException ? '無法儲存。請檢查瀏覽器是否允許儲存網站資料。' : error.message, true);
        return false;
    } finally {
        if (cloud) {
            main.inert = false;
            main.removeAttribute('aria-busy');
        }
    }
}

const photo = initPhotoImport({
    cloud: Boolean(cloud),
    currentBook: () => data.books.find(book => book.id === activeId),
    persist: async update => {
        if (!await persist(update, 'photoSaveNotice')) return false;
        renderWords();
        return true;
    }
});

const ownWords = () => data.words.filter(entry => entry.bookId === activeId);
const selectedBlanks = () => [...byId('blankChoices').querySelectorAll('input:checked')].map(input => Number(input.value));

function renderWorkspace() {
    const hasWords = ownWords().length > 0;
    if (!hasWords && workspaceView === 'exam') workspaceView = 'word';
    byId('goToExam').hidden = !hasWords;
    byId('goToWord').classList.toggle('primary', !hasWords);
    byId('wordListDetails').hidden = !hasWords;
    byId('examPanel').hidden = workspaceView !== 'exam';
    byId('photoPanel').hidden = workspaceView !== 'photo';
    byId('goToPhoto').setAttribute('aria-expanded', String(workspaceView === 'photo'));
    byId('wordPanel').hidden = !['word', 'batch'].includes(workspaceView);
    byId('wordPanel').setAttribute('aria-labelledby', workspaceView === 'batch' ? 'batchHeading' : 'wordHeading');
    byId('wordHeading').hidden = workspaceView === 'batch';
    byId('batchHeading').hidden = workspaceView !== 'batch';
    wordForm.hidden = workspaceView === 'batch';
    byId('batchDetails').hidden = workspaceView !== 'batch';
    for (const [id, view] of [['goToExam', 'exam'], ['goToWord', 'word'], ['goToBatch', 'batch']]) {
        byId(id).setAttribute('aria-pressed', String(workspaceView === view));
    }
}

byId('goToExam').addEventListener('click', () => {
    workspaceView = 'exam';
    renderWorkspace();
    byId('examHeading').focus();
});
byId('goToWord').addEventListener('click', () => {
    workspaceView = 'word';
    renderWorkspace();
    wordFields.word.focus();
});
byId('goToBatch').addEventListener('click', () => {
    workspaceView = 'batch';
    renderWorkspace();
    batchForm.elements.words.focus();
});
const photoButton = byId('goToPhoto');
photoButton.hidden = !deploymentCloud.photoImport;
photoButton.addEventListener('click', () => {
    workspaceView = 'photo';
    renderWorkspace();
    byId('photoHeading').focus();
});

function fillBlanks(positions) {
    const word = wordFields.word.value.trim();
    const choices = byId('blankChoices');
    choices.replaceChildren();
    if (!/^\p{Script=Han}{1,10}$/u.test(word)) {
        choices.textContent = '輸入詞語後選擇。';
        return;
    }
    for (const [index, char] of Array.from(word).entries()) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = String(index + 1);
        input.checked = positions.includes(index + 1);
        input.setAttribute('aria-label', `挖空第 ${index + 1} 字 ${char}`);
        label.append(input, char);
        choices.append(label);
    }
}

function clearEditor(lesson = wordFields.lesson.value) {
    editingId = null;
    wordForm.reset();
    wordFields.lesson.value = lesson || '1';
    byId('wordHeading').textContent = '新增詞語';
    byId('saveWord').textContent = '儲存詞語';
    byId('cancelEdit').hidden = true;
    dirty = false;
    fillBlanks([]);
}

function discardEditor(includeBatch = false) {
    const unsavedBatch = includeBatch && batchForm.elements.words.value.trim();
    return !(dirty || unsavedBatch) || window.confirm('還有詞語尚未儲存，要捨棄修改嗎？');
}

function editWord(entry) {
    if (!discardEditor()) return;
    editingId = entry.id;
    wordFields.lesson.value = entry.lesson;
    wordFields.word.value = entry.word;
    wordFields.pronunciation.value = entry.pronunciation.join(' ');
    wordFields.confirmed.checked = entry.confirmed;
    fillBlanks(entry.blanks);
    byId('wordHeading').textContent = `編輯「${entry.word}」`;
    byId('saveWord').textContent = '儲存修改';
    byId('cancelEdit').hidden = false;
    notice('wordNotice');
    dirty = false;
    workspaceView = 'word';
    renderWorkspace();
    wordFields.word.focus();
}

function renderWords() {
    const words = ownWords();
    const current = filter.value;
    const lessons = [...new Set(words.map(entry => entry.lesson))].sort((a, b) => a - b);
    filter.replaceChildren(new Option('全部課次', ''), ...lessons.map(lesson => new Option(`第 ${lesson} 課`, lesson)));
    if (lessons.includes(Number(current))) filter.value = current;
    const shown = words.filter(entry => !filter.value || entry.lesson === Number(filter.value)).sort((a, b) => a.lesson - b.lesson);
    notice('listCount', shown.length ? `${shown.length} 個詞語 · ${shown.filter(entry => entry.confirmed).length} 個可出題` : '這裡還沒有詞語。');
    byId('wordList').replaceChildren(...shown.map(entry => {
        const row = document.createElement('li');
        const text = document.createElement('div');
        const title = document.createElement('h3');
        title.textContent = entry.word;
        const meta = document.createElement('p');
        meta.className = 'word-meta';
        const chars = Array.from(entry.word);
        const targets = entry.blanks.map(position => chars[position - 1]).join('、');
        meta.textContent = `第 ${entry.lesson} 課 · 挖空 ${targets} · ${entry.confirmed ? '已確認' : '待確認'}`;
        const reading = document.createElement('p');
        reading.className = 'word-meta';
        reading.textContent = entry.pronunciation.join('　') || '尚未填寫注音';
        text.append(title, meta, reading);
        const actions = document.createElement('div');
        actions.className = 'actions';
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.textContent = '編輯';
        edit.setAttribute('aria-label', `編輯第 ${entry.lesson} 課 ${entry.word}`);
        edit.addEventListener('click', () => editWord(entry));
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'delete';
        remove.textContent = '刪除';
        remove.setAttribute('aria-label', `刪除第 ${entry.lesson} 課 ${entry.word}`);
        remove.addEventListener('click', async () => {
            if (!window.confirm(`刪除第 ${entry.lesson} 課的「${entry.word}」？`)) return;
            if (!await persist(state => { state.words = state.words.filter(word => word.id !== entry.id); }, 'listCount')) return;
            if (editingId === entry.id) clearEditor();
            renderWords();
            if (ownWords().length) filter.focus();
            else byId('goToWord').focus();
            notice('listCount', `已刪除「${entry.word}」，目前有 ${ownWords().length} 個詞語。`);
        });
        actions.append(edit, remove);
        row.append(text, actions);
        return row;
    }));
    renderWorkspace();
    renderExams();
    renderShareExport();
    if (sharedVocabulary) {
        fillShareTargets(shareTarget.value);
        renderShareImport();
    }
}

function renderBooks() {
    if (!data.books.some(book => book.id === activeId)) activeId = data.books.at(-1)?.id ?? null;
    bookSelect.replaceChildren(...data.books.map(book => new Option(bookLabel(book), book.id)));
    bookSelect.disabled = !activeId;
    byId('bookWorkspace').hidden = !activeId;
    workspaceView = 'exam';
    photo.reset();
    byId('wordListDetails').open = false;
    byId('examHistory').open = false;
    if (activeId) {
        bookSelect.value = activeId;
        query.searchParams.set('book', activeId);
        history.replaceState(null, '', query);
    } else {
        bookSelect.add(new Option('尚未建立詞庫', ''));
        byId('bookDetails').open = true;
    }
    renderWords();
}

function clearBatch() {
    batch = [];
    byId('batchRows').replaceChildren();
    byId('batchCommitAction').hidden = true;
    byId('batchConfirmLabel').hidden = true;
    byId('batchConfirm').checked = false;
    notice('batchNotice');
}

bookForm.elements.year.value = new Date().getFullYear() - 1911 - Number(new Date().getMonth() < 7);
bookForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!discardEditor(true)) return;
    try {
        const book = makeBook({ ...Object.fromEntries(new FormData(bookForm)), id: crypto.randomUUID() });
        if (!await persist(state => state.books.push(book), 'bookNotice')) return;
        activeId = book.id;
        bookForm.elements.name.value = '';
        byId('bookDetails').open = false;
        clearEditor('1');
        batchForm.reset();
        clearBatch();
        renderBooks();
        notice('bookNotice', `已建立「${book.name}」。`);
        bookSelect.focus();
    } catch (error) {
        notice('bookNotice', error.message, true);
    }
});

bookSelect.addEventListener('change', () => {
    if (!discardEditor(true)) {
        bookSelect.value = activeId;
        return;
    }
    activeId = bookSelect.value;
    filter.value = '';
    clearEditor('1');
    batchForm.reset();
    clearBatch();
    notice('wordNotice');
    notice('bookNotice');
    notice('examNotice');
    renderBooks();
});

wordForm.addEventListener('input', event => {
    dirty = true;
    if (event.target === wordFields.word || event.target === wordFields.pronunciation) wordFields.confirmed.checked = false;
    if (event.target === wordFields.word) fillBlanks([1]);
});
wordForm.addEventListener('submit', async event => {
    event.preventDefault();
    try {
        const entry = makeWord({ ...Object.fromEntries(new FormData(wordForm)),
            id: editingId ?? crypto.randomUUID(), bookId: activeId, blanks: selectedBlanks(), confirmed: wordFields.confirmed.checked });
        if (!await persist(state => saveWord(state, entry), 'wordNotice')) return;
        filter.value = '';
        clearEditor(entry.lesson);
        renderWords();
        notice('wordNotice', `${cloud ? '已同步' : '已儲存'}「${entry.word}」。`);
        wordFields.word.focus();
    } catch (error) {
        notice('wordNotice', error.message, true);
    }
});
byId('cancelEdit').addEventListener('click', () => {
    if (!discardEditor()) return;
    clearEditor();
    notice('wordNotice');
    wordFields.word.focus();
});
filter.addEventListener('change', renderWords);

batchForm.addEventListener('input', event => {
    if (event.target !== byId('batchConfirm')) clearBatch();
});
batchForm.addEventListener('submit', event => {
    event.preventDefault();
    batch = previewBatch(batchForm.elements.words.value, activeId, batchForm.elements.lesson.value, ownWords());
    const valid = batch.filter(row => row.entry).length;
    byId('batchCommitAction').hidden = !valid;
    byId('batchConfirmLabel').hidden = !batch.some(row => row.entry?.pronunciation.length);
    notice('batchNotice', batch.length ? `${valid} 筆可儲存，${batch.length - valid} 筆需修正或略過。` : '請貼上至少一個詞語。');
    byId('batchRows').replaceChildren(...batch.map(row => {
        const item = document.createElement('li');
        item.value = row.line;
        const reading = row.entry?.pronunciation.join('　') || '待補注音';
        const chars = Array.from(row.word);
        const targets = row.entry?.blanks.map(position => chars[position - 1]).join('、');
        item.textContent = `${row.word || '空白詞語'} · ${row.error ?? `${reading} · 挖空 ${targets}`}`;
        item.toggleAttribute('data-error', Boolean(row.error));
        return item;
    }));
});
byId('commitBatch').addEventListener('click', async () => {
    const accepted = batch.filter(row => row.entry);
    const confirmed = byId('batchConfirm').checked;
    const ready = confirmed ? accepted.filter(row => row.entry.pronunciation.length).length : 0;
    if (!accepted.length || !await persist(state => {
        for (const { entry } of accepted) saveWord(state, { ...entry, id: crypto.randomUUID(),
            confirmed: confirmed && Boolean(entry.pronunciation.length) });
    }, 'batchNotice')) return;
    const original = batchForm.elements.words.value.split(/\r?\n/u);
    batchForm.elements.words.value = batch.filter(row => row.error).map(row => original[row.line - 1]).join('\n');
    clearBatch();
    renderWords();
    notice('batchNotice', `已儲存 ${accepted.length} 個詞語，${ready} 個可出題。`);
});

function examSettings() {
    const fields = examForm.elements;
    return { from: Number(fields.from.value), to: Number(fields.to.value), count: Number(fields.count.value) };
}

async function readPriorityTerms(bookId) {
    const local = readAttempts(localStorage, cloud?.ownerId ?? 'local');
    if (!cloud) return recentWrongTerms(local, bookId);
    const remote = await cloud.readReviewAttempts();
    return recentWrongTerms(mergeReviewAttempts(local, remote), bookId);
}

function renderPool() {
    if (!activeId) return;
    try {
        const { from, to } = examSettings();
        const distinctWords = examForm.elements.prioritize.checked;
        const { available, ambiguous } = questionPool(ownWords(), activeId, from, to, distinctWords);
        const excluded = ambiguous ? `。${ambiguous} 組提示會對到多個答案，已排除` : '';
        notice('examPool', `這個範圍有 ${available.length} 題可抽${excluded}。`);
    } catch (error) {
        notice('examPool', error.message, true);
    }
}

function renderExams() {
    renderPool();
    const exams = data.exams.filter(exam => exam.book.id === activeId).slice().reverse();
    byId('examHistory').hidden = !exams.length;
    byId('examList').replaceChildren(...exams.map(exam => {
        const item = document.createElement('li');
        const details = document.createElement('div');
        const heading = document.createElement('h4');
        heading.textContent = `第 ${exam.from}～${exam.to} 課 · ${exam.count} 題`;
        const meta = document.createElement('p');
        meta.className = 'word-meta';
        const seed = document.createElement('code');
        seed.textContent = exam.seed;
        meta.append(dateFormat.format(new Date(exam.createdAt)), ' · 種子 ', seed);
        details.append(heading, meta);
        const link = document.createElement('a');
        const path = `exam.html?${new URLSearchParams({ id: exam.id })}`;
        link.href = cloud ? cloudPageUrl(path) : path;
        link.textContent = '開啟考卷與解答';
        link.setAttribute('aria-label', `開啟第 ${exam.from} 至 ${exam.to} 課 ${exam.count} 題考卷，種子 ${exam.seed}`);
        item.append(details, link);
        return item;
    }));
}

examForm.addEventListener('input', () => {
    notice('examNotice');
    renderPool();
});
byId('newExamSeed').addEventListener('click', () => {
    examForm.elements.seed.value = '';
    examForm.requestSubmit();
});
examForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (creatingExam) return;
    creatingExam = true;
    const seed = examForm.elements.seed.value.trim() || crypto.randomUUID().replaceAll('-', '').slice(0, 16);
    const settings = examSettings();
    const bookId = activeId;
    try {
        let priorityWords = null;
        if (examForm.elements.prioritize.checked) {
            notice('examNotice', '正在讀取最近的批改紀錄…');
            main.inert = true;
            try {
                priorityWords = await readPriorityTerms(bookId);
            } finally {
                main.inert = false;
            }
        }
        if (!await persist(state => {
            const book = state.books.find(candidate => candidate.id === bookId);
            if (!book) throw new Error('請重新選擇班級詞庫。');
            state.exams.push(makeExam({ ...settings, id: crypto.randomUUID(), createdAt: new Date().toISOString(),
                book, words: state.words, seed, priorityWords }));
        }, 'examNotice')) return;
        renderExams();
        byId('examHistory').open = true;
        notice('examNotice', `${cloud ? '已同步' : '已儲存'} ${settings.count} 題。可在下方開啟考卷與解答。`);
        byId('examList').querySelector('a')?.focus();
    } catch (error) {
        notice('examNotice', error.message, true);
    } finally {
        creatingExam = false;
    }
});

function exportChecks() {
    return [...byId('shareExportWords').querySelectorAll('input')];
}

function updateShareSelection() {
    const checks = exportChecks();
    const selected = checks.filter(check => check.checked).length;
    byId('shareDownload').disabled = !selected;
    byId('shareToggleAll').textContent = selected === checks.length ? '取消全選' : '全選';
    notice('shareExportNotice', `已選 ${selected} 個詞語。`);
}

function renderShareExport() {
    const words = ownWords().sort((a, b) => a.lesson - b.lesson);
    byId('shareExport').hidden = !words.length;
    const list = byId('shareExportWords');
    if (!byId('shareDetails').open) return;
    const selected = new Set(list.dataset.book === activeId ? new FormData(shareExportForm).getAll('selected') : []);
    list.dataset.book = activeId ?? '';
    list.replaceChildren(...words.map(word => {
        const label = document.createElement('label');
        const check = document.createElement('input');
        check.type = 'checkbox';
        check.name = 'selected';
        check.value = word.id;
        check.checked = selected.has(word.id);
        label.className = 'check';
        label.append(check, `第 ${word.lesson} 課 · ${word.word}`);
        return label;
    }));
    updateShareSelection();
}

function renderShareImport() {
    const nameIsRequired = !shareTarget.value;
    byId('shareNameLabel').hidden = !nameIsRequired;
    const confirm = byId('shareConfirmReadings');
    confirm.checked = false;
    importPreview = null;
    byId('shareApply').disabled = true;
    byId('sharePreviewRows').replaceChildren();
    try {
        importPreview = previewVocabularyShare(data, sharedVocabulary, { id: shareTarget.value, name: shareName.value });
        const rows = importPreview.rows;
        const newRows = rows.filter(row => row.status === 'new');
        const conflicts = rows.filter(row => row.status === 'conflict').length;
        byId('shareApply').disabled = !newRows.length;
        confirm.disabled = !newRows.some(({ word }) => word.pronunciation.length);
        const describe = entry => {
            const chars = Array.from(entry.word);
            return `${entry.pronunciation.join('　') || '待補注音'} · 挖空 ${entry.blanks.map(i => chars[i - 1]).join('、')}`;
        };
        const labels = { new: '可新增', duplicate: '相同，略過', conflict: '與現有詞語不同，略過' };
        byId('sharePreviewRows').replaceChildren(...rows.map(({ word, status, existing }) => {
            const item = document.createElement('li');
            const current = status === 'conflict' ? ` · 現有 ${describe(existing)}` : '';
            item.textContent = `第 ${word.lesson} 課 · ${word.word} · ${describe(word)} · ${labels[status]}${current}`;
            return item;
        }));
        notice('shareImportNotice', `${newRows.length} 筆可新增，${conflicts} 筆衝突，${rows.length - newRows.length - conflicts} 筆相同。`);
    } catch (error) {
        notice('shareImportNotice', error.message, true);
    }
}

function fillShareTargets(preferred) {
    const compatible = compatibleShareBooks(sharedVocabulary, data.books);
    shareTarget.replaceChildren(new Option('建立新班級詞庫', ''), ...compatible.map(book => new Option(bookLabel(book), book.id)));
    if (compatible.some(book => book.id === preferred)) shareTarget.value = preferred;
}

byId('shareDetails').addEventListener('toggle', renderShareExport);
shareExportForm.addEventListener('change', updateShareSelection);
byId('shareToggleAll').addEventListener('click', () => {
    const checks = exportChecks();
    const select = checks.some(check => !check.checked);
    checks.forEach(check => { check.checked = select; });
    updateShareSelection();
});
shareExportForm.addEventListener('submit', event => {
    event.preventDefault();
    try {
        const selected = new Set(new FormData(shareExportForm).getAll('selected'));
        const share = createVocabularyShare(data.books.find(book => book.id === activeId), ownWords().filter(word => selected.has(word.id)));
        const blob = new Blob([JSON.stringify(share, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = '老師詞庫分享.json';
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        notice('shareExportNotice', `已匯出 ${share.words.length} 個詞語。`);
    } catch (error) {
        notice('shareExportNotice', error.message, true);
    }
});
shareFile.addEventListener('change', async () => {
    const file = shareFile.files[0];
    sharedVocabulary = null;
    importPreview = null;
    byId('sharePreview').hidden = true;
    notice('shareImportNotice');
    if (!file) return;
    try {
        if (file.size > vocabularyShareMaxBytes) throw new Error('分享檔須小於 2 MB。');
        const raw = await file.text();
        if (shareFile.files[0] !== file) return;
        sharedVocabulary = parseVocabularyShare(raw);
        fillShareTargets(activeId);
        shareName.value = sharedVocabulary.source.name;
        byId('shareSource').textContent = `來源班級　${bookLabel(sharedVocabulary.source)}`;
        byId('sharePreview').hidden = false;
        renderShareImport();
    } catch (error) {
        if (shareFile.files[0] === file) notice('shareImportNotice', error.message, true);
    }
});
shareTarget.addEventListener('change', renderShareImport);
shareName.addEventListener('input', renderShareImport);
byId('shareImportForm').addEventListener('submit', async event => {
    event.preventDefault();
    const preview = importPreview;
    const share = sharedVocabulary;
    if (!preview || !share || byId('shareApply').disabled || !discardEditor(true)) return;
    const confirmReadings = byId('shareConfirmReadings').checked;
    let result;
    if (!await persist(state => {
        result = applyVocabularyShare(state, share, preview, { confirmReadings, nextId: () => crypto.randomUUID() });
    }, 'shareImportNotice')) return;
    sharedVocabulary = null;
    importPreview = null;
    shareFile.value = '';
    byId('sharePreview').hidden = true;
    activeId = result.book.id;
    clearEditor('1');
    batchForm.reset();
    clearBatch();
    renderBooks();
    notice('shareImportNotice', `已將 ${result.count} 個詞語匯入「${result.book.name}」。`);
});

window.addEventListener('beforeunload', event => {
    if (!dirty && !batchForm.elements.words.value.trim() && !main.hasAttribute('aria-busy')) return;
    event.preventDefault();
    event.returnValue = true;
});

try {
    data = cloud ? readVocabulary(cloud) : readVocabulary();
    renderBooks();
} catch (error) {
    notice('bookNotice', error.message, true);
}
