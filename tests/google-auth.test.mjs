import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cloudReturnUrl, finishGoogleFlow, readGoogleCallback, startGoogleFlow, syncPageUrl, takeGoogleFlow } from '../googleAuth.mjs';

const page = 'https://app.example.test/preview/sync.html';
const projectUrl = 'https://project.example.test';
const googleUser = { id: 'existing-parent', email: 'new@example.test', identities: [{ provider: 'google' }] };

function tabStorage() {
    const data = new Map();
    return {
        getItem: key => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, value),
        removeItem: key => data.delete(key)
    };
}

function provider({ currentUser, resultUser = googleUser, redirect = `${projectUrl}/auth/v1/authorize` } = {}) {
    const calls = [];
    const respond = data => ({ data, error: null });
    return {
        calls,
        async signInWithOAuth(request) {
            calls.push(['signin', request]);
            return respond({ url: redirect, flowId: 'flow-a' });
        },
        async linkIdentity(request) {
            calls.push(['link', request]);
            return respond({ url: redirect, flowId: 'flow-b' });
        },
        async getSession() {
            return respond({ session: currentUser ? { user: currentUser } : null });
        },
        async exchangeCodeForSession(code, options) {
            calls.push(['exchange', code, options]);
            return respond({ session: { user: resultUser } });
        },
        async signOut(options) {
            calls.push(['signout', options]);
            return { error: null };
        }
    };
}

test('the sign-in return preserves cloud exam context and rejects destinations outside the app', () => {
    const target = 'exam.html?part=answers&id=exam-a&cloud=1&code=irrelevant#draft';
    const expected = 'https://app.example.test/preview/exam.html?cloud=1&id=exam-a&part=answers';
    assert.equal(cloudReturnUrl(target, page), expected);
    assert.equal(new URL(syncPageUrl(expected)).searchParams.get('returnTo'), expected);
    assert.equal(cloudReturnUrl('index.html?cloud=1&code=irrelevant', page),
        'https://app.example.test/preview/index.html?cloud=1');
    for (const unsafe of [
        'https://external.example.test/exam.html?cloud=1', '//external.example.test/exam.html?cloud=1',
        '/exam.html?cloud=1', 'another/exam.html?cloud=1', 'exam.html?cloud=0',
        'sync.html?cloud=1', '../index.html?cloud=1', 'javascript:alert(1)',
        'https://other@app.example.test/preview/exam.html?cloud=1'
    ]) assert.equal(cloudReturnUrl(unsafe, page), null);
});

test('a callback accepts exactly one PKCE code and treats implicit tokens or errors as failures', () => {
    assert.deepEqual(readGoogleCallback(new URL(`${page}?code=one`)), { code: 'one', error: null });
    assert.deepEqual(readGoogleCallback(new URL(`${page}#error=access_denied&error_description=raw`)),
        { code: null, error: 'access_denied' });
    for (const suffix of ['?code=a&code=b', '?code=a#access_token=test', '#provider_token=test']) {
        assert.equal(readGoogleCallback(new URL(page + suffix)).code, null);
    }
    assert.equal(readGoogleCallback(new URL(`${page}?returnTo=exam.html`)), null);
});

test('Google sign-in pins the PKCE flow and resumes only from the same tab and project', async () => {
    const auth = provider();
    const storage = tabStorage();
    const returnTo = 'learning.html?cloud=1';
    assert.equal(await startGoogleFlow(auth, { projectUrl, page, returnTo, storage }), `${projectUrl}/auth/v1/authorize`);
    assert.deepEqual(auth.calls[0], ['signin', { provider: 'google',
        options: { redirectTo: page, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } }]);
    assert.equal(takeGoogleFlow(tabStorage(), projectUrl), null);
    const flow = takeGoogleFlow(storage, projectUrl);
    assert.equal(flow.returnTo, 'https://app.example.test/preview/learning.html?cloud=1');
    assert.equal(takeGoogleFlow(storage, projectUrl), null);
    assert.equal((await finishGoogleFlow(auth, { code: 'one' }, flow)).user, googleUser);
    assert.deepEqual(auth.calls[1], ['exchange', 'one', { flowId: 'flow-a' }]);

    await startGoogleFlow(auth, { projectUrl, page, storage });
    assert.equal(takeGoogleFlow(storage, 'https://different.example.test'), null);
    await startGoogleFlow(auth, { projectUrl, page, storage });
    assert.equal(takeGoogleFlow(storage, projectUrl, Date.now() + 16 * 60_000), null);
    await assert.rejects(startGoogleFlow(provider({ redirect: 'https://external.example.test/' }),
        { projectUrl, page, storage }), /登入網址/u);
});

test('manual linking retains the original Auth ID even when the Google email differs', async () => {
    const auth = provider({ currentUser: { id: googleUser.id, email: 'old@example.test' } });
    const storage = tabStorage();
    await startGoogleFlow(auth, { projectUrl, page, ownerId: googleUser.id, storage });
    const flow = takeGoogleFlow(storage, projectUrl);
    assert.equal(auth.calls[0][0], 'link');
    assert.equal((await finishGoogleFlow(auth, { code: 'one' }, flow)).user.id, googleUser.id);
    assert.deepEqual(auth.calls[1], ['exchange', 'one', { flowId: 'flow-b' }]);
});

test('cancelled, stale and conflicting link callbacks cannot exchange into another family', async () => {
    const flow = { ownerId: googleUser.id, flowId: 'flow-b' };
    const other = { ...googleUser, id: 'different-parent' };
    const changed = provider({ currentUser: other });
    await assert.rejects(finishGoogleFlow(changed, { error: 'access_denied' }, flow), /已取消/u);
    await assert.rejects(finishGoogleFlow(changed, { error: 'identity_already_exists' }, flow), /其他帳號/u);
    await assert.rejects(finishGoogleFlow(changed, { code: 'one' }, flow), /登入狀態已變更/u);
    await assert.rejects(finishGoogleFlow(changed, { code: 'one' }, null), /已過期/u);
    assert.deepEqual(changed.calls, []);

    const mismatch = provider({ currentUser: googleUser, resultUser: other });
    await assert.rejects(finishGoogleFlow(mismatch, { code: 'one' }, flow), /原先登入的帳號不一致/u);
    assert.deepEqual(mismatch.calls, [
        ['exchange', 'one', { flowId: 'flow-b' }], ['signout', { scope: 'local' }]
    ]);
});
