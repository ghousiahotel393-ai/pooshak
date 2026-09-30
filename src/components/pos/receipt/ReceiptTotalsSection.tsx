import { formatCurrency } from '../../../lib/currencies';
import { TwoCol } from './parts';
import { type ReceiptCtx } from './types';

export function renderDiscountBreakdown(ctx: ReceiptCtx) {
  const { sale, shDealDiscount, shItemDiscount, shBillDiscount, currencyCode, fs } = ctx;
  if (!(sale.discountAmount > 0)) return null;
  const typesCount = [shDealDiscount > 0, shItemDiscount > 0, shBillDiscount > 0].filter(Boolean).length;
  if (typesCount > 1) {
    return (<>
      {shDealDiscount > 0 && <TwoCol ctx={ctx} left="  DEAL DISCOUNT" right={`-${formatCurrency(shDealDiscount, currencyCode)}`} style={{ fontSize: `${Math.max(8, fs.body - 1)}px`, opacity: 0.8 }} />}
      {shItemDiscount > 0 && <TwoCol ctx={ctx} left="  ITEM DISCOUNT" right={`-${formatCurrency(shItemDiscount, currencyCode)}`} style={{ fontSize: `${Math.max(8, fs.body - 1)}px`, opacity: 0.8 }} />}
      {shBillDiscount > 0 && <TwoCol ctx={ctx} left="  BILL DISCOUNT" right={`-${formatCurrency(shBillDiscount, currencyCode)}`} style={{ fontSize: `${Math.max(8, fs.body - 1)}px`, opacity: 0.8 }} />}
      <TwoCol ctx={ctx} left="TOTAL DISCOUNT" right={`-${formatCurrency(sale.discountAmount, currencyCode)}`} />
    </>);
  }
  let label = "DISCOUNT";
  if (shDealDiscount > 0) label = "DEAL DISCOUNT";
  else if (shItemDiscount > 0) label = "ITEM DISCOUNT";
  else if (shBillDiscount > 0) label = "BILL DISCOUNT";
  return <TwoCol ctx={ctx} left={label} right={`-${formatCurrency(sale.discountAmount, currencyCode)}`} />;
}

export function renderTotalsSection(ctx: ReceiptCtx) {
  const { showDiscount, sale, settings, taxLabel, currencyCode, fs, bd, baseWeight, clamp } = ctx;
  return (
    <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      {showDiscount && <TwoCol ctx={ctx} left="SUBTOTAL" right={formatCurrency(sale.subtotal, currencyCode)} />}
      {showDiscount && renderDiscountBreakdown(ctx)}
      {(() => {
        const dcExtra = sale.extraCharges?.find((c: any) => Number(c.amount) > 0 && c.name?.toUpperCase() === 'DC');
        if (dcExtra) {
          return <TwoCol ctx={ctx} left="DELIVERY FEE (DC)" right={formatCurrency(dcExtra.amount, currencyCode)} />;
        }
        if (sale.deliveryFee != null && sale.deliveryFee > 0) {
          return <TwoCol ctx={ctx} left="DELIVERY FEE (DC)" right={formatCurrency(sale.deliveryFee, currencyCode)} />;
        }
        if (sale.extraCharges && sale.extraCharges.length > 0) {
          return sale.extraCharges.map((charge: any, idx: number) => (
            <TwoCol ctx={ctx} key={idx} left={charge.name || "OTHER"} right={formatCurrency(charge.amount, currencyCode)} />
          ));
        }
        return null;
      })()}
      {settings.receiptShowTax && <TwoCol ctx={ctx} left={`${taxLabel} (${settings.taxRate}%)`} right={formatCurrency(sale.taxAmount, currencyCode)} />}
      <div style={{ textAlign: 'center', fontSize: `${fs.body}px`, fontWeight: clamp(baseWeight + 100), margin: '6px 0', textTransform: 'uppercase', lineHeight: '1.5' }}>
        {bd.dealsCount > 0 && <div>TOTAL DEALS x{bd.dealsCount}</div>}
        {bd.dealsCount > 0 && bd.standaloneCount > 0 && <div style={{ borderTop: '1px dotted #999', width: '60%', margin: '3px auto' }} />}
        {bd.standaloneCount > 0 && <div>TOTAL OTHER ITEMS: {bd.standaloneCount} ({bd.standaloneQty} pcs)</div>}
        {bd.dealsCount === 0 && bd.standaloneCount === 0 && <div>0 ITEMS</div>}
      </div>
      <TwoCol ctx={ctx} left="GRAND TOTAL" right={formatCurrency(sale.total, currencyCode)} bold lg style={{ padding: '4px 0' }} />
      {sale.status === 'partially_refunded' && sale.refundedAmount > 0 && (
        <>
          <TwoCol ctx={ctx} left="REFUNDED" right={`-${formatCurrency(sale.refundedAmount, currencyCode)}`} />
          <TwoCol ctx={ctx} left="NET AMOUNT" right={formatCurrency(sale.total - sale.refundedAmount, currencyCode)} bold lg style={{ padding: '4px 0' }} />
        </>
      )}
      {sale.status === 'refunded' && (
        <TwoCol ctx={ctx} left="REFUNDED" right={`-${formatCurrency(sale.total, currencyCode)}`} bold lg style={{ padding: '4px 0' }} />
      )}
    </div>
  );
}
