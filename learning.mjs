import { courseKey, lookupCharacters } from './characterLookup.mjs';
import { confirmCourse, curriculumStorageKey, importCourses, isPediaSource, isWritingHistory, lookupScope, mergeCourses,
    progressStorageKey, readProgress, readStoredValue, writingStorageKey } from './learningData.mjs';
import { cloudPageUrl, connectCloud, openPageStorage, readCloudSettings, readCurriculumCatalog } from './cloudStorage.mjs';
import { syncPageUrl } from './googleAuth.mjs';

const access = await openPageStorage({ resumeSession: true });
const cloud = access && !access.isGuest ? access : null;
const recordStorage = cloud ?? localStorage;
const localRequested = new URL(location.href).searchParams.get('local') === '1';

const byId = id => document.getElementById(id);
const fields = Object.fromEntries(['publisher', 'academicYear', 'grade', 'semester', 'edition', 'lesson'].map(id => [id, byId(id)]));
const publishers = ['康軒', '南一', '翰林'];
const input = byId('query');
const statusLabels = { taught: '推估已教', not_yet_taught: '尚未教到', insufficient_data: '資料不足' };
const writingLabels = { not_assessed: '尚未評估', can_write: '會寫', cannot_write: '不會寫',
    uses_zhuyin: '用注音代替', missing_strokes: '漏筆畫' };
const dateLabel = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' });
const importLimit = 2_000_000;

function readLocal(key) {
    return readStoredValue(key === curriculumStorageKey ? localStorage : recordStorage, key);
}

