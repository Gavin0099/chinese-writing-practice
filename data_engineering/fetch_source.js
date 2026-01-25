const fs = require('fs');
const path = require('path');
const axios = require('axios');
const XLSX = require('xlsx');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

// =================CONFIGURATION=================
const TARGET_DIR = __dirname;
const TARGET_FILE = "source_4808.csv";
const FULL_PATH = path.join(TARGET_DIR, TARGET_FILE);
const LOCAL_XLS = path.join(TARGET_DIR, 'source_4808.xls');

// Sources
// 1. Scope: Local XLS provided by user
// 2. Attributes: MOE Dict Mirror
const DICT_DATA_URL = "https://raw.githubusercontent.com/g0v/moedict-data/main/dict-concised.csv";

async function fetchAndMerge() {
    console.log(`🚀 [ETL] 啟動資料修復程序 (Hybrid Mode)...`);

    // Step 1: Read Scope from Local XLS
    console.log("📥 1. 讀取本地 4808 字表 (source_4808.xls)...");
    let stdChars = [];
    if (fs.existsSync(LOCAL_XLS)) {
        try {
            const workbook = XLSX.readFile(LOCAL_XLS);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const records = XLSX.utils.sheet_to_json(sheet);

            // Find char column
            const headers = Object.keys(records[0] || {});
            const charCol = headers.find(h => h.includes('字') || h.includes('Character'));

            if (!charCol) throw new Error("Cannot find Character column in XLS");

            stdChars = records.map(r => r[charCol]).filter(c => c && c.length === 1);
            console.log(`   ✅ 本地範圍確認: 共 ${stdChars.length} 字`);
        } catch (e) {
            console.error(`   ❌ 讀取本地 XLS 失敗: ${e.message}`);
            process.exit(1);
        }
    } else {
        console.error(`   ❌ 找不到 source_4808.xls`);
        process.exit(1);
    }

    // Step 2: Fetch Attributes (MOE Dict)
    console.log("📥 2. 下載教育部國語小字典 (g0v mirror)...");
    let dictionary = [];
    try {
        const resp = await axios.get(DICT_DATA_URL);
        // dict-concised.csv columns: title,bopomofo,radical,stroke_count,...
        dictionary = parse(resp.data, {
            columns: true,
            skip_empty_lines: true
        });
        console.log(`   ✅ 字典讀取成功: 原始資料共 ${dictionary.length} 筆`);
    } catch (e) {
        console.error(`   ❌ 下載失敗: ${e.message}`);
        // If download fails, we have no attributes.
        process.exit(1);
    }

    // Step 3: Indexing
    console.log("⚙️ 3. 建立索引...");
    const charMap = new Map();
    dictionary.forEach(row => {
        const char = row.title;
        // Handle variations? usually exact match for standard fonts
        if (!charMap.has(char)) {
            charMap.set(char, {
                zhuyin: row.bopomofo,
                radical: row.radical,
                totalStrokes: parseInt(row.stroke_count) || 0
            });
        }
    });

    // Step 4: Merge
    console.log("⚙️ 4. 執行合併...");
    const mergedData = [];
    let missingCount = 0;

    stdChars.forEach(char => {
        const attr = charMap.get(char);
        if (attr) {
            mergedData.push({
                character: char,
                zhuyin: attr.zhuyin,
                radical: attr.radical,
                totalStrokes: attr.totalStrokes
            });
        } else {
            console.warn(`   ⚠️ 缺失屬性: '${char}' (將留空)`);
            missingCount++;
            mergedData.push({
                character: char,
                zhuyin: '',
                radical: '',
                totalStrokes: 0
            });
        }
    });

    if (missingCount > 0) {
        console.log(`   ⚠️ 共有 ${missingCount} 個字缺失屬性 (需人工補全或使用 Anomalies 報告)`);
    } else {
        console.log("   ✅ 完整性檢查通過。");
    }

    // Step 5: Output
    console.log(`💾 5. 存檔中: ${TARGET_FILE}`);
    const outputString = stringify(mergedData, {
        header: true,
        columns: ['character', 'zhuyin', 'radical', 'totalStrokes']
    });

    fs.writeFileSync(FULL_PATH, outputString);
    console.log(`🎉 處理完成！`);
}

fetchAndMerge();
