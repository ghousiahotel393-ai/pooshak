import React from 'react';
import { formatCurrency } from '../../lib/currencies';
import { BarcodePreview } from '../../shared/ui/BarcodePreview';
import { RenderReceiptLayoutProps } from './ReceiptPreviewLayoutProps';

export function renderOffsetLogo(props: RenderReceiptLayoutProps) {
  const { settings, bodyStyle, metaBlock, defaultItemsTable, totalsBlock, paymentBlock, notesBlock, footerBlock, storeNameBlock, storeInfoBlock, renderLogo, total, previewWrap, TwoCol } = props;
  return previewWrap(
    <div style={{ textAlign: 'right' }}>
      {renderLogo({ position: 'absolute', top: '15px', left: '15px', width: '50px', height: '50px', border: '2px solid #000', borderRadius: '8px' })}
      <div style={{ paddingTop: '25px', paddingLeft: '70px', minHeight: '55px' }}>
        {settings.receiptShowStoreName && storeNameBlock}
        {storeInfoBlock}
      </div>
      <div style={bodyStyle}>
        {metaBlock}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '4px 0' }} />
        {defaultItemsTable}
        <div style={{ borderTop: '2px dashed #000', width: '100%', margin: '6px 0' }} />
        {totalsBlock}
        <TwoCol left="TOTAL" right={formatCurrency(total, settings.currency)} bold lg style={{ padding: '4px 0' }} />
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {paymentBlock}
        {notesBlock}
      </div>
      {footerBlock}
    </div>
  );
}

