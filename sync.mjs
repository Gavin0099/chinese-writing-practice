import { backupCounts, downloadBackupFile, exportBackup } from './backupData.mjs';
import { deploymentCloud } from './cloudConfig.mjs';
import { connectCloud, openFamilyStorage, readCloudSettings, saveCloudSettings } from './cloudStorage.mjs';
import { cloudReturnUrl, finishGoogleFlow, googleIdentity, readGoogleCallback, startGoogleFlow, syncPageUrl, takeGoogleFlow } from './googleAuth.mjs';

const byId = id => document.getElementById(id);
const settingsForm = byId('settingsForm');
const emailForm = byId('emailForm');
const codeForm = byId('codeForm');
const migrate = byId('migrateLocal');
const googleButton = byId('googleButton');
const linkGoogle = byId('linkGoogle');
const retry = byId('retrySync');
const page = new URL(location.href);
const callback = readGoogleCallback(page);
const managed = Boolean(deploymentCloud.url && deploymentCloud.key);
const localEmail = !managed && ['127.0.0.1', 'localhost'].includes(page.hostname);
let returnTo = cloudReturnUrl(page.searchParams.get('returnTo'), page.href);
let settings;
let client;
let family;
let user;
let email;

// Keep one-time codes and provider errors out of later navigations and browser history.
if (callback) history.replaceState(null, '', new URL('sync.html', page));

function notice(id, message, error = false) {
    const element = byId(id);
    element.textContent = message;
    element.toggleAttribute('data-error', error);
}

function describe(backup) {
    const { books, words, exams, progress, writing } = backupCounts(backup);
    return `${books} 個班級、${words} 個詞語、${exams} 份考卷、${progress} 筆教學進度、${writing} 筆習寫紀錄`;
}

function showMigration() {
    migrate.hidden = true;
    try {
        const local = exportBackup();
        if (Object.values(backupCounts(local)).some(count => count > 0)) {
            if (family.hasSavedBackup()) {
                notice('migrationHelp', '這個帳號已有雲端紀錄。本機資料仍在此瀏覽器，可到本機備份頁下載並逐筆核對。');
                return;
            }
            notice('migrationHelp', `此瀏覽器有 ${describe(local)}。確認帳號後可上傳到這個空白家庭。`);
            migrate.hidden = false;
        }
    } catch {
        notice('migrationHelp', '本機資料無法完整讀取。請先在備份頁確認紀錄。', true);
    }
}

async function showWorkspace(session, resume = false) {
    user = session.user;
    notice('loginNotice', user.email ? `已登入 ${user.email}。` : '已登入家庭帳號。');
    byId('googleSignIn').hidden = true;
    byId('localEmailTest').hidden = true;
    byId('accountActions').hidden = false;
    byId('projectSettings').hidden = true;
    family?.close();
    family = await openFamilyStorage(client, () => {
        byId('cloudWorkspace').hidden = true;
        byId('accountActions').hidden = true;
        user = null;
        location.reload();
    });
    if (resume && returnTo) {
        location.replace(returnTo);
        return;
    }
    linkGoogle.hidden = (managed && !deploymentCloud.allowGoogleLink) || googleIdentity(user);
    byId('cloudWorkspace').hidden = false;
    notice('workspaceNotice', `雲端目前有 ${describe(exportBackup(family))}。`);
    showMigration();
}

async function goToGoogle(ownerId) {
    const button = ownerId ? linkGoogle : googleButton;
    button.disabled = true;
    notice('loginNotice', '正在開啟 Google…');
    try {
        const response = await fetch(new URL('/auth/v1/settings', settings.url), {
            headers: { apikey: settings.key }, cache: 'no-store'
        }).catch(() => null);
        if (!response?.ok) throw new Error('無法連到登入服務。請檢查網路後重試。');
        if (!(await response.json()).external?.google) {
            throw new Error('這個雲端專案尚未啟用 Google 登入。你仍可使用本機工具。');
        }
        const url = await startGoogleFlow(client.auth, {
            projectUrl: settings.url, page: page.href, returnTo, ownerId, storage: sessionStorage
        });
        location.assign(url);
    } catch (error) {
        notice('loginNotice', error.message, true);
        button.disabled = false;
        button.focus();
    }
}

googleButton.addEventListener('click', () => goToGoogle());
linkGoogle.addEventListener('click', async () => {
    if (!user || !family) return;
    if (!window.confirm('將所選 Google 帳號連結到目前家庭。之後可以用它開啟這份家庭資料。確定繼續？')) return;
    const ownerId = user.id;
    linkGoogle.disabled = true;
    try {
        const { data, error } = await client.auth.getUser();
        if (error || data.user?.id !== ownerId) throw new Error('請重新登入原帳號，再連結 Google。');
        if (googleIdentity(data.user)) {
            linkGoogle.hidden = true;
            notice('loginNotice', '這個帳號已連結 Google。');
            return;
        }
        await goToGoogle(ownerId);
    } catch (error) {
        notice('loginNotice', error.message, true);
        linkGoogle.disabled = false;
    }
});

