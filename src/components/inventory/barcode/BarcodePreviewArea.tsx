import React from 'react';
import { BarcodePreviewToolbar } from './BarcodePreviewToolbar';
import { Product } from '../../../types';
import type { PaperSize } from './BarcodeCardView';
import { mmToPx } from './barcodeLayout';

interface BarcodePreviewAreaProps {
    previewAreaRef: React.RefObject<HTMLDivElement>;
    componentRef: React.RefObject<HTMLDivElement>;
    paperSize: PaperSize;
    pages: { product: Product; id: string }[][];
    allLabels: { product: Product; id: string }[];
    previewScale: number;
    autoScale: number;
    zoomDelta: number;
    setZoomDelta: React.Dispatch<React.SetStateAction<number>>;
    calcAutoScale: () => void;
    a4Columns: number;
    a4Rows: number;
    gapXmm: number;
    gapYmm: number;
    pageWidthMm: number;
    pageHeightMm: number;
    pageMarginMm: number;
    renderCard: (product: Product, labelId: string) => React.ReactNode;
}

export function BarcodePreviewArea({
    previewAreaRef,
    componentRef,
    paperSize,
    pages,
    allLabels,
    previewScale,
    autoScale,
    zoomDelta,
    setZoomDelta,
    calcAutoScale,
    a4Columns,
    a4Rows,
    gapXmm,
    gapYmm,
    pageWidthMm,
    pageHeightMm,
    pageMarginMm,
    renderCard
}: BarcodePreviewAreaProps) {
    // The page element is sized in millimetres so the SAME layout drives the preview (scaled by a
    // CSS transform) and the print (transform removed). px values below are only for the on-screen
    // divider width and the transform-scale margin compensation.
    const pageWpx = mmToPx(pageWidthMm);
    const pageHpx = mmToPx(pageHeightMm);

    return (
        <div
            ref={previewAreaRef}
            className="h-[22vh] sm:h-[30vh] lg:h-full lg:flex-1 flex-shrink-0 bg-neutral-100 dark:bg-[#0f0f0f] flex flex-col overflow-hidden order-1 lg:order-2 relative min-h-0"
        >
            <BarcodePreviewToolbar
                paperSize={paperSize}
                pageCount={pages.length}
                a4Columns={a4Columns}
                a4Rows={a4Rows}
                autoScale={autoScale}
                zoomDelta={zoomDelta}
                previewScale={previewScale}
                setZoomDelta={setZoomDelta}
                calcAutoScale={calcAutoScale}
            />

            <div className="flex-1 overflow-auto">
                <div className="flex flex-col items-center py-4 px-2 min-h-full">
                    <div ref={componentRef} className="print:bg-transparent flex flex-col items-center">
                        {paperSize === 'A4' ? (
                            pages.map((page, pi) => (
                                <div key={`pw-${pi}`} className="flex flex-col items-center mb-6">
                                    <div
                                        className="page-indicator print:hidden flex items-center gap-2 mb-2"
                                        style={{ width: `${pageWpx * previewScale}px`, maxWidth: 'calc(100vw - 32px)' }}
                                    >
                                        <div className="h-px flex-1 bg-neutral-200 dark:border-white/[0.08]" />
                                        <span className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 px-2.5 py-0.5 rounded bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] shadow-none whitespace-nowrap">
                                            <span className="text-emerald-500">●</span> page {pi + 1} / {pages.length}
                                        </span>
                                        <div className="h-px flex-1 bg-neutral-200 dark:border-white/[0.08]" />
                                    </div>

                                    {/* Page Container: occupies exact scaled dimensions to prevent overlapping */}
                                    <div
                                        className="preview-page-viewport"
                                        style={{
                                            width: `${pageWpx * previewScale}px`,
                                            height: `${pageHpx * previewScale}px`,
                                            overflow: 'hidden',
                                            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.12)',
                                            backgroundColor: 'white',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <div
                                            className="print-page bg-white"
                                            data-capture-id={`page-${pi}`}
                                            style={{
                                                width: `${pageWidthMm}mm`,
                                                height: `${pageHeightMm}mm`,
                                                transform: `scale(${previewScale})`,
                                                transformOrigin: 'top left',
                                                display: 'grid',
                                                gridTemplateColumns: `repeat(${a4Columns},1fr)`,
                                                gridTemplateRows: `repeat(${a4Rows},1fr)`,
                                                alignContent: 'stretch',
                                                gap: `${gapYmm}mm ${gapXmm}mm`,
                                                padding: `${pageMarginMm}mm`,
                                                boxSizing: 'border-box',
                                                backgroundColor: 'white',
                                                overflow: 'hidden',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {page.map(item => renderCard(item.product, item.id))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center pt-3 print:pt-0 gap-3">
                                {allLabels.map(item => renderCard(item.product, item.id))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    /* The page is already sized in mm — for print we only remove the on-screen
                       scale transform and decorations so it prints at its true physical size. */
                    .print-page {
                        transform: none !important;
                        margin-bottom: 0 !important;
                        box-shadow: none !important;
                    }
                    .label-to-print {
                        transform: none !important;
                        margin-bottom: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    .page-indicator { display: none !important; }
                }
            `}</style>
        </div>
    );
}
