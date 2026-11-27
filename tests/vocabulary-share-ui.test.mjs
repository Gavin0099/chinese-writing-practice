import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { vocabularyStorageKey } from '../vocabularyData.mjs';
import { vocabularyShareMaxBytes } from '../vocabularyShare.mjs';

// DOM seam test using the repo's existing node:vm approach. Run the whole page
// script, replacing import bindings and unrelated cloud/photo entry points only.
// Nodes, FormData, downloads and file selection are doubles, not a browser.
const html = await readFile(new URL('../vocabulary.html', import.meta.url), 'utf8');
const pageSource = await readFile(new URL('../vocabulary.mjs', import.meta.url), 'utf8');
const imports = [...pageSource.matchAll(/^import\s+\{([^}]+)\}\s+from\s+'([^']+)';/gm)];
const bindings = {};
for (const [, names, path] of imports) {
    const module = await import(new URL(path, new URL('../vocabulary.mjs', import.meta.url)));
    for (const name of names.split(',').map(name => name.trim())) bindings[name] = module[name];
}
const executable = pageSource.replace(/^import\s+\{[^}]+\}\s+from\s+'[^']+';/gm, '');

const source = { id: 'source', name: '來源班級', publisher: '康軒', year: 115, grade: 2, semester: 1, edition: '修訂版' };
const target = { ...source, id: 'target', name: '接收班級' };
const sunny = { lesson: 3, word: '晴天', pronunciation: ['ㄑㄧㄥˊ', 'ㄊㄧㄢ'], blanks: [1] };
const sky = { lesson: 3, word: '天空', pronunciation: ['ㄊㄧㄢ', 'ㄎㄨㄥ'], blanks: [1] };
const rain = { lesson: 3, word: '雨天', pronunciation: [], blanks: [1] };
const share = { format: 'chinese-writing-practice-vocabulary', version: 1,
    source: { name: source.name, publisher: '康軒', year: 115, grade: 2, semester: 1, edition: '修訂版' }, words: [sunny, sky, rain] };
const word = (fields, id, bookId = target.id) => ({ ...fields, id, bookId, confirmed: true });
const file = (text = JSON.stringify(share)) => new File([text], '詞庫.json', { type: 'application/json' });
const snapshot = values => [...values.entries()];

class NodeDouble {
    constructor(tag = '') {
        Object.assign(this, { tag, value: '', textContent: '', checked: false, disabled: false,
            hidden: false, open: false, children: [], dataset: {}, files: [], elements: {}, listeners: new Map(), attributes: new Map() });
        this.classList = { toggle() {} };
    }
    addEventListener(type, callback) {
        const callbacks = this.listeners.get(type) ?? [];
        callbacks.push(callback);
        this.listeners.set(type, callbacks);
    }
    async fire(type, target = this) {
        for (const callback of this.listeners.get(type) ?? []) await callback({ target, preventDefault() {} });
    }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    add(node) { this.append(node); }
    setAttribute(key, value) { this.attributes.set(key, String(value)); }
    removeAttribute(key) { this.attributes.delete(key); }
    hasAttribute(key) { return this.attributes.has(key); }
    toggleAttribute(key, force) { if (force) this.setAttribute(key, ''); else this.removeAttribute(key); }
    querySelectorAll(selector) {
        assert.ok(['input', 'input:checked'].includes(selector), `unsupported test selector: ${selector}`);
        const descendants = this.children.filter(child => child instanceof NodeDouble)
            .flatMap(child => [child, ...child.querySelectorAll('input')]);
        return descendants.filter(child => child.tag === 'input' && (selector !== 'input:checked' || child.checked));
    }
    focus() {}
    reset() { for (const node of Object.values(this.elements)) { node.value = ''; node.checked = false; } }
    remove() {}
}

