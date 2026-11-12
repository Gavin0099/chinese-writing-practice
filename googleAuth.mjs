const pendingKey = 'write-practice-google-flow';
const maxFlowAge = 15 * 60 * 1000;
const returnParams = new Map([
    ['index.html', []],
    ['vocabulary.html', ['book']],
    ['learning.html', []],
    ['exam.html', ['id', 'part']]
]);

export function cloudReturnUrl(target, page) {
    if (!target) return null;
    const root = new URL('./', page);
    let url;
    try {
        url = new URL(target, root);
    } catch {
        return null;
    }
    if (url.origin !== root.origin || url.username || url.password) return null;
    const file = url.pathname.slice(root.pathname.length);
    if (!url.pathname.startsWith(root.pathname) || !returnParams.has(file) ||
        url.searchParams.get('cloud') !== '1') return null;
    const destination = new URL(file, root);
    destination.searchParams.set('cloud', '1');
    for (const name of returnParams.get(file)) {
        const value = url.searchParams.get(name);
        if (value) destination.searchParams.set(name, value);
    }
    return destination.href;
}

export function syncPageUrl(page) {
    const url = new URL('sync.html', page);
    const returnTo = cloudReturnUrl(page, url.href);
    if (returnTo) url.searchParams.set('returnTo', returnTo);
    return url.href;
}

export function googleIdentity(user) {
    return user?.identities?.some(identity => identity.provider === 'google') ?? false;
}

export function readGoogleCallback(url) {
    const query = url.searchParams;
    const hash = new URLSearchParams(url.hash.slice(1));
    const error = query.get('error_code') || hash.get('error_code') || query.get('error') || hash.get('error');
    const unexpected = ['access_token', 'refresh_token', 'provider_token', 'provider_refresh_token', 'id_token']
        .some(name => query.has(name) || hash.has(name));
    const codes = query.getAll('code');
    if (!error && !unexpected && !codes.length && !query.has('sb_flow_id') &&
        !query.has('error_description') && !hash.has('error_description')) return null;
    return { code: codes.length === 1 && !unexpected && !error ? codes[0] : null, error };
}

export function takeGoogleFlow(storage, projectUrl, now = Date.now()) {
    const saved = storage.getItem(pendingKey);
    storage.removeItem(pendingKey);
    try {
        const flow = JSON.parse(saved);
        if (flow?.projectUrl === projectUrl && typeof flow.flowId === 'string' && flow.flowId &&
            Number.isFinite(flow.startedAt) && flow.startedAt <= now && now - flow.startedAt <= maxFlowAge) return flow;
    } catch {
        // Treat invalid or stale flow state as an interrupted sign-in.
    }
    return null;
}

export async function startGoogleFlow(auth, { projectUrl, page, returnTo, ownerId, storage }) {
    const callback = new URL('sync.html', page);
    const loopback = ['localhost', '127.0.0.1'].includes(callback.hostname);
    if (callback.protocol !== 'https:' && !(loopback && callback.protocol === 'http:')) {
        throw new Error('請從 HTTPS 網站開啟 Google 登入。');
    }
    const request = { provider: 'google', options: {
        redirectTo: callback.href, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' }
    } };
    storage.removeItem(pendingKey);
    const result = ownerId ? await auth.linkIdentity(request) : await auth.signInWithOAuth(request);
    if (result.error || !result.data?.flowId || !result.data.url) {
        throw new Error(ownerId ? '目前無法連結 Google。請確認原帳號仍在登入，稍後再試。' : '目前無法開啟 Google 登入。請稍後再試。');
    }
    const redirect = new URL(result.data.url);
    const project = new URL(projectUrl);
    const isProject = redirect.origin === project.origin && redirect.pathname.startsWith('/auth/v1/');
    const isGoogle = redirect.origin === 'https://accounts.google.com';
    if ((!isProject && !isGoogle) || redirect.username || redirect.password) throw new Error('Google 登入網址無法確認。請重試。');
    storage.setItem(pendingKey, JSON.stringify({
        projectUrl, flowId: result.data.flowId, ownerId: ownerId ?? null, startedAt: Date.now(),
        returnTo: cloudReturnUrl(returnTo, callback.href)
    }));
    return redirect.href;
}

export async function finishGoogleFlow(auth, callback, flow) {
    if (!flow) throw new Error('這次登入已過期或未從此分頁發起。請重新登入。');
    if (!callback.code) {
        const cancelled = callback.error === 'access_denied';
        if (callback.error === 'identity_already_exists') {
            throw new Error('這個 Google 帳號已連結其他帳號。請回到原帳號核對資料。');
        }
        if (flow.ownerId) throw new Error(cancelled ? '已取消連結 Google。' : 'Google 連結未完成。請重試。');
        throw new Error(cancelled ? '已取消 Google 登入。' : 'Google 登入未完成。請重試。');
    }
    const { data: current, error: sessionError } = await auth.getSession();
    const currentId = current?.session?.user?.id ?? null;
    if (sessionError || currentId !== flow.ownerId) {
        throw new Error('這個瀏覽器的登入狀態已變更。請確認帳號後再試。');
    }
    const { data, error } = await auth.exchangeCodeForSession(callback.code, { flowId: flow.flowId });
    const session = data?.session;
    if (error || !session?.user?.id || session.user.is_anonymous) {
        throw new Error(flow.ownerId ? 'Google 連結未完成。請重試。' : 'Google 登入未完成。請重新登入。');
    }
    if (flow.ownerId && session.user.id !== flow.ownerId) {
        await auth.signOut({ scope: 'local' });
        throw new Error('帳號與原先登入的帳號不一致，請重新登入原帳號。');
    }
    if (!googleIdentity(session.user)) {
        if (!flow.ownerId) await auth.signOut({ scope: 'local' });
        throw new Error('尚未確認 Google 身份。請回到帳號頁核對後再試。');
    }
    return session;
}
