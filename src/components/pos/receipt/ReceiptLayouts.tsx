import { formatCurrency } from '../../../lib/currencies';
import { BarcodePreview } from '../../../shared/ui/BarcodePreview';
import { renderLogo, RECEIPT_WATERMARK } from './parts';
import { renderHeaderSection, renderMetaSection } from './ReceiptHeader';
import { renderItemsSection, renderTotalsSection, renderPaymentSection } from './ReceiptBody';
import { renderFooterSection } from './ReceiptFooter';
import { renderBoxedSections, renderTearOff, renderVerticalLine, renderEmphasizedTotal } from './ReceiptLayoutsExtra';
import { type ReceiptCtx } from './types';

export function renderDefaultBody(ctx: ReceiptCtx) {
  const { refundWatermark, editWatermark, headerBorder, bodyPadL, bodyPadR, template, notesBox, baseContainer } = ctx;
  return (
    <div style={baseContainer}>
      {refundWatermark}{editWatermark}
      <div style={{ borderTop: headerBorder, width: '100%', margin: '6px 0' }} />
      {renderHeaderSection(ctx)}
      <div style={{ paddingLeft: bodyPadL, paddingRight: bodyPadR }}>
        <div style={{ borderTop: headerBorder, width: '100%', margin: '6px 0' }} />
        {renderMetaSection(ctx)}
        <div style={{ borderTop: template === 'classic' ? '1px dashed black' : '1px solid black', width: '100%', margin: '4px 0' }} />
        {renderItemsSection(ctx)}
        <div style={{ borderTop: headerBorder, width: '100%', margin: '6px 0' }} />
        {renderTotalsSection(ctx)}
        <div style={{ borderTop: headerBorder, width: '100%', margin: '6px 0' }} />
        {renderPaymentSection(ctx)}
        {notesBox}
      </div>
      {renderFooterSection(ctx)}
      <div style={{ borderTop: headerBorder, width: '100%', margin: '6px 0' }} />
    </div>
  );
}

export function renderHorizontalHeader(ctx: ReceiptCtx) {
  const { refundWatermark, editWatermark, bodyPadL, bodyPadR, notesBox, baseContainer } = ctx;
  return (
    <div style={baseContainer}>
      {refundWatermark}{editWatermark}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '10px' }}>
        {renderLogo(ctx, { width: '50px', height: '50px', border: '2px solid #000', borderRadius: '8px', flexShrink: 0 })}
        <div style={{ textAlign: 'left' }}>
          {ctx.settings.receiptShowStoreName && <div style={{ fontWeight: ctx.clamp(ctx.baseWeight + 300), fontSize: `${ctx.fs.shopName}px`, textTransform: 'uppercase' }}>{ctx.settings.storeName}</div>}
          {ctx.settings.receiptShowStoreAddress && <div>{ctx.settings.storeAddress}</div>}
          {ctx.settings.receiptShowStorePhone && <div>T: {ctx.settings.storePhone}</div>}
          {ctx.settings.receiptShowStoreEmail && <div style={{ wordBreak: 'break-all' }}>E: {ctx.settings.storeEmail}</div>}
          {ctx.settings.receiptHeader && <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap', fontWeight: ctx.clamp(ctx.baseWeight + 100), fontSize: '10px' }}>{ctx.settings.receiptHeader}</div>}
        </div>
      </div>
      <div style={{ paddingLeft: bodyPadL, paddingRight: bodyPadR }}>
        {renderMetaSection(ctx)}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '4px 0' }} />
        {renderItemsSection(ctx)}
        <div style={{ borderTop: '2px solid #000', width: '100%', margin: '8px 0' }} />
        {renderTotalsSection(ctx)}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {renderPaymentSection(ctx)}
        {notesBox}
      </div>
      {renderFooterSection(ctx)}
    </div>
  );
}

