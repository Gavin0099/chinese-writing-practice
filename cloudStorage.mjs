import { backupSections, downloadBackupFile, exportBackup, validateBackup } from './backupData.mjs';
import { deploymentCloud } from './cloudConfig.mjs';
import { syncPageUrl } from './googleAuth.mjs';

const settingsKey = 'write_practice_supabase_settings';
const sdk = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';
const sectionsByKey = new Map(Object.entries(backupSections).map(([section, key]) => [key, section]));

export function readCloudSettings() {
    if (deploymentCloud.url && deploymentCloud.key) return deploymentCloud;
    const saved = localStorage.getItem(settingsKey);
    return saved ? JSON.parse(saved) : null;
}

export function saveCloudSettings(projectUrl, key) {
    const url = new URL(projectUrl);
    const loopback = ['localhost', '127.0.0.1'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) throw new Error('請輸入 Supabase 專案的 HTTPS 網址。');
    if (!key.startsWith('sb_publishable_')) {
        let role;
        try {
            const payload = key.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
            role = JSON.parse(atob(payload)).role;
        } catch {
            // Legacy local development keys are JWTs; the role must be anon.
        }
        if (role !== 'anon') throw new Error('請使用 Supabase Publishable Key 或 anon key。');
    }
    localStorage.setItem(settingsKey, JSON.stringify({ url: url.origin, key }));
}

export async function connectCloud(settings = readCloudSettings()) {
    if (!settings) throw new Error('請先設定 Supabase 專案。');
    const { createClient } = await import(sdk);
    return createClient(settings.url, settings.key, { auth: {
        storageKey: `write-practice-auth:${settings.url}`, detectSessionInUrl: false, flowType: 'pkce'
    } });
}

export async function readCurriculumCatalog(client, includeReview = false) {
    async function readRows(query) {
        const size = 100;
        const courses = [];
        for (let from = 0; ; from += size) {
            const { data, error } = await query().order('course_key').range(from, from + size - 1)
                .abortSignal(AbortSignal.timeout(8000));
            if (error || !Array.isArray(data)) throw new Error('無法載入雲端教材。', { cause: error });
            courses.push(...data.map(row => row.course));
            if (data.length < size) return courses;
        }
    }
    const [published, review] = await Promise.all([
        readRows(() => client.from('curriculum_catalog').select('course_key,course')),
        includeReview ? readRows(() => client.rpc('read_review_curriculum')) : []
    ]);
    return { published, review };
}

async function currentSession(client) {
    const { data, error } = await client.auth.getSession();
    if (error) throw new Error('無法確認登入狀態。請檢查連線後重試。');
    const session = data.session;
    return session?.user?.id && !session.user.is_anonymous ? session : null;
}

async function authenticatedSession(client) {
    const session = await currentSession(client);
    if (!session) throw new Error('請登入後再開啟雲端資料。');
    return session;
}

async function readFamilyBackup(client, session) {
    const { data, error } = await client.rpc('read_family_backup')
        .setHeader('Authorization', `Bearer ${session.access_token}`);
    if (error || !Number.isSafeInteger(data?.revision)) throw new Error('無法讀取雲端資料。請檢查專案連線及資料庫設定。');
    const backup = data.backup === null ? exportBackup({ getItem: () => null }) : validateBackup(data.backup);
    return { revision: data.revision, backup };
}

export async function openFamilyStorage(client, onSessionLost = () => {}, onUnconfirmedSave = () => {}) {
    const initialSession = await authenticatedSession(client);
    const owner = initialSession.user.id;
    let { revision, backup } = await readFamilyBackup(client, initialSession);
    let saving = false;
    let active = true;
    let needsReload = false;
    const sessionChanged = '登入已變更。請重新開啟雲端頁面。';
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
        if (active && (!session || session.user.id !== owner || session.user.is_anonymous)) {
            active = false;
            backup = null;
            onSessionLost();
        }
    });
    try {
        if ((await authenticatedSession(client)).user.id !== owner || !active) throw new Error(sessionChanged);
    } catch (error) {
        listener.subscription.unsubscribe();
        throw error;
    }

    async function write(operation) {
        if (!active) throw new Error(sessionChanged);
        if (saving) throw new Error('正在同步，請等目前這筆資料儲存完成。');
        saving = true;
        try {
            const session = await authenticatedSession(client);
            if (!active || session.user.id !== owner) throw new Error(sessionChanged);
            return await operation(session);
        } finally {
            saving = false;
        }
    }

    function save(next) {
        return write(async session => {
            if (needsReload) throw new Error('請先下載未同步備份，再重新載入雲端頁面後繼續編輯。');
            const normalized = validateBackup({ ...next, exportedAt: new Date().toISOString() });
            const { data: savedRevision, error } = await client.rpc('save_family_backup', {
                p_expected_revision: revision, p_backup: normalized
            }).setHeader('Authorization', `Bearer ${session.access_token}`);
            if (!active) throw new Error(sessionChanged);
            if (error || savedRevision !== revision + 1) {
                needsReload = true;
                onUnconfirmedSave(normalized);
                const conflict = ['PT409', '40001'].includes(error?.code);
                const reason = conflict ? '另一個裝置已儲存較新的資料。' : '這次儲存尚未確認。';
                throw new Error(`${reason}請下載未同步備份，再重新載入核對雲端資料。`, { cause: error });
            }
            revision = savedRevision;
            backup = normalized;
        });
    }

    function importBackup(next) {
        return write(async session => {
            const { data: outcome, error } = await client.rpc('import_family_backup', {
                p_backup: validateBackup(next)
            }).setHeader('Authorization', `Bearer ${session.access_token}`);
            if (!active) throw new Error(sessionChanged);
            if (error?.message === 'family_already_has_data') return 'cloud_has_data';
            if (error || !['imported', 'already_imported'].includes(outcome)) {
                throw new Error('尚未確認匯入結果。本機資料仍保留，可以重試。');
            }
            const latest = await readFamilyBackup(client, session);
            if (!active) throw new Error(sessionChanged);
            ({ revision, backup } = latest);
            return outcome;
        });
    }

    return {
        getItem(key) { const section = sectionsByKey.get(key); return section && backup ? JSON.stringify(backup[section]) : null; },
        setItem(key, value) {
            const section = sectionsByKey.get(key);
            if (!section) throw new Error('這項資料沒有雲端儲存欄位。');
            return save({ ...backup, [section]: JSON.parse(value) });
        },
        hasSavedBackup: () => revision > 0,
        importBackup,
        close() {
            active = false;
            backup = null;
            listener.subscription.unsubscribe();
        }
    };
}

