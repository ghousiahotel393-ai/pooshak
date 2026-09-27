import { Trash2, Hash, Tag } from 'lucide-react';
import { PurchaseRecord, Product } from '../../types';
import { useUiStore } from '../../stores';
import { Badge } from '../../shared/ui';
import { ProductThumb } from '../../shared/ui/ProductThumb';
import { formatCurrency } from '../../lib/currencies';

interface PurchaseHistoryCardProps {
  record: PurchaseRecord;
  appProducts: Product[];
  currency: string;
  onDelete: (record: PurchaseRecord) => void;
}

export function PurchaseHistoryCard({ record, appProducts, currency, onDelete }: PurchaseHistoryCardProps) {
  const handleRowClick = () => {
    const isRetail = record.type === 'Sale' || record.type === 'Return' || record.notes?.includes('Invoice #');
    if (isRetail) {
      const ref = record.notes?.match(/#([A-Z0-9-]+)/)?.[1] || record.id.slice(-6).toUpperCase();
      useUiStore.getState().setPendingReturnTab('purchases');
      useUiStore.getState().setPendingSearch(ref);
      const event = new CustomEvent('navigate', { detail: 'transactions' });
      window.dispatchEvent(event);
    } else if (record.productId) {
      const p = appProducts.find(prod => prod.id === record.productId);
      if (p) {
        useUiStore.getState().setPendingReturnTab('purchases');
        window.dispatchEvent(new CustomEvent('open-product-hub', { detail: p.id }));
      }
    }
  };

  const product = appProducts.find(p => p.id === record.productId);
  const displayName = record.productName && record.productName !== 'Unknown Product'
    ? record.productName
    : (product?.name || 'Unknown Product');
  const displaySku = record.sku && record.sku !== 'N/A' && record.sku.trim() !== ''
    ? record.sku
    : (product?.sku && product.sku !== 'N/A' && product.sku.trim() !== '' ? product.sku : null);
  const productImage = product?.image || (record as any).image;

  return (
    <tr
      key={record.id}
      onClick={handleRowClick}
      className="group hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
    >
      <td className="px-3.5 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className={`h-9 w-9 rounded-md flex flex-col items-center justify-center shrink-0 border ${
            record.type === 'Return' ? 'bg-amber-500/10 border-amber-500/20' :
            record.type?.includes('Reversal') || record.type?.includes('Deletion') ? 'bg-rose-500/10 border-rose-500/20' :
              'bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/[0.08]'
          }`}>
            <p className={`text-[10px] font-mono font-bold leading-none ${
              record.type === 'Return' ? 'text-amber-500' :
              record.type?.includes('Reversal') || record.type?.includes('Deletion') ? 'text-rose-500' :
                'text-emerald-600 dark:text-emerald-400'
            }`}>{new Date(record.date || Date.now()).toLocaleDateString('en-US', { month: 'short' })}</p>
            <p className="text-[12px] font-mono font-bold text-neutral-900 dark:text-white leading-none mt-0.5">{new Date(record.date || Date.now()).getDate()}</p>
          </div>

          {productImage && (
            <div className="w-9 h-9 rounded-md overflow-hidden shrink-0 border border-neutral-200 dark:border-white/[0.08] bg-neutral-100 dark:bg-white/[0.04]">
              <ProductThumb image={productImage} alt={displayName} imgClassName="w-full h-full object-cover" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-tight truncate max-w-[200px]">
                {displayName}
              </p>
              {record.type === 'Return' && (
                <Badge tone="warning" variant="solid" size="sm" className="!text-[9.5px] !px-2 !py-0.5 !rounded animate-pulse">{"RETURN"}</Badge>
              )}
              {(record.type?.includes('Reversal') || record.type?.includes('Deletion')) && (
                <Badge tone="danger" variant="solid" size="sm" className="!text-[9.5px] !px-2 !py-0.5 !rounded">{"DELETED"}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {displaySku && (
                <>
                  <span className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1 uppercase">
                    <Hash className="h-3 w-3" /> {displaySku}
                  </span>
                  <span className="w-1 h-1 bg-gray-300 dark:bg-white/10 rounded-full" />
                </>
              )}
              <span className={`text-[11px] font-bold uppercase tracking-tight ${
                record.supplier === 'SALE RETURN' ? 'text-amber-500' :
                record.supplier === 'SYSTEM REVERSAL' ? 'text-rose-500' :
                  'text-emerald-600 dark:text-emerald-400'
              }`}>
                {record.supplier || "DIRECT ENTRY"}
              </span>
              {record.addedBy && (
                <>
                  <span className="w-1 h-1 bg-gray-300 dark:bg-white/10 rounded-full" />
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase">
                    {"BY"} {record.addedBy}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3.5 py-2.5 text-center">
        <div className="inline-flex flex-col items-center">
          <span className={`text-xs font-black mb-1 ${
            record.type === 'Return' ? 'text-amber-500' :
            record.type?.includes('Reversal') || record.type?.includes('Deletion') ? 'text-rose-500' :
              'text-neutral-900 dark:text-white'
          }`}>
            {record.quantity > 0 ? '+' : ''}{record.quantity} <span className="text-[11px] text-neutral-500">{"PCS"}</span>
          </span>
          <div className="flex items-center gap-1.5 p-1 px-2 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/[0.08]">
            <Tag className={`h-3 w-3 ${
              record.type === 'Return' ? 'text-amber-500' :
              record.type?.includes('Reversal') || record.type?.includes('Deletion') ? 'text-rose-500' :
                'text-neutral-500'
            }`} />
            <span className="text-[11px] font-mono text-neutral-700 dark:text-neutral-300 font-semibold">{"Cost"}: {formatCurrency(record.costPrice || 0, currency)}</span>
          </div>
        </div>
      </td>
      <td className="px-3.5 py-2.5 text-center">
        <div className="inline-flex flex-col items-center gap-0.5">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">{"Total Impact"}</p>
          <p className={`text-[13px] font-mono font-bold tabular-nums ${
            record.type === 'Return' ? 'text-amber-600 dark:text-amber-400' :
            record.type?.includes('Reversal') || record.type?.includes('Deletion') ? 'text-rose-600 dark:text-rose-400' :
              'text-emerald-600 dark:text-emerald-400'
          }`}>{formatCurrency((record.quantity || 0) * (record.costPrice || 0), currency)}</p>
          <p className="text-[11px] font-mono text-neutral-500">{"SRP: "}{formatCurrency(record.retailPrice || 0, currency)}</p>
        </div>
      </td>
      <td className="px-3.5 py-2.5 text-right">
        <div className="flex justify-end lg:opacity-0 group-hover:opacity-100 transition-opacity">
          {record.type !== 'Return' && !record.type?.includes('Reversal') && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(record); }}
              className="p-1.5 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 rounded transition-colors"
              title="Delete Record"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function PurchaseHistoryMobileCard({ record, appProducts, currency }: Omit<PurchaseHistoryCardProps, 'onDelete'>) {
  const handleCardClick = () => {
    const isRetail = record.type === 'Sale' || record.type === 'Return' || record.notes?.includes('Invoice #');
    if (isRetail) {
      const ref = record.notes?.match(/#([A-Z0-9-]+)/)?.[1] || record.id.slice(-6).toUpperCase();
      useUiStore.getState().setPendingReturnTab('purchases');
      useUiStore.getState().setPendingSearch(ref);
      const event = new CustomEvent('navigate', { detail: 'transactions' });
      window.dispatchEvent(event);
    } else if (record.productId) {
      useUiStore.getState().setPendingReturnTab('purchases');
      window.dispatchEvent(new CustomEvent('open-product-hub', { detail: record.productId }));
    }
  };

  const product = appProducts.find(p => p.id === record.productId);
  const displayName = record.productName && record.productName !== 'Unknown Product'
    ? record.productName
    : (product?.name || 'Unknown Product');
  const displaySku = record.sku && record.sku !== 'N/A' && record.sku.trim() !== ''
    ? record.sku
    : (product?.sku && product.sku !== 'N/A' && product.sku.trim() !== '' ? product.sku : null);
  const productImage = product?.image || (record as any).image;

  return (
    <div
      key={record.id}
      onClick={handleCardClick}
      className="p-3 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-2.5 active:bg-neutral-50 dark:active:bg-white/[0.02] cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`h-10 w-10 rounded-md flex flex-col items-center justify-center shrink-0 border ${
            record.type === 'Return' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
            record.type?.includes('Reversal') || record.type?.includes('Deletion') ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
              'bg-neutral-100 dark:bg-white/[0.04] border-neutral-200 dark:border-white/[0.08]'
          }`}>
            <p className="text-[9.5px] font-bold font-mono uppercase">{new Date(record.date || Date.now()).toLocaleDateString('en-US', { month: 'short' })}</p>
            <p className="text-[13px] font-bold font-mono leading-none mt-0.5">{new Date(record.date || Date.now()).getDate()}</p>
          </div>

          {productImage && (
            <div className="h-10 w-10 rounded-md overflow-hidden shrink-0 border border-neutral-200 dark:border-white/[0.08] bg-neutral-100 dark:bg-white/[0.04]">
              <ProductThumb image={productImage} alt={displayName} imgClassName="w-full h-full object-cover" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-neutral-900 dark:text-white truncate leading-snug">
              {displayName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {displaySku && (
                <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                  @{displaySku}
                </span>
              )}
              {record.type === 'Return' && (
                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  RETURN
                </span>
              )}
              {(record.type?.includes('Reversal') || record.type?.includes('Deletion')) && (
                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  DELETED
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
            record.quantity > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-500'
          }`}>
            {record.quantity > 0 ? '+' : ''}{record.quantity} PCS
          </span>
          <p className="text-[10.5px] font-mono font-medium text-neutral-500 uppercase mt-1">
            {record.supplier || 'DIRECT'} {record.addedBy ? `• BY ${record.addedBy}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100 dark:border-white/[0.04]">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500 mb-0.5">Financial Impact</p>
          <p className="text-[13px] font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency((record.quantity || 0) * (record.costPrice || 0), currency)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500 mb-0.5">Unit Cost</p>
          <p className="text-[13px] font-mono font-bold tabular-nums text-neutral-900 dark:text-white">
            {formatCurrency(record.costPrice || 0, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}
