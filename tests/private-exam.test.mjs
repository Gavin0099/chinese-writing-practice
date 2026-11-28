import { createLocks, localLocks } from './helpers/local-locks.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { boot, NodeDouble } from './helpers/vocabulary-page.mjs';
import { bookLabel, readVocabulary, updateVocabulary, vocabularyStorageKey } from '../vocabularyData.mjs';
import { examTypeTitles, isExamType } from '../examData.mjs';
import { backupCounts, downloadBackupFile, exportBackup, parseBackup, readBackupTarget, restoreBackup as restoreLocalBackup } from '../backupData.mjs';
import { openFamilyStorage } from '../cloudStorage.mjs';
const restoreBackup = (backup, expected, storage) => restoreLocalBackup(backup, expected, storage, localLocks);

// Expectations come from EX-01's fixed one-question example, not makeExam.
const when = '2026-11-27T00:00:00.000Z';
const book = { id: 'class-a', name: '私人甲班', publisher: '康軒', year: 115, grade: 2, semester: 1, edition: '' };
const otherBook = { ...book, id: 'class-b', name: '私人乙班' };
const word = { id: 'word-a', bookId: 'class-a', lesson: 3, word: '晴天',
    pronunciation: ['ㄑㄧㄥˊ', 'ㄊㄧㄢ'], blanks: [1], confirmed: true };
const exam = { id: 'import-1', createdAt: when, book, from: 3, to: 3, count: 1, seed: 'fixed-ex01',
    questions: [{ word: '晴天', pronunciation: ['ㄑㄧㄥˊ', 'ㄊㄧㄢ'], blanks: [1], sources: [{ id: 'word-a', lesson: 3 }] }] };
const otherExam = { ...exam, id: 'other-exam', book: otherBook, seed: 'other-seed' };
const oldBackup = { format: 'chinese-writing-practice-backup', version: 1, exportedAt: when,
    vocabulary: { books: [book, otherBook], words: [word], exams: [exam, otherExam] },
    teachingProgress: { activeKey: null, records: [] }, writingRecords: { 晴: [{ status: 'can_write', at: when }] } };
const walk = node => [node, ...(node.children ?? []).flatMap(child => typeof child === 'object' ? walk(child) : [])];
const rows = ui => ui.get('examList').children;
const remove = row => walk(row).find(node => node.tag === 'button' && node.textContent === '刪除');
function local(state = { books: [book], words: [word], exams: [] }) {
    return new Map([[vocabularyStorageKey, JSON.stringify(state)]]);
}
async function selectBook(ui, id = 'class-a') {
    ui.get('bookSelect').value = id;
    await ui.get('bookSelect').fire('change');
}
async function generate(ui) {
    const fields = ui.get('examForm').elements;
    fields.from.value = '3'; fields.to.value = '3'; fields.count.value = '1';
    await ui.get('examForm').fire('submit');
}

const examSource = (await readFile(new URL('../exam.mjs', import.meta.url), 'utf8'))
    .replace(/^import\s+\{[^}]+\}\s+from\s+'[^']+';/gm, '');
async function preview(storage, id = exam.id, cloud = null) {
    const nodes = new Map(['backToBook', 'recordReview', 'both', 'questions', 'answers', 'previewHeading',
        'examSummary', 'examPages', 'examControls', 'printExam', 'previewError'].map(id => [id, new NodeDouble()]));
    await runInNewContext(`(async () => {${examSource}\n})()`, {
        document: { getElementById: id => nodes.get(id), createElement: tag => new NodeDouble(tag) },
        location: { search: `?id=${id}`, href: 'http://localhost/exam.html' }, URLSearchParams,
        bookLabel, examTypeTitles, isExamType,
        cloudPageUrl: path => { const url = new URL(path, 'http://localhost/exam.html'); url.searchParams.set('cloud', '1'); return url.href; },
        readVocabulary: supplied => readVocabulary(supplied ?? storage), openPageStorage: async () => cloud,
        window: { print() {} }
    });
    return nodes;
}

test('EX-01 empty class shows private save location and an accessible empty history', async () => {
    const fresh = await boot();
    assert.equal(fresh.get('bookWorkspace').hidden, true);
    const ui = await boot(local());
    assert.match(ui.get('examPrivacy').textContent, /私人.*此瀏覽器/);
    assert.equal(ui.get('examHistory').hidden, false);
    assert.equal(rows(ui).length, 0);
    assert.match(ui.get('examHistoryNotice').textContent, /尚未保存/);
});

