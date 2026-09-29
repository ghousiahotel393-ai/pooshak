import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency } from '../../../lib/currencies';
import { Product } from '../../../types';
import { BarcodeSVG } from './BarcodeSVG';

export type PaperSize = 'A4'
    | 'Thermal-50x25'
    | 'Thermal-40x30'
    | 'Thermal-50x30'
    | 'Thermal-50x40'
    | 'Thermal-60x40'
    | 'Thermal-80x40'
    | 'Thermal-80x50';

interface BarcodeCardProps {
    product: Product;
    labelId: string;
    isThermal: boolean;
    paperSize: PaperSize;
    labelBorder: boolean;
    currency: string;
    pad: number;
    ratio: number;
    fs: { name: number; price: number; sku: number; cat: number; nameLH: number };
    barH: number;
    barcodeBarWidth: number;
    barcodeScale: number;
    barcodeZoom: number;
    barcodeFontSize: number;
    showBarcode: boolean;
    showQr: boolean;
    showName: boolean;
    showPrice: boolean;
    showCategory: boolean;
    showSku: boolean;
    nameLines: 1 | 2;
    qrSz: number;
    previewScale: number;
    cellW: number;
    cellH: number;
    marginX: number;
    marginY: number;
}

export function BarcodeCard({
    product,
    labelId,
    isThermal,
    _paperSize,
    labelBorder,
    currency,
    pad,
    ratio,
    fs,
    barH,
    barcodeBarWidth,
    barcodeScale,
    barcodeZoom,
    barcodeFontSize,
    showBarcode,
    showQr,
    showName,
    showPrice,
    showCategory,
    showSku,
    nameLines,
    qrSz,
    previewScale,
    cellW,
    cellH,
    marginX,
    marginY,
}: BarcodeCardProps) {
    const valRaw = product.barcodeValue || product.barcode || product.sku || '';
    const val = valRaw.toUpperCase().replace(/[^A-Z0-9. $/+%]/g, '');

    const innerContent = (
        <div style={{
            width: '100%', height: '100%',
            padding: `${pad}px`,
            border: labelBorder && !isThermal ? '1px solid #e5e7eb' : 'none',
            backgroundColor: 'white', overflow: 'hidden', boxSizing: 'border-box',
            transform: `translate(${marginX}px, ${marginY}px)`,
        }}>
            <div style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: `${Math.max(2, Math.round(4 * ratio))}px`,
            }}>
                {Boolean(showName) ? (
                    <p style={{
                        fontSize: `${fs.name}px`, fontWeight: 900,
                        lineHeight: `${fs.nameLH}px`, textTransform: 'uppercase',
                        color: '#111827', wordBreak: 'break-word', textAlign: 'center',
                        width: '100%', margin: 0, flexShrink: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: nameLines,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                    }}>{product.name}</p>
                ) : null}

                {(Boolean(showPrice) || Boolean(showCategory && product.category)) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0, justifyContent: 'center', flexWrap: 'wrap', maxWidth: '100%' }}>
                        {Boolean(showPrice) ? <p style={{ fontSize: `${fs.price}px`, fontWeight: 900, color: '#059669', margin: 0, whiteSpace: 'nowrap' }}>{formatCurrency(product.price, currency)}</p> : null}
                        {Boolean(showCategory && product.category) ? <p style={{ fontSize: `${fs.cat}px`, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{product.category}</p> : null}
                    </div>
                ) : null}

                {Boolean(showSku && product.sku) ? (
                    <p style={{ fontSize: `${fs.sku}px`, color: '#9ca3af', fontFamily: 'monospace', margin: 0, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                        SKU: {product.sku}
                    </p>
                ) : null}

                {val && (Boolean(showBarcode) || Boolean(showQr)) ? (
                    <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 0 }}>
                        {Boolean(showBarcode) ? (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                minHeight: 0,
                                flex: 1,
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    height: `${barH * barcodeZoom}px`,
                                    maxHeight: '75%',
                                    minHeight: 0,
                                    overflow: 'hidden'
                                }}>
                                    <BarcodeSVG
                                        value={val}
                                        barWidth={barcodeBarWidth}
                                        height={barH}
                                        barcodeScale={barcodeScale}
                                        barcodeZoom={barcodeZoom}
                                    />
                                </div>
                                <p style={{
                                    fontSize: `${Math.max(5, Math.round(barcodeFontSize * ratio))}px`,
                                    fontFamily: 'monospace',
                                    fontWeight: 750,
                                    color: '#000000',
                                    margin: 0,
                                    marginTop: `${Math.max(1, Math.round(2 * ratio))}px`,
                                    textTransform: 'uppercase',
                                    textAlign: 'center',
                                    width: '100%',
                                    letterSpacing: '0.05em',
                                    flexShrink: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {val}
                                </p>
                            </div>
                        ) : null}
                        {Boolean(showQr) ? (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                minHeight: 0,
                                flex: 1,
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    height: `${Math.max(20, Math.round(qrSz * barcodeZoom * barcodeScale))}px`,
                                    maxHeight: '80%',
                                    minHeight: 0,
                                    overflow: 'hidden'
                                }}>
                                    <QRCodeSVG
                                        value={val}
                                        size={Math.max(20, Math.round(qrSz * barcodeZoom * barcodeScale))}
                                        level="L"
                                        includeMargin={false}
                                        style={{
                                            width: 'auto',
                                            height: '100%',
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            aspectRatio: '1/1',
                                            display: 'block'
                                        }}
                                    />
                                </div>
                                <p style={{
                                    fontSize: `${Math.max(4, Math.round((barcodeFontSize - 1) * ratio))}px`,
                                    fontWeight: 800,
                                    color: '#000000',
                                    margin: 0,
                                    marginTop: `${Math.max(1, Math.round(3 * ratio))}px`,
                                    textTransform: 'uppercase',
                                    textAlign: 'center',
                                    letterSpacing: '0.05em',
                                    flexShrink: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    Scan With Camera
                                </p>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ fontSize: `${Math.max(6, Math.round(8 * ratio))}px`, color: '#ef4444', fontWeight: 700, fontStyle: 'italic', margin: 0, textAlign: 'center' }}>No Code Data</p>
                    </div>
                )}
            </div>
        </div>
    );

    if (isThermal) {
        return (
            <div key={labelId} data-capture-id={labelId}
                className="label-to-print print:break-after-page shadow-md print:shadow-none bg-white border border-gray-200 dark:border-white/5 print:border-none"
                style={{
                    width: `${cellW}px`,
                    height: `${cellH}px`,
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top center',
                    marginBottom: `${(cellH * previewScale) - cellH + (12 * previewScale)}px`,
                    overflow: 'hidden',
                    marginRight: 'auto',
                    marginLeft: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'white',
                    flexShrink: 0
                }}>
                {innerContent}
            </div>
        );
    }

    return (
        <div key={labelId} data-capture-id={labelId} style={{ width: '100%', height: '100%' }}>
            {innerContent}
        </div>
    );
}