async function boot(values = new Map()) {
    const nodes = new Map([...html.matchAll(/<([\w-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)]
        .map(([, tag, attributes, id]) => {
            const node = new NodeDouble(tag);
            for (const flag of ['hidden', 'disabled', 'checked']) node[flag] = new RegExp(`\\s${flag}(?:\\s|$)`).test(attributes);
            return [id, node];
        }));
    const get = id => { assert.ok(nodes.has(id), `missing HTML id: ${id}`); return nodes.get(id); };
    for (const [id, fields] of Object.entries({
        bookForm: { year: '' }, wordForm: { word: '', pronunciation: '', lesson: '1', confirmed: '' },
        batchForm: { words: '', lesson: '1' }, examForm: { from: '1', to: '8', count: '15', blankMode: 'vocabulary', examType: 'character', prioritize: '' }
    })) {
        get(id).elements = Object.fromEntries(Object.entries(fields).map(([name, value]) => {
            const node = new NodeDouble('input'); node.value = value; return [name, node];
        }));
    }
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    const urls = new Map();
    const downloads = [];
    class TestURL extends URL {
        static createObjectURL(blob) { const url = `blob:test-${urls.size}`; urls.set(url, blob); return url; }
        static revokeObjectURL(url) { urls.delete(url); }
    }
    const document = {
        getElementById: get,
        querySelector: selector => { assert.equal(selector, 'main'); return get('main'); },
        body: new NodeDouble('body'),
        createElement(tag) {
            const node = new NodeDouble(tag);
            if (tag === 'a') node.click = () => downloads.push({ name: node.download, blob: urls.get(node.href) });
            return node;
        }
    };
    const timers = [];
    let sequence = 0;
    const context = { ...bindings, document, localStorage: storage, URL: TestURL, URLSearchParams, Blob, DOMException,
        location: { href: 'http://localhost/vocabulary.html?local=1' }, history: { replaceState() {} },
        window: { addEventListener() {}, confirm: () => true },
        crypto: { randomUUID: () => `import-${++sequence}` },
        Option: function (label, value) { const option = new NodeDouble('option'); option.textContent = label; option.value = String(value); return option; },
        FormData: class {
            constructor(form) { assert.equal(form, get('shareExportForm')); }
            getAll(name) { return get('shareExportWords').querySelectorAll('input:checked').filter(node => node.name === name).map(node => node.value); }
        },
        setTimeout: callback => timers.push(callback),
        openPageStorage: async () => null, initPhotoImport: () => ({ reset() {} }),
        readVocabulary: (supplied = storage) => bindings.readVocabulary(supplied),
        updateVocabulary: (update, supplied = storage) => bindings.updateVocabulary(update, supplied)
    };
    await runInNewContext(`(async () => {${executable}\n})()`, context, { filename: 'vocabulary.mjs' });
    assert.equal(get('bookNotice').textContent, '', 'page initialization must succeed');
    get('shareDetails').open = true;
    await get('shareDetails').fire('toggle');
    return { get, values, storage, downloads, timers,
        read: () => values.has(vocabularyStorageKey) ? JSON.parse(values.get(vocabularyStorageKey)) : null,
        async choose(selectedFile) { get('shareFile').files = selectedFile ? [selectedFile] : []; await get('shareFile').fire('change'); },
        async submit() { await get('shareImportForm').fire('submit'); }
    };
}

test('the class picker uses compact labels and keeps full details for the active class', async () => {
    const sandbox = { ...target, edition: '測試資料' };
    const otherEdition = { ...source, id: 'other-edition', edition: '最新版' };
    const stored = { books: [source, otherEdition, sandbox], words: [], exams: [] };
    const { get } = await boot(new Map([[vocabularyStorageKey, JSON.stringify(stored)]]));
    const select = get('bookSelect');
    assert.deepEqual(Array.from(select.children, option => option.textContent), [
        '來源班級 · 115 學年度 康軒 2 年級上學期 · 修訂版',
        '來源班級 · 115 學年度 康軒 2 年級上學期 · 最新版',
        '接收班級 · 115 康軒 2上'
    ]);
    assert.equal(select.value, sandbox.id);
    assert.match(get('bookSelectionDetails').textContent, /接收班級.*測試資料$/);
    select.value = otherEdition.id;
    await select.fire('change');
    assert.match(get('bookSelectionDetails').textContent, /來源班級.*最新版$/);
});

test('UI export selects one term, excludes all private fields, and its Blob imports only after confirmation then survives reboot', async () => {
    const original = { books: [{ ...source, ownerId: 'PRIVATE-owner', photo: 'PRIVATE-photo' }, target],
        words: [{ ...word(sunny, 'chosen', source.id), childId: 'PRIVATE-child', photo: 'PRIVATE-image', results: ['PRIVATE-result'], futureField: 'PRIVATE-unknown' },
            word(sky, 'unselected', source.id), word(rain, 'other-class')], exams: [] };
    const values = new Map([[vocabularyStorageKey, JSON.stringify(original)], ['private-records', 'PRIVATE-history']]);
    const ui = await boot(values);
    ui.get('bookSelect').value = source.id;
    await ui.get('bookSelect').fire('change');
    assert.equal(ui.get('shareDownload').disabled, true);
    const checks = ui.get('shareExportWords').querySelectorAll('input');
    assert.deepEqual(checks.map(check => check.value).sort(), ['chosen', 'unselected']);
    checks.find(check => check.value === 'chosen').checked = true;
    await ui.get('shareExportForm').fire('change');
    assert.equal(ui.get('shareDownload').disabled, false);
    const before = snapshot(values);
    await ui.get('shareExportForm').fire('submit');
    assert.equal(ui.downloads.length, 1);
    const downloaded = ui.downloads[0];
    assert.equal(downloaded.name, '老師詞庫分享.json');
    assert.equal(downloaded.blob.type, 'application/json');
    const text = await downloaded.blob.text();
    assert.deepEqual(JSON.parse(text), { ...share, words: [sunny] });
    assert.doesNotMatch(text, /PRIVATE|other-class|unselected|confirmed|ownerId|childId|photo|results|futureField/);
    assert.deepEqual(snapshot(values), before);
    ui.timers.forEach(callback => callback());

    // Fresh storage: viewing the received file is not permission to save it.
    const receiver = await boot();
    await receiver.choose(file(text));
    assert.equal(receiver.get('sharePreview').hidden, false);
    assert.match(receiver.get('shareSource').textContent, /來源班級.*115 學年度 康軒 2 年級上學期.*修訂版/);
    assert.equal(receiver.get('shareConfirmReadings').checked, false);
    assert.equal(receiver.read(), null);
    await receiver.submit();
    const saved = receiver.read();
    assert.equal(saved.books[0].name, '來源班級');
    assert.deepEqual(saved.words, [{ ...sunny, id: 'import-2', bookId: 'import-1', confirmed: false }]);
    const reopened = await boot(receiver.values);
    assert.deepEqual(reopened.read(), saved);
    assert.equal(reopened.get('wordList').children[0].children[0].children[0].textContent, '晴天');
});

test('UI preview shows duplicates and conflicts, filters editions, and persists only confirmed additions to the chosen class', async () => {
    const original = { books: [target, { ...target, id: 'different', edition: '舊版' }],
        words: [word(sunny, 'duplicate'), word({ ...sky, blanks: [2] }, 'conflict')], exams: [] };
    const values = new Map([[vocabularyStorageKey, JSON.stringify(original)], ['private-records', 'unchanged']]);
    const ui = await boot(values);
    await ui.choose(file());
    assert.deepEqual(ui.get('shareTarget').children.map(option => option.value), ['', 'target']);
    ui.get('shareTarget').value = target.id;
    await ui.get('shareTarget').fire('change');
    const rows = ui.get('sharePreviewRows').children.map(row => row.textContent);
    assert.match(rows[0], /晴天.*相同，略過/);
    assert.match(rows[1], /天空.*與現有詞語不同，略過.*現有/);
    assert.match(rows[2], /雨天.*待補注音.*可新增/);
    assert.match(ui.get('shareImportNotice').textContent, /1 筆可新增，1 筆衝突，1 筆相同/);
    assert.deepEqual(ui.read(), original);
    await ui.submit();
    const saved = ui.read();
    assert.deepEqual(saved.words, [...original.words, { ...rain, id: 'import-1', bookId: target.id, confirmed: false }]);
    assert.deepEqual(saved.books, original.books);
    assert.equal(values.get('private-records'), 'unchanged');
    assert.deepEqual((await boot(values)).read(), saved);
    await ui.choose(file());
    ui.get('shareTarget').value = target.id;
    await ui.get('shareTarget').fire('change');
    assert.equal(ui.get('shareApply').disabled, true);
    await ui.submit();
    assert.deepEqual(ui.read(), saved);
});

test('UI recipient explicitly confirms readings; changing the preview resets that consent', async () => {
    const ui = await boot();
    await ui.choose(file());
    ui.get('shareConfirmReadings').checked = true;
    ui.get('shareName').value = '自訂接收班級';
    await ui.get('shareName').fire('input');
    assert.equal(ui.get('shareConfirmReadings').checked, false);
    ui.get('shareConfirmReadings').checked = true;
    await ui.submit();
    assert.equal(ui.read().books[0].name, '自訂接收班級');
    assert.deepEqual(ui.read().words.map(entry => entry.confirmed), [true, true, false]);
    assert.equal(ui.get('sharePreview').hidden, true);
    assert.match(ui.get('shareImportNotice').textContent, /已將 3 個詞語匯入/);
});

test('UI rejects malformed files after a valid preview, without leaving a usable old preview or writing storage', async () => {
    const ui = await boot();
    const invalid = ['[', 'null', '{}', JSON.stringify({ ...share, version: 9 }),
        JSON.stringify({ ...share, source: null }), JSON.stringify({ ...share, words: [] }),
        JSON.stringify({ ...share, words: [sunny, sunny] }),
        JSON.stringify({ ...share, words: [{ ...sunny, pronunciation: [3] }] }),
        JSON.stringify({ ...share, words: [{ ...sunny, blanks: [9] }] })];
    for (const text of invalid) {
        await ui.choose(file());
        await ui.choose(file(text));
        assert.equal(ui.get('sharePreview').hidden, true);
        assert.equal(ui.get('shareImportNotice').hasAttribute('data-error'), true);
        assert.ok(ui.get('shareImportNotice').textContent.length > 0);
        await ui.submit();
        assert.equal(ui.read(), null);
    }
});

test('UI enforces the byte limit before reading, accepts the exact boundary, and recovers from file read failure', async () => {
    const ui = await boot();
    const json = JSON.stringify(share);
    const exact = file(json + ' '.repeat(vocabularyShareMaxBytes - Buffer.byteLength(json)));
    assert.equal(exact.size, 2_000_000);
    await ui.choose(exact);
    assert.equal(ui.get('sharePreview').hidden, false);
    let reads = 0;
    await ui.choose({ size: 2_000_001, text: async () => { reads++; return json; } });
    assert.equal(reads, 0);
    assert.equal(ui.get('sharePreview').hidden, true);
    assert.match(ui.get('shareImportNotice').textContent, /2 MB/);
    await ui.submit();
    assert.equal(ui.read(), null);
    await ui.choose({ size: 1, text: async () => { throw new Error('fixture file read failed'); } });
    assert.match(ui.get('shareImportNotice').textContent, /fixture file read failed/);
    assert.equal(ui.get('sharePreview').hidden, true);
    await ui.choose(file());
    assert.equal(ui.get('sharePreview').hidden, false);
    assert.equal(ui.read(), null);
});

test('UI ignores a replaced pending file, stale read errors and cancelled file selection', async () => {
    const ui = await boot();
    let resolveRead;
    const pending = ui.choose({ size: 1, text: () => new Promise(resolve => { resolveRead = resolve; }) });
    await ui.choose(file(JSON.stringify({ ...share, source: { ...share.source, name: '最新來源' } })));
    resolveRead(JSON.stringify(share));
    await pending;
    assert.match(ui.get('shareSource').textContent, /最新來源/);
    let rejectRead;
    const failing = ui.choose({ size: 1, text: () => new Promise((resolve, reject) => { rejectRead = reject; }) });
    await ui.choose(file());
    rejectRead(new Error('stale error'));
    await failing;
    assert.doesNotMatch(ui.get('shareImportNotice').textContent, /stale error/);
    await ui.choose(null);
    await ui.submit();
    assert.equal(ui.get('sharePreview').hidden, true);
    assert.equal(ui.read(), null);
});

test('UI detects a stale preview against persisted state and refuses partial writes', async () => {
    const values = new Map([[vocabularyStorageKey, JSON.stringify({ books: [target], words: [], exams: [] })]]);
    const ui = await boot(values);
    await ui.choose(file());
    const changed = { books: [target], words: [word({ ...sunny, blanks: [2] }, 'other-tab')], exams: [] };
    values.set(vocabularyStorageKey, JSON.stringify(changed));
    await ui.submit();
    assert.match(ui.get('shareImportNotice').textContent, /重新核對/);
    assert.deepEqual(ui.read(), changed);
});

test('UI storage failure preserves the previous value and preview; retry applies once and survives reboot', async () => {
    const values = new Map([[vocabularyStorageKey, JSON.stringify({ books: [target], words: [], exams: [] })]]);
    const ui = await boot(values);
    await ui.choose(file());
    const before = snapshot(values);
    const write = ui.storage.setItem;
    ui.storage.setItem = () => { throw new DOMException('fixture quota', 'QuotaExceededError'); };
    await ui.submit();
    assert.match(ui.get('shareImportNotice').textContent, /無法儲存/);
    assert.deepEqual(snapshot(values), before);
    assert.equal(ui.get('sharePreview').hidden, false);
    ui.storage.setItem = write;
    await ui.submit();
    assert.equal(ui.read().words.length, 3);
    const saved = ui.read();
    await ui.submit();
    assert.deepEqual(ui.read(), saved);
    assert.deepEqual((await boot(values)).read(), saved);
});