test('EX-01 generation persists the fixed snapshot, lists newest first per class and reopens without source words', async () => {
    const values = local({ books: [book, otherBook], words: [word], exams: [otherExam] });
    let ui = await boot(values);
    await selectBook(ui);
    await generate(ui);
    assert.deepEqual(ui.read().exams, [otherExam, exam]);
    const restored = await boot(new Map());
    await restoreBackup(parseBackup(JSON.stringify(exportBackup(ui.storage))), readBackupTarget(restored.storage), restored.storage);
    assert.deepEqual(restored.read().exams, [otherExam, exam]);
    assert.equal(rows(ui).length, 1);
    assert.equal(walk(rows(ui)[0]).find(node => node.tag === 'a').href, 'exam.html?id=import-1');
    assert.match(ui.get('examNotice').textContent, /私人/);
    await generate(ui);
    assert.deepEqual(ui.read().exams.map(item => item.id), ['other-exam', 'import-1', 'import-2']);
    assert.deepEqual(rows(ui).map(row => walk(row).find(node => node.tag === 'a').href),
        ['exam.html?id=import-2', 'exam.html?id=import-1']);
    const saved = ui.read();
    // Characterization of V-03's existing snapshot independence and reopen path.
    values.set(vocabularyStorageKey, JSON.stringify({ ...saved, words: [] }));
    ui = await boot(values);
    await selectBook(ui);
    assert.equal(ui.get('examPanel').hidden, true);
    assert.equal(ui.get('examHistory').hidden, false);
    assert.equal(rows(ui).length, 2);
    const opened = await preview(ui.storage);
    assert.equal(opened.get('previewError').textContent, '');
    const pages = opened.get('examPages').children;
    assert.equal(pages.length, 2);
    assert.deepEqual(pages.map(page => walk(page).filter(node => node.className === 'exam-grid').map(node => node.textContent)),
        [['', '天'], ['晴', '天']]);
    assert.deepEqual(ui.read().exams[1], exam);
    await selectBook(ui, 'class-b');
    assert.equal(rows(ui).length, 1);
    assert.equal(walk(rows(ui)[0]).find(node => node.tag === 'a').href, 'exam.html?id=other-exam');
});

test('EX-01 cancel leaves storage untouched; delete removes only the selected exam and persists across reload', async () => {
    const sibling = { ...exam, id: 'same-class-exam', seed: 'same-class-seed' };
    const initial = { ...oldBackup.vocabulary, exams: [exam, sibling, otherExam] };
    const values = local(initial);
    let confirmation;
    let accept = false;
    let ui = await boot(values, { confirm: message => { confirmation = message; return accept; } });
    await selectBook(ui);
    const before = values.get(vocabularyStorageKey);
    assert.ok(remove(rows(ui)[0]), 'saved exam needs a delete action');
    await remove(rows(ui)[1]).fire('click');
    assert.equal(values.get(vocabularyStorageKey), before);
    assert.match(confirmation, /3.*1.*fixed-ex01/);
    accept = true;
    await remove(rows(ui)[1]).fire('click');
    assert.deepEqual(ui.read(), { ...initial, exams: [sibling, otherExam] });
    assert.equal(rows(ui).length, 1);
    await remove(rows(ui)[0]).fire('click');
    assert.deepEqual(ui.read(), { ...initial, exams: [otherExam] });
    assert.equal(rows(ui).length, 0);
    assert.match(ui.get('examHistoryNotice').textContent, /已刪除/);
    ui = await boot(values);
    await selectBook(ui);
    assert.equal(ui.get('examHistory').hidden, false);
    assert.match(ui.get('examHistoryNotice').textContent, /尚未保存/);
    assert.match((await preview(ui.storage)).get('previewError').textContent, /找不到/);
});

test('EX-01 failed save or deletion keeps persisted data and visible history; retry succeeds once', async () => {
    const ui = await boot(local());
    const write = ui.storage.setItem;
    ui.storage.setItem = () => { throw new DOMException('fixture quota', 'QuotaExceededError'); };
    await generate(ui);
    assert.deepEqual(ui.read().exams, []);
    assert.equal(rows(ui).length, 0);
    assert.match(ui.get('examNotice').textContent, /無法儲存/);
    ui.storage.setItem = write;
    await generate(ui);
    const before = ui.read();
    assert.equal(before.exams.length, 1);
    assert.ok(remove(rows(ui)[0]), 'delete action must exist before testing failure');
    ui.storage.setItem = () => { throw new DOMException('fixture quota', 'QuotaExceededError'); };
    await remove(rows(ui)[0]).fire('click');
    assert.deepEqual(ui.read(), before);
    assert.equal(rows(ui).length, 1);
    assert.equal(ui.get('examHistoryNotice').hasAttribute('data-error'), true);
    assert.match(ui.get('examHistoryNotice').textContent, /無法儲存/);
    ui.storage.setItem = write;
    await remove(rows(ui)[0]).fire('click');
    assert.deepEqual(ui.read().exams, []);
});

