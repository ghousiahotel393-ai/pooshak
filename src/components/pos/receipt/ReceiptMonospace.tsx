import { formatCurrency } from '../../../lib/currencies';
import { TwoCol } from './parts';
import { renderHeaderSection, MonoMeta } from './ReceiptHeader';
import { MonoItems } from './ReceiptBody';
import { MonoTotals, MonoPayment, MonoNotes, MonoFooter } from './ReceiptFooter';
import { type ReceiptCtx } from './types';

export function renderMonospaceBody(ctx: ReceiptCtx) {
  const { sale, settings, template, headerBorder, fs, baseWeight, padTop, padBottom, padLeft, padRight, fontFamily, paperWidthPx, currencyCode, refundWatermark } = ctx;

  const dividerStyle = {
    borderTop: headerBorder,
    width: '100%',
    margin: '6px 0',
  };

  const subDividerStyle = {
    borderTop: template === 'classic' ? '1px dashed black' : '1px solid black',
    width: '100%',
    margin: '4px 0',
  };

  return (
    <div
      id="receipt-content"
      style={{
        width: paperWidthPx,
        maxWidth: paperWidthPx,
        boxSizing: 'border-box',
        margin: '0 auto',
        position: 'relative',
        paddingTop: `${Math.max(0, padTop)}mm`,
        paddingBottom: `${Math.max(0, padBottom)}mm`,
        paddingLeft: `${Math.max(0, padLeft)}mm`,
        paddingRight: `${Math.max(0, padRight)}mm`,
        left: `${settings.receiptOffsetX || 0}mm`,
        marginTop: padTop < 0 ? `${padTop}mm` : '0',
        marginBottom: padBottom < 0 ? `${padBottom}mm` : '0',
        fontFamily: fontFamily,
        fontSize: `${fs.body}px`,
        fontWeight: baseWeight,
        color: '#000',
        background: '#fff',
        lineHeight: '1.4',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
      }}
    >
      {sale.status === 'refunded' && refundWatermark}

      {template !== 'minimal' && <div style={dividerStyle} />}

      {renderHeaderSection(ctx)}

      <div style={{
        paddingLeft: '0mm',
        paddingRight: '0mm',
        position: 'relative',
        left: `${(padLeft < 0 ? padLeft : 0) - (padRight < 0 ? padRight : 0)}mm`,
      }}>
        {template !== 'minimal' && <div style={dividerStyle} />}

        {MonoMeta(ctx)}

        {template !== 'minimal' && <div style={subDividerStyle} />}

        <TwoCol ctx={ctx} left="ITEM" right="TOTAL" bold />

        {template !== 'minimal' && <div style={subDividerStyle} />}

        <div style={{ marginTop: '4px', marginBottom: '4px' }}>
          {MonoItems(ctx)}
        </div>

        {template !== 'minimal' && <div style={dividerStyle} />}

        {MonoTotals(ctx)}

        {template !== 'minimal' && <div style={dividerStyle} />}

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

        {template !== 'minimal' && <div style={dividerStyle} />}

        {MonoPayment(ctx)}

        {MonoNotes(ctx)}
      </div>

      {MonoFooter(ctx)}

      {template !== 'minimal' && <div style={dividerStyle} />}
    </div>
  );
}
