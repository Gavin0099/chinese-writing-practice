import assert from 'node:assert/strict';
import { test } from 'node:test';
import { vocabularyStorageKey } from '../vocabularyData.mjs';
import { vocabularyShareMaxBytes } from '../vocabularyShare.mjs';

import { boot } from './helpers/vocabulary-page.mjs';

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
