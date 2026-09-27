import { PurchaseRecord, Product } from '../../types';
import {
  getTimezone, getStartOfDayInTimezone, getEndOfDayInTimezone,
  getStartOfInputDayInTimezone, getEndOfInputDayInTimezone
} from '../../lib/dateUtils';

export interface DateBoundaries {
  start: Date;
  end: Date;
}

export function computeDateBoundaries(
  dateRange: string,
  startDateInput: string,
  endDateInput: string,
  country: string
): DateBoundaries {
  const timezone = getTimezone(country);
  const now = new Date();
  let start: Date;
  let end: Date;

  try {
    if (dateRange === 'custom' && startDateInput && endDateInput) {
      start = new Date(getStartOfInputDayInTimezone(startDateInput, timezone).getTime());
      end = new Date(getEndOfInputDayInTimezone(endDateInput, timezone).getTime());
    } else if (dateRange === 'today') {
      start = getStartOfDayInTimezone(now, timezone);
      end = getEndOfDayInTimezone(now, timezone);
    } else if (dateRange === 'yesterday') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      start = getStartOfDayInTimezone(yesterday, timezone);
      end = getEndOfDayInTimezone(yesterday, timezone);
    } else if (dateRange === 'last7') {
      const last7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      start = getStartOfDayInTimezone(last7, timezone);
      end = getEndOfDayInTimezone(now, timezone);
    } else if (dateRange === 'thisMonth') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      start = getStartOfDayInTimezone(startOfMonth, timezone);
      end = getEndOfDayInTimezone(now, timezone);
    } else if (dateRange === 'lastMonth') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      start = getStartOfDayInTimezone(lm, timezone);
      end = getEndOfDayInTimezone(lmEnd, timezone);
    } else if (dateRange === 'last30') {
      const last30 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      start = getStartOfDayInTimezone(last30, timezone);
      end = getEndOfDayInTimezone(now, timezone);
    } else if (dateRange === 'all') {
      start = new Date(Date.UTC(2000, 0, 1));
      end = getEndOfDayInTimezone(now, timezone);
    } else {
      const last30 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      start = getStartOfDayInTimezone(last30, timezone);
      end = getEndOfDayInTimezone(now, timezone);
    }
  } catch (_e) {
    const last30 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    start = getStartOfDayInTimezone(last30, timezone);
    end = getEndOfDayInTimezone(now, timezone);
  }

  return { start, end };
}

export function filterPurchaseRecords(
  appPurchaseRecords: PurchaseRecord[] | undefined,
  appProducts: Product[],
  debouncedSearch: string,
  supplierFilter: string,
  categoryFilter: string,
  userFilter: string,
  dateBoundaries: DateBoundaries
): PurchaseRecord[] {
  const records = appPurchaseRecords || [];
  return records.filter(r => {
    const matchesSearch = (r.productName?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
      (r.sku?.toLowerCase() || '').includes(debouncedSearch.toLowerCase()) ||
      (r.supplier?.toLowerCase() || '').includes(debouncedSearch.toLowerCase());
    const matchesSupplier = supplierFilter === 'All' || r.supplier === supplierFilter;

    const product = appProducts.find(p => p.id === r.productId);
    const matchesCategory = categoryFilter === 'All' || (product && product.category === categoryFilter);

    const rDate = new Date(r.date || Date.now());
    const matchesDate = !isNaN(rDate.getTime()) && rDate >= dateBoundaries.start && rDate <= dateBoundaries.end;
    const matchesUser = userFilter === 'All' || r.addedBy === userFilter;

    return matchesSearch && matchesSupplier && matchesCategory && matchesDate && matchesUser;
  })
    .sort((a, b) => new Date(b.date || Date.now()).getTime() - new Date(a.date || Date.now()).getTime())
    // Was capped at 300, which silently truncated exports for shops with more purchase
    // records in range. Raised so the (paginated) list and the export cover the full set.
    .slice(0, 5000);
}

export function buildExportRows(filteredRecords: PurchaseRecord[]) {
  return filteredRecords.map(r => ({
    date: new Date(r.date || Date.now()).toLocaleDateString(),
    productName: r.productName,
    sku: r.sku || '',
    supplier: r.supplier || '',
    quantity: r.quantity,
    costPrice: r.costPrice || 0,
    retailPrice: r.retailPrice || 0,
    totalCost: (r.quantity || 0) * (r.costPrice || 0),
    notes: r.notes || '',
  }));
}
