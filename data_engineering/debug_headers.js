const XLSX = require('xlsx');
const path = require('path');

const FILE = path.join(__dirname, 'source_4808.xls');

if (!require('fs').existsSync(FILE)) {
    console.error('File not found');
    process.exit(1);
}

const workbook = XLSX.readFile(FILE);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert to JSON with header:1 to see raw array of arrays
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('--- Row 0 (Headers?) ---');
console.log(JSON.stringify(rows[0]));
console.log('--- Row 1 (Data?) ---');
console.log(JSON.stringify(rows[1]));
console.log('--- Row 2 (Data?) ---');
console.log(JSON.stringify(rows[2]));
