export function questionKey(entry) {
    return JSON.stringify(Array.from(entry.word, (character, index) => [
        entry.blanks.includes(index + 1) ? null : character, entry.pronunciation[index]
    ]));
}

export function questionPool(words, bookId, from, to, distinctWords = false) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > 60 || from > to) {
        throw new Error('請輸入有效的課次範圍，起始課次須小於或等於結束課次。');
    }
    const groups = new Map();
    const candidates = words.filter(entry => entry.bookId === bookId && entry.confirmed && entry.lesson >= from && entry.lesson <= to)
        .sort((left, right) => left.lesson - right.lesson || (left.word < right.word ? -1 : Number(left.word > right.word)));
    for (const entry of candidates) {
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

export function makeExam({ id, createdAt, book, words, from, to, count, seed, priorityWords = null }) {
    if (!Number.isInteger(count) || count < 1 || count > 60) throw new Error('請輸入 1 至 60 題。');
    if (typeof seed !== 'string' || !seed.trim() || seed.length > 48) throw new Error('亂數種子須為 1 至 48 字元。');
    const { available } = questionPool(words, book.id, from, to, priorityWords !== null);
    if (count > available.length) throw new Error(`這個範圍只有 ${available.length} 題可抽，請減少題數或新增已確認詞語。`);
    const random = seededRandom(seed);
    let selected;
    if (priorityWords) {
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
