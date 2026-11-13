import { courseKey, lookupCharacters } from './characterLookup.mjs';
import { confirmCourse, curriculumStorageKey, importCourses, isPediaSource, lookupReferenceLessons, lookupScope,
    mergeCourses, progressStorageKey, readProgress, readStoredValue } from './learningData.mjs';
import { cloudPageUrl, connectCloud, openPageStorage, readCloudSettings, readCurriculumCatalog } from './cloudStorage.mjs';
import { syncPageUrl } from './googleAuth.mjs';
import { lookupWordReviews, readAttempts } from './reviewData.mjs';
import { mergeReviewAttempts } from './reviewSync.mjs';
import { readVocabulary } from './vocabularyData.mjs';

const access = await openPageStorage({ resumeSession: true });
const cloud = access && !access.isGuest ? access : null;
const recordStorage = cloud ?? localStorage;
const localRequested = new URL(location.href).searchParams.get('local') === '1';

const byId = id => document.getElementById(id);
const fields = Object.fromEntries(['publisher', 'academicYear', 'grade', 'semester', 'edition', 'lesson'].map(id => [id, byId(id)]));
const publishers = ['康軒', '南一', '翰林'];
const input = byId('query');
const resultList = byId('results');
const reviewNotice = byId('reviewLookupNotice');
const statusLabels = { taught: '推估已教', not_yet_taught: '尚未教到', insufficient_data: '資料不足' };
const importLimit = 2_000_000;

function readLocal(key) {
    return readStoredValue(key === curriculumStorageKey ? localStorage : recordStorage, key);
}

let localCourses = mergeCourses(readLocal(curriculumStorageKey));
let cloudCourses = [];
let courses = localCourses;
let progress = readProgress(readLocal(progressStorageKey));
let activeQuery = null;
let reviewWords = [];
let reviewAttempts = [];
let remoteAttempts = [];
let reviewLoading = false;
let reviewReady = false;
let reviewIncomplete = false;

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

function lessonLabel(occurrence) {
    const semester = occurrence.semester === 1 ? '上學期' : '下學期';
    return `${occurrence.publisher} ${occurrence.grade} 年級${semester} 第 ${occurrence.lesson} 課`;
}

function sourceLink(url, label) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label;
    return link;
}

function appendExcerpt(container, excerpt) {
    const text = typeof excerpt?.text === 'string' ? excerpt.text.trim() : '';
    const credit = typeof excerpt?.credit === 'string' ? excerpt.credit.trim() : '';
    let url;
    if (typeof excerpt?.url === 'string') {
        try { url = new URL(excerpt.url); } catch { /* Missing or invalid source. */ }
    }
    const usable = text && [...text].length <= 80 && credit && url?.protocol === 'https:' && !url.username && !url.password;
    const label = document.createElement('p');
    label.textContent = usable ? '課文節錄' : '這一課目前沒有可顯示的課文節錄。';
    label.className = usable ? 'lesson-excerpt-label' : 'hint';
    container.append(label);
    if (!usable) return;
    const quote = document.createElement('blockquote');
    quote.textContent = text;
    quote.cite = url.href;
    container.append(quote, sourceLink(url.href, credit));
}

function lessonEvidenceRenderer() {
    const editions = new Map(courses.map(course => [courseKey(course), course]));
    const rendered = new Map();
    return (occurrence, prefix, char) => {
        const kind = occurrence.type === 'writing' ? '習寫字' : '認讀字';
        const edition = courseKey(occurrence);
        const key = JSON.stringify([edition, occurrence.lesson]);
        const previous = rendered.get(key);
        if (previous) {
            const link = document.createElement('a');
            link.href = `#${previous.details.id}`;
            link.textContent = `${prefix}同「${previous.char}」的教材課次（${kind}）`;
            link.addEventListener('click', event => {
                event.preventDefault();
                previous.details.open = true;
                previous.details.querySelector('summary').focus();
            });
            return link;
        }
        const details = document.createElement('details');
        details.id = `lesson-evidence-${rendered.size + 1}`;
        details.className = 'lesson-evidence';
        const summary = document.createElement('summary');
        const title = occurrence.title ? `〈${occurrence.title.replace(/^第.+?課[：:]\s*/, '')}〉` : '';
        summary.textContent = `${prefix}${lessonLabel(occurrence)}${title}（${occurrence.academicYear} 學年度，${kind}）`;
        details.append(summary);
        rendered.set(key, { details, char });

        const lesson = editions.get(edition)?.lessons.find(item => item.number === occurrence.lesson);
        const body = document.createElement('div');
        body.className = 'lesson-evidence-body';
        appendExcerpt(body, lesson?.excerpt);
        for (const [type, label] of [['writing', '習寫字'], ['recognition', '認讀字']]) {
            const entries = lesson?.characters.filter(item => item.kind === type).map(item => item.character) ?? [];
            if (!entries.length) continue;
            const line = document.createElement('p');
            line.textContent = `${label}　${entries.join('、')}`;
            body.append(line);
        }
        if (isPediaSource(occurrence.source)) body.append(sourceLink(occurrence.source, '教育百科生字表'));
        details.append(body);
        return details;
    };
}

