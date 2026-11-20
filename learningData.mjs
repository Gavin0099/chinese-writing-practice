import { courseKey, isVerifiedLesson, isWritingStatus, lookupCharacters } from './characterLookup.mjs';

export const curriculumStorageKey = 'write_practice_lookup_curricula';
export const progressStorageKey = 'write_practice_teaching_progress';
export const writingStorageKey = 'write_practice_writing_records';

export function readStoredValue(storage, key) {
    try {
        return JSON.parse(storage.getItem(key));
    } catch {
        return null;
    }
}

export function mergeCourses(...sources) {
    const courses = new Map();
    for (const source of sources) {
        if (!Array.isArray(source)) continue;
        for (const course of source) {
            const key = courseKey(course);
            if (key && typeof course.versionLabel === 'string' &&
                Array.isArray(course.expectedLessons) && Array.isArray(course.lessons)) courses.set(key, course);
        }
    }
    return [...courses.values()];
}

export function isWritingHistory(character, records) {
    return /^\p{Script=Han}$/u.test(character) && Array.isArray(records) && records.length > 0 && records.every(record =>
        isWritingStatus(record?.status) && typeof record.at === 'string' && Number.isFinite(Date.parse(record.at)));
}

export function isPediaSource(url) {
    return typeof url === 'string' && /^https:\/\/pedia\.cloud\.edu\.tw\/Bookmark\/TCollection\?TextNameId=\d+$/.test(url);
}

export function importCourses(candidate, reports = []) {
    const { file, sha256 } = candidate?.source ?? {};
    if (candidate?.schema_version !== 1 || candidate.status !== 'candidate' ||
        typeof file !== 'string' || !file.trim() || !/^[0-9a-f]{64}$/.test(sha256) ||
        !Array.isArray(candidate.editions) || !candidate.editions.length) {
        throw new Error('請選擇資料工具產生的 candidate JSON。');
    }

    const courses = new Map();
    for (const edition of candidate.editions) {
        const course = {
            academicYear: edition?.academic_year, publisher: edition?.publisher, grade: edition?.grade,
            semester: edition?.semester, sourceVersion: sha256, versionLabel: file
        };
        const key = courseKey(course);
        if (!key || courses.has(key) || !Array.isArray(edition.lessons)) throw new Error('檔案含有無效或重複的教材。');
        const numbered = edition.lessons.filter(lesson => lesson?.number !== null);
        const numbers = numbered.map(lesson => lesson?.number);
        if (new Set(numbers).size !== numbers.length || numbers.some(number => !Number.isInteger(number) || number < 1)) {
            throw new Error('檔案含有無效或重複的課次。');
        }

        const comparison = reports.filter(report => report?.workbook?.sha256 === sha256 && Array.isArray(report.results))
            .flatMap(report => report.results.filter(row => row?.academic_year === course.academicYear &&
                row.publisher === course.publisher && row.grade === course.grade && row.semester === course.semester));
        const rows = new Map();
        for (const row of comparison) {
            rows.set(row.lesson, rows.has(row.lesson) ? null : row);
        }
        const expectedLessons = [...new Set([...numbers, ...[...rows.keys()].filter(n => Number.isInteger(n) && n > 0)])]
            .sort((a, b) => a - b);
        if (!expectedLessons.length) continue;

        const lessons = numbered.flatMap(lesson => {
            const pedia = lesson.pedia;
            const row = rows.get(lesson.number);
            if (pedia?.status !== 'match' || !isPediaSource(pedia.url) ||
                (comparison.length && (row?.status !== 'match' || row.detail_url !== pedia.url))) return [];
            const verified = {
                number: lesson.number, title: typeof pedia.title === 'string' ? pedia.title : null,
                status: 'verified', source: pedia.url,
                characters: Array.isArray(lesson.characters)
                    ? lesson.characters.map(entry => ({ character: entry?.character, kind: entry?.kind })) : []
            };
            return isVerifiedLesson(verified) ? [verified] : [];
        });

        courses.set(key, { ...course, expectedLessons, lessons,
            coverageComplete: numbered.length === edition.lessons.length &&
                rows.size === comparison.length && rows.size === expectedLessons.length &&
                lessons.length === expectedLessons.length && expectedLessons.every((number, i) => number === i + 1)
        });
    }
    const results = [...courses.values()];
    if (!results.some(course => course.lessons.length)) throw new Error('檔案沒有可查詢的比對一致課次。');
    return results;
}

const term = course => course.academicYear * 2 + course.semester;
const schoolTerm = course => (course.grade - 1) * 2 + course.semester;

export function readProgress(value) {
    const records = Array.isArray(value?.records) ? value.records : [value];
    const confirmed = records.filter(record => record?.confirmed === true && courseKey(record) &&
        Number.isInteger(record.lesson) && record.lesson >= 0);
    return { records: confirmed, activeKey: typeof value?.activeKey === 'string' ? value.activeKey : courseKey(confirmed[0]) };
}

export function confirmCourse(state, course, lesson) {
    if (!courseKey(course) || (lesson !== 0 && !course.expectedLessons.includes(lesson))) {
        throw new Error('請選擇有效的課次。');
    }
    const { academicYear, publisher, grade, semester, sourceVersion } = course;
    const record = { academicYear, publisher, grade, semester, sourceVersion, lesson, confirmed: true };
    return { activeKey: courseKey(course), records: [...state.records.filter(entry => term(entry) !== term(course)), record] };
}

export function lookupScope(course, courses, progress) {
    if (!course) return {};
    const currentKey = courseKey(course);
    const records = progress.records.filter(record => term(record) < term(course) || courseKey(record) === currentKey);
    const keys = new Set(records.map(courseKey));
    const curricula = [...courses.filter(edition => keys.has(courseKey(edition)) && courseKey(edition) !== currentKey), course];
    const historyComplete = records.length === schoolTerm(course) && curricula.length === records.length &&
        records.every(record => term(course) - term(record) === schoolTerm(course) - schoolTerm(record));

    const confirmedTerms = new Set(records.map(term));
    const references = [];
    for (let slot = 1; slot < schoolTerm(course); slot++) {
        const expectedTerm = term(course) - schoolTerm(course) + slot;
        if (confirmedTerms.has(expectedTerm)) continue;
        const options = courses.filter(edition => edition.publisher === course.publisher && schoolTerm(edition) === slot);
        const exact = options.filter(edition => term(edition) === expectedTerm);
        const candidates = exact.length ? exact : options.filter(edition => edition.academicYear === course.academicYear);
        if (candidates.length === 1) references.push({ course: candidates[0], otherYear: exact.length === 0 });
    }
    return { curricula, progress: records, historyComplete, references };
}

export function lookupReferenceLessons(text, references = []) {
    const hits = new Map();
    for (const { course, otherYear } of references) {
        for (const { char, curriculum } of lookupCharacters(text, { curricula: [course] })) {
            if (!curriculum.occurrences.length) continue;
            if (!hits.has(char)) hits.set(char, []);
            hits.get(char).push(...curriculum.occurrences.map(occurrence => ({ occurrence, otherYear })));
        }
    }
    return hits;
}
