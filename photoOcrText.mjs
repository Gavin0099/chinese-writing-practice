export const isPhotoWord = word => /^\p{Script=Han}{1,10}$/u.test(word);
// Normalize the unambiguous simplified glyph produced by the OCR model.
const ocrGlyphs = new Map([['带', '帶']]);

export function cleanRecognizedWord(raw) {
    // Ignore stray punctuation, numbering, and adjacent printed zhuyin.
    // Keep mixed-script or oversized results for manual review.
    const word = raw.replace(/[\s\p{P}\p{Nd}ㄅ-ㄩˉˊˇˋ˙]+/gu, '');
    return isPhotoWord(word) ? Array.from(word, char => ocrGlyphs.get(char) ?? char).join('') : '';
}

// Context matters when the character's first dictionary reading differs.
const wordReadings = new Map([
    // Contextual readings for 叫好 and 暑假; the dictionary also lists 好ˋ and 假ˇ.
    ['叫好', 'ㄐㄧㄠˋ ㄏㄠˇ'],
    ['暑假', 'ㄕㄨˇ ㄐㄧㄚˋ']
]);
const syllable = /^(?:˙[ㄅ-ㄩ]{1,3}|[ㄅ-ㄩ]{1,3}[ˊˇˋ˙]?)$/u;

export function suggestPhotoReading(word, dictionary) {
    if (!isPhotoWord(word)) return { reading: '', ambiguous: [] };
    const exact = wordReadings.get(word);
    if (exact) return { reading: exact, ambiguous: [] };
    const readings = [];
    const ambiguous = [];
    for (const char of word) {
        const options = [...new Set((dictionary?.[char]?.zhuyin ?? [])
            .map(value => value.split('<br>')[0].trim().replace(/ˉ$/u, ''))
            .filter(value => syllable.test(value)))];
        if (!options.length) return { reading: '', ambiguous: [] };
        if (options.length > 1) ambiguous.push(char);
        readings.push(options[0]);
    }
    return { reading: readings.join(' '), ambiguous: [...new Set(ambiguous)] };
}
