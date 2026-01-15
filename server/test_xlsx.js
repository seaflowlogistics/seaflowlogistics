import * as XLSX_STAR from 'xlsx';
import XLSX_DEFAULT from 'xlsx';

console.log('XLSX_STAR keys:', Object.keys(XLSX_STAR));
console.log('XLSX_DEFAULT type:', typeof XLSX_DEFAULT);
if (typeof XLSX_DEFAULT === 'object') {
    console.log('XLSX_DEFAULT keys:', Object.keys(XLSX_DEFAULT));
}

try {
    if (typeof XLSX_STAR.readFile === 'function') console.log('XLSX_STAR.readFile exists');
    else console.log('XLSX_STAR.readFile MISSING');
} catch (e) {
    console.log(e);
}

try {
    if (XLSX_DEFAULT && typeof XLSX_DEFAULT.readFile === 'function') console.log('XLSX_DEFAULT.readFile exists');
    else console.log('XLSX_DEFAULT.readFile MISSING');
} catch (e) {
    console.log(e);
}
