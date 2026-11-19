import { isVerifiedLesson } from './characterLookup.mjs';

const label = value => typeof value === 'string' ? value.normalize('NFKC').trim() : '';

function lessonNumber(value) {
    const text = label(String(value ?? ''));
    const number = Number(text);
    return /^[0-9]{1,2}$/u.test(text) && number >= 1 && number <= 60 ? number : null;
}

export function matchingBookCourses(book, courses) {
    return courses.filter(course => course.academicYear === book.year && course.grade === book.grade &&
        course.semester === book.semester && label(course.publisher) === label(book.publisher));
}

export function bookWritingLessons(book, courses, confirmed = null) {
    if (!book) return [];
    let matching = matchingBookCourses(book, courses);
    const edition = label(book.edition);
    if (book.curriculumSourceVersion) {
        matching = matching.filter(course => course.sourceVersion === book.curriculumSourceVersion);
    } else if (edition) {
        matching = matching.filter(course => [course.versionLabel, course.sourceVersion].some(value => label(value) === edition));
    }
    if (matching.length > 1 && confirmed) {
        const pinned = matching.filter(course => course.academicYear === confirmed.academicYear &&
            course.grade === confirmed.grade && course.semester === confirmed.semester &&
            course.publisher === confirmed.publisher && course.sourceVersion === confirmed.sourceVersion);
        if (pinned.length === 1) matching = pinned;
    }
    if (matching.length !== 1) return [];
    const course = matching[0];
    const expected = new Set(course.expectedLessons);
    const seen = new Map();
    for (const lesson of course.lessons) {
        const number = lessonNumber(lesson?.number);
        if (number === null || !expected.has(number)) continue;
        seen.set(number, seen.has(number) || !isVerifiedLesson(lesson) ? null : {
            number,
            characters: lesson.characters.filter(entry => entry.kind === 'writing')
                .map(entry => entry.character)
        });
    }
    return [...seen.values()].filter(Boolean);
}