byId('backupCloud').addEventListener('click', () => {
    if (!family || !user) return;
    try {
        downloadBackupFile(exportBackup(family));
        notice('workspaceNotice', '雲端備份已交給瀏覽器下載。');
    } catch (error) {
        notice('workspaceNotice', error.message, true);
    }
});

settingsForm.addEventListener('submit', event => {
    event.preventDefault();
    try {
        saveCloudSettings(settingsForm.elements.url.value.trim(), settingsForm.elements.key.value.trim());
        location.reload();
    } catch (error) {
        notice('settingsNotice', error.message, true);
    }
});

emailForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    email = emailForm.elements.email.value.trim();
    try {
        const { error } = await client.auth.signInWithOtp({ email });
        if (error) throw error;
        emailForm.hidden = true;
        codeForm.hidden = false;
        codeForm.elements.code.focus();
        notice('loginNotice', `已要求寄送驗證碼至 ${email}。`);
    } catch {
        notice('loginNotice', '暫時無法寄送驗證碼。請確認 Email，稍後再試。', true);
    } finally {
        button.disabled = false;
    }
});

byId('changeEmail').addEventListener('click', () => {
    codeForm.reset();
    codeForm.hidden = true;
    emailForm.hidden = false;
    emailForm.elements.email.focus();
    notice('loginNotice', '');
});

codeForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    try {
        const { data, error } = await client.auth.verifyOtp({ email, token: codeForm.elements.code.value, type: 'email' });
        if (error || !data.session) {
            notice('loginNotice', '驗證碼無效或過期。請核對，或重新寄送。', true);
            return;
        }
        codeForm.reset();
        await showWorkspace(data.session, true);
    } catch (error) {
        notice('loginNotice', error.message, true);
    } finally {
        button.disabled = false;
    }
});

migrate.addEventListener('click', async () => {
    if (family.hasSavedBackup()) return;
    migrate.disabled = true;
    try {
        const outcome = await family.importBackup(exportBackup());
        if (outcome === 'cloud_has_data') {
            notice('workspaceNotice', '這個帳號已有雲端紀錄，本機資料仍在此瀏覽器。請先到本機備份頁下載，再開啟雲端詞庫核對。', true);
            migrate.hidden = true;
            notice('migrationHelp', '');
            return;
        }
        const result = outcome === 'already_imported' ? '這份本機資料已匯入。雲端目前有' : '已同步';
        notice('workspaceNotice', `${result} ${describe(exportBackup(family))}。`);
        notice('migrationHelp', '');
        migrate.hidden = true;
    } catch (error) {
        notice('workspaceNotice', error.message, true);
    } finally {
        migrate.disabled = false;
    }
});

byId('signOut').addEventListener('click', async () => {
    const button = byId('signOut');
    button.disabled = true;
    try {
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error && user && (await client.auth.getSession()).data.session) throw error;
        // The family listener reloads the page when the local session is removed.
        if (user) location.reload();
    } catch {
        notice('loginNotice', '無法確認登出，請稍後重試。', true);
        button.disabled = false;
    }
});

retry.addEventListener('click', () => location.reload());
window.addEventListener('pageshow', event => {
    if (event.persisted) location.reload();
});

try {
    settings = readCloudSettings();
    byId('projectSettings').hidden = managed;
    if (!settings) {
        notice('loginNotice', '雲端連線尚未設定。你可以先使用本機工具。');
        if (localEmail) byId('projectSettings').open = true;
    } else {
        if (!managed) {
            settingsForm.elements.url.value = settings.url;
            settingsForm.elements.key.value = settings.key;
        }
        const flow = callback ? takeGoogleFlow(sessionStorage, settings.url) : null;
        if (flow) {
            returnTo = cloudReturnUrl(flow.returnTo, page.href);
            if (returnTo) history.replaceState(null, '', syncPageUrl(returnTo));
        }
        client = await connectCloud(settings);
        let callbackError;
        let linked = false;
        let session;
        if (callback) {
            try {
                session = await finishGoogleFlow(client.auth, callback, flow);
                linked = Boolean(flow.ownerId);
            } catch (error) {
                callbackError = error.message;
            }
        }
        if (!session) {
            const { data, error } = await client.auth.getSession();
            if (error) throw new Error('無法確認登入狀態。請檢查連線後重試。');
            session = data.session;
        }
        if (session?.user?.id && !session.user.is_anonymous) await showWorkspace(session, !callbackError);
        else {
            byId('googleSignIn').hidden = false;
            byId('localEmailTest').hidden = !localEmail;
            emailForm.hidden = !localEmail;
            notice('loginNotice', '');
        }
        if (callbackError) notice('loginNotice', callbackError, true);
        if (linked && !returnTo) notice('loginNotice', 'Google 已連結。這個帳號可以繼續開啟同一份家庭資料。');
    }
} catch (error) {
    retry.hidden = false;
    notice('loginNotice', client ? error.message : '無法開啟雲端連線。請檢查網路或連線設定後重試。', true);
}
