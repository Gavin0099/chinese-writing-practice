const XLSX = require('xlsx');
const path = require('path');

const FILE = path.join(__dirname, 'source_4808.xls');
const workbook = XLSX.readFile(FILE);

console.log('Sheet Names:', workbook.SheetNames);