test('EX-01 fixed legacy v1 restores unchanged, then deletion and current exam types round-trip in v1', async () => {
    const values = new Map();
    let ui = await boot(values);
    await restoreBackup(parseBackup(JSON.stringify(oldBackup)), readBackupTarget(ui.storage), ui.storage);
    const restored = exportBackup(ui.storage);
    assert.deepEqual(restored, { ...oldBackup, exportedAt: restored.exportedAt });
    ui = await boot(values);
    await selectBook(ui);
    assert.ok(remove(rows(ui)[0]), 'restored exam must be deletable');
    await remove(rows(ui)[0]).fire('click');
    const afterDelete = exportBackup(ui.storage);
    assert.equal(afterDelete.version, 1);
    assert.deepEqual(afterDelete.vocabulary, { ...oldBackup.vocabulary, exams: [otherExam] });
    assert.deepEqual(afterDelete.writingRecords, oldBackup.writingRecords);
    const destination = await boot(new Map());
    await restoreBackup(parseBackup(JSON.stringify(afterDelete)), readBackupTarget(destination.storage), destination.storage);
    assert.deepEqual(exportBackup(destination.storage).vocabulary, afterDelete.vocabulary);
    for (const type of ['zhuyin', 'mixed']) {
        const typed = { ...oldBackup, vocabulary: { ...oldBackup.vocabulary, exams: [{ ...exam, examType: type,
            questions: [{ ...exam.questions[0], ...(type === 'mixed' && { target: 'zhuyin' }) }] }] } };
        await restoreBackup(typed, readBackupTarget(destination.storage), destination.storage);
        assert.deepEqual(exportBackup(destination.storage).vocabulary.exams, typed.vocabulary.exams);
    }
});

test('EX-01 V-06 UI export with saved exams downloads only the explicitly selected word', async () => {
    const ui = await boot(local({ books: [book], words: [word], exams: [exam] }));
    ui.get('shareExportWords').querySelectorAll('input')[0].checked = true;
    await ui.get('shareExportForm').fire('submit');
    assert.equal(ui.downloads.length, 1);
    assert.deepEqual(JSON.parse(await ui.downloads[0].blob.text()), {
        format: 'chinese-writing-practice-vocabulary', version: 1,
        source: { name: '私人甲班', publisher: '康軒', year: 115, grade: 2, semester: 1, edition: '' },
        words: [{ lesson: 3, word: '晴天', pronunciation: ['ㄑㄧㄥˊ', 'ㄊㄧㄢ'], blanks: [1] }]
    });
    assert.deepEqual(ui.read().exams, [exam]);
});

function server() {
    let revision = 0;
    let backup = { ...oldBackup, vocabulary: { books: [book], words: [word], exams: [] } };
    let retry = false;
    let active = true;
    const requests = [];
    const drafts = [];
    const client = {
        auth: { async getSession() { return { data: { session: active ? { user: { id: 'family-a' }, access_token: 'fixture' } : null } }; },
            onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; } },
        rpc(name, args) { return { async setHeader(header, value) {
            requests.push({ name, args: structuredClone(args), header, value });
            if (name === 'read_family_backup') return { data: { revision, backup } };
            assert.equal(name, 'save_family_backup');
            if (retry) return { error: { status: 503 } };
            if (args.p_expected_revision !== revision) return { error: { code: 'PT409' } };
            backup = structuredClone(args.p_backup);
            return { data: ++revision };
        } }; }
    };
    return { requests, drafts, snapshot: () => structuredClone(backup), advance: () => revision++,
        retry: value => { retry = value; }, logout: () => { active = false; },
        open: options => openFamilyStorage(client, undefined, draft => drafts.push(draft), options) };
}

test('EX-01 cloud UI save/reopen/delete uses existing revisioned RPC and rejects stale deletion or lost session', async () => {
    const f = server();
    let cloud = await f.open();
    let ui = await boot(new Map(), { cloud });
    await generate(ui);
    assert.deepEqual(f.snapshot().vocabulary.exams, [exam]);
    assert.match(ui.get('examPrivacy').textContent, /私人.*此帳號/);
    assert.equal((await preview(ui.storage, exam.id, cloud)).get('examPages').children.length, 2);
    cloud.close();
    cloud = await f.open();
    ui = await boot(new Map(), { cloud });
    assert.equal(rows(ui).length, 1);
    assert.ok(remove(rows(ui)[0]), 'cloud saved exam must be deletable');
    await remove(rows(ui)[0]).fire('click');
    assert.deepEqual(f.snapshot().vocabulary.exams, []);
    await generate(ui);
    const confirmed = f.snapshot().vocabulary;
    f.advance();
    await remove(rows(ui)[0]).fire('click');
    assert.deepEqual(ui.read(), confirmed);
    assert.deepEqual(f.drafts[0].vocabulary.exams, []);
    assert.match(ui.get('examHistoryNotice').textContent, /另一個裝置/);
    f.logout();
    await remove(rows(ui)[0]).fire('click');
    assert.match(ui.get('examHistoryNotice').textContent, /登入/);
    assert.deepEqual(f.snapshot().vocabulary, confirmed);
    assert.deepEqual(f.requests.filter(item => item.name === 'save_family_backup').map(item => item.args.p_expected_revision), [0, 1, 2, 3]);
    cloud.close();
});

