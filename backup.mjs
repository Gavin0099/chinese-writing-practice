import { backupCounts, downloadBackupFile, exportBackup, parseBackup, readBackupTarget, restoreBackup } from './backupData.mjs';

const byId = id => document.getElementById(id);
const fileInput = byId('backupFile');
const restoreButton = byId('restoreBackup');
let pending = null;

function notice(id, message, error = false) {
    const element = byId(id);
    element.textContent = message;
    element.toggleAttribute('data-error', error);
}

function describe(backup) {
    const { books, words, exams, progress, writing } = backupCounts(backup);
    return `${books} 個班級、${words} 個詞語、${exams} 份考卷、${progress} 筆教學進度、${writing} 筆習寫紀錄。`;
}

function existingRecords() {
    try {
        const current = exportBackup();
        notice('currentSummary', `目前有 ${describe(current)}`);
        return Object.values(backupCounts(current)).some(count => count > 0);
    } catch {
        notice('currentSummary', '目前資料無法完整讀取。', true);
        return true;
    }
}

function resetPreview() {
    pending = null;
    restoreButton.hidden = true;
}

byId('downloadBackup').addEventListener('click', () => {
    try {
        downloadBackupFile(exportBackup());
        notice('exportNotice', '備份檔已交給瀏覽器下載。');
    } catch (error) {
        notice('exportNotice', error instanceof SyntaxError ? '目前資料無法讀取，請保留瀏覽器資料。' : error.message, true);
    }
});

fileInput.addEventListener('change', async () => {
    resetPreview();
    const file = fileInput.files[0];
    if (!file) {
        notice('restoreNotice', '');
        return;
    }
    try {
        const backup = parseBackup(await file.text());
        if (fileInput.files[0] !== file) return;
        const target = readBackupTarget();
        const replaces = existingRecords();
        pending = { backup, target, replaces };
        notice('restoreNotice', `檔案包含 ${describe(backup)}${replaces ? '還原會取代目前的詞庫、考卷與學習紀錄。' : ''}`);
        restoreButton.hidden = false;
    } catch (error) {
        if (fileInput.files[0] !== file) return;
        notice('restoreNotice', error.message, true);
        fileInput.value = '';
    }
});

restoreButton.addEventListener('click', () => {
    if (!pending) return;
    if (pending.replaces && !window.confirm('要用這份備份取代目前的詞庫、考卷與學習紀錄嗎？')) return;
    try {
        restoreBackup(pending.backup, pending.target);
        existingRecords();
        notice('restoreNotice', '還原完成。重新開啟詞庫或學習查詢即可看到紀錄。');
    } catch (error) {
        notice('restoreNotice', error.message, true);
    }
    fileInput.value = '';
    resetPreview();
});

existingRecords();
