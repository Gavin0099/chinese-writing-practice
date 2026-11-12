import { courseKey, isVerifiedLesson } from './characterLookup.mjs';
import { cloudPageUrl, openPageStorage } from './cloudStorage.mjs';
import { syncPageUrl } from './googleAuth.mjs';
import { curriculumStorageKey, mergeCourses, progressStorageKey, readProgress, readStoredValue } from './learningData.mjs';

export function resolveWorksheetCourse(savedProgress, courses) {
    const { records, activeKey } = readProgress(savedProgress);
    const active = records.filter(record => courseKey(record) === activeKey);
    const progress = active.length === 1 ? active[0] : null;
    const course = progress && courses.find(candidate => courseKey(candidate) === activeKey);
    const lessons = course ? [...new Set(course.expectedLessons)]
        .filter(number => Number.isSafeInteger(number) && number > 0)
        .sort((a, b) => a - b)
        .map(number => {
            const matches = course.lessons.filter(lesson => lesson?.number === number);
            if (matches.length !== 1 || !isVerifiedLesson(matches[0])) return { number, verified: false, writing: '' };
            const lesson = matches[0];
            return {
                number, verified: true, title: typeof lesson.title === 'string' ? lesson.title.split('\n')[0] : '',
                writing: lesson.characters.filter(entry => entry.kind === 'writing').map(entry => entry.character).join('')
            };
        }) : [];
    return { progress, hasConfirmedProgress: records.length > 0, course, lessons };
}

export async function openWorksheetHome({ prepare, clear }) {
    const byId = id => document.getElementById(id);
    const panel = byId('currentWorksheet');
    let access;
    let connectionFailed = false;
    try {
        access = await openPageStorage({ home: true });
    } catch {
        connectionFailed = true;
        document.querySelector('main').inert = false;
    }
    if (!panel.isConnected) return true;

    const cloud = access && !access.isGuest ? access : null;
    const savedProgress = connectionFailed ? null : readStoredValue(cloud ?? localStorage, progressStorageKey);
    const local = readStoredValue(localStorage, curriculumStorageKey);
    const initial = resolveWorksheetCourse(savedProgress, mergeCourses(local));
    if (!access && !connectionFailed && !initial.hasConfirmedProgress) return false;

    const account = byId('worksheetAccount');
    account.textContent = cloud ? '帳號與同步' : '雲端同步';
    if (!cloud) account.href = syncPageUrl(cloudPageUrl('index.html'));
    const settings = byId('worksheetSettings');
    if (cloud) settings.href = cloudPageUrl('learning.html');

    let state = initial;
    let catalogFailed = false;
    if (access && initial.progress) {
        try {
            const { published, review } = await access.readCurriculumCatalog();
            state = resolveWorksheetCourse(savedProgress, mergeCourses(review, published, local));
        } catch {
            catalogFailed = true;
        }
    }
    if (!panel.isConnected) return true;

    const { progress, course, lessons } = state;
    const heading = byId('worksheetTitle');
    const notice = byId('worksheetNotice');
    const choice = byId('worksheetLesson');
    const prepareButton = byId('prepareWorksheet');
    const manual = byId('legacyControls');
    const manualButton = byId('toggleCustomBtn');
    const showManual = () => {
        manual.style.display = 'block';
        manualButton.textContent = '收合自訂練習';
    };
    manualButton.textContent = '手動輸入生字';
    manualButton.disabled = false;
    manualButton.onclick = () => {
        if (manual.style.display === 'none') {
            showManual();
            byId('characters').focus();
        } else {
            manual.style.display = 'none';
            manualButton.textContent = '手動輸入生字';
        }
    };
    for (const field of document.querySelectorAll('.legacy-course-field')) field.hidden = true;
    byId('legacyWorksheetEdition').hidden = true;
    byId('resetAppBtn').hidden = true;
    byId('cardLoading').hidden = true;
    panel.hidden = false;

    if (!progress) {
        heading.textContent = connectionFailed ? '手動練習' : '先設定學校教材';
        notice.textContent = connectionFailed ? '可以手動輸入這次要練習的生字。'
            : '選擇學校使用的出版社，並確認目前教到哪一課。';
        return true;
    }

    const term = progress.semester === 1 ? '上學期' : '下學期';
    byId('worksheetContext').textContent = `${progress.publisher} · ${progress.academicYear} 學年度 · ${progress.grade} 年級${term}`;
    settings.textContent = '調整教學進度';
    const describeLesson = lesson => `第 ${lesson.number} 課${lesson.title ? `：${lesson.title}` : ''}`;
    function showSelection() {
        const selected = lessons.find(lesson => String(lesson.number) === choice.value);
        if (!selected) {
            heading.textContent = progress.lesson === 0 ? '尚未開始上課' : `第 ${progress.lesson} 課`;
            notice.textContent = !course
                ? catalogFailed ? '暫時無法載入教材，請重新整理後再試。' : '目前無法取得這個版本的字表。'
                : progress.lesson === 0 ? '可選一課準備練習簿。' : '請選擇有字表的課次。';
        } else {
            heading.textContent = describeLesson(selected);
            if (!selected.verified) notice.textContent = '這一課的字表待核對，請改選其他課或手動輸入生字。';
            else if (!selected.writing) notice.textContent = '這一課沒有習寫字，請改選其他課。';
            else notice.textContent = selected.number === progress.lesson
                ? '依家長確認的課次準備練習。' : '這次選擇的練習課次。';
        }
        prepareButton.disabled = !selected?.writing;
        prepareButton.textContent = selected ? `準備第 ${selected.number} 課練習簿` : '準備練習簿';
    }
    if (lessons.length) {
        const options = lessons.map(lesson => new Option(
            describeLesson(lesson) + (lesson.verified ? lesson.writing ? '' : '（無習寫字）' : '（字表待核對）'),
            lesson.number));
        if (!lessons.some(lesson => lesson.number === progress.lesson)) options.unshift(new Option('選擇課次', ''));
        choice.replaceChildren(...options);
        choice.value = lessons.some(lesson => lesson.number === progress.lesson) ? String(progress.lesson) : '';
        byId('worksheetLessons').hidden = false;
        prepareButton.hidden = false;
        choice.addEventListener('change', () => {
            clear();
            showSelection();
        });
        prepareButton.onclick = () => {
            const selected = lessons.find(lesson => String(lesson.number) === choice.value);
            if (!selected?.writing) return;
            showManual();
            prepare(selected.writing, {
                academicYear: progress.academicYear, publisher: progress.publisher, grade: progress.grade,
                semester: progress.semester === 1 ? 'A' : 'B', lesson: selected.number, title: selected.title
            });
            byId('worksheetPrint').focus();
        };
    }
    showSelection();
    return true;
}
