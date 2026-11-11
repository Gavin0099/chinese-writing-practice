import { courseKey, lookupCharacters } from './characterLookup.mjs';
import { confirmCourse, curriculumStorageKey, importCourses, isPediaSource, lookupScope, progressStorageKey,
    readProgress, writingStorageKey } from './learningData.mjs';

const byId = id => document.getElementById(id);
const fields = Object.fromEntries(['academicYear', 'publisher', 'grade', 'semester', 'edition', 'lesson'].map(id => [id, byId(id)]));
const input = byId('query');
const statusLabels = { taught: '推估已教', not_yet_taught: '尚未教到', insufficient_data: '資料不足' };
const writingLabels = { not_assessed: '尚未評估', can_write: '會寫', cannot_write: '不會寫',
    uses_zhuyin: '用注音代替', missing_strokes: '漏筆畫' };
const dateLabel = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' });
const importLimit = 2_000_000;

function readLocal(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
}

const savedCourses = readLocal(curriculumStorageKey);
let courses = Array.isArray(savedCourses) ? savedCourses.filter(course => courseKey(course) &&
    Array.isArray(course.expectedLessons) && Array.isArray(course.lessons)) : [];
let progress = readProgress(readLocal(progressStorageKey));
function readWriting() {
    return Object.fromEntries(Object.entries(readLocal(writingStorageKey) ?? {}).filter(([char, records]) =>
        /^\p{Script=Han}$/u.test(char) && Array.isArray(records) && records.length && records.every(record =>
            Object.hasOwn(writingLabels, record?.status) && typeof record.at === 'string' && Number.isFinite(Date.parse(record.at)))));
}

let writing = readWriting();
let activeQuery = null;

function showNotice(element, message, error = false) {
    element.textContent = message;
    element.toggleAttribute('data-error', error);
}

function setOptions(field, entries, wanted) {
    field.replaceChildren(...entries.map(([value, label]) => new Option(label, value)));
    if (entries.some(([value]) => String(value) === String(wanted))) field.value = wanted;
}

function fillPicker(preferred) {
    const path = [
        ['academicYear', value => `${value} 學年度`], ['publisher', value => `${value}版`],
        ['grade', value => `${value} 年級`], ['semester', value => value === 1 ? '上學期' : '下學期']
    ];
    let choices = courses;
    for (const [key, label] of path) {
        const values = [...new Set(choices.map(course => course[key]))].sort((a, b) =>
            typeof a === 'number' ? a - b : a.localeCompare(b, 'zh-TW'));
        setOptions(fields[key], values.map(value => [value, label(value)]), preferred?.[key] ?? fields[key].value);
        choices = choices.filter(course => String(course[key]) === fields[key].value);
    }
    setOptions(fields.edition, choices.map(course => [courseKey(course),
        `${course.versionLabel} · ${course.sourceVersion.slice(0, 8)}`]), preferred ? courseKey(preferred) : fields.edition.value);
    byId('progressFields').disabled = !courses.length;
    updateLessonPicker();
}

const currentCourse = () => courses.find(course => courseKey(course) === fields.edition.value);

function updateLessonPicker() {
    const course = currentCourse();
    const confirmed = progress.records.filter(record => courseKey(record) === courseKey(course));
    const cutoff = confirmed.length === 1 ? confirmed[0].lesson : null;
    const lessons = course?.expectedLessons.map(number => {
        const verified = course.lessons.find(lesson => lesson.number === number);
        const title = verified?.title?.replace(/^[^：]+：/, '');
        return [number, title ? `第 ${number} 課　${title}` : `第 ${number} 課${verified ? '' : '（字表待核對）'}`];
    }) ?? [];
    setOptions(fields.lesson, [['', '選擇課次'], [0, '尚未開始'], ...lessons], cutoff);
    showNotice(byId('progressNotice'), !course ? '匯入教材後即可設定課次。' : !fields.lesson.value
        ? '這個教材版本的教學進度尚未確認。'
        : cutoff === 0 ? '已確認這學期尚未開始。' : `已確認教到第 ${cutoff} 課。`);
    renderResults();
}

function addEvidence(container, occurrence) {
    const semester = occurrence.semester === 1 ? '上' : '下';
    const kind = occurrence.type === 'writing' ? '習寫' : '認讀';
    const text = `${occurrence.academicYear} 學年度 · ${occurrence.publisher}${occurrence.grade}${semester} · 第 ${occurrence.lesson} 課 · ${kind}`;
    if (isPediaSource(occurrence.source)) {
        const link = document.createElement('a');
        link.href = occurrence.source;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = text;
        container.append(link);
    } else {
        container.append(text);
    }
    if (occurrence.title) container.append(`　${occurrence.title.replace(/^[^：]+：/, '')}`);
}

function updateWritingHistory(card, records) {
    const history = card.querySelector('.writing-history');
    const items = records.slice().reverse().map(record => {
        const item = document.createElement('li');
        item.textContent = `${dateLabel.format(new Date(record.at))}　${writingLabels[record.status]}`;
        return item;
    });
    history.querySelector('ol').replaceChildren(...items);
    history.hidden = !records.length;
}