test('EX-01 offline UI queues save and delete durably across reopen then replays the expected exam collections', async () => {
    const f = server();
    const records = new Map();
    let timestamp = Date.parse(when);
    let id = 0;
    const options = { offline: true, storage: { getItem: key => records.get(key) ?? null,
        setItem: (key, value) => records.set(key, value) }, now: () => timestamp,
        newId: () => `queued-${++id}`, baseDelayMs: 100 };
    let cloud = await f.open(options);
    f.retry(true);
    let ui = await boot(new Map(), { cloud });
    await generate(ui);
    assert.deepEqual(ui.read().exams, [exam]);
    assert.deepEqual(f.snapshot().vocabulary.exams, []);
    assert.match(ui.get('examNotice').textContent, /暫存於本機.*待連線/);
    await cloud.close();
    cloud = await f.open(options);
    ui = await boot(new Map(), { cloud });
    assert.equal(rows(ui).length, 1);
    assert.ok(remove(rows(ui)[0]), 'queued exam must be deletable');
    await remove(rows(ui)[0]).fire('click');
    assert.deepEqual(ui.read().exams, []);
    assert.match(ui.get('examHistoryNotice').textContent, /暫存於本機.*待連線/);
    await cloud.close();
    cloud = await f.open(options);
    assert.deepEqual(readVocabulary(cloud).exams, []);
    f.retry(false);
    timestamp += 100;
    assert.deepEqual(await cloud.sync(), { status: 'synced', revision: 2 });
    assert.deepEqual(f.requests.filter(item => item.name === 'save_family_backup').map(item => item.args.p_backup.vocabulary.exams),
        [[exam], [exam], []]);
    assert.deepEqual(f.snapshot().vocabulary, { books: [book], words: [word], exams: [] });
    assert.deepEqual(f.snapshot().writingRecords, oldBackup.writingRecords);
    await cloud.close();
});

// Fixed F2 regression cases supplied by the independent review.
function mapStorage(values) {
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
        get length() { return values.size; }, key: index => [...values.keys()][index] };
}
const sibling = { ...exam, id: 'sibling', seed: 'sibling-seed' };
test('EX-01 F2 latest selected exam is removed, not array index zero', async () => {
    const ui=await boot(local({ books:[book], words:[word], exams:[exam,sibling] }));
    await remove(rows(ui)[0]).fire('click');
    assert.deepEqual(ui.read().exams,[exam]);
});
test('EX-01 F2 stale already-deleted exam does not remove its surviving sibling or write again', async () => {
    const values=local({books:[book],words:[word],exams:[exam,sibling]});
    const storage=mapStorage(values);
    let writes=0;
    const original=storage.setItem;
    storage.setItem=(...args)=>{ writes++; return original(...args); };
    const a=await boot(values,{storage});
    const b=await boot(values,{storage});
    await remove(rows(a)[1]).fire('click');
    await remove(rows(b)[1]).fire('click');
    assert.deepEqual(a.read().exams,[sibling]);
    assert.equal(writes,1);
    assert.match(b.get('examHistoryNotice').textContent,/已不存在/);
});
test('EX-01 F2 concurrent double click of one cloud exam writes once', async () => {
    const f=server();
    const cloud=await f.open();
    const ui=await boot(new Map(),{cloud});
    await generate(ui);
    let release;
    const barrier=new Promise(resolve=>release=resolve);
    const original=cloud.setItem;
    let writes=0;
    cloud.setItem=async(...args)=>{writes++;await barrier;return original(...args);};
    const button=remove(rows(ui)[0]);
    const first=button.fire('click');
    const second=button.fire('click');
    release();
    await Promise.all([first,second]);
    assert.equal(writes,1);
    assert.deepEqual(f.snapshot().vocabulary.exams,[]);
    cloud.close();
});

// F1: schedule the second tab at the first tab's write boundary.
test('EX-01 F1 two local tabs deleting different exams must not resurrect an acknowledged deletion',async()=>{
    // Two storage clients contend at A's write boundary. While A holds the
    // lock, B must wait, then re-read A's committed deletion before updating.
    const values=local({books:[book],words:[word],exams:[exam,sibling]});
    const sa=mapStorage(values), sb=mapStorage(values);
    const a=await boot(values,{storage:sa}), b=await boot(values,{storage:sb});
    const original=sa.setItem;
    let second;
    sa.setItem=(...args)=>{
        sa.setItem=original;
        second=remove(rows(b)[0]).fire('click'); // remove sibling; must wait for A's lock
        return original(...args); // A must commit before B re-reads
    };
    await remove(rows(a)[1]).fire('click');
    await second;
    assert.match(a.get('examHistoryNotice').textContent,/已刪除/);
    assert.match(b.get('examHistoryNotice').textContent,/已刪除/);
    assert.deepEqual(a.read().exams,[]);
});

