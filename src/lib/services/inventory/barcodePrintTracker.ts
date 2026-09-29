/**
 * Barcode Print Tracker Service
 * Tracks printed barcode quantities per product and computes unprinted received-stock batches.
 *
 * Print tracking is an APPEND-ONLY, cloud-direct ledger (`barcode_print_log`), NOT browser
 * storage (AGENTS.md §1.7.5, §2.3). Each confirmed print run appends one row per product via a
 * single atomic bundle (§1.5.1). `totalPrinted` for a product = SUM(quantity) of its ledger rows,
 * so the count is accurate, per-device-consistent, and converges across devices through sync.
 * The bundle is idempotent on operation_id, so a retry never double-counts.
 *
 *   unprinted = max(0, totalReceived - totalPrinted)
 *
 * which is identical to the FIFO batch model in aggregate (already-printed labels never reload).
 */

import { localQuery, atomicWrite, newOperationId } from '../../../data';
import type { AtomicOp } from '../../../data';
import type { Product } from '../../../types';

/**
 * Append one row per printed product in a SINGLE atomic bundle (§1.5.1). Idempotent on the
 * bundle operation_id — a retry of the same run replays without adding rows.
 */
export async function recordPrintedQuantities(quantities: Record<string, number>): Promise<void> {
  const ops: AtomicOp[] = [];
  for (const [productId, qty] of Object.entries(quantities)) {
    if (qty > 0) {
      ops.push({
        table: 'barcode_print_log',
        op: 'insert',
        row: { product_id: productId, quantity: qty },
      });
    }
  }
  if (ops.length === 0) return;
  await atomicWrite(ops, { operation_id: newOperationId(), action: 'barcode_print' });
}

/**
 * Total printed labels per product, summed from the append-only ledger (local mirror).
 */
export async function getPrintedTotals(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  try {
    const rows = await localQuery<{ product_id: string; total_printed: number }>(`
      SELECT product_id, SUM(quantity) AS total_printed
      FROM barcode_print_log
      GROUP BY product_id;
    `);
    for (const r of rows) {
      if (r.product_id) map[r.product_id] = Number(r.total_printed) || 0;
    }
  } catch (err) {
    console.warn('[barcodePrintTracker] Failed to query print log:', err);
  }
  return map;
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
  const printedMap = await getPrintedTotals();
  const unprintedMap: Record<string, number> = {};

  for (const p of products) {
    const totalIn = incomingMap[p.id] || 0;
    const printed = printedMap[p.id] || 0;
    unprintedMap[p.id] = Math.max(0, Math.round(totalIn - printed));
  }

  return unprintedMap;
}
