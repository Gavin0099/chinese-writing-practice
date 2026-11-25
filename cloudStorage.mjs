import { backupSections, downloadBackupFile, exportBackup, validateBackup } from './backupData.mjs';
import { deploymentCloud } from './cloudConfig.mjs';
import { syncPageUrl } from './googleAuth.mjs';
import { openOfflineFamilyStorage } from './offlineFamilySync.mjs';

const settingsKey = 'write_practice_supabase_settings';
const offlineFlagKey = 'write_practice_offline_sync';
const sdk = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';
const sectionsByKey = new Map(Object.entries(backupSections).map(([section, key]) => [key, section]));

export function formatCloudSaveNotice(outcome) {
    return outcome?.status === 'queued' ? '已暫存於本機，待連線後同步' : '已同步';
}

export function isOfflineSyncEnabled(pageUrl = globalThis.location?.href, deployment = deploymentCloud, storage = globalThis.localStorage) {
    if (pageUrl) {
        try {
            const flag = new URL(pageUrl).searchParams.get('offline');
            if (flag === '0') return false;
            if (flag === '1') return true;
        } catch {
            // Ignore malformed URL and fall through to explicit deployment/local flag.
        }
    }
    if (deployment?.offlineSync === true) return true;
    try {
        return storage?.getItem?.(offlineFlagKey) === '1';
    } catch {
        return false;
    }
}

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

const RETRYABLE_HTTP = new Set([408, 429, 500, 502, 503, 504]);
const CONFLICT_CODES = new Set(['PT409', '40001']);

function isTransientNetworkError(error) {
    if (!error) return false;
    if (error.retryable === true || RETRYABLE_HTTP.has(error.status)) return true;
    if (error.name === 'AbortError') return true;
    const message = String(error.message ?? '');
    return /failed to fetch|networkerror|load failed|fetch failed|timeout/i.test(message);
}

async function readFamilyBackup(client, session) {
    let data;
    let error;
    try {
        ({ data, error } = await client.rpc('read_family_backup')
            .setHeader('Authorization', `Bearer ${session.access_token}`));
    } catch (caught) {
        if (isTransientNetworkError(caught)) {
            throw Object.assign(new Error('無法讀取雲端資料。請檢查網路連線。', { cause: caught }), { retryable: true });
        }
        throw caught;
    }
    if (error) {
        if (isTransientNetworkError(error)) {
            throw Object.assign(new Error('無法讀取雲端資料。請檢查網路連線。', { cause: error }), {
                retryable: true, status: error.status
            });
        }
        throw new Error('無法讀取雲端資料。請檢查專案連線及資料庫設定。', { cause: error });
    }
    if (!Number.isSafeInteger(data?.revision)) throw new Error('無法讀取雲端資料。請檢查專案連線及資料庫設定。');
    const backup = data.backup === null ? exportBackup({ getItem: () => null }) : validateBackup(data.backup);
    return { revision: data.revision, backup };
}

