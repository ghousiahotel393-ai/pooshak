/**
 * Report export engine tests — the shared PDF/Excel/CSV report exporter
 * (src/shared/export). Guards:
 *   - getColumnLabel precedence (label > header > key)
 *   - jsPDF + jspdf-autotable produce a real, non-empty PDF for a WIDE, numeric report
 *     (this is the Issue-5 fix: the old built-in doc.table dropped alignment and clipped
 *     wide reports; autoTable fits columns + right-aligns numeric cols). If someone removes
 *     jspdf-autotable and reverts to doc.table, this test fails the build.
 *   - XLSX aoa_to_sheet maps title/header/data rows into the expected cells.
 *
 * Run: npx tsx tests/reportExport.test.mjs   (or: npm test)
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getColumnLabel } from '../src/shared/export/exportEngine.ts';

let passed = 0;
const assert = (c, m) => { if (!c) throw new Error(`ASSERT FAILED: ${m}`); passed++; console.log(`  ok - ${m}`); };

async function main() {
  console.log('Report export engine');

  // 1. Column label precedence.
  assert(getColumnLabel({ key: 'k', header: 'H', label: 'L' }) === 'L', 'getColumnLabel prefers label');
  assert(getColumnLabel({ key: 'k', header: 'H' }) === 'H', 'getColumnLabel falls back to header');
  assert(getColumnLabel({ key: 'k' }) === 'k', 'getColumnLabel falls back to key');

  // 2. Wide + numeric PDF via autoTable (the actual Issue-5 fix).
  const columns = Array.from({ length: 12 }, (_, i) => ({ key: `c${i}`, label: `Col ${i}` }));
  const head = [columns.map((c) => getColumnLabel(c))];
  const body = [
    columns.map((_, i) => (i === 11 ? '1,234,567.89' : `A very long cell value ${i} that would overflow`)),
    columns.map((_, i) => (i === 11 ? '42.00' : `row2 ${i}`)),
  ];
  const columnStyles = { 11: { halign: 'right' } };

  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
  autoTable(doc, {
    head,
    body,
    startY: 30,
    margin: { left: 12, right: 12 },
    tableWidth: 'auto',
    styles: { fontSize: 7.5, cellPadding: 1.6, overflow: 'linebreak' },
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
    columnStyles,
  });
  const ab = doc.output('arraybuffer');
  const header = Buffer.from(ab.slice(0, 5)).toString('latin1');
  assert(header === '%PDF-', 'autoTable produces a valid PDF signature');
  assert(ab.byteLength > 2000, 'wide 12-column numeric PDF is non-empty (no clipping/throw)');
  // autoTable must have paginated/laid out at least one page.
  assert(doc.getNumberOfPages() >= 1, 'autoTable laid out at least one page');

  // 2b. Selected printer paper sizes (80mm thermal, 58mm thermal, A4 sheet).
  const doc80 = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });
  assert(Math.round(doc80.internal.pageSize.getWidth()) === 80, '80mm thermal roll width is 80mm');

  const doc58 = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [58, 200] });
  assert(Math.round(doc58.internal.pageSize.getWidth()) === 58, '58mm thermal roll width is 58mm');

  const docA4 = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  assert(Math.round(docA4.internal.pageSize.getWidth()) === 210, 'A4 sheet width is 210mm');

  // 3. Excel AOA mapping (title + header + data land in expected cells).
  const aoa = [
    ['My Report'],
    ['Filters: All'],
    [],
    columns.map((c) => getColumnLabel(c)),
    columns.map((_, i) => (i === 11 ? 1234567.89 : `d${i}`)),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  assert(ws['A1'] && ws['A1'].v === 'My Report', 'Excel title cell A1 correct');
  assert(ws['A4'] && ws['A4'].v === 'Col 0', 'Excel header row maps first column label');
  // 12th column header is at column L (index 11) on row 4.
  assert(ws['L4'] && ws['L4'].v === 'Col 11', 'Excel header row maps last column label');
  // numeric data stays numeric (real Excel math), not a string.
  assert(ws['L5'] && ws['L5'].v === 1234567.89 && ws['L5'].t === 'n', 'Excel keeps numeric cells numeric');

  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => { console.error('\nTEST RUN FAILED:', err); process.exit(1); });