export function _centeredFlow(ctx: ReceiptCtx) {
  const { refundWatermark, editWatermark, bodyPadL, bodyPadR, notesBox, baseContainer, is58mm, shBundles, shStandalone, showDiscount, sale, settings, taxLabel, currencyCode, fs } = ctx;
  return (
    <div style={{ ...baseContainer, textAlign: 'center' }}>
      {refundWatermark}{editWatermark}
      {settings.receiptShowBarcode !== false && (
        <div style={{ margin: '10px 0', display: 'flex', justifyContent: 'center' }}>
          <BarcodePreview value={sale.invoiceNumber} height={40} showValue={true} options={{ width: is58mm ? 1.1 : 1.4, margin: 4 }} />
        </div>
      )}
      {renderLogo(ctx, { width: '50px', height: '50px', border: '2px solid #000', borderRadius: '50%', margin: '0 auto 5px' })}
      {settings.receiptShowStoreName && <div style={{ fontWeight: ctx.clamp(ctx.baseWeight + 300), fontSize: `${fs.shopName}px`, textTransform: 'uppercase' }}>{settings.storeName}</div>}
      <div style={{ marginBottom: '10px' }}>
        {settings.receiptShowStoreAddress && <div style={{ textAlign: 'center' }}>{settings.storeAddress}</div>}
        {settings.receiptShowStorePhone && <div style={{ textAlign: 'center' }}>T: {settings.storePhone}</div>}
        {settings.receiptShowStoreEmail && <div style={{ textAlign: 'center', wordBreak: 'break-all' }}>E: {settings.storeEmail}</div>}
      </div>
      <div style={{ paddingLeft: bodyPadL, paddingRight: bodyPadR }}>
        {renderMetaSection(ctx)}
        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '4px 0' }} cellPadding={0} cellSpacing={0}>
          <thead><tr><th style={{ borderBottom: '1px solid #000', textAlign: 'left', padding: '4px 0' }}>ITEM</th><th style={{ borderBottom: '1px solid #000', textAlign: 'center', padding: '4px 0' }}>QTY</th><th style={{ borderBottom: '1px solid #000', textAlign: 'right', padding: '4px 0' }}>TOTAL</th></tr></thead>
          <tbody>
            {shBundles.map((b: any) => (
              <tr key={b.bundleId}>
                <td style={{ padding: '4px 0', textAlign: 'left' }}>🎁 {b.bundleName}</td>
                <td style={{ padding: '4px 0', textAlign: 'center' }}>1</td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>{formatCurrency(b.totalSubtotal, currencyCode)}</td>
              </tr>
            ))}
            {shStandalone.map((item: any, i: number) => (
              <tr key={`sa-${i}`}>
                <td style={{ padding: '4px 0', textAlign: 'left' }}>{i + 1}. {item.product?.name || 'Item'}</td>
                <td style={{ padding: '4px 0', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>{formatCurrency(item.subtotal, currencyCode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '10px 0', marginTop: '10px', textAlign: 'center' }}>
          {showDiscount && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '2px 0' }}><span>SUBTOTAL</span><span>{formatCurrency(sale.subtotal, currencyCode)}</span></div>}
          {sale.discountAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '2px 0' }}><span>DISCOUNT</span><span>-{formatCurrency(sale.discountAmount, currencyCode)}</span></div>}
          {settings.receiptShowTax && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '2px 0' }}><span>{taxLabel} ({settings.taxRate}%)</span><span>{formatCurrency(sale.taxAmount, currencyCode)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', margin: '6px 0' }}><span>GRAND TOTAL</span><span>{formatCurrency(sale.total, currencyCode)}</span></div>
        </div>
        {renderPaymentSection(ctx)}
        {notesBox}
      </div>
      {settings.receiptShowFooter !== false && settings.receiptFooter && (
        <div style={{ textAlign: 'center', marginTop: '15px', whiteSpace: 'pre-wrap', fontSize: '10px' }}>{settings.receiptFooter}</div>
      )}
      {settings.receiptShowFooter !== false && settings.storeWebsite && (
        <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '10px' }}>({settings.storeWebsite.replace(/^https?:\/\//i, '').toUpperCase()})</div>
      )}
      {RECEIPT_WATERMARK}
    </div>
  );
}