export async function openFamilyStorage(client, onSessionLost = () => {}, onUnconfirmedSave = () => {}, options = {}) {
    const initialSession = await authenticatedSession(client);
    const owner = initialSession.user.id;
    let active = true;
    const sessionChanged = '登入已變更。請重新開啟雲端頁面。';

    if (options.offline === true) {
        let offlineStore;
        const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
            if (active && (!session || session.user.id !== owner || session.user.is_anonymous)) {
                active = false;
                listener.subscription.unsubscribe();
                offlineStore?.close();
                onSessionLost();
            }
        });
        const activeSession = async () => {
            if (!active) throw new Error(sessionChanged);
            const session = await authenticatedSession(client);
            if (!active || session.user.id !== owner) throw new Error(sessionChanged);
            return session;
        };
        try {
            if ((await authenticatedSession(client)).user.id !== owner || !active) throw new Error(sessionChanged);
            offlineStore = await openOfflineFamilyStorage({
                ownerId: owner,
                storage: options.storage,
                indexedDB: options.indexedDB,
                locks: options.locks,
                requireLocks: options.requireLocks ?? false,
                channel: options.channel,
                onStateChange: options.onStateChange,
                now: options.now ?? (() => Date.now()),
                newId: options.newId ?? (() => globalThis.crypto.randomUUID()),
                baseDelayMs: options.baseDelayMs,
                maxDelayMs: options.maxDelayMs,
                async readBackup() {
                    const session = await activeSession();
                    return readFamilyBackup(client, session);
                },
                async saveBackup({ expectedRevision, backup }) {
                    const session = await activeSession();
                    let savedRevision;
                    let error;
                    try {
                        ({ data: savedRevision, error } = await client.rpc('save_family_backup', {
                            p_expected_revision: expectedRevision, p_backup: backup
                        }).setHeader('Authorization', `Bearer ${session.access_token}`));
                    } catch (caught) {
                        if (isTransientNetworkError(caught)) return { retryable: true };
                        throw caught;
                    }
                    if (!active) throw new Error(sessionChanged);
                    if (error) {
                        if (CONFLICT_CODES.has(error.code) || error.status === 409) {
                            return { code: error.code, status: 409 };
                        }
                        if (isTransientNetworkError(error)) return { retryable: true, status: error.status };
                        throw new Error('這次儲存尚未確認。請稍後重試。', { cause: error });
                    }
                    return { revision: savedRevision };
                }
            });
            if (!active) {
                await offlineStore.close();
                throw new Error(sessionChanged);
            }
        } catch (error) {
            active = false;
            listener.subscription.unsubscribe();
            throw error;
        }
        const handleOutcome = (outcome, { throwOnConflict = false } = {}) => {
            options.onSyncOutcome?.(outcome);
            if (outcome?.status === 'conflict') {
                if (outcome.conflictDraft?.payload) {
                    onUnconfirmedSave(outcome.conflictDraft.payload, outcome.conflictDraft);
                }
                if (throwOnConflict) {
                    throw Object.assign(
                        new Error('另一個裝置已儲存較新的資料。請下載未同步備份，再選擇保留本機重送或改用雲端版本。'),
                        { code: 'OFFLINE_CONFLICT', outcome }
                    );
                }
            }
            return outcome;
        };
        const reviewRequest = async query => {
            const session = await activeSession();
            const result = await query()
                .setHeader('Authorization', `Bearer ${session.access_token}`)
                .abortSignal(AbortSignal.timeout(10000));
            if (!active) throw new Error(sessionChanged);
            return result;
        };
        const readReviewAttempts = async () => {
            const attempts = [];
            const size = 100;
            let after;
            for (;;) {
                const { data, error } = await reviewRequest(() => {
                    const query = client.from('review_attempts').select('attempt_id,attempt')
                        .eq('owner_id', owner).order('attempt_id').limit(size);
                    return after === undefined ? query : query.gt('attempt_id', after);
                });
                if (error || !Array.isArray(data)) throw new Error('無法讀取雲端批改紀錄。', { cause: error });
                attempts.push(...data.map(row => row.attempt));
                if (data.length < size) return attempts;
                after = data.at(-1).attempt_id;
            }
        };
        const appendReviewAttempts = async attempts => {
            const { data, error } = await reviewRequest(() =>
                client.rpc('append_review_attempts', { p_attempts: attempts }));
            if (error?.message === 'review_attempt_conflict') throw new Error('同一筆批改紀錄有不同內容，請保留此瀏覽器的紀錄。');
            if (error || data !== attempts.length) throw new Error('尚未確認雲端儲存。', { cause: error });
        };
        return {
            ownerId: owner,
            offlineEnabled: true,
            get hasPending() { return active && offlineStore.hasPending; },
            readReviewAttempts,
            appendReviewAttempts,
            getItem: key => active ? offlineStore.getItem(key) : null,
            async setItem(key, value) {
                if (!active) throw new Error(sessionChanged);
                return handleOutcome(await offlineStore.setItem(key, value), { throwOnConflict: true });
            },
            async sync() {
                if (!active) throw new Error(sessionChanged);
                return handleOutcome(await offlineStore.sync());
            },
            get conflictDraft() { return active ? offlineStore.conflictDraft : null; },
            readLatest: () => active ? offlineStore.readLatest() : Promise.reject(new Error(sessionChanged)),
            resolveConflict: opts => active ? offlineStore.resolveConflict(opts) : Promise.reject(new Error(sessionChanged)),
            async close() {
                active = false;
                listener.subscription.unsubscribe();
                await offlineStore.close();
            }
        };
    }

    let { revision, backup } = await readFamilyBackup(client, initialSession);
    let saving = false;
    let needsReload = false;
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

    async function reviewRequest(query) {
        const session = await authenticatedSession(client);
        if (!active || session.user.id !== owner) throw new Error(sessionChanged);
        const result = await query()
            .setHeader('Authorization', `Bearer ${session.access_token}`)
            .abortSignal(AbortSignal.timeout(10000));
        if (!active) throw new Error(sessionChanged);
        return result;
    }

    async function readReviewAttempts() {
        const attempts = [];
        const size = 100;
        let after;
        for (;;) {
            const { data, error } = await reviewRequest(() => {
                const query = client.from('review_attempts').select('attempt_id,attempt')
                    .eq('owner_id', owner).order('attempt_id').limit(size);
                return after === undefined ? query : query.gt('attempt_id', after);
            });
            if (error || !Array.isArray(data)) throw new Error('無法讀取雲端批改紀錄。', { cause: error });
            attempts.push(...data.map(row => row.attempt));
            if (data.length < size) return attempts;
            after = data.at(-1).attempt_id;
        }
    }

    async function appendReviewAttempts(attempts) {
        const { data, error } = await reviewRequest(() =>
            client.rpc('append_review_attempts', { p_attempts: attempts }));
        if (error?.message === 'review_attempt_conflict') throw new Error('同一筆批改紀錄有不同內容，請保留此瀏覽器的紀錄。');
        if (error || data !== attempts.length) throw new Error('尚未確認雲端儲存。', { cause: error });
    }

    return {
        ownerId: owner,
        readReviewAttempts,
        appendReviewAttempts,
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
        const requeueConflict = document.createElement('button');
        requeueConflict.type = 'button';
        requeueConflict.textContent = '保留本機修改並重送';
        requeueConflict.hidden = true;
        const discardConflict = document.createElement('button');
        discardConflict.type = 'button';
        discardConflict.textContent = '放棄本機草稿、改用雲端版本';
        discardConflict.hidden = true;
        actions.append(requeueConflict, discardConflict);
        let activeConflictDraft = null;
        const syncNow = document.createElement('button');
        syncNow.type = 'button';
        syncNow.textContent = '立即同步';
        syncNow.hidden = true;
        const showConflictNotice = (attempted, conflictEntry) => {
            draft = attempted;
            activeConflictDraft = conflictEntry ?? null;
            const hasResolver = Boolean(activeConflictDraft?.id);
            requeueConflict.hidden = !hasResolver;
            discardConflict.hidden = !hasResolver;
            explanation.setAttribute('data-error', '');
            explanation.textContent = hasResolver
                ? '另一個裝置已儲存較新的雲端資料。請先下載未同步備份，再選擇「保留本機修改並重送」或「放棄本機草稿、改用雲端版本」。'
                : '這次修改已保留在此頁。請下載備份，再重新載入雲端資料。';
            draftNotice.hidden = false;
            window.addEventListener('beforeunload', protectDraft);
        };
        const canOffline = isOfflineSyncEnabled(page.href) &&
            typeof globalThis.indexedDB?.open === 'function' &&
            typeof globalThis.navigator?.locks?.request === 'function';
        const offlineStatusText = outcome => {
            if (outcome?.status === 'queued') {
                status.textContent = '離線待同步：修改已安全暫存於本機 IndexedDB，連線恢復後會自動同步。';
                syncNow.hidden = false;
            } else if (outcome?.status === 'offline') {
                status.textContent = '目前離線：正顯示本機已確認的家庭資料。';
                syncNow.hidden = false;
            } else if (outcome?.status === 'conflict') {
                status.textContent = '偵測到雲端版本衝突：本機修改已保留草稿，請核對後處理。';
                syncNow.hidden = true;
            } else if (outcome?.status === 'synced') {
                status.textContent = home ? '已連線到家庭帳號（已同步）。' : '雲端模式（已同步）。';
                syncNow.hidden = true;
            }
        };
        const context = await openFamilyStorage(client, () => {
            draft = null;
            activeConflictDraft = null;
            window.removeEventListener('beforeunload', protectDraft);
            draftNotice.remove();
            main.replaceChildren();
            location.replace(signIn());
        }, showConflictNotice, canOffline ? {
            offline: true,
            indexedDB: globalThis.indexedDB,
            locks: globalThis.navigator.locks,
            requireLocks: true,
            onSyncOutcome: offlineStatusText,
            onStateChange: () => {
                status.textContent = '另一個分頁已更新家庭資料，請重新整理以顯示最新內容。';
            }
        } : {});
        const runConflictResolution = async action => {
            if (!activeConflictDraft?.id || !context.resolveConflict) return;
            requeueConflict.disabled = true;
            discardConflict.disabled = true;
            try {
                const latest = await context.readLatest();
                await context.resolveConflict({
                    action,
                    expectedConflictId: activeConflictDraft.id,
                    latestRevision: latest.revision
                });
                if (action === 'requeue') await context.sync();
                window.removeEventListener('beforeunload', protectDraft);
                location.reload();
            } catch (err) {
                explanation.textContent = `衝突處理失敗：${err.message}`;
                requeueConflict.disabled = false;
                discardConflict.disabled = false;
            }
        };
        requeueConflict.addEventListener('click', () => { runConflictResolution('requeue'); });
        discardConflict.addEventListener('click', () => { runConflictResolution('discard'); });
        syncNow.addEventListener('click', () => { context.sync?.().catch(() => {}); });
        status.after(syncNow);
        useCloudNavigation();
        status.textContent = home ? '已連線到家庭帳號。' : '雲端模式。看到已同步後，即可在其他裝置開啟這筆資料。';
        if (context.offlineEnabled) {
            window.addEventListener('online', () => { context.sync?.().catch(() => {}); });
            if (context.conflictDraft) {
                showConflictNotice(context.conflictDraft.payload, context.conflictDraft);
                offlineStatusText({ status: 'conflict', conflictDraft: context.conflictDraft });
            } else if (context.hasPending) {
                if (globalThis.navigator?.onLine === false) {
                    offlineStatusText({ status: 'queued' });
                } else {
                    context.sync().catch(() => {});
                }
            }
        }
        window.addEventListener('pagehide', event => {
            if (event.persisted) {
                main.hidden = true;
                context.close?.();
            }
        });
        window.addEventListener('pageshow', event => {
            if (event.persisted) {
                main.hidden = true;
                location.reload();
            }
        });
        main.inert = false;
        return Object.assign(context, { readCurriculumCatalog: () => readCurriculumCatalog(client, true) });
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
