export function questionKey(entry) {
    return JSON.stringify(Array.from(entry.word, (character, index) => [
        entry.blanks.includes(index + 1) ? null : character, entry.pronunciation[index]
    ]));
}

function examEntry(entry, blankMode) {
    if (blankMode === 'vocabulary') return entry;
    const characters = Array.from(entry.word);
    const blanks = blankMode === 'all'
        ? characters.map((_, index) => index + 1)
        : [1 + Math.floor(seededRandom(entry.word)() * characters.length)];
    return { ...entry, blanks };
}

export function usesLessonCharacters(blankMode) {
    return blankMode === 'lesson' || blankMode === 'lesson-preferred';
}

function lessonQuestionPool(candidates, from, to, distinctWords, lessonCharacters, allowFallback) {
    const missingLessons = [];
    for (let lesson = from; lesson <= to; lesson++) {
        if (!lessonCharacters.has(lesson)) missingLessons.push(lesson);
    }
    const prompts = new Map();
    let noMatchingCharacter = 0;
    for (const candidate of candidates) {
        const writing = lessonCharacters.get(candidate.lesson);
        const characters = Array.from(candidate.word);
        const positions = [];
        characters.forEach((character, index) => {
            if (writing?.has(character)) positions.push(index + 1);
        });
        const matched = positions.length > 0;
        if (!matched) {
            if (writing) noMatchingCharacter++;
            if (!allowFallback) continue;
            positions.push(examEntry(candidate, 'single').blanks[0]);
        }
        for (const position of positions) {
            const character = matched ? characters[position - 1] : null;
            const entry = { ...candidate, blanks: [position] };
            const key = questionKey(entry);
            const source = { id: candidate.id, lesson: candidate.lesson };
            const existing = prompts.get(key);
            if (!existing) prompts.set(key, { entry, character, sources: [source], ambiguous: false });
            else {
                existing.ambiguous ||= existing.entry.word !== candidate.word;
                existing.character ??= character;
                existing.sources.push(source);
            }
        }
    }

    const groups = new Map();
    let ambiguous = 0;
    for (const prompt of prompts.values()) {
        if (prompt.ambiguous) {
            ambiguous++;
            continue;
        }
        const { entry } = prompt;
        const key = distinctWords ? entry.word : JSON.stringify([entry.word, entry.pronunciation]);
        if (!groups.has(key)) groups.set(key, { entry, variants: [] });
        groups.get(key).variants.push(prompt);
    }
    return { available: [...groups.values()], ambiguous, missingLessons, noMatchingCharacter };
}

export function questionPool(words, bookId, from, to, distinctWords = false, blankMode = 'vocabulary',
    lessonCharacters = new Map()) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > 60 || from > to) {
        throw new Error('請輸入有效的課次範圍，起始課次須小於或等於結束課次。');
    }
    if (!usesLessonCharacters(blankMode) && !['vocabulary', 'single', 'all'].includes(blankMode)) {
        throw new Error('請選擇有效的挖空方式。');
    }
    const candidates = words.filter(entry => entry.bookId === bookId && entry.confirmed && entry.lesson >= from && entry.lesson <= to)
        .sort((left, right) => left.lesson - right.lesson || (left.word < right.word ? -1 : Number(left.word > right.word)));
    if (usesLessonCharacters(blankMode)) {
        return lessonQuestionPool(candidates, from, to, distinctWords, lessonCharacters, blankMode === 'lesson-preferred');
    }
    const groups = new Map();
    for (const candidate of candidates) {
        const entry = examEntry(candidate, blankMode);
        const key = questionKey(entry);
        const source = { id: entry.id, lesson: entry.lesson };
        const group = groups.get(key);
        if (!group) groups.set(key, { entry, sources: [source], ambiguous: false });
        else {
            group.ambiguous ||= group.entry.word !== entry.word;
            group.sources.push(source);
        }
    }
    const available = [...groups.values()].filter(group => !group.ambiguous);
    const ambiguous = groups.size - available.length;
    if (!distinctWords) return { available, ambiguous };
    const seen = new Set();
    return { ambiguous, available: available.filter(({ entry }) => {
        if (seen.has(entry.word)) return false;
        seen.add(entry.word);
        return true;
    }) };
}