function renderResult(result) {
    const card = byId('resultTemplate').content.firstElementChild.cloneNode(true);
    const { char, positions, curriculum, teachingStatus, writingStatus } = result;
    card.querySelector('h3').textContent = char;
    if (positions.length > 1) card.querySelector('.count').textContent = `出現 ${positions.length} 次`;

    const first = card.querySelector('.first-occurrence');
    if (curriculum.firstOccurrence) {
        first.textContent = '最早查到　';
        addEvidence(first, curriculum.firstOccurrence);
    } else {
        first.textContent = '已核對範圍內查無收錄';
    }
    const other = curriculum.occurrences.slice(1).map(occurrence => {
        const item = document.createElement('li');
        addEvidence(item, occurrence);
        return item;
    });
    card.querySelector('.occurrences').append(...other);

    const teaching = card.querySelector('.teaching-status');
    teaching.textContent = statusLabels[teachingStatus];
    teaching.dataset.state = teachingStatus;

    const writingField = card.querySelector('.writing-status');
    writingField.value = writingStatus;
    writingField.setAttribute('aria-label', `${char}的習寫狀態`);
    updateWritingHistory(card, writing[char] ?? []);
    writingField.addEventListener('change', () => {
        const current = readWriting();
        const records = current[char] ?? [];
        const next = [...records, { status: writingField.value, at: new Date().toISOString() }];
        const updated = { ...current, [char]: next };
        const notice = card.querySelector('.writing-notice');
        try {
            localStorage.setItem(writingStorageKey, JSON.stringify(updated));
            writing = updated;
            byId('showRecords').hidden = false;
            updateWritingHistory(card, next);
            showNotice(notice, '已儲存');
        } catch {
            writingField.value = records.at(-1)?.status ?? 'not_assessed';
            showNotice(notice, '儲存失敗，請檢查瀏覽器儲存空間。', true);
        }
    });
    return card;
}

function renderResults() {
    if (activeQuery === null) return;
    const writingStatuses = Object.fromEntries(Object.entries(writing).map(([char, records]) => [char, records.at(-1).status]));
    const scope = lookupScope(currentCourse(), courses, progress);
    const results = lookupCharacters(activeQuery, { ...scope, writingStatuses });
    byId('resultsHeading').hidden = !results.length;
    showNotice(byId('queryNotice'), results.length ? `共 ${results.length} 個不同的國字` : '請輸入至少一個國字。');
    byId('results').replaceChildren(...results.map(renderResult));
}

byId('curriculumFiles').addEventListener('change', async event => {
    const picker = event.currentTarget;
    const files = [...picker.files];
    if (!files.length) return;
    const notice = byId('importNotice');
    picker.disabled = true;
    try {
        if (files.some(file => file.size > importLimit)) throw new Error('每個教材檔案須小於 2 MB。');
        const parsed = await Promise.all(files.map(async file => JSON.parse(await file.text())));
        const candidates = parsed.filter(value => value?.status === 'candidate');
        const reports = parsed.filter(value => Array.isArray(value?.results) && value?.workbook);
        if (!candidates.length || candidates.length + reports.length !== parsed.length) {
            throw new Error('請選擇 candidate JSON，可一併選擇同批 comparison JSON。');
        }
        const imported = candidates.flatMap(candidate => importCourses(candidate, reports));
        const merged = new Map(courses.map(course => [courseKey(course), course]));
        for (const course of imported) merged.set(courseKey(course), course);
        const updated = [...merged.values()];
        localStorage.setItem(curriculumStorageKey, JSON.stringify(updated));
        courses = updated;
        fillPicker(courses.find(course => courseKey(course) === progress.activeKey));
        byId('curriculumImport').open = false;
        showNotice(notice, `已載入 ${imported.length} 組教材，共 ${imported.reduce((total, course) => total + course.lessons.length, 0)} 個比對一致課次。`);
    } catch (error) {
        const message = error instanceof SyntaxError ? '無法讀取 JSON 格式，請重新選擇教材檔案。'
            : error instanceof DOMException ? '無法儲存教材，請檢查瀏覽器儲存空間。' : error.message;
        showNotice(notice, message, true);
    } finally {
        picker.disabled = false;
        picker.value = '';
    }
});

for (const field of [fields.academicYear, fields.publisher, fields.grade, fields.semester]) {
    field.addEventListener('change', () => fillPicker());
}
fields.edition.addEventListener('change', updateLessonPicker);

byId('progressForm').addEventListener('submit', event => {
    event.preventDefault();
    if (!fields.lesson.value) return;
    try {
        const updated = confirmCourse(readProgress(readLocal(progressStorageKey)), currentCourse(), Number(fields.lesson.value));
        localStorage.setItem(progressStorageKey, JSON.stringify(updated));
        progress = updated;
        updateLessonPicker();
    } catch (error) {
        showNotice(byId('progressNotice'), error instanceof DOMException ? '儲存失敗，請檢查瀏覽器儲存空間。' : error.message, true);
    }
});

byId('queryForm').addEventListener('submit', event => {
    event.preventDefault();
    activeQuery = input.value;
    renderResults();
});
byId('showRecords').addEventListener('click', () => {
    activeQuery = Object.keys(writing).join('');
    renderResults();
});

byId('showRecords').hidden = !Object.keys(writing).length;
byId('curriculumImport').open = !courses.length;
fillPicker(courses.find(course => courseKey(course) === progress.activeKey));