// F1 covers every local collection writer, not only delete.
test('EX-01 F1 a contending word writer re-reads after deletion and cannot restore the removed exam', async () => {
    const values = local({ books: [book], words: [word], exams: [exam, sibling] });
    const storage = mapStorage(values), locks = createLocks();
    const ui = await boot(values, { storage, locks });
    const original = storage.setItem;
    const replacement = { ...word, word: '雨天', pronunciation: ['ㄩˇ', 'ㄊㄧㄢ'] };
    let second;
    storage.setItem = (...args) => {
        storage.setItem = original;
        second = updateVocabulary(state => { state.words[0] = replacement; }, mapStorage(values), locks);
        return original(...args);
    };
    await remove(rows(ui)[1]).fire('click');
    await second;
    assert.deepEqual(ui.read(), { books: [book], words: [replacement], exams: [sibling] });
});

test('EX-01 F1 restore waits for deletion then rejects a stale preview instead of reviving the exam', async () => {
    const values = local({ books: [book], words: [word], exams: [exam, sibling] });
    const storage = mapStorage(values), locks = createLocks();
    const ui = await boot(values, { storage, locks });
    const preview = readBackupTarget(storage);
    const original = storage.setItem;
    let restoring;
    storage.setItem = (...args) => {
        storage.setItem = original;
        restoring = restoreLocalBackup(oldBackup, preview, mapStorage(values), locks);
        return original(...args);
    };
    await remove(rows(ui)[1]).fire('click');
    await assert.rejects(restoring, /本機資料已變更/);
    assert.deepEqual(ui.read(), { books: [book], words: [word], exams: [sibling] });
    // A fresh, explicit restore may intentionally bring back a backed-up exam.
    await restoreLocalBackup(oldBackup, readBackupTarget(storage), storage, locks);
    assert.deepEqual(ui.read(), oldBackup.vocabulary);
});

test('EX-01 F1 unavailable or failed locks reject local generation, deletion and restore visibly without writes', async () => {
    for (const locks of [null, {}, { request: async () => { throw new Error('lock denied'); } }]) {
        const values = local({ books: [book], words: [word], exams: [exam] });
        const storage = mapStorage(values);
        const before = readBackupTarget(storage);
        let writes = 0;
        storage.setItem = () => { writes++; throw new Error('must not write'); };
        const ui = await boot(values, { storage, locks });
        await remove(rows(ui)[0]).fire('click');
        assert.match(ui.get('examHistoryNotice').textContent, /Web Locks|lock denied/);
        assert.equal(ui.get('examHistoryNotice').hasAttribute('data-error'), true);
        assert.equal(rows(ui).length, 1);
        await generate(ui);
        assert.match(ui.get('examNotice').textContent, /Web Locks|lock denied/);
        assert.equal(ui.get('examNotice').hasAttribute('data-error'), true);
        await assert.rejects(restoreLocalBackup(oldBackup, before, storage, locks), /Web Locks|lock denied/);
        assert.equal(writes, 0);
        assert.deepEqual(readBackupTarget(storage), before);
    }
});

const reviewSource = await readFile(new URL('../review.mjs', import.meta.url), 'utf8');
const reviewBindings = {};
for (const [, names, path] of reviewSource.matchAll(/^import\s+\{([^}]+)\}\s+from\s+'([^']+)';/gm)) {
    const module = await import(new URL(path, new URL('../review.mjs', import.meta.url)));
    for (const name of names.split(',').map(name => name.trim())) reviewBindings[name] = module[name];
}
async function bootReview(storage, locks) {
    const nodes = new Map();
    const get = id => {
        if (!nodes.has(id)) nodes.set(id, new NodeDouble());
        return nodes.get(id);
    };
    get('reviewMode').value = 'recent';
    const attempt = reviewBindings.gradeExam(exam, [1], { id: 'grade-a', at: when });
    reviewBindings.saveAttempt(storage, 'local', attempt);
    const beforeAttempts = reviewBindings.readAttempts(storage, 'local');
    let sequence = 0;
    const location = { href: 'http://localhost/review.html?exam=import-1' };
    await runInNewContext(`(async () => {${reviewSource.replace(/^import\s+\{[^}]+\}\s+from\s+'[^']+';/gm, '')}\n})()`, {
        ...reviewBindings, localStorage: storage, location, URL, URLSearchParams,
        document: { getElementById: get, createElement: tag => new NodeDouble(tag) },
        window: { addEventListener() {} },
        Option: function (label, value) { const option = new NodeDouble('option'); option.value = value; return option; },
        crypto: { randomUUID: () => `review-${++sequence}` },
        Date: class extends Date { constructor(...args) { super(...(args.length ? args : [when])); } },
        FormData: class { *[Symbol.iterator]() { yield* Object.entries({ mode: 'recent', size: 'all', wrong: '1', fresh: '0', from: '3', to: '3' }); } },
        openPageStorage: async () => null,
        updateVocabulary: (update, supplied) => updateVocabulary(update, supplied, locks)
    });
    assert.equal(get('reviewNotice').textContent, '');
    assert.equal(get('retakeSubmit').disabled, false);
    return { get, location, beforeAttempts };
}