function seededRandom(seed) {
    let state = 2166136261;
    for (let index = 0; index < seed.length; index++) state = Math.imul(state ^ seed.charCodeAt(index), 16777619);
    return () => {
        state = (state + 0x6D2B79F5) | 0;
        let value = Math.imul(state ^ state >>> 15, state | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
}

function draw(groups, count, random) {
    for (let index = 0; index < count; index++) {
        const selected = index + Math.floor(random() * (groups.length - index));
        [groups[index], groups[selected]] = [groups[selected], groups[index]];
    }
    return groups.slice(0, count);
}

function drawLessonQuestions(available, count, random, priorityWords) {
    const distinct = new Map();
    const groupsByCharacter = new Map();
    const repeats = [];

    function assignCharacter(group, tried) {
        for (const variant of group.variants) {
            const { character } = variant;
            if (character === null || tried.has(character)) continue;
            tried.add(character);
            const previous = groupsByCharacter.get(character);
            // An earlier question can use another lesson character to leave this one available.
            if (previous && !assignCharacter(previous, tried)) continue;
            groupsByCharacter.set(character, group);
            distinct.set(group, variant);
            return true;
        }
        return false;
    }

    function pick(groups, slots) {
        if (!slots) return;
        const repeatedGroups = [];
        for (const group of draw(groups, groups.length, random)) {
            if (assignCharacter(group, new Set())) {
                slots--;
                if (!slots) break;
            } else {
                repeatedGroups.push(group);
            }
        }
        repeats.push(...repeatedGroups.slice(0, slots).map(group =>
            group.variants.find(variant => variant.character !== null) ?? group.variants[0]));
    }

    if (priorityWords) {
        const priority = available.filter(({ entry }) => priorityWords.has(entry.word));
        const ordinary = available.filter(({ entry }) => !priorityWords.has(entry.word));
        const priorityCount = Math.min(count, priority.length);
        pick(priority, priorityCount);
        pick(ordinary, count - priorityCount);
    } else {
        pick(available, count);
    }
    return draw([...distinct.values(), ...repeats], count, random);
}

export function makeExam({ id, createdAt, book, words, from, to, count, seed, priorityWords = null,
    blankMode = 'vocabulary', lessonCharacters }) {
    if (!Number.isInteger(count) || count < 1 || count > 60) throw new Error('請輸入 1 至 60 題。');
    if (typeof seed !== 'string' || !seed.trim() || seed.length > 48) throw new Error('亂數種子須為 1 至 48 字元。');
    const { available, missingLessons } = questionPool(words, book.id, from, to, priorityWords !== null, blankMode, lessonCharacters);
    if (count > available.length) {
        const reason = blankMode === 'lesson' && missingLessons?.length
            ? `第 ${missingLessons.join('、')} 課缺少應寫生字表，請核對班級教材版次。`
            : '請減少題數或新增已確認詞語。';
        throw new Error(`這個範圍只有 ${available.length} 題可抽。${reason}`);
    }
    const random = seededRandom(seed);
    let selected;
    if (usesLessonCharacters(blankMode)) {
        selected = drawLessonQuestions(available, count, random, priorityWords);
    } else if (priorityWords) {
        const priority = available.filter(({ entry }) => priorityWords.has(entry.word));
        const ordinary = available.filter(({ entry }) => !priorityWords.has(entry.word));
        const priorityCount = Math.min(count, priority.length);
        const picked = [...draw(priority, priorityCount, random), ...draw(ordinary, count - priorityCount, random)];
        selected = draw(picked, count, random);
    } else {
        selected = draw(available, count, random);
    }
    const questions = selected.map(({ entry, sources }) => ({
        word: entry.word, pronunciation: [...entry.pronunciation], blanks: [...entry.blanks], sources
    }));
    return { id, createdAt, book: { ...book }, from, to, count, seed, questions };
}