function renderResult(result, references, lessonEvidence) {
    const card = byId('resultTemplate').content.firstElementChild.cloneNode(true);
    const { char, positions, curriculum, teachingStatus } = result;
    card.querySelector('h3').textContent = char;
    if (positions.length > 1) card.querySelector('.count').textContent = `出現 ${positions.length} 次`;

    const first = card.querySelector('.first-occurrence');
    if (curriculum.firstOccurrence) {
        first.append(lessonEvidence(curriculum.firstOccurrence, '最早查到　', char));
    } else if (!references.length) {
        first.textContent = '這次查詢的教材中未找到這個字。';
    } else {
        first.hidden = true;
    }
    const other = curriculum.occurrences.slice(1).map(occurrence => {
        const item = document.createElement('li');
        item.append(lessonEvidence(occurrence, '', char));
        return item;
    });
    card.querySelector('.occurrences').append(...other);
    const referenceItems = references.map(({ occurrence, otherYear }) => {
        const item = document.createElement('li');
        const prefix = otherYear ? '其他學年度參考　' : '前期教材（尚未確認使用）　';
        item.append(lessonEvidence(occurrence, prefix, char));
        return item;
    });
    card.querySelector('.reference-occurrences').append(...referenceItems);

    const teaching = card.querySelector('.teaching-status');
    teaching.textContent = statusLabels[teachingStatus];
    teaching.dataset.state = teachingStatus;

    return card;
}

function renderWordReviews() {
    const cards = [...resultList.children];
    const characters = cards.map(card => card.querySelector('h3').textContent);
    const hits = lookupWordReviews(characters, reviewWords, reviewAttempts);
    let hasMatches = false;
    for (const [index, card] of cards.entries()) {
        const section = card.querySelector('.word-review');
        const rows = hits.get(characters[index]);
        hasMatches ||= rows.length > 0;
        section.hidden = !rows.length;
        section.querySelector('ul').replaceChildren(...rows.map(({ word, everWrong, lastWrong }) => {
            const row = document.createElement('li');
            const term = document.createElement('strong');
            term.textContent = word;
            const status = document.createElement('span');
            if (everWrong) status.textContent = lastWrong ? '曾寫錯' : '曾寫錯，最近一次答對';
            else if (lastWrong === null) status.textContent = reviewIncomplete ? '目前未取得批改紀錄' : '尚無批改紀錄';
            else status.textContent = '有作答，未記錄錯誤';
            row.append(term, status);
            return row;
        }));
    }
    let message = '';
    if (cards.length) {
        if (reviewLoading) message = '正在讀取批改紀錄…';
        else if (reviewIncomplete) message = '暫時無法讀取完整的批改紀錄。可再按「查詢國字」重試。';
        else if (reviewReady) message = hasMatches ? '詞語紀錄依整題批改結果顯示。' : '目前沒有相關詞語的批改紀錄。';
    }
    showNotice(reviewNotice, message, reviewIncomplete && !reviewLoading);
}

async function loadWordReviews() {
    if (reviewLoading || !resultList.children.length) return;
    reviewLoading = true;
    reviewIncomplete = false;
    if (cloud) renderWordReviews();
    let localAttempts = [];
    try {
        localAttempts = readAttempts(localStorage, cloud?.ownerId ?? 'local');
    } catch {
        reviewIncomplete = true;
    }
    try {
        reviewWords = readVocabulary(recordStorage).words;
    } catch {
        reviewWords = [];
        reviewIncomplete = true;
    }
    if (cloud) {
        try {
            remoteAttempts = mergeReviewAttempts(await cloud.readReviewAttempts());
        } catch {
            reviewIncomplete = true;
        }
    }
    try {
        reviewAttempts = mergeReviewAttempts(remoteAttempts, localAttempts);
    } catch {
        reviewAttempts = remoteAttempts;
        reviewIncomplete = true;
    }
    reviewLoading = false;
    reviewReady = true;
    renderWordReviews();
}

function renderResults() {
    if (activeQuery === null) return;
    const scope = lookupScope(currentCourse(), courses, progress);
    const { references, ...confirmedScope } = scope;
    const results = lookupCharacters(activeQuery, confirmedScope);
    const referenceHits = lookupReferenceLessons(activeQuery, references);
    const lessonEvidence = lessonEvidenceRenderer();
    byId('resultsHeading').hidden = !results.length;
    showNotice(byId('queryNotice'), results.length ? `共 ${results.length} 個不同的國字` : '請輸入至少一個國字。');
    resultList.replaceChildren(...results.map(result =>
        renderResult(result, referenceHits.get(result.char) ?? [], lessonEvidence)));
    renderWordReviews();
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
    void loadWordReviews();
});
fillPicker(courses.find(course => courseKey(course) === progress.activeKey));
byId('queryFields').disabled = false;

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
