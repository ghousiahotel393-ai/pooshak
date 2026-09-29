/**
 * Barcode Print Tracker Service
 * Tracks printed barcode quantities per product and computes unprinted received stock batches.
 */

import { localQuery } from '../../../data';
import type { Product } from '../../../types';

const STORAGE_KEY = 'zpos_barcode_print_tracking';

export interface BarcodePrintRecord {
  totalPrinted: number;
  lastPrintedAt: string;
}

export type BarcodePrintMap = Record<string, BarcodePrintRecord>;

export function getBarcodePrintTracking(): BarcodePrintMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveBarcodePrintTracking(map: BarcodePrintMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota error
  }
}

export function recordPrintedQuantities(quantities: Record<string, number>): void {
  const current = getBarcodePrintTracking();
  const now = new Date().toISOString();
  let changed = false;

  for (const [productId, qty] of Object.entries(quantities)) {
    if (qty > 0) {
      const prev = current[productId]?.totalPrinted || 0;
      current[productId] = {
        totalPrinted: prev + qty,
        lastPrintedAt: now,
      };
      changed = true;
    }
  }

  if (changed) {
    saveBarcodePrintTracking(current);
  }
}

/**
 * Fetch total cumulative incoming stock for each product from inventory_ledger + current stock fallback.
 */
export async function getCumulativeIncomingStock(products: Product[]): Promise<Record<string, number>> {
  const incomingMap: Record<string, number> = {};

  try {
    const rows = await localQuery<{ product_id: string; total_in: number }>(`
      SELECT product_id, SUM(quantity) as total_in
      FROM inventory_ledger
      WHERE quantity > 0
      GROUP BY product_id;
    `);

    for (const r of rows) {
      if (r.product_id) {
        incomingMap[r.product_id] = Number(r.total_in) || 0;
      }
    }
  } catch (err) {
    console.warn('[barcodePrintTracker] Failed to query ledger:', err);
  }

  for (const p of products) {
    const ledgerIn = incomingMap[p.id] || 0;
    incomingMap[p.id] = Math.max(ledgerIn, p.stock || 0);
  }

  return incomingMap;
}

/**
 * Calculate unprinted quantity for a list of products.
 * unprinted = max(0, totalReceived - totalPrinted).
 */
export async function calculateUnprintedQuantities(
  products: Product[]
): Promise<Record<string, number>> {
  const incomingMap = await getCumulativeIncomingStock(products);
  const trackingMap = getBarcodePrintTracking();
  const unprintedMap: Record<string, number> = {};

  for (const p of products) {
    const totalIn = incomingMap[p.id] || 0;
    const printed = trackingMap[p.id]?.totalPrinted || 0;
    unprintedMap[p.id] = Math.max(0, Math.round(totalIn - printed));
  }

  return unprintedMap;
}
