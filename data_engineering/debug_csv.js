const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const SOURCE_CSV = path.join(__dirname, 'source_4808.csv');
let csvContent = fs.readFileSync(SOURCE_CSV, 'utf8');

if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.slice(1);
}

console.log("--- Content Snippet ---");
console.log(csvContent.slice(0, 100));

const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
});

console.log(`Records length: ${records.length}`);
if (records.length > 0) {
    console.log("First Record:", records[0]);
    const headers = Object.keys(records[0]);
    console.log("Headers:", headers);
    const charCol = headers.find(h => h.includes('字') || h.includes('Character') || h.includes('常用') || h.includes('title'));
    console.log(`Detected Char Col: '${charCol}'`);
    console.log(`First Val: '${records[0][charCol]}'`);
}
