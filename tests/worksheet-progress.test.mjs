import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const worksheetKey = 'write_practice_data';
const progressKey = 'write_practice_teaching_progress';
const legacy = {
    profile: { id: 'fixture', name: '測試' },
    settings: { grade: 2, semester: 'A', lastLesson: 8, directDownload: true, updatedAt: '2026-01-01T00:00:00.000Z' },
    history: [{ grade: 2, semester: 'A', lesson: 8 }]
};
const confirmed = {
    academicYear: 115, publisher: '測試版', grade: 2, semester: 1, sourceVersion: 'fixture', lesson: 3, confirmed: true
};
const storageScript = readFileSync(new URL('../storageManager.js', import.meta.url), 'utf8');
const recommendationScript = readFileSync(new URL('../recommendationEngine.js', import.meta.url), 'utf8');

function boot(entries = new Map()) {
    const writes = [];
    const localStorage = {
        getItem: key => entries.get(key) ?? null,
        setItem(key, value) {
            writes.push(key);
            entries.set(key, value);
        },
        removeItem: key => entries.delete(key)
    };
    const window = { CURRICULUM_DATA: { 2: { A: [{ lesson: 8, title: '測試八' }, { lesson: 9, title: '測試九' }] } } };
    runInNewContext(`${storageScript}\n${recommendationScript}`, { localStorage, window, console: { log() {}, error() {} } });
    return { storage: window.storageManager, recommendations: window.recommendationEngine, writes };
}

test('migrates a legacy worksheet recommendation without writing teaching progress', () => {
    const values = new Map([[worksheetKey, JSON.stringify(legacy)]]);
    for (let load = 0; load < 2; load++) {
        const { storage, recommendations, writes } = boot(values);
        const settings = storage.getSettings();
        assert.equal(settings.lastOutputLesson, 8);
        assert.equal(settings.lastOutputAt, null);
        assert.equal(settings.directDownload, true);
        assert.equal(storage.getProfile().name, legacy.profile.name);
        assert.equal(recommendations.getRecommendation(settings).lesson, 9);
        assert.equal(storage.getTeachingProgress(), null);
        assert.deepEqual(writes, []);
    }
    assert.deepEqual(JSON.parse(values.get(worksheetKey)), legacy);
});

test('a worksheet output records once and preserves independently confirmed teaching progress', () => {
    const savedProgress = JSON.stringify(confirmed);
    const values = new Map([[worksheetKey, JSON.stringify(legacy)], [progressKey, savedProgress]]);
    const { storage, writes } = boot(values);
    storage.addHistory({ grade: 2, semester: 'A', lesson: 9, title: '測試九' });
    assert.deepEqual(writes, [worksheetKey]);
    const data = JSON.parse(values.get(worksheetKey));
    assert.equal(data.history.length, 2);
    assert.deepEqual(data.history[1], legacy.history[0]);
    assert.equal(data.settings.lastLesson, undefined);
    assert.equal(data.settings.lastOutputLesson, 9);
    assert.equal(data.settings.lastOutputAt, data.history[0].timestamp);
    assert.equal(values.get(progressKey), savedProgress);
    const reloaded = boot(values).storage;
    assert.equal(reloaded.getSettings().lastOutputLesson, 9);
    assert.equal(reloaded.getTeachingProgress().lesson, 3);
    reloaded.resetWorksheetData();
    assert.equal(values.has(worksheetKey), false);
    assert.equal(values.get(progressKey), savedProgress);
});

test('starts empty and ignores invalid or unconfirmed progress records', () => {
    for (const value of ['invalid-json', JSON.stringify({ ...confirmed, confirmed: false })]) {
        const { storage, writes } = boot(new Map([[progressKey, value]]));
        assert.equal(storage.isNewUser(), true);
        assert.equal(storage.getTeachingProgress(), null);
        assert.equal(storage.getSettings().lastOutputLesson, 0);
        assert.deepEqual(writes, []);
    }
});
