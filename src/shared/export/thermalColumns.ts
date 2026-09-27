import type { ExportColumn } from './exportEngine';

/**
 * Filter wide multi-column reports to the primary columns that fit legibly on
 * a thermal receipt roll (80mm / 58mm) without character-by-character vertical wrapping.
 */
export function getThermalColumns(columns: ExportColumn[], is58mm: boolean): ExportColumn[] {
  const maxCols = is58mm ? 4 : 5;
  if (columns.length <= maxCols) return columns;

  const isId = (c: ExportColumn) =>
    /invoice|order|voucher|id|code|receipt|number/i.test(c.key + ' ' + (c.label || c.header || ''));
  const isDate = (c: ExportColumn) =>
    /date|time|timestamp/i.test(c.key + ' ' + (c.label || c.header || ''));
  const isEntity = (c: ExportColumn) =>
    /customer|supplier|vendor|user|salesman|product|item|description|title|name/i.test(
      c.key + ' ' + (c.label || c.header || '')
    );
  const isFinalTotal = (c: ExportColumn) =>
    /net_revenue|net_total|grand_total|\btotal\b|final_amount/i.test(c.key + ' ' + (c.label || c.header || ''));
  const isMoney = (c: ExportColumn) =>
    /revenue|amount|net|price|subtotal|balance|cost/i.test(c.key + ' ' + (c.label || c.header || ''));
  const isStatus = (c: ExportColumn) =>
    /status|state|type|payment/i.test(c.key + ' ' + (c.label || c.header || ''));

  const idCol = columns.find(isId);
  const dateCol = columns.find(isDate);
  const entityCol = columns.find(c => isEntity(c) && c !== idCol);
  const moneyCol = columns.find(isFinalTotal) || columns.find(isMoney);
  const statusCol = columns.find(isStatus);

  const selected: ExportColumn[] = [];
  if (idCol) selected.push(idCol);
  if (dateCol) selected.push(dateCol);
  if (entityCol) selected.push(entityCol);
  if (moneyCol) selected.push(moneyCol);
  if (!is58mm && statusCol && selected.length < maxCols) selected.push(statusCol);

  for (const c of columns) {
    if (selected.length >= maxCols) break;
    if (!selected.includes(c)) selected.push(c);
  }

  return selected.length > 0 ? selected : columns.slice(0, maxCols);
}
