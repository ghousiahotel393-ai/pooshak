import { formatCurrency } from '../../../lib/currencies';
import { BarcodePreview } from '../../../shared/ui/BarcodePreview';
import { renderLogo, RECEIPT_WATERMARK } from './parts';
import { renderMetaSection } from './ReceiptHeader';
import { renderItemsSection, renderTotalsSection, renderPaymentSection } from './ReceiptBody';
import { renderFooterSection } from './ReceiptFooter';
import { type ReceiptCtx } from './types';

export function renderBoxedSections(ctx: ReceiptCtx) {
  const { refundWatermark, editWatermark, bodyPadL, bodyPadR, notesBox, baseContainer, is58mm } = ctx;
  return (
    <div style={baseContainer}>
      {refundWatermark}{editWatermark}
      <div style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', marginBottom: '10px' }}>
        {renderLogo(ctx, { width: '50px', height: '50px', border: '1px dashed #000', borderRadius: '8px', margin: '0 auto 5px' })}
        {ctx.settings.receiptShowStoreName && <div style={{ fontWeight: ctx.clamp(ctx.baseWeight + 300), fontSize: `${ctx.fs.shopName}px`, textTransform: 'uppercase' }}>{ctx.settings.storeName}</div>}
        {ctx.settings.receiptShowStoreAddress && <div style={{ marginTop: '4px' }}>{ctx.settings.storeAddress}</div>}
        {ctx.settings.receiptShowStorePhone && <div style={{ marginTop: '2px' }}>T: {ctx.settings.storePhone}</div>}
        {ctx.settings.receiptShowStoreEmail && <div style={{ marginTop: '2px', wordBreak: 'break-all' }}>E: {ctx.settings.storeEmail}</div>}
        {ctx.settings.receiptHeader && <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap', fontWeight: ctx.clamp(ctx.baseWeight + 100), fontSize: '10px' }}>{ctx.settings.receiptHeader}</div>}
      </div>
      <div style={{ paddingLeft: bodyPadL, paddingRight: bodyPadR }}>
        {renderMetaSection(ctx)}
        <div style={{ border: '1px solid #000', padding: '5px', margin: '8px 0' }}>
          {renderItemsSection(ctx)}
        </div>
        <div style={{ border: '1px solid #000', padding: '10px', margin: '8px 0' }}>
          {renderTotalsSection(ctx)}
        </div>
        {renderPaymentSection(ctx)}
        {notesBox}
      </div>
      {ctx.settings.receiptShowBarcode !== false && (
        <div style={{ border: '1px solid #000', padding: '10px 0', marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
          <BarcodePreview value={ctx.sale.invoiceNumber} height={40} showValue={true} options={{ width: is58mm ? 1.1 : 1.4, margin: 4 }} />
        </div>
      )}
      {ctx.settings.receiptShowFooter !== false && ctx.settings.receiptFooter && (
        <div style={{ textAlign: 'center', marginTop: '8px', whiteSpace: 'pre-wrap', fontSize: '10px' }}>{ctx.settings.receiptFooter}</div>
      )}
      {ctx.settings.receiptShowFooter !== false && ctx.settings.storeWebsite && (
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10px' }}>({ctx.settings.storeWebsite.replace(/^https?:\/\//i, '').toUpperCase()})</div>
      )}
      {RECEIPT_WATERMARK}
    </div>
  );
}

export function renderTearOff(ctx: ReceiptCtx) {
  const { refundWatermark, editWatermark, bodyPadL, bodyPadR, notesBox, baseContainer } = ctx;
  return (
    <div style={baseContainer}>
      {refundWatermark}{editWatermark}
      <div style={{ textAlign: 'center' }}>
        {renderLogo(ctx, { width: '50px', height: '50px', border: '2px solid #000', borderRadius: '8px', margin: '0 auto 10px' })}
        {ctx.settings.receiptShowStoreName && <div style={{ fontWeight: ctx.clamp(ctx.baseWeight + 300), fontSize: `${ctx.fs.shopName}px`, textTransform: 'uppercase' }}>{ctx.settings.storeName}</div>}
        {ctx.settings.receiptShowStoreAddress && <div>{ctx.settings.storeAddress}</div>}
        {ctx.settings.receiptShowStorePhone && <div style={{ marginTop: '2px' }}>T: {ctx.settings.storePhone}</div>}
        {ctx.settings.receiptShowStoreEmail && <div style={{ marginTop: '2px', wordBreak: 'break-all' }}>E: {ctx.settings.storeEmail}</div>}
        {ctx.settings.receiptHeader && <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap', fontWeight: ctx.clamp(ctx.baseWeight + 100), fontSize: '10px' }}>{ctx.settings.receiptHeader}</div>}
      </div>
      <div style={{ paddingLeft: bodyPadL, paddingRight: bodyPadR }}>
        {renderMetaSection(ctx)}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '4px 0' }} />
        {renderItemsSection(ctx)}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {renderTotalsSection(ctx)}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {renderPaymentSection(ctx)}
        {notesBox}
      </div>
      {renderFooterSection(ctx)}
      <div style={{ borderTop: '2px dashed #000', marginTop: '20px', paddingTop: '15px', position: 'relative', textAlign: 'center' }}>
        <span style={{ position: 'absolute', top: '-11px', left: '50%', background: '#fff', padding: '0 5px', fontSize: '14px' }}>✂</span>
        {ctx.settings.receiptShowFooter !== false && ctx.settings.storeWebsite && (
          <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '10px' }}>({ctx.settings.storeWebsite.replace(/^https?:\/\//i, '').toUpperCase()})</div>
        )}
        {RECEIPT_WATERMARK}
      </div>
    </div>
  );
}

export function renderVerticalLine(ctx: ReceiptCtx) {
  const { refundWatermark, editWatermark, bodyPadL, bodyPadR, notesBox, baseContainer } = ctx;
  return (
    <div style={baseContainer}>
      {refundWatermark}{editWatermark}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
        {renderLogo(ctx, { width: '50px', height: '50px', border: '2px solid #000', flexShrink: 0 })}
        <div style={{ width: '2px', height: '40px', background: '#000', margin: '0 15px' }} />
        <div>
          {ctx.settings.receiptShowStoreName && <div style={{ fontWeight: ctx.clamp(ctx.baseWeight + 300), fontSize: `${ctx.fs.shopName}px`, textTransform: 'uppercase' }}>{ctx.settings.storeName}</div>}
          {ctx.settings.receiptShowStoreAddress && <div>{ctx.settings.storeAddress}</div>}
          {ctx.settings.receiptShowStorePhone && <div style={{ marginTop: '2px' }}>T: {ctx.settings.storePhone}</div>}
          {ctx.settings.receiptShowStoreEmail && <div style={{ marginTop: '2px', wordBreak: 'break-all' }}>E: {ctx.settings.storeEmail}</div>}
          {ctx.settings.receiptHeader && <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap', fontWeight: ctx.clamp(ctx.baseWeight + 100), fontSize: '10px' }}>{ctx.settings.receiptHeader}</div>}
        </div>
      </div>
      <div style={{ paddingLeft: bodyPadL, paddingRight: bodyPadR }}>
        {renderMetaSection(ctx)}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '4px 0' }} />
        {renderItemsSection(ctx)}
        <div style={{ borderTop: '2px solid #000', width: '100%', margin: '6px 0' }} />
        {renderTotalsSection(ctx)}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {renderPaymentSection(ctx)}
        {notesBox}
      </div>
      {renderFooterSection(ctx)}
    </div>
  );
}

export function renderEmphasizedTotal(ctx: ReceiptCtx) {
  const { refundWatermark, editWatermark, bodyPadL, bodyPadR, notesBox, baseContainer, sale, settings, taxLabel, currencyCode, showDiscount, fs } = ctx;
  return (
    <div style={baseContainer}>
      {refundWatermark}{editWatermark}
      <div style={{ textAlign: 'center' }}>
        {renderLogo(ctx, { width: '50px', height: '50px', border: '2px solid #000', borderRadius: '50%', margin: '0 auto 10px' })}
        {settings.receiptShowStoreName && <div style={{ fontWeight: ctx.clamp(ctx.baseWeight + 300), fontSize: `${fs.shopName}px`, textTransform: 'uppercase' }}>{settings.storeName}</div>}
        {settings.receiptShowStoreAddress && <div style={{ marginTop: '4px' }}>{settings.storeAddress}</div>}
        {settings.receiptShowStorePhone && <div style={{ marginTop: '2px' }}>T: {settings.storePhone}</div>}
        {settings.receiptShowStoreEmail && <div style={{ marginTop: '2px', wordBreak: 'break-all' }}>E: {settings.storeEmail}</div>}
        {settings.receiptHeader && <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap', fontWeight: ctx.clamp(ctx.baseWeight + 100), fontSize: '10px' }}>{settings.receiptHeader}</div>}
      </div>
      <div style={{ paddingLeft: bodyPadL, paddingRight: bodyPadR }}>
        {renderMetaSection(ctx)}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '4px 0' }} />
        {renderItemsSection(ctx)}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {showDiscount && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '2px 0' }}><span>SUBTOTAL</span><span>{formatCurrency(sale.subtotal, currencyCode)}</span></div>}
        {sale.discountAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '2px 0' }}><span>DISCOUNT</span><span>-{formatCurrency(sale.discountAmount, currencyCode)}</span></div>}
        {settings.receiptShowTax && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '2px 0' }}><span>{taxLabel} ({settings.taxRate}%)</span><span>{formatCurrency(sale.taxAmount, currencyCode)}</span></div>}
        <div style={{ border: '2px solid #000', padding: '10px', textAlign: 'center', fontSize: '18px', display: 'flex', flexDirection: 'column', margin: '8px 0' }}>
          <span style={{ fontSize: '11px' }}>GRAND TOTAL</span>
          <span style={{ fontWeight: 'bold' }}>{formatCurrency(sale.total, currencyCode)}</span>
        </div>
        {sale.status === 'partially_refunded' && sale.refundedAmount > 0 && (
          <div style={{ border: '2px solid #000', padding: '10px', textAlign: 'center', fontSize: '18px', display: 'flex', flexDirection: 'column', margin: '8px 0' }}>
            <span style={{ fontSize: '11px' }}>REFUNDED</span>
            <span style={{ fontWeight: 'bold' }}>-{formatCurrency(sale.refundedAmount, currencyCode)}</span>
            <span style={{ fontSize: '11px', marginTop: '4px' }}>NET AMOUNT</span>
            <span style={{ fontWeight: 'bold' }}>{formatCurrency(sale.total - sale.refundedAmount, currencyCode)}</span>
          </div>
        )}
        {sale.status === 'refunded' && (
          <div style={{ border: '2px solid #000', padding: '10px', textAlign: 'center', fontSize: '18px', display: 'flex', flexDirection: 'column', margin: '8px 0' }}>
            <span style={{ fontSize: '11px' }}>REFUNDED</span>
            <span style={{ fontWeight: 'bold' }}>-{formatCurrency(sale.total, currencyCode)}</span>
          </div>
        )}
        {renderPaymentSection(ctx)}
        {notesBox}
      </div>
      {renderFooterSection(ctx)}
    </div>
  );
}