export function renderLeftGrid(ctx: ReceiptCtx) {
  const { refundWatermark, editWatermark, bodyPadL, bodyPadR, notesBox, baseContainer, is58mm } = ctx;
  return (
    <div style={baseContainer}>
      {refundWatermark}{editWatermark}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ borderBottom: '3px solid #000', width: '100%', paddingBottom: '5px', fontSize: '16px', fontWeight: 'bold' }}>{ctx.settings.storeName || 'STORE NAME'}</div>
        {ctx.settings.receiptShowStoreAddress && <div style={{ marginTop: '4px' }}>{ctx.settings.storeAddress}</div>}
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
      {ctx.settings.receiptShowBarcode !== false && (
        <div style={{ textAlign: 'left', margin: '10px 0' }}>
          <BarcodePreview value={ctx.sale.invoiceNumber} height={40} showValue={true} options={{ width: is58mm ? 1.1 : 1.4, margin: 4 }} />
        </div>
      )}
      {ctx.settings.receiptShowFooter !== false && ctx.settings.receiptFooter && (
        <div style={{ textAlign: 'left', marginTop: '8px', whiteSpace: 'pre-wrap', fontSize: '10px' }}>{ctx.settings.receiptFooter}</div>
      )}
      {ctx.settings.receiptShowFooter !== false && ctx.settings.storeWebsite && (
        <div style={{ textAlign: 'left', marginTop: '4px', fontSize: '10px' }}>({ctx.settings.storeWebsite.replace(/^https?:\/\//i, '').toUpperCase()})</div>
      )}
      {RECEIPT_WATERMARK}
    </div>
  );
}

export function renderSplitColumns(ctx: ReceiptCtx) {
  const { refundWatermark, editWatermark, bodyPadL, bodyPadR, notesBox, baseContainer } = ctx;
  return (
    <div style={baseContainer}>
      {refundWatermark}{editWatermark}
      <div style={{ textAlign: 'center', borderBottom: '1px dotted #000', paddingBottom: '10px', marginBottom: '10px' }}>
        {renderLogo(ctx, { width: '50px', height: '50px', border: '2px solid #000', borderRadius: '8px', margin: '0 auto 5px' })}
        {ctx.settings.receiptShowStoreName && <div style={{ fontWeight: ctx.clamp(ctx.baseWeight + 300), fontSize: `${ctx.fs.shopName}px`, textTransform: 'uppercase' }}>{ctx.settings.storeName}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '5px' }}>
          <span>{ctx.settings.receiptShowStoreAddress && ctx.settings.storeAddress}</span>
          <span>
            {ctx.settings.receiptShowStorePhone && ctx.settings.storePhone}
            {ctx.settings.receiptShowStoreEmail && ` | ${ctx.settings.storeEmail}`}
          </span>
        </div>
        {ctx.settings.receiptHeader && <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap', fontWeight: ctx.clamp(ctx.baseWeight + 100), fontSize: '10px' }}>{ctx.settings.receiptHeader}</div>}
      </div>
      <div style={{ paddingLeft: bodyPadL, paddingRight: bodyPadR }}>
        {renderMetaSection(ctx)}
        <div style={{ borderTop: '1px dotted #000', width: '100%', margin: '4px 0' }} />
        {renderItemsSection(ctx)}
        <div style={{ borderTop: '1px dotted #000', width: '100%', margin: '6px 0' }} />
        {renderTotalsSection(ctx)}
        <div style={{ borderTop: '1px dotted #000', width: '100%', margin: '6px 0' }} />
        {renderPaymentSection(ctx)}
        {notesBox}
      </div>
      {renderFooterSection(ctx)}
    </div>
  );
}

export function renderFloatingTotals(ctx: ReceiptCtx) {
  const { refundWatermark, editWatermark, bodyPadL, bodyPadR, notesBox, baseContainer, sale, settings, taxLabel, currencyCode, showDiscount, fs } = ctx;
  return (
    <div style={baseContainer}>
      {refundWatermark}{editWatermark}
      {settings.receiptShowStoreName && <div style={{ fontWeight: ctx.clamp(ctx.baseWeight + 300), fontSize: `${fs.shopName}px`, borderBottom: '2px solid #000', display: 'inline-block', paddingBottom: '2px', marginBottom: '10px' }}>{settings.storeName}</div>}
      <div style={{ marginBottom: '15px' }}>
        {settings.receiptShowStoreAddress && <div>{settings.storeAddress}</div>}
        {settings.receiptShowStorePhone && <div>T: {settings.storePhone}</div>}
        {settings.receiptShowStoreEmail && <div style={{ wordBreak: 'break-all' }}>E: {settings.storeEmail}</div>}
        {settings.receiptHeader && <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap', fontWeight: ctx.clamp(ctx.baseWeight + 100), fontSize: '10px' }}>{settings.receiptHeader}</div>}
      </div>
      <div style={{ paddingLeft: bodyPadL, paddingRight: bodyPadR }}>
        {renderMetaSection(ctx)}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '4px 0' }} />
        {renderItemsSection(ctx)}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: '10px' }}>
          <div style={{ width: '70%' }}>
            {showDiscount && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '2px 0' }}><span>SUBTOTAL</span><span>{formatCurrency(sale.subtotal, currencyCode)}</span></div>}
            {sale.discountAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '2px 0' }}><span>DISCOUNT</span><span>-{formatCurrency(sale.discountAmount, currencyCode)}</span></div>}
            {settings.receiptShowTax && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '2px 0' }}><span>{taxLabel} ({settings.taxRate}%)</span><span>{formatCurrency(sale.taxAmount, currencyCode)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '4px', marginTop: '4px' }}><span>GRAND TOTAL</span><span>{formatCurrency(sale.total, currencyCode)}</span></div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {renderPaymentSection(ctx)}
        {notesBox}
      </div>
      {renderFooterSection(ctx)}
    </div>
  );
}

