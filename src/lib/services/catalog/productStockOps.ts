/**
 * Product Stock & Procurement Ledger Operations.
 * Atomic bundle helper for product create / update stock movements (AGENTS.md §1.5).
 * Ensures inventory_ledger AND purchase_records are always synchronized in the SAME atomic bundle.
 */

import { safeRandomUUID } from '../../crypto/uuid';
import { type AtomicOp } from '../../../data';
import { buildInventoryLedgerOp, dispatchInventoryTxEvent, type InventoryTxRecord } from '../inventory/inventoryLedgerRepository';
import { PurchaseRecord } from '../../../types';

export interface StockAuditBundle {
  ops: AtomicOp[];
  ledgerRec: InventoryTxRecord | null;
  purchaseRec: PurchaseRecord | null;
}

export function buildCreateStockOps(params: {
  productId: string;
  productName: string;
  sku?: string | null;
  initialStock: number;
  cost: number;
  price: number;
  supplierName?: string | null;
  supplierId?: string | null;
  trackInventory: boolean;
  userId: string;
  now: number;
}): StockAuditBundle {
  const {
    productId, productName, sku, initialStock, cost, price,
    supplierName, supplierId, trackInventory, userId, now,
  } = params;

  const ops: AtomicOp[] = [];
  let ledgerRec: InventoryTxRecord | null = null;
  let purchaseRec: PurchaseRecord | null = null;

  if (trackInventory && initialStock > 0) {
    ledgerRec = {
      id: `itx_init_${productId}`,
      productId,
      type: 'INITIAL',
      quantity: initialStock,
      balanceAfter: initialStock,
      referenceType: 'AUDIT',
      referenceId: productId,
      deviceId: '',
      userId,
      notes: 'Initial Stock on Create',
      createdAt: now,
    };
    ops.push(buildInventoryLedgerOp(ledgerRec));

    const purchaseId = safeRandomUUID();
    const nowIso = new Date(now).toISOString();
    ops.push({
      table: 'purchase_records',
      op: 'insert',
      row: {
        id: purchaseId,
        type: 'Stock IN',
        product_id: productId,
        product_name: productName,
        sku: sku || null,
        quantity: initialStock,
        cost_price: cost || 0,
        retail_price: price || 0,
        total_amount: initialStock * (cost || 0),
        supplier: supplierName || 'Initial Stock',
        supplier_id: supplierId || null,
        added_by: userId,
        notes: 'Initial Stock on Create',
        purchased_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      },
    });

    purchaseRec = {
      id: purchaseId,
      productId,
      productName,
      sku: sku || '',
      quantity: initialStock,
      costPrice: cost || 0,
      retailPrice: price || 0,
      totalAmount: initialStock * (cost || 0),
      supplier: supplierName || 'Initial Stock',
      supplierId: supplierId || undefined,
      addedBy: userId,
      notes: 'Initial Stock on Create',
      date: new Date(now),
      type: 'Stock IN',
    };
  }

  return { ops, ledgerRec, purchaseRec };
}

export function buildUpdateStockOps(params: {
  productId: string;
  productName: string;
  sku?: string | null;
  existingStock: number;
  newStock: number;
  wasTracked: boolean;
  isTracked: boolean;
  cost: number;
  price: number;
  supplierName?: string | null;
  supplierId?: string | null;
  userId: string;
  now: number;
}): StockAuditBundle {
  const {
    productId, productName, sku, existingStock, newStock,
    wasTracked, isTracked, cost, price, supplierName, supplierId, userId, now,
  } = params;

  const ops: AtomicOp[] = [];
  let ledgerRec: InventoryTxRecord | null = null;
  let purchaseRec: PurchaseRecord | null = null;

  const effectiveOldStock = wasTracked ? existingStock : 0;
  if (isTracked && (existingStock !== newStock || !wasTracked)) {
    const diff = wasTracked ? (newStock - existingStock) : newStock;
    if (diff !== 0) {
      ledgerRec = {
        id: `itx_adj_${productId}_${now}`,
        productId,
        type: diff > 0 ? 'RESTOCK' : 'ADJUSTMENT',
        quantity: diff,
        balanceAfter: newStock,
        referenceType: 'ADJUSTMENT',
        referenceId: productId,
        deviceId: '',
        userId,
        notes: diff > 0
          ? `Stock Added via Product Editor (${effectiveOldStock} -> ${newStock})`
          : `Stock Reduced via Product Editor (${effectiveOldStock} -> ${newStock})`,
        createdAt: now,
      };
      ops.push(buildInventoryLedgerOp(ledgerRec));

      const purchaseId = safeRandomUUID();
      const nowIso = new Date(now).toISOString();
      ops.push({
        table: 'purchase_records',
        op: 'insert',
        row: {
          id: purchaseId,
          type: diff > 0 ? 'Stock IN' : 'Adjustment',
          product_id: productId,
          product_name: productName,
          sku: sku || null,
          quantity: diff,
          cost_price: cost || 0,
          retail_price: price || 0,
          total_amount: Math.abs(diff) * (cost || 0),
          supplier: supplierName || (diff > 0 ? 'Direct Stock In' : 'Manual Adjustment'),
          supplier_id: supplierId || null,
          added_by: userId,
          notes: diff > 0
            ? `Stock Added via Product Editor (${effectiveOldStock} → ${newStock})`
            : `Stock Reduced via Product Editor (${effectiveOldStock} → ${newStock})`,
          purchased_at: nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        },
      });

      purchaseRec = {
        id: purchaseId,
        productId,
        productName,
        sku: sku || '',
        quantity: diff,
        costPrice: cost || 0,
        retailPrice: price || 0,
        totalAmount: Math.abs(diff) * (cost || 0),
        supplier: supplierName || (diff > 0 ? 'Direct Stock In' : 'Manual Adjustment'),
        supplierId: supplierId || undefined,
        addedBy: userId,
        notes: diff > 0
          ? `Stock Added via Product Editor (${effectiveOldStock} → ${newStock})`
          : `Stock Reduced via Product Editor (${effectiveOldStock} → ${newStock})`,
        date: new Date(now),
        type: diff > 0 ? 'Stock IN' : 'Adjustment',
      };
    }
  }

  return { ops, ledgerRec, purchaseRec };
}

export async function dispatchProductStockEvents(
  ledgerRec: InventoryTxRecord | null,
  purchaseRec: PurchaseRecord | null
): Promise<void> {
  if (ledgerRec) {
    dispatchInventoryTxEvent(ledgerRec);
  }
  if (purchaseRec) {
    try {
      const { useInventoryStore } = await import('../../../stores');
      useInventoryStore.getState().addPurchaseRecord(purchaseRec);
    } catch {}
  }
}