test('EX-01 F1 review-page retake contends with deletion and preserves the deletion and grading history', async () => {
    const values = local({ books: [book], words: [word], exams: [exam, sibling] });
    const storage = mapStorage(values), locks = createLocks();
    const ui = await boot(values, { storage, locks });
    const review = await bootReview(mapStorage(values), locks);
    const original = storage.setItem;
    let retaking;
    storage.setItem = (...args) => {
        storage.setItem = original;
        retaking = review.get('retakeForm').fire('submit');
        return original(...args);
    };
    await remove(rows(ui)[1]).fire('click');
    await retaking;
    assert.equal(review.get('reviewNotice').textContent, '');
    assert.equal(review.location.href, 'exam.html?id=review-1');
    assert.deepEqual(ui.read(), { books: [book], words: [word], exams: [sibling, {
        ...exam, id: 'review-1', seed: 'review-2', questions: [{ ...exam.questions[0], sources: [{ id: 'grade-a:0', lesson: 3 }] }]
    }] });
    assert.deepEqual(reviewBindings.readAttempts(storage, 'local'), review.beforeAttempts);
});

test('EX-01 F1 review-page retake shows missing-lock failure and leaves the collection and history intact', async () => {
    const values = local({ books: [book], words: [word], exams: [exam] });
    const storage = mapStorage(values);
    const review = await bootReview(storage, null);
    const before = [...values.entries()];
    await review.get('retakeForm').fire('submit');
    assert.match(review.get('reviewNotice').textContent, /Web Locks/);
    assert.equal(review.get('reviewNotice').hasAttribute('data-error'), true);
    assert.equal(review.location.href, 'http://localhost/review.html?exam=import-1');
    assert.deepEqual([...values.entries()], before);
});

const backupSource = (await readFile(new URL('../backup.mjs', import.meta.url), 'utf8'))
    .replace(/^import\s+\{[^}]+\}\s+from\s+'[^']+';/gm, '');
async function bootBackup(storage, locks) {
    const nodes = new Map(['backupFile', 'restoreBackup', 'currentSummary', 'downloadBackup', 'exportNotice', 'restoreNotice']
        .map(id => [id, new NodeDouble()]));
    const get = id => { assert.ok(nodes.has(id)); return nodes.get(id); };
    const downloads = [], urls = new Map(), timers = [];
    class DownloadURL extends URL {
        static createObjectURL(blob) { const url = `blob:backup-${urls.size}`; urls.set(url, blob); return url; }
        static revokeObjectURL(url) { urls.delete(url); }
    }
    await runInNewContext(`${downloadBackupFile.toString()}\n${backupSource}`, {
        document: { getElementById: get, body: new NodeDouble('body'), createElement: tag => {
            assert.equal(tag, 'a');
            const link = new NodeDouble(tag);
            link.click = () => downloads.push({ name: link.download, blob: urls.get(link.href) });
            return link;
        } }, window: { confirm: () => true },
        URL: DownloadURL, Blob, setTimeout: callback => timers.push(callback),
        backupCounts, parseBackup, exportBackup: () => exportBackup(storage),
        readBackupTarget: () => readBackupTarget(storage),
        restoreBackup: (backup, expected) => restoreLocalBackup(backup, expected, storage, locks)
    });
    get('backupFile').files = [{ text: async () => JSON.stringify(oldBackup) }];
    await get('backupFile').fire('change');
    return { get, downloads, timers, urls };
}

test('EX-01 F1 backup UI waits for the lock, prevents double-click and reports unsupported locks without writing', async () => {
    const completed = /\u9084\u539f\u5b8c\u6210/;
    const values = local(), storage = mapStorage(values), locks = createLocks();
    let release;
    const barrier = new Promise(resolve => { release = resolve; });
    const held = locks.request(vocabularyStorageKey, { mode: 'exclusive' }, () => barrier);
    const ui = await bootBackup(storage, locks);
    const before = readBackupTarget(storage);
    const restoring = ui.get('restoreBackup').fire('click');
    await ui.get('restoreBackup').fire('click');
    assert.equal(ui.get('restoreBackup').disabled, true);
    assert.doesNotMatch(ui.get('restoreNotice').textContent, completed);
    assert.deepEqual(readBackupTarget(storage), before);
    release();
    await held;
    await restoring;
    assert.match(ui.get('restoreNotice').textContent, completed);
    assert.equal(ui.get('restoreBackup').disabled, false);
    assert.deepEqual(readVocabulary(storage), oldBackup.vocabulary);

    const unsupported = await bootBackup(storage, null);
    const saved = readBackupTarget(storage);
    await unsupported.get('restoreBackup').fire('click');
    assert.match(unsupported.get('restoreNotice').textContent, /Web Locks/);
    assert.equal(unsupported.get('restoreNotice').hasAttribute('data-error'), true);
    assert.equal(unsupported.get('restoreBackup').disabled, false);
    assert.deepEqual(readBackupTarget(storage), saved);
});

