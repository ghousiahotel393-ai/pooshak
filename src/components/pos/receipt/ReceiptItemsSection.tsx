import { formatCurrency } from '../../../lib/currencies';
import { TwoCol } from './parts';
import { type ReceiptCtx } from './types';

export function renderItemsSection(ctx: ReceiptCtx) {
  const { shBundles, shStandalone, baseWeight, fs, clamp, currencyCode, showDiscount } = ctx;
  return (
    <div style={{ marginTop: '4px', marginBottom: '4px' }}>
      <TwoCol ctx={ctx} left="ITEM" right="TOTAL" bold />
      {shBundles.length > 0 && (
        <div style={{ marginBottom: '6px' }}>
          <div style={{ fontWeight: clamp(baseWeight + 300), fontSize: `${fs.body}px`, marginBottom: '4px', letterSpacing: '1px', textTransform: 'uppercase', color: '#7c3aed' }}>
            BUNDLE / DEAL ITEMS ({shBundles.length})
          </div>
          {shBundles.map((b: any, bIdx: number) => (
            <div key={b.bundleId} style={{ marginBottom: '6px', textTransform: 'uppercase', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <div style={{ fontWeight: clamp(baseWeight + 300), marginBottom: '2px' }}>{bIdx + 1}. 🎁 {b.bundleQty > 1 ? `${b.bundleQty}x ` : ''}{b.bundleName}</div>
              {b.items[0]?.toppings?.length > 0 && (
                <div style={{ fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.9, marginBottom: '2px', paddingLeft: '8px' }}>
                  + {b.items[0].toppings.map((t: any) => `${t.name} (${formatCurrency(t.price, currencyCode)})`).join(', ')}
                </div>
              )}
              <div style={{ paddingLeft: '8px', marginBottom: '4px' }}>
                {b.items.map((item: any, idx: number) => (
                  <div key={idx} style={{ fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.9, marginBottom: '1px' }}>
                    - {b.bundleQty > 0 ? Math.round(item.quantity / b.bundleQty) : item.quantity}x {item.product?.name || 'Item'}
                    {item.selectedVariantLabel ? ` (${item.selectedVariantLabel})` : item.selectedVariant ? ` (${item.selectedVariant})` : ''}
                    {item.extrasList && item.extrasList.length > 0 && (
                      <div style={{ paddingLeft: '6px', fontSize: `${Math.max(8, fs.body - 3)}px`, fontWeight: 'bold' }}>
                        + {item.extrasList.map((e: any) => `${e.qty > 1 ? e.qty + 'x ' : ''}${e.name} ${e.price ? '(' + formatCurrency(e.price * e.qty, currencyCode) + ')' : ''}`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {showDiscount ? (
                <>
                  <TwoCol ctx={ctx} left="  DEAL SUBTOTAL" right={formatCurrency(b.totalOriginal, currencyCode)} style={{ fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.7 }} />
                  {b.totalDiscount > 0 && <TwoCol ctx={ctx} left="  🎁 DEAL DISCOUNT" right={`-${formatCurrency(b.totalDiscount, currencyCode)}`} style={{ fontSize: `${Math.max(8, fs.body - 2)}px`, color: '#dc2626', fontWeight: 'bold' }} />}
                  <TwoCol ctx={ctx} left="  DEAL PRICE" right={formatCurrency(b.totalSubtotal, currencyCode)} style={{ fontSize: `${Math.max(8, fs.body - 1)}px`, fontWeight: 'bold' }} />
                </>
              ) : (
                <TwoCol ctx={ctx} left="  DEAL PRICE" right={formatCurrency(b.totalSubtotal, currencyCode)} style={{ fontSize: `${Math.max(8, fs.body - 1)}px`, fontWeight: 'bold' }} />
              )}
            </div>
          ))}
        </div>
      )}
      {shStandalone.length > 0 && (
        <div style={{ marginBottom: '6px' }}>
          <div style={{ fontWeight: clamp(baseWeight + 300), fontSize: `${fs.body}px`, marginBottom: '4px', letterSpacing: '1px', textTransform: 'uppercase', color: '#6b7280' }}>
            OTHER / STANDALONE ITEMS ({shStandalone.length})
          </div>
          {shStandalone.map((item: any, index: number) => (
            <div key={`sa-${index}`} style={{ marginBottom: '6px', textTransform: 'uppercase', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <div style={{ textAlign: 'left', wordWrap: 'break-word' }}>{index + 1}. {item.product?.name || 'Item'}</div>
              {item.selectedVariantLabel && <div style={{ textAlign: 'left', fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8 }}>{item.selectedVariantLabel}</div>}
              {!item.selectedVariantLabel && item.selectedVariant && <div style={{ textAlign: 'left', fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8 }}>{item.selectedVariant}</div>}
              {item.selectedModifiers && item.selectedModifiers.length > 0 && <div style={{ textAlign: 'left', fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8 }}>+ {item.selectedModifiers.map((m: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${m.name} (${formatCurrency(m.price * Math.abs(item.quantity), currencyCode)})`).join(', ')}</div>}
              {item.addonItems && item.addonItems.length > 0 && <div style={{ textAlign: 'left', fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8 }}>+ Add-ons: {item.addonItems.map((a: any) => `${a.addon?.name || a.name} ${a.quantity * Math.abs(item.quantity)}x (${formatCurrency(a.subtotal * Math.abs(item.quantity), currencyCode)})`).join(', ')}</div>}
              {item.toppings && item.toppings.length > 0 && <div style={{ textAlign: 'left', fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8 }}>+ {item.toppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name} (${formatCurrency(t.price * Math.abs(item.quantity), currencyCode)})`).join(', ')}</div>}
              {item.displayToppings && item.displayToppings.length > 0 && <div style={{ textAlign: 'left', fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8 }}>+ {item.displayToppings.map((t: any) => `${Math.abs(item.quantity) > 1 ? Math.abs(item.quantity) + 'x ' : ''}${t.name}`).join(', ')}</div>}
              {item.serialNumber && <div style={{ textAlign: 'left', fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8 }}>SN: {item.serialNumber}</div>}
              <TwoCol ctx={ctx} left={`${item.quantity} PCS x ${formatCurrency(item.subtotal / item.quantity, currencyCode)}`} right={formatCurrency(item.subtotal, currencyCode)} />
              {showDiscount && item.discount > 0 && (
                <TwoCol ctx={ctx} left={`DISCOUNT ${item.discountType === 'percentage' && item.discountValue ? `(${item.discountValue}%)` : ''}`} right={`-${formatCurrency(item.discount, currencyCode)}`} style={{ fontSize: `${Math.max(8, fs.body - 2)}px`, opacity: 0.8, marginTop: '2px' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
