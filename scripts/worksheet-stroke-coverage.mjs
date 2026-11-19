import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
for (const source of ['../curriculum_data.js', '../stroke-data/verified-tw.js']) {
    runInNewContext(readFileSync(new URL(source, import.meta.url), 'utf8'), { window });
}

const { characters } = window.VERIFIED_TW_STROKES;
console.log('grade\tsemester\tlesson\tverified\ttotal');
for (const [grade, terms] of Object.entries(window.CURRICULUM_DATA)) {
    for (const [semester, lessons] of Object.entries(terms)) {
        const seen = new Set();
        for (const { lesson, vocab } of lessons) {
            // The worksheet selects the first record when a lesson number repeats.
            if (seen.has(lesson)) continue;
            seen.add(lesson);
            const verified = vocab.filter(char => Object.hasOwn(characters, char)).length;
            console.log([grade, semester, lesson, verified, vocab.length].join('\t'));
        }
    }
}
