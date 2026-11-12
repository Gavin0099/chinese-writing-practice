const HAN = /^\p{Script=Han}$/u;
const CHARACTER_TYPES = new Set(["writing", "recognition"]);
const WRITING_STATUSES = new Set(["can_write", "cannot_write", "uses_zhuyin", "missing_strokes", "not_assessed"]);

export function isWritingStatus(status) {
    return WRITING_STATUSES.has(status);
}

export function courseKey(course) {
    if (!course || !Number.isInteger(course.academicYear) || course.academicYear < 1 ||
        typeof course.publisher !== "string" || !course.publisher.trim() ||
        !Number.isInteger(course.grade) || course.grade < 1 || course.grade > 6 ||
        ![1, 2].includes(course.semester) ||
        typeof course.sourceVersion !== "string" || !course.sourceVersion.trim()) return null;

    return JSON.stringify([course.academicYear, course.publisher, course.grade, course.semester, course.sourceVersion]);
}

export function isVerifiedLesson(lesson) {
    if (lesson?.status !== "verified" || typeof lesson.source !== "string" || !lesson.source.trim() ||
        !Array.isArray(lesson.characters) || !lesson.characters.length) return false;

    const seen = new Set();
    for (const entry of lesson.characters) {
        if (typeof entry?.character !== "string" || !HAN.test(entry.character) ||
            !CHARACTER_TYPES.has(entry.kind) || seen.has(entry.character)) return false;
        seen.add(entry.character);
    }
    return true;
}

function readCourse(course) {
    const { expectedLessons, lessons } = course;
    if (!Array.isArray(expectedLessons) || expectedLessons.length === 0 || !Array.isArray(lessons)) return null;
    const expected = new Set(expectedLessons);
    if (expected.size !== expectedLessons.length || expectedLessons.some(number => !Number.isInteger(number) || number < 1)) return null;

    const byNumber = new Map();
    const ambiguous = new Set();
    for (const lesson of lessons) {
        if (!expected.has(lesson?.number)) return null;
        if (byNumber.has(lesson.number)) ambiguous.add(lesson.number);
        byNumber.set(lesson.number, lesson);
    }

    const verified = expectedLessons.slice().sort((a, b) => a - b).flatMap(number => {
        const lesson = byNumber.get(number);
        if (ambiguous.has(number) || !isVerifiedLesson(lesson)) return [];
        return [lesson];
    });

    return { expected, verified, complete: course.coverageComplete === true && verified.length === expected.size };
}

/** Look up the child's selected curriculum editions using confirmed progress records. */
export function lookupCharacters(text, { curricula = [], progress = [], historyComplete = false, writingStatuses = {} } = {}) {
    const positions = new Map();
    let offset = 0;
    for (const char of text) {
        if (HAN.test(char)) {
            if (!positions.has(char)) positions.set(char, []);
            positions.get(char).push(offset);
        }
        offset += char.length;
    }

    const progressByCourse = new Map();
    for (const entry of progress) {
        const key = courseKey(entry);
        if (!key) continue;
        // Conflicting records require a fresh confirmation.
        progressByCourse.set(key, progressByCourse.has(key) ? null : entry);
    }

    const occurrences = new Map();
    let fullHistory = historyComplete === true && curricula.length > 0;
    const termCounts = new Map();
    for (const course of curricula) {
        const term = `${course?.academicYear}/${course?.semester}`;
        termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
    }
    const sortedCourses = curricula.slice().sort((a, b) =>
        (a?.academicYear - b?.academicYear) || (a?.semester - b?.semester));
    const taught = new Set();
    let previousTerm = null;
    for (const course of sortedCourses) {
        const key = courseKey(course);
        const term = `${course?.academicYear}/${course?.semester}`;
        const indexed = key && termCounts.get(term) === 1 ? readCourse(course) : null;
        if (!indexed) {
            fullHistory = false;
            continue;
        }

        const termNumber = course.academicYear * 2 + course.semester;
        if (previousTerm !== null && termNumber !== previousTerm + 1) fullHistory = false;
        previousTerm = termNumber;

        const confirmed = progressByCourse.get(key);
        const cutoff = confirmed?.confirmed === true &&
            (confirmed.lesson === 0 || indexed.expected.has(confirmed.lesson)) ? confirmed.lesson : null;
        if (cutoff === null || !indexed.complete) fullHistory = false;

        for (const lesson of indexed.verified) {
            for (const entry of lesson.characters) {
                const char = entry.character;
                if (!positions.has(char)) continue;
                if (!occurrences.has(char)) occurrences.set(char, []);
                occurrences.get(char).push({
                    academicYear: course.academicYear,
                    publisher: course.publisher,
                    grade: course.grade,
                    semester: course.semester,
                    sourceVersion: course.sourceVersion,
                    lesson: lesson.number,
                    title: lesson.title ?? null,
                    type: entry.kind,
                    source: lesson.source
                });
                if (cutoff !== null && lesson.number <= cutoff) taught.add(char);
            }
        }
    }

    return Array.from(positions, ([char, offsets]) => {
        const matches = occurrences.get(char) ?? [];
        const firstOccurrence = matches[0] ?? null;
        const writingStatus = writingStatuses[char];
        return {
            char,
            positions: offsets,
            curriculum: {
                firstOccurrence,
                occurrences: matches,
                type: firstOccurrence?.type ?? "unknown",
                sourceVersion: firstOccurrence?.sourceVersion ?? null
            },
            teachingStatus: taught.has(char) ? "taught" : fullHistory ? "not_yet_taught" : "insufficient_data",
            writingStatus: WRITING_STATUSES.has(writingStatus) ? writingStatus : "not_assessed"
        };
    });
}