export function cloudPageUrl(path) {
    const url = new URL(path, location.href);
    url.searchParams.set('cloud', '1');
    return url.href;
}

export function useCloudNavigation() {
    for (const link of document.querySelectorAll('a[data-workspace-link]')) {
        link.href = cloudPageUrl(link.href);
    }
}

export async function openPageStorage({ home = false, resumeSession = home } = {}) {
    const page = new URL(location.href);
    const explicit = page.searchParams.get('cloud') === '1';
    if (!explicit && (!resumeSession || page.searchParams.get('local') === '1')) return null;
    if (explicit) useCloudNavigation();
    const main = document.querySelector('main');
    const status = document.createElement('p');
    status.className = 'notice cloud-mode-status';
    status.setAttribute('role', 'status');
    status.textContent = '正在讀取雲端資料…';
    const signIn = () => syncPageUrl(cloudPageUrl(home ? 'index.html' : page));
    let openingCloud = explicit;
    try {
        const settings = readCloudSettings();
        if (!explicit && !settings) return null;
        const client = await connectCloud(settings);
        if (!explicit && !(await currentSession(client))) {
            return { isGuest: true, readCurriculumCatalog: () => readCurriculumCatalog(client) };
        }
        openingCloud = true;
        main.inert = true;
        main.before(status);
        const download = document.createElement('button');
        download.type = 'button';
        download.textContent = '下載未同步備份';
        const reload = document.createElement('button');
        reload.type = 'button';
        reload.textContent = '重新載入雲端資料';
        reload.hidden = true;
        const draftNotice = document.createElement('aside');
        draftNotice.className = 'panel cloud-mode-status cloud-draft';
        draftNotice.hidden = true;
        const explanation = document.createElement('p');
        explanation.className = 'notice';
        explanation.setAttribute('role', 'status');
        explanation.setAttribute('data-error', '');
        const actions = document.createElement('div');
        actions.className = 'actions';
        actions.append(download, reload);
        draftNotice.append(explanation, actions);
        main.before(draftNotice);
        let draft;
        function protectDraft(event) {
            event.preventDefault();
            event.returnValue = '';
        }
        download.addEventListener('click', () => {
            downloadBackupFile(draft, true);
            window.removeEventListener('beforeunload', protectDraft);
            reload.hidden = false;
            explanation.removeAttribute('data-error');
            explanation.textContent = '已交給瀏覽器下載。可在本機備份與還原頁開啟這份備份，核對後再把需要的修改輸入雲端。';
        });
        reload.addEventListener('click', () => location.reload());
        const context = await openFamilyStorage(client, () => {
            draft = null;
            window.removeEventListener('beforeunload', protectDraft);
            draftNotice.remove();
            main.replaceChildren();
            location.replace(signIn());
        }, attempted => {
            draft = attempted;
            explanation.textContent = '這次修改已保留在此頁。請下載備份，再重新載入雲端資料。';
            draftNotice.hidden = false;
            window.addEventListener('beforeunload', protectDraft);
        });
        useCloudNavigation();
        status.textContent = home ? '已連線到家庭帳號。' : '雲端模式。看到已同步後，即可在其他裝置開啟這筆資料。';
        window.addEventListener('pagehide', event => {
            if (event.persisted) main.hidden = true;
        });
        window.addEventListener('pageshow', event => {
            if (event.persisted) {
                main.hidden = true;
                location.reload();
            }
        });
        main.inert = false;
        return { ...context, readCurriculumCatalog: () => readCurriculumCatalog(client, true) };
    } catch (error) {
        if (!openingCloud && !home) return null;
        main.inert = true;
        main.before(status);
        status.textContent = `${error.message} `;
        status.setAttribute('data-error', '');
        const link = document.createElement('a');
        link.href = signIn();
        link.textContent = '前往登入或重試連線';
        status.append(link);
        throw error;
    }
}