export function renderOffsetLogo(ctx: ReceiptCtx) {
  const { refundWatermark, editWatermark, bodyPadL, bodyPadR, notesBox, baseContainer } = ctx;
  return (
    <div style={{ ...baseContainer, textAlign: 'right' }}>
      {refundWatermark}{editWatermark}
      {renderLogo(ctx, { position: 'absolute', top: '15px', left: '15px', width: '50px', height: '50px', border: '2px solid #000', borderRadius: '8px' })}
      <div style={{ paddingTop: '25px', paddingLeft: '70px', minHeight: '55px' }}>
        {ctx.settings.receiptShowStoreName && <div style={{ fontWeight: ctx.clamp(ctx.baseWeight + 300), fontSize: `${ctx.fs.shopName}px`, textTransform: 'uppercase' }}>{ctx.settings.storeName}</div>}
        {ctx.settings.receiptShowStoreAddress && <div style={{ marginTop: '4px' }}>{ctx.settings.storeAddress}</div>}
        {ctx.settings.receiptShowStorePhone && <div style={{ marginTop: '2px' }}>T: {ctx.settings.storePhone}</div>}
        {ctx.settings.receiptShowStoreEmail && <div style={{ marginTop: '2px', wordBreak: 'break-all' }}>E: {ctx.settings.storeEmail}</div>}
        {ctx.settings.receiptHeader && <div style={{ marginTop: '4px', whiteSpace: 'pre-wrap', fontWeight: ctx.clamp(ctx.baseWeight + 100), fontSize: '10px' }}>{ctx.settings.receiptHeader}</div>}
      </div>
      <div style={{ paddingLeft: bodyPadL, paddingRight: bodyPadR }}>
        {renderMetaSection(ctx)}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '4px 0' }} />
        {renderItemsSection(ctx)}
        <div style={{ borderTop: '2px dashed #000', width: '100%', margin: '6px 0' }} />
        {renderTotalsSection(ctx)}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {renderPaymentSection(ctx)}
        {notesBox}
      </div>
      {renderFooterSection(ctx)}
    </div>
  );
}


export function renderNewLayout(ctx: ReceiptCtx) {
  switch (ctx.template) {
    case 'horizontal_header': return renderHorizontalHeader(ctx);
    case 'centered_flow': return _centeredFlow(ctx);
    case 'left_grid': return renderLeftGrid(ctx);
    case 'split_columns': return renderSplitColumns(ctx);
    case 'floating_totals': return renderFloatingTotals(ctx);
    case 'offset_logo': return renderOffsetLogo(ctx);
    case 'boxed_sections': return renderBoxedSections(ctx);
    case 'tear_off': return renderTearOff(ctx);
    case 'vertical_line': return renderVerticalLine(ctx);
    case 'emphasized_total': return renderEmphasizedTotal(ctx);
    default: return renderDefaultBody(ctx);
  }
}
