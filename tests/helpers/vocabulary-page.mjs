import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { vocabularyStorageKey } from '../../vocabularyData.mjs';
import { localLocks } from './local-locks.mjs';

// DOM seam test using the repo's existing node:vm approach. Run the whole page
// script, replacing import bindings and unrelated cloud/photo entry points only.
// Nodes, FormData, downloads and file selection are doubles, not a browser.
const html = await readFile(new URL('../../vocabulary.html', import.meta.url), 'utf8');
const pageSource = await readFile(new URL('../../vocabulary.mjs', import.meta.url), 'utf8');
const imports = [...pageSource.matchAll(/^import\s+\{([^}]+)\}\s+from\s+'([^']+)';/gm)];
const bindings = {};
for (const [, names, path] of imports) {
    const module = await import(new URL(path, new URL('../../vocabulary.mjs', import.meta.url)));
    for (const name of names.split(',').map(name => name.trim())) bindings[name] = module[name];
}
const executable = pageSource.replace(/^import\s+\{[^}]+\}\s+from\s+'[^']+';/gm, '');

export class NodeDouble {
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
        for (const callback of this.listeners.get(type) ?? []) await callback({ target, currentTarget: this, preventDefault() {} });
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
    querySelector(selector) { return this.children.flatMap(child => child instanceof NodeDouble ? [child, ...(child.children ?? [])] : []).find(child => child.tag === selector); }
    focus() {}
    reset() { for (const node of Object.values(this.elements)) { node.value = ''; node.checked = false; } }
    remove() {}
}

export async function boot(values = new Map(), options = {}) {
    const nodes = new Map([...html.matchAll(/<([\w-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)]
        .map(([, tag, attributes, id]) => {
            const node = new NodeDouble(tag);
            for (const flag of ['hidden', 'disabled', 'checked']) node[flag] = new RegExp(`\\s${flag}(?:\\s|$)`).test(attributes);
            return [id, node];
        }));
    const get = id => { assert.ok(nodes.has(id), `missing HTML id: ${id}`); return nodes.get(id); };
    for (const [id, fields] of Object.entries({
        bookForm: { year: '' }, wordForm: { word: '', pronunciation: '', lesson: '1', confirmed: '' },
        batchForm: { words: '', lesson: '1' }, examForm: { from: '1', to: '8', count: '15', blankMode: 'vocabulary', examType: 'character', seed: 'fixed-ex01', prioritize: '' }
    })) {
        get(id).elements = Object.fromEntries(Object.entries(fields).map(([name, value]) => {
            const node = new NodeDouble('input'); node.value = value; return [name, node];
        }));
    }
    const storage = options.storage ?? { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
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
        location: { href: 'http://localhost/vocabulary.html?local=1' },
        Date: class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-11-27T00:00:00.000Z'])); } }, history: { replaceState() {} },
        window: { addEventListener() {}, confirm: options.confirm ?? (() => true) },
        crypto: { randomUUID: () => `import-${++sequence}` },
        Option: function (label, value) { const option = new NodeDouble('option'); option.textContent = label; option.value = String(value); return option; },
        FormData: class {
            constructor(form) { assert.equal(form, get('shareExportForm')); }
            getAll(name) { return get('shareExportWords').querySelectorAll('input:checked').filter(node => node.name === name).map(node => node.value); }
        },
        setTimeout: callback => timers.push(callback),
        cloudPageUrl: path => { const url = new URL(path, 'http://localhost/vocabulary.html'); url.searchParams.set('cloud', '1'); return url.href; },
        openPageStorage: async () => options.cloud ?? null, initPhotoImport: () => ({ reset() {} }),
        readVocabulary: (supplied = storage) => bindings.readVocabulary(supplied),
        updateVocabulary: (update, supplied = storage) => bindings.updateVocabulary(update, supplied,
            options.locks === undefined ? localLocks : options.locks)
    };
    await runInNewContext(`(async () => {${executable}\n})()`, context, { filename: 'vocabulary.mjs' });
    assert.equal(get('bookNotice').textContent, '', 'page initialization must succeed');
    get('shareDetails').open = true;
    await get('shareDetails').fire('toggle');
    return { get, values, storage, downloads, timers,
        read: () => { const raw = (options.cloud ?? storage).getItem(vocabularyStorageKey); return raw === null ? null : JSON.parse(raw); },
        async choose(selectedFile) { get('shareFile').files = selectedFile ? [selectedFile] : []; await get('shareFile').fire('change'); },
        async submit() { await get('shareImportForm').fire('submit'); }
    };
}