// F3: the Owner-approved read-only support floor applies to local mode only.
test('EX-01 F3 missing Web Locks preserves reading, exam reopening and backup download without writes', async () => {
    const values = new Map(), storage = mapStorage(values);
    await restoreBackup(oldBackup, readBackupTarget(storage), storage);
    const before = [...values.entries()];
    let writes = 0;
    const write = storage.setItem;
    storage.setItem = (...args) => { writes++; return write(...args); };
    const ui = await boot(values, { storage, locks: null });
    assert.deepEqual(ui.read(), oldBackup.vocabulary);
    assert.equal(rows(ui).length, 1);
    const opened = await preview(storage);
    assert.equal(opened.get('previewError').textContent, '');
    assert.deepEqual(opened.get('examPages').children.map(page =>
        walk(page).filter(node => node.className === 'exam-grid').map(node => node.textContent)),
    [['', '天'], ['晴', '天']]);
    const backup = await bootBackup(storage, null);
    await backup.get('downloadBackup').fire('click');
    assert.equal(backup.downloads.length, 1);
    const downloaded = backup.downloads[0];
    assert.match(downloaded.name, /^chinese-writing-practice_backup_\d{4}-\d{2}-\d{2}\.json$/);
    assert.equal(downloaded.blob.type, 'application/json');
    const content = JSON.parse(await downloaded.blob.text());
    assert.deepEqual(content, { ...oldBackup, exportedAt: content.exportedAt });
    assert.match(backup.get('exportNotice').textContent, /備份檔已交給瀏覽器下載/);
    assert.equal(backup.get('exportNotice').hasAttribute('data-error'), false);
    backup.timers.forEach(callback => callback());
    assert.equal(backup.urls.size, 0);
    assert.equal(writes, 0);
    assert.deepEqual([...values.entries()], before);
});

test('EX-01 F3 missing Web Locks refuses local word deletion, batch commit and share import visibly without changing data', async () => {
    const values = local({ books: [book], words: [word], exams: [exam] });
    const storage = mapStorage(values), before = [...values.entries()];
    let writes = 0;
    const write = storage.setItem;
    storage.setItem = (...args) => { writes++; return write(...args); };
    const ui = await boot(values, { storage, locks: null });
    const unchanged = id => {
        assert.match(ui.get(id).textContent, /Web Locks/);
        assert.equal(ui.get(id).hasAttribute('data-error'), true);
        assert.equal(writes, 0);
        assert.deepEqual([...values.entries()], before);
    };
    const deleteWord = walk(ui.get('wordList')).find(node => node.tag === 'button' && node.textContent === '刪除');
    await deleteWord.fire('click');
    unchanged('listCount');
    ui.get('batchForm').elements.words.value = '雨天';
    ui.get('batchForm').elements.lesson.value = '3';
    await ui.get('batchForm').fire('submit');
    assert.equal(ui.get('batchCommitAction').hidden, false);
    await ui.get('commitBatch').fire('click');
    unchanged('batchNotice');
    await ui.choose(new File([JSON.stringify({ format: 'chinese-writing-practice-vocabulary', version: 1,
        source: { name: book.name, publisher: book.publisher, year: book.year, grade: book.grade, semester: book.semester, edition: '' },
        words: [{ lesson: 3, word: '雨天', pronunciation: [], blanks: [1] }] })], 'share.json', { type: 'application/json' }));
    assert.equal(ui.get('sharePreview').hidden, false);
    assert.equal(ui.get('shareApply').disabled, false);
    await ui.submit();
    unchanged('shareImportNotice');
});

