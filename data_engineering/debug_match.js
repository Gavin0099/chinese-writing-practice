const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const DICT_PATH = path.join(__dirname, 'sources/dict-csld.json');
const CSV_PATH = path.join(__dirname, 'source_4808.csv');

if (!fs.existsSync(DICT_PATH)) { console.log("Dict missing"); process.exit(1); }
if (!fs.existsSync(CSV_PATH)) { console.log("CSV missing"); process.exit(1); }

// Load Dict
console.log("Loading dict...");
const dictData = JSON.parse(fs.readFileSync(DICT_PATH, 'utf8'));
// Index it
const dictMap = new Map();
dictData.forEach(entry => {
    if (entry.title) dictMap.set(entry.title, entry);
});
console.log(`Dict size: ${dictMap.size}`);

// Load CSV
console.log("Loading CSV...");
const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

console.log(`CSV size: ${records.length}`);
console.log("CSV Headers:", Object.keys(records[0]));

// Test first 5 regular chars
const testChars = ['一', '丁', '不', '人', '的'];
testChars.forEach(c => {
    console.log(`Lookup '${c}': ${dictMap.has(c) ? 'FOUND' : 'MISSING'}`);
    if (dictMap.has(c)) {
        const entry = dictMap.get(c);
        console.log(`   -> Radical: ${entry.radical}, Strokes: ${entry.stroke_count}`);
        // Inspect Zhuyin structure
        if (entry.heteronyms && entry.heteronyms.length > 0) {
            console.log(`   -> Zhuyin: ${entry.heteronyms[0].bopomofo}`);
        }
    }
});
