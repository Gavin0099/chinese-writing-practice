const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// CONFIG
const SOURCE_CSV = path.join(__dirname, 'source_4808.csv');
const DICT_JSON = path.join(__dirname, 'sources/dict-csld.json');

const OUTPUT_CORE = path.join(__dirname, 'char_core_4808.json');
const OUTPUT_SET = path.join(__dirname, 'char_set_4808.json');
const OUTPUT_ANOMALIES = path.join(__dirname, 'anomalies.json');
const OUTPUT_META = path.join(__dirname, 'meta.json');

function log(msg) { console.log(`[ETL] ${msg}`); }

function main() {
    log('Starting Final ETL Pipeline (Node.js/Robust)...');

    // 1. Load Scope (CSV)
    if (!fs.existsSync(SOURCE_CSV)) {
        console.error('❌ Source CSV not found');
        process.exit(1);
    }

    // Read with BOM handling
    let csvContent = fs.readFileSync(SOURCE_CSV, 'utf8');
    if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
    }

    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });

    // Find char column
    const headers = Object.keys(records[0] || {});
    log(`CSV Headers: ${JSON.stringify(headers)}`);

    // Priority list
    let charCol = headers.find(h => ['常用字', 'character', 'title', '字', 'Word', 'Character'].includes(h));

    if (!charCol) {
        charCol = headers.find(h => h.includes('字') || h.includes('Character') || h.includes('title'));
    }

    if (!charCol) {
        console.error(`❌ Could not identify character column in: ${headers.join(',')}`);
        process.exit(1);
    }
    log(`Selected Character Column: '${charCol}'`);
    if (records.length > 0) {
        log(`Sample raw value: '${records[0][charCol]}'`);
    }

    const charList = records.map(r => r[charCol]);
    // Filter
    const validChars = charList.filter(c => c && c.trim().length > 0);
    const uniqueChars = [...new Set(validChars)];
    log(`Scope loaded: ${uniqueChars.length} characters.`);

    // 2. Load Dictionary
    if (!fs.existsSync(DICT_JSON)) {
        console.error('❌ Dictionary JSON not found');
        process.exit(1);
    }
    log(`Loading dictionary...`);
    const dictData = JSON.parse(fs.readFileSync(DICT_JSON, 'utf8'));

    // Indexing
    const dictMap = new Map();
    dictData.forEach(entry => {
        if (entry.title) dictMap.set(entry.title, entry);
    });
    log(`Dictionary indexed: ${dictMap.size} entries.`);

    // 3. Join & Normalize
    const coreData = {};
    const anomalies = [];
    let successCount = 0;

    uniqueChars.forEach(char => {
        const entry = dictMap.get(char);

        if (!entry) {
            anomalies.push({ char, reason: 'Not found in dictionary' });
            return;
        }

        // Extract Attributes
        let zhuyinList = [];
        if (entry.heteronyms) {
            entry.heteronyms.forEach(h => {
                if (h.bopomofo) {
                    const prons = h.bopomofo.split(/[\s　]+/).map(p => p.trim()).filter(p => p);
                    zhuyinList.push(...prons);
                }
            });
        }
        zhuyinList = [...new Set(zhuyinList)]; // Unique

        const radical = entry.radical || '';
        const strokes = parseInt(entry.stroke_count) || 0;

        if (zhuyinList.length === 0 || !radical || strokes === 0) {
            anomalies.push({ char, reason: 'Missing fields', data: { zhuyinList, radical, strokes } });
            return; // Strict skip
        }

        coreData[char] = {
            zhuyin: zhuyinList,
            radical: radical,
            totalStrokes: strokes,
            charForm: '正體'
        };
        successCount++;
    });

    // 4. Output
    log(`Generation Result: Success=${successCount}, Anomalies=${anomalies.length}`);

    fs.writeFileSync(OUTPUT_CORE, JSON.stringify(coreData, null, 2));
    fs.writeFileSync(OUTPUT_SET, JSON.stringify(uniqueChars, null, 2));
    fs.writeFileSync(OUTPUT_ANOMALIES, JSON.stringify(anomalies, null, 2));

    const meta = {
        dataset: "char_core_4808",
        generatedAt: new Date().toISOString(),
        stats: {
            total: uniqueChars.length,
            success: successCount,
            anomalies: anomalies.length
        },
        sources: {
            scope: "MOE Standard Font List (via source_4808.csv)",
            dict: "MOE Concised Dictionary (CSLD)"
        }
    };
    fs.writeFileSync(OUTPUT_META, JSON.stringify(meta, null, 2));

    log(`✅ Done! Files saved.`);
}

main();
