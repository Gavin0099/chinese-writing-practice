function questionKey(entry) {
    return JSON.stringify(Array.from(entry.word, (character, index) => [
        entry.blanks.includes(index + 1) ? null : character, entry.pronunciation[index]
    ]));
}

export function questionPool(words, bookId, from, to) {
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
    return { available, ambiguous: groups.size - available.length };
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

export function makeExam({ id, createdAt, book, words, from, to, count, seed }) {
    if (!Number.isInteger(count) || count < 1 || count > 60) throw new Error('請輸入 1 至 60 題。');
    if (typeof seed !== 'string' || !seed.trim() || seed.length > 48) throw new Error('亂數種子須為 1 至 48 字元。');
    const { available } = questionPool(words, book.id, from, to);
    if (count > available.length) throw new Error(`這個範圍只有 ${available.length} 題可抽，請減少題數或新增已確認詞語。`);
    const random = seededRandom(seed);
    const questions = [];
    for (let index = 0; index < count; index++) {
        const selected = index + Math.floor(random() * (available.length - index));
        [available[index], available[selected]] = [available[selected], available[index]];
        const { entry, sources } = available[index];
        questions.push({ word: entry.word, pronunciation: [...entry.pronunciation], blanks: [...entry.blanks], sources });
    }
    return { id, createdAt, book: { ...book }, from, to, count, seed, questions };
}
