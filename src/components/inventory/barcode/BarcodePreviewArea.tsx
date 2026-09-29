import React from 'react';
import { BarcodePreviewToolbar } from './BarcodePreviewToolbar';
import { Product } from '../../../types';
import type { PaperSize } from './BarcodeCardView';

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
    gapX: number;
    gapY: number;
    renderCard: (product: Product, labelId: string) => React.ReactNode;
}

const A4_W = 794;
const A4_H = 1123;

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
    gapX,
    gapY,
    renderCard
}: BarcodePreviewAreaProps) {
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
                                <div key={`pw-${pi}`} className="flex flex-col items-center">
                                    <div
                                        className="page-indicator print:hidden flex items-center gap-2 my-2"
                                        style={{ width: `${A4_W * previewScale}px`, maxWidth: 'calc(100vw - 32px)' }}
                                    >
                                        <div className="h-px flex-1 bg-neutral-200 dark:border-white/[0.08]" />
                                        <span className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-600 dark:text-neutral-400 px-2.5 py-0.5 rounded bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] shadow-none whitespace-nowrap">
                                            <span className="text-emerald-500">●</span> page {pi + 1} / {pages.length}
                                        </span>
                                        <div className="h-px flex-1 bg-neutral-200 dark:border-white/[0.08]" />
                                    </div>

                                    <div
                                        className="print-page bg-white shadow-2xl print:shadow-none"
                                        data-capture-id={`page-${pi}`}
                                        style={{
                                            width: `${A4_W}px`,
                                            height: `${A4_H}px`,
                                            transform: `scale(${previewScale})`,
                                            transformOrigin: 'top center',
                                            marginBottom: `${(A4_H * previewScale) - A4_H + 16}px`,
                                            display: 'grid',
                                            gridTemplateColumns: `repeat(${a4Columns},1fr)`,
                                            gridTemplateRows: `repeat(${a4Rows},1fr)`,
                                            alignContent: 'stretch',
                                            gap: `${gapY}px ${gapX}px`,
                                            padding: '19px',
                                            boxSizing: 'border-box',
                                            backgroundColor: 'white',
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {page.map(item => renderCard(item.product, item.id))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center pt-3 print:pt-0">
                                {allLabels.map(item => renderCard(item.product, item.id))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    .print-page {
                        transform: none !important;
                        margin-bottom: 0 !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        padding: 5mm !important;
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
