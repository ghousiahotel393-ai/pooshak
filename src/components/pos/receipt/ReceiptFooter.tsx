import { formatCurrency } from '../../../lib/currencies';
import { getDealCountBreakdown } from '../../../lib/utils';
import { BarcodePreview } from '../../../shared/ui/BarcodePreview';
import { TwoCol } from './parts';
import { type ReceiptCtx } from './types';

export function renderFooterSection(ctx: ReceiptCtx) {
  const { settings, sale, is58mm, RECEIPT_WATERMARK } = ctx;
  return (
    <div style={{ textAlign: 'center', marginTop: '16px', marginBottom: '24px', textTransform: 'uppercase', position: 'relative', left: `${settings.receiptFooterOffsetX || 0}mm`, width: '100%', display: 'block', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      {settings.receiptShowBarcode !== false && (
        <div style={{ margin: '12px auto', display: 'flex', justifyContent: 'center' }}>
          <BarcodePreview value={sale.invoiceNumber} height={40} showValue={true} options={{ width: is58mm ? 1.1 : 1.4, margin: 4 }} />
        </div>
      )}
      {settings.receiptShowFooter !== false && settings.receiptFooter && (
        <div style={{ marginBottom: '8px', whiteSpace: 'pre-wrap' }}>{settings.receiptFooter}</div>
      )}
      {settings.receiptShowFooter !== false && settings.storeWebsite && (
        <div style={{ marginTop: '4px', fontSize: '10px' }}>({settings.storeWebsite.replace(/^https?:\/\//i, '').toUpperCase()})</div>
      )}
      {RECEIPT_WATERMARK}
    </div>
  );
}

export function MonoTotals(ctx: ReceiptCtx) {
  const { showDiscount, sale, settings, taxLabel, currencyCode, fs, baseWeight, clamp, appBundles } = ctx;
  return (
    <>
      {showDiscount && (
        <TwoCol ctx={ctx} left="SUBTOTAL" right={formatCurrency(sale.subtotal, currencyCode)} />
      )}
      {showDiscount && (() => {
        if (!(sale.discountAmount > 0)) return null;

        let dealDiscount = 0;
        let itemDiscount = 0;
        (sale.items || []).forEach((item: any) => {
          const isBundle = item.bundleId || item.bundle_id;
          if (isBundle) {
            dealDiscount += (item.discount || 0);
          } else {
            itemDiscount += (item.discount || 0);
          }
        });

        const billDiscount = Math.max(0, (sale.discountAmount || 0) - dealDiscount - itemDiscount);

        const typesCount = [dealDiscount > 0, itemDiscount > 0, billDiscount > 0].filter(Boolean).length;

        if (typesCount > 1) {
          return (
            <>
              {dealDiscount > 0 && (
                <TwoCol ctx={ctx} left="  DEAL DISCOUNT" right={`-${formatCurrency(dealDiscount, currencyCode)}`} style={{ fontSize: `${Math.max(8, fs.body - 1)}px`, opacity: 0.8 }} />
              )}
              {itemDiscount > 0 && (
                <TwoCol ctx={ctx} left="  ITEM DISCOUNT" right={`-${formatCurrency(itemDiscount, currencyCode)}`} style={{ fontSize: `${Math.max(8, fs.body - 1)}px`, opacity: 0.8 }} />
              )}
              {billDiscount > 0 && (
                <TwoCol ctx={ctx} left="  BILL DISCOUNT" right={`-${formatCurrency(billDiscount, currencyCode)}`} style={{ fontSize: `${Math.max(8, fs.body - 1)}px`, opacity: 0.8 }} />
              )}
              <TwoCol ctx={ctx} left="TOTAL DISCOUNT" right={`-${formatCurrency(sale.discountAmount, currencyCode)}`} />
            </>
          );
        } else {
          let label = "DISCOUNT";
          if (dealDiscount > 0) label = "DEAL DISCOUNT";
          else if (itemDiscount > 0) label = "ITEM DISCOUNT";
          else if (billDiscount > 0) label = "BILL DISCOUNT";

          return (
            <TwoCol ctx={ctx} left={label} right={`-${formatCurrency(sale.discountAmount, currencyCode)}`} />
          );
        }
      })()}
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
      {settings.receiptShowTax && (
        <TwoCol ctx={ctx} left={`${taxLabel} (${settings.taxRate}%)`} right={formatCurrency(sale.taxAmount, currencyCode)} />
      )}
      {(() => {
        const bd = getDealCountBreakdown(sale.items, appBundles);
        const showDeals = bd.dealsCount > 0;
        const showStandalone = bd.standaloneCount > 0;
        const thinSep = { borderTop: '1px dotted #999', width: '60%', margin: '3px auto' };
        if (!showDeals && !showStandalone) {
          return <div style={{ textAlign: 'center', fontSize: `${fs.body}px`, fontWeight: clamp(baseWeight + 100), margin: '6px 0', textTransform: 'uppercase' }}>0 ITEMS</div>;
        }
        return (
          <div style={{ textAlign: 'center', fontSize: `${fs.body}px`, fontWeight: clamp(baseWeight + 100), margin: '6px 0', textTransform: 'uppercase', lineHeight: '1.5' }}>
            {showDeals && <div>TOTAL DEALS x{bd.dealsCount}</div>}
            {showDeals && showStandalone && <div style={thinSep} />}
            {showStandalone && <div>TOTAL OTHER ITEMS: {bd.standaloneCount} ({bd.standaloneQty} pcs)</div>}
          </div>
        );
      })()}
    </>
  );
}

export function MonoPayment(ctx: ReceiptCtx) {
  const { sale, baseWeight, clamp, currencyCode } = ctx;
  return (
    <div style={{ marginTop: '4px', marginBottom: '4px', textTransform: 'uppercase' }}>
      {sale.paymentMethod === 'split' && sale.splitPayments ? (
        <div style={{ marginBottom: '4px' }}>
          <div style={{ textAlign: 'left', fontWeight: clamp(baseWeight + 200) }}>SPLIT PAYMENT:</div>
          {sale.splitPayments.map((p, i) => (
            <TwoCol ctx={ctx} key={i} left={p.method} right={formatCurrency(p.amount, currencyCode)} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'left' }}>PAID: {sale.paymentMethod}</div>
      )}
      <TwoCol ctx={ctx} left="CHG:" right={formatCurrency(sale.changeAmount || 0, currencyCode)} />
    </div>
  );
}

export function MonoNotes(ctx: ReceiptCtx) {
  const { settings, sale, baseWeight, clamp } = ctx;
  return (
    settings.receiptShowNotes && sale.notes ? (
      <div style={{
        border: '2px solid black',
        padding: '6px',
        textAlign: 'center',
        margin: '12px auto',
        width: '90%',
        wordWrap: 'break-word',
        textTransform: 'uppercase',
        fontWeight: clamp(baseWeight + 100),
      }}>
        {sale.notes}
      </div>
    ) : null
  );
}

export function MonoFooter(ctx: ReceiptCtx) {
  const { settings, sale, is58mm, RECEIPT_WATERMARK } = ctx;
  return (
    <div style={{
      textAlign: 'center',
      marginTop: '16px',
      marginBottom: '24px',
      textTransform: 'uppercase',
      position: 'relative',
      left: `${settings.receiptFooterOffsetX || 0}mm`,
      width: '100%',
      display: 'block'
    }}>
      {settings.receiptShowBarcode !== false && (
        <div style={{ margin: '12px auto', display: 'flex', justifyContent: 'center' }}>
          <BarcodePreview
            value={sale.invoiceNumber}
            height={40}
            showValue={true}
            options={{ width: is58mm ? 1.1 : 1.4, margin: 4 }}
          />
        </div>
      )}
      {settings.receiptShowFooter !== false && settings.receiptFooter && (
        <div style={{ marginBottom: '8px', whiteSpace: 'pre-wrap' }}>{settings.receiptFooter}</div>
      )}
      {settings.receiptShowFooter !== false && settings.storeWebsite && (
        <div style={{ marginTop: '4px', fontSize: '10px' }}>({settings.storeWebsite.replace(/^https?:\/\//i, '').toUpperCase()})</div>
      )}
      {RECEIPT_WATERMARK}
    </div>
  );
}