let localCourses = mergeCourses(readLocal(curriculumStorageKey));
let cloudCourses = [];
let courses = localCourses;
let progress = readProgress(readLocal(progressStorageKey));
function readWriting() {
    return Object.fromEntries(Object.entries(readLocal(writingStorageKey) ?? {}).filter(([char, records]) =>
        isWritingHistory(char, records)));
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
        ['publisher', '選擇出版社', value => value],
        ['academicYear', '選擇學年度', value => `${value} 學年度`],
        ['grade', '選擇年級', value => `${value} 年級`],
        ['semester', '選擇學期', value => value === 1 ? '上學期' : '下學期']
    ];
    let choices = courses;
    for (const [key, placeholder, label] of path) {
        const available = choices.map(course => course[key]);
        const values = key === 'publisher' ? [...new Set([...publishers, ...available])]
            : [...new Set(available)].sort((a, b) => a - b);
        const entries = values.map(value => [value, label(value)]);
        if (key === 'publisher' || values.length !== 1) entries.unshift(['', placeholder]);
        setOptions(fields[key], entries, preferred?.[key] ?? fields[key].value);
        fields[key].disabled = !values.length;
        choices = choices.filter(course => String(course[key]) === fields[key].value);
    }
    const editions = choices.map(course => [courseKey(course), choices.length === 1 ? course.versionLabel
        : `${course.versionLabel} · ${course.sourceVersion.slice(0, 8)}`]);
    if (editions.length !== 1) editions.unshift(['', '選擇教材版本']);
    setOptions(fields.edition, editions, preferred ? courseKey(preferred) : fields.edition.value);
    fields.edition.disabled = !choices.length;
    byId('progressFields').disabled = false;
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
    fields.lesson.disabled = !course;
    byId('confirmProgress').disabled = !course || fields.lesson.value === '';
    const missingCourse = progress.records.length > 0 && !courses.some(item => courseKey(item) === progress.activeKey);
    let message;
    if (!fields.publisher.value) message = '先選擇孩子學校使用的出版社。';
    else if (!courses.some(item => item.publisher === fields.publisher.value)) message = '目前沒有可用的教材。';
    else if (!course) message = '選擇學年度、年級和學期後，即可設定課次。';
    else if (cutoff === null) message = '這個教材版本的教學進度尚未確認。';
    else if (cutoff === 0) message = '已確認這學期尚未開始。';
    else message = `已確認教到第 ${cutoff} 課。`;
    if (missingCourse && cutoff === null) message += ' 先前確認的課次已保留，載入相同版本後即可查看。';
    showNotice(byId('progressNotice'), message);
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
    writingField.addEventListener('change', async () => {
        const current = readWriting();
        const records = current[char] ?? [];
        const next = [...records, { status: writingField.value, at: new Date().toISOString() }];
        const updated = { ...current, [char]: next };
        const notice = card.querySelector('.writing-notice');
        try {
            writingField.disabled = true;
            await recordStorage.setItem(writingStorageKey, JSON.stringify(updated));
            writing = updated;
            byId('showRecords').hidden = false;
            updateWritingHistory(card, next);
            showNotice(notice, cloud ? '已同步' : '已儲存');
        } catch (error) {
            writingField.value = records.at(-1)?.status ?? 'not_assessed';
            showNotice(notice, cloud ? error.message : '儲存失敗，請檢查瀏覽器儲存空間。', true);
        } finally {
            writingField.disabled = false;
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
        const updated = mergeCourses(localCourses, imported);
        localStorage.setItem(curriculumStorageKey, JSON.stringify(updated));
        localCourses = updated;
        courses = mergeCourses(cloudCourses, localCourses);
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

const selectionSteps = ['publisher', 'academicYear', 'grade', 'semester', 'edition'];
for (const [index, key] of selectionSteps.slice(0, -1).entries()) {
    fields[key].addEventListener('change', () => {
        for (const step of selectionSteps.slice(index + 1)) fields[step].value = '';
        fillPicker();
    });
}
fields.edition.addEventListener('change', updateLessonPicker);
fields.lesson.addEventListener('change', () => {
    byId('confirmProgress').disabled = !currentCourse() || fields.lesson.value === '';
});

byId('progressForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!fields.lesson.value) return;
    try {
        const updated = confirmCourse(readProgress(readLocal(progressStorageKey)), currentCourse(), Number(fields.lesson.value));
        byId('progressFields').disabled = true;
        await recordStorage.setItem(progressStorageKey, JSON.stringify(updated));
        progress = updated;
        updateLessonPicker();
    } catch (error) {
        showNotice(byId('progressNotice'), error instanceof DOMException ? '儲存失敗，請檢查瀏覽器儲存空間。' : error.message, true);
    } finally {
        byId('progressFields').disabled = false;
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
if (cloud) byId('lookupHelp').textContent = '查詢文字只在此瀏覽器處理。習寫紀錄會同步到此帳號。';
fillPicker(courses.find(course => courseKey(course) === progress.activeKey));

async function loadCatalog() {
    const notice = byId('catalogNotice');
    const retry = byId('retryCatalog');
    retry.hidden = true;
    try {
        const settings = !access && readCloudSettings();
        if (!access && !settings) return;
        const modeLink = byId('catalogModeLink');
        const cloudLookup = cloudPageUrl('learning.html');
        modeLink.href = cloud ? 'learning.html?local=1' : localRequested ? cloudLookup : syncPageUrl(cloudLookup);
        modeLink.textContent = cloud ? '改用本機查詢' : localRequested ? '開啟雲端查詢' : '使用 Google 登入';
        byId('catalogMode').hidden = false;
        showNotice(notice, '正在載入雲端教材…');
        const { published, review } = access ? await access.readCurriculumCatalog()
            : await readCurriculumCatalog(await connectCloud(settings));
        cloudCourses = mergeCourses(review, published);
        courses = mergeCourses(cloudCourses, localCourses);
        const restore = fields.publisher.value === '' && courses.find(course => courseKey(course) === progress.activeKey);
        fillPicker(restore || undefined);
        if (review.length) showNotice(notice, '已載入僅供本帳號使用的開發測試教材。');
        else if (cloudCourses.length) showNotice(notice, '已載入雲端教材。');
        else showNotice(notice, cloud ? '這個帳號目前沒有可用的雲端教材。'
            : '登入後可載入帳號可用的教材。');
    } catch {
        showNotice(notice, '暫時無法載入雲端教材。已匯入本機的教材仍可使用。', true);
        retry.hidden = false;
    }
}

byId('retryCatalog').addEventListener('click', loadCatalog);
void loadCatalog();