test('EX-01 F3 without Web Locks cloud exam generation and deletion succeed through expected-revision RPC only', async () => {
    const f = server(), cloud = await f.open({ locks: null });
    // Distinct local data must never be used as a cloud write fallback.
    const values = local({ books: [book], words: [word], exams: [sibling] });
    const beforeLocal = [...values.entries()];
    try {
        const ui = await boot(values, { cloud, locks: null });
        assert.deepEqual(ui.read(), { books: [book], words: [word], exams: [] });
        await generate(ui);
        const saved = { books: [book], words: [word], exams: [exam] };
        assert.deepEqual(ui.read(), saved);
        assert.deepEqual(f.snapshot().vocabulary, saved);
        assert.equal(rows(ui).length, 1);
        assert.equal(ui.get('examNotice').textContent, '已同步 1 題私人考卷。可在下方開啟考卷與解答。');
        assert.equal(ui.get('examNotice').hasAttribute('data-error'), false);
        assert.deepEqual(f.requests.filter(item => item.name === 'save_family_backup')
            .map(item => ({ revision: item.args.p_expected_revision, vocabulary: item.args.p_backup.vocabulary })),
        [{ revision: 0, vocabulary: saved }]);

        await remove(rows(ui)[0]).fire('click');
        const deleted = { books: [book], words: [word], exams: [] };
        assert.deepEqual(ui.read(), deleted);
        assert.deepEqual(f.snapshot().vocabulary, deleted);
        assert.equal(rows(ui).length, 0);
        assert.match(ui.get('examHistoryNotice').textContent, /已刪除/);
        assert.equal(ui.get('examHistoryNotice').hasAttribute('data-error'), false);
        assert.deepEqual(f.requests.map(item => item.name),
            ['read_family_backup', 'save_family_backup', 'save_family_backup']);
        assert.deepEqual(f.requests.filter(item => item.name === 'save_family_backup')
            .map(item => ({ revision: item.args.p_expected_revision, vocabulary: item.args.p_backup.vocabulary })),
        [{ revision: 0, vocabulary: saved }, { revision: 1, vocabulary: deleted }]);
        assert.deepEqual(f.snapshot().teachingProgress, oldBackup.teachingProgress);
        assert.deepEqual(f.snapshot().writingRecords, oldBackup.writingRecords);
        assert.deepEqual(f.drafts, []);
        assert.deepEqual([...values.entries()], beforeLocal);
    } finally { await cloud.close(); }
});

test('EX-01 F3 without Web Locks stale cloud generation and deletion show server conflict without local resurrection', async () => {
    for (const action of ['generate', 'delete']) {
        const f = server(), cloud = await f.open({ locks: null });
        const removed = { ...exam, id: 'deleted-by-other-device' };
        const initial = { books: [book], words: [word], exams: [removed, sibling] };
        const latest = { books: [book], words: [word], exams: [sibling] };
        const attempted = { books: [book], words: [word],
            exams: action === 'generate' ? [removed, sibling, exam] : [removed] };
        const values = new Map();
        try {
            await cloud.setItem(vocabularyStorageKey, JSON.stringify(initial)); // revision 0 -> 1
            const ui = await boot(values, { cloud, locks: null });
            const beforeLocal = [...values.entries()];
            // A second device deletes an exam at revision 1 -> 2. This tab's
            // attempted write still carries revision 1 and the deleted exam.
            const other = await f.open({ locks: null });
            try { await other.setItem(vocabularyStorageKey, JSON.stringify(latest)); }
            finally { await other.close(); }
            if (action === 'generate') await generate(ui);
            else await remove(rows(ui)[0]).fire('click'); // stale deletion of sibling
            const notice = ui.get(action === 'generate' ? 'examNotice' : 'examHistoryNotice');
            assert.deepEqual(f.requests.filter(item => item.name === 'save_family_backup')
                .map(item => ({ revision: item.args.p_expected_revision, vocabulary: item.args.p_backup.vocabulary })),
            [{ revision: 0, vocabulary: initial }, { revision: 1, vocabulary: latest },
                { revision: 1, vocabulary: attempted }]);
            assert.deepEqual(f.snapshot().vocabulary, latest);
            assert.deepEqual(f.snapshot().teachingProgress, oldBackup.teachingProgress);
            assert.deepEqual(f.snapshot().writingRecords, oldBackup.writingRecords);
            // The failed write cannot change the tab's confirmed cache or list.
            // That cache stays stale until reload; it is never saved locally.
            assert.deepEqual(ui.read(), initial);
            assert.equal(rows(ui).length, 2);
            assert.match(notice.textContent, /另一個裝置已儲存較新的資料/);
            assert.match(notice.textContent, /下載未同步備份.*重新載入/);
            assert.equal(notice.hasAttribute('data-error'), true);
            assert.deepEqual(f.drafts.map(draft => draft.vocabulary), [attempted]);
            assert.deepEqual([...values.entries()], beforeLocal);

            // Retrying before reload cannot bypass the conflict with a new RPC.
            if (action === 'generate') await generate(ui);
            else await remove(rows(ui)[0]).fire('click');
            assert.equal(f.requests.filter(item => item.name === 'save_family_backup').length, 3);
            assert.match(notice.textContent, /重新載入/);
            assert.equal(notice.hasAttribute('data-error'), true);
            assert.deepEqual(ui.read(), initial);
            assert.deepEqual([...values.entries()], beforeLocal);

            const reloaded = await f.open({ locks: null });
            try {
                const reopened = await boot(values, { cloud: reloaded, locks: null });
                assert.deepEqual(reopened.read(), latest);
                assert.equal(rows(reopened).length, 1);
                assert.match((await preview(reopened.storage, removed.id, reloaded))
                    .get('previewError').textContent, /找不到/);
                assert.deepEqual(f.snapshot().vocabulary, latest);
                assert.deepEqual([...values.entries()], beforeLocal);
            } finally { await reloaded.close(); }
        } finally { await cloud.close(); }
    }
});