export function renderBoxedSections(props: RenderReceiptLayoutProps) {
  const { settings, bodyStyle, fs, is58mm, RECEIPT_WATERMARK, metaBlock, defaultItemsTable, totalsBlock, paymentBlock, notesBlock, storeNameBlock, storeInfoBlock, renderLogo, total, previewWrap, TwoCol } = props;
  return previewWrap(
    <>
      <div style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', marginBottom: '10px' }}>
        {renderLogo({ width: '50px', height: '50px', border: '1px dashed #000', borderRadius: '8px', margin: '0 auto 5px' })}
        {settings.receiptShowStoreName && storeNameBlock}
        {storeInfoBlock}
      </div>
      <div style={bodyStyle}>
        {metaBlock}
        <div style={{ border: '1px solid #000', padding: '5px', margin: '8px 0' }}>
          {defaultItemsTable}
        </div>
        <div style={{ border: '1px solid #000', padding: '10px', margin: '8px 0' }}>
          {totalsBlock}
          <TwoCol left="TOTAL" right={formatCurrency(total, settings.currency)} bold lg style={{ padding: '4px 0' }} />
        </div>
        {paymentBlock}
        {notesBlock}
      </div>
      {settings.receiptShowBarcode !== false && (
        <div style={{ border: '1px solid #000', padding: '10px 0', marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
          <BarcodePreview value={`${settings.invoicePrefix || "INV"}-001234`} height={40} showValue={true} options={{ width: is58mm ? 1.1 : 1.4, margin: 4 }} />
        </div>
      )}
      {settings.receiptShowFooter !== false && settings.receiptFooter && (
        <div style={{ textAlign: 'center', marginTop: '8px', whiteSpace: 'pre-wrap', fontSize: `${fs.footer}px` }}>{settings.receiptFooter}</div>
      )}
      {settings.receiptShowFooter !== false && settings.storeWebsite && (
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10px' }}>({settings.storeWebsite.replace(/^https?:\/\//i, '').toUpperCase()})</div>
      )}
      {RECEIPT_WATERMARK}
    </>
  );
}

export function renderTearOff(props: RenderReceiptLayoutProps) {
  const { settings, bodyStyle, RECEIPT_WATERMARK, metaBlock, defaultItemsTable, totalsBlock, paymentBlock, notesBlock, footerBlock, storeNameBlock, renderLogo, total, previewWrap, TwoCol } = props;
  return previewWrap(
    <>
      <div style={{ textAlign: 'center' }}>
        {renderLogo({ width: '50px', height: '50px', border: '2px solid #000', borderRadius: '8px', margin: '0 auto 10px' })}
        {settings.receiptShowStoreName && storeNameBlock}
        {settings.receiptShowStoreAddress && <div>{settings.storeAddress}</div>}
        {settings.receiptShowStorePhone && <div style={{ marginTop: '2px' }}>T: {settings.storePhone || '+92 300 0000000'}</div>}
        {settings.receiptShowStoreEmail && <div style={{ marginTop: '2px', wordBreak: 'break-all' }}>E: {settings.storeEmail || 'contact@mystore.com'}</div>}
      </div>
      <div style={bodyStyle}>
        {metaBlock}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '4px 0' }} />
        {defaultItemsTable}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {totalsBlock}
        <TwoCol left="TOTAL" right={formatCurrency(total, settings.currency)} bold lg style={{ padding: '4px 0' }} />
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {paymentBlock}
        {notesBlock}
      </div>
      {footerBlock}
      <div style={{ borderTop: '2px dashed #000', marginTop: '20px', paddingTop: '15px', position: 'relative', textAlign: 'center' }}>
        <span style={{ position: 'absolute', top: '-11px', left: '50%', background: '#fff', padding: '0 5px', fontSize: '14px' }}>✂</span>
        {settings.receiptShowFooter !== false && settings.storeWebsite && (
          <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '10px' }}>({settings.storeWebsite.replace(/^https?:\/\//i, '').toUpperCase()})</div>
        )}
        {RECEIPT_WATERMARK}
      </div>
    </>
  );
}

export function renderVerticalLine(props: RenderReceiptLayoutProps) {
  const { settings, bodyStyle, metaBlock, defaultItemsTable, totalsBlock, paymentBlock, notesBlock, footerBlock, storeNameBlock, storeInfoBlock, renderLogo, total, previewWrap, TwoCol } = props;
  return previewWrap(
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
        {renderLogo({ width: '50px', height: '50px', border: '2px solid #000', flexShrink: 0 })}
        <div style={{ width: '2px', height: '40px', background: '#000', margin: '0 15px' }} />
        <div>
          {settings.receiptShowStoreName && storeNameBlock}
          {storeInfoBlock}
        </div>
      </div>
      <div style={bodyStyle}>
        {metaBlock}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '4px 0' }} />
        {defaultItemsTable}
        <div style={{ borderTop: '2px solid #000', width: '100%', margin: '6px 0' }} />
        {totalsBlock}
        <TwoCol left="TOTAL" right={formatCurrency(total, settings.currency)} bold lg style={{ padding: '4px 0' }} />
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {paymentBlock}
        {notesBlock}
      </div>
      {footerBlock}
    </>
  );
}

export function renderEmphasizedTotal(props: RenderReceiptLayoutProps) {
  const { settings, bodyStyle, metaBlock, defaultItemsTable, totalsBlock, paymentBlock, notesBlock, footerBlock, storeNameBlock, storeInfoBlock, renderLogo, total, previewWrap } = props;
  return previewWrap(
    <>
      <div style={{ textAlign: 'center' }}>
        {renderLogo({ width: '50px', height: '50px', border: '2px solid #000', borderRadius: '50%', margin: '0 auto 10px' })}
        {settings.receiptShowStoreName && storeNameBlock}
        {storeInfoBlock}
      </div>
      <div style={bodyStyle}>
        {metaBlock}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '4px 0' }} />
        {defaultItemsTable}
        <div style={{ borderTop: '1px solid #000', width: '100%', margin: '6px 0' }} />
        {totalsBlock}
        <div style={{ border: '2px solid #000', padding: '10px', textAlign: 'center', fontSize: '18px', display: 'flex', flexDirection: 'column', margin: '8px 0', borderRadius: '4px' }}>
          <span style={{ fontSize: '11px' }}>GRAND TOTAL</span>
          <span style={{ fontWeight: 'bold' }}>{formatCurrency(total, settings.currency)}</span>
        </div>
        {paymentBlock}
        {notesBlock}
      </div>
      {footerBlock}
    </>
  );
}
