import { useBarcodeSettings } from './useBarcodeSettings';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, X } from 'lucide-react';
import { Product } from '../../../types';
import { Button } from '../../../shared/ui';
import { sonner } from '../../../lib/sonner';
import { BarcodeCard } from './BarcodeCard';
import { BarcodeSidebar } from './BarcodeSidebar';
import { BarcodePreviewArea } from './BarcodePreviewArea';
import { calculateUnprintedQuantities, recordPrintedQuantities } from '../../../lib/services/inventory/barcodePrintTracker';

interface BarcodeGeneratorProps {
    products: Product[];
    onClose: () => void;
    onProductsChange?: (nextProducts: Product[]) => void;
    onClearAll?: () => void;
}

const A4_W = 794;

export { persistedBarcodeProducts, persistedBarcodeQuantities, clearPersistedBarcodeState } from './useBarcodeBatchState';
import { useBarcodeBatchState } from './useBarcodeBatchState';

export function BarcodeGenerator({ products, onClose, onProductsChange, onClearAll }: BarcodeGeneratorProps) {
    const settings = useBarcodeSettings();
    const {
        paperSize, a4Columns, a4Rows, barcodeScale, barcodeHeight,
        labelPadding, labelBorder, showBarcode, showQr, qrSize, nameLines, barcodeFontSize, contentScale,
        marginX, marginY, gapX, gapY, barcodeBarWidth, barcodeZoom,
        showPrice, showName, showCategory, showSku, appSettings
    } = settings;

    const {
        localProducts, setLocalProducts, quantities, setQuantities,
        unprintedMap, refreshUnprinted, updateQty, setGlobalQty,
        handleLoadUnprinted, handleClearAll,
    } = useBarcodeBatchState({ products, onProductsChange, onClearAll });

    const isThermal = paperSize !== 'A4';
    const totalLabels = localProducts.reduce((sum, p) => sum + (quantities[p.id] || 0), 0);

    const allLabels: { product: Product; id: string }[] = [];
    localProducts.forEach(p => {
        const q = quantities[p.id] || 0;
        for (let i = 0; i < q; i++) {
            allLabels.push({ product: p, id: `${p.id}-${i}` });
        }
    });

    const labelsPerPage = a4Columns * a4Rows;
    const pages: typeof allLabels[] = [];
    if (!isThermal) {
        for (let i = 0; i < allLabels.length; i += labelsPerPage) {
            pages.push(allLabels.slice(i, i + labelsPerPage));
        }
    } else {
        pages.push(allLabels);
    }

    const [autoScale, setAutoScale] = useState(1);
    const [zoomDelta, setZoomDelta] = useState(0);
    const previewScale = autoScale + zoomDelta;

    const previewAreaRef = useRef<HTMLDivElement>(null);
    const componentRef = useRef<HTMLDivElement>(null);

    const calcAutoScale = useCallback(() => {
        if (!previewAreaRef.current) return;
        const w = previewAreaRef.current.clientWidth;
        const targetW = isThermal ? (paperSize === '58mm' ? 220 : 300) : A4_W;
        const scale = Math.min(1, (w - 40) / targetW);
        setAutoScale(scale);
        setZoomDelta(0);
    }, [isThermal, paperSize]);

    useEffect(() => {
        calcAutoScale();
        window.addEventListener('resize', calcAutoScale);
        return () => window.removeEventListener('resize', calcAutoScale);
    }, [calcAutoScale]);

    const getPageStyle = () => {
        if (paperSize === 'A4') {
            return `@page { size: A4 portrait; margin: 0; }`;
        }
        const match = paperSize.match(/Thermal-(\d+)x(\d+)/);
        if (match) {
            return `@page { size: ${match[1]}mm ${match[2]}mm; margin: 0; } body { margin: 0; }`;
        }
        return `@page { margin: 0; }`;
    };

    const handlePrintFn = useReactToPrint({
        content: () => componentRef.current,
        documentTitle: `Barcodes_${Date.now()}`,
        pageStyle: getPageStyle(),
    });

    const handlePrint = async () => {
        if (totalLabels > 0 && handlePrintFn) {
            await recordPrintedQuantities(quantities);
            handlePrintFn();
            await refreshUnprinted(localProducts);
        }
    };

    const cellW = isThermal ? '100%' : `${100 / a4Columns}%`;
    const cellH = isThermal ? 'auto' : `${100 / a4Rows}%`;

    const renderCard = (product: Product, labelId: string) => (
        <BarcodeCard
            key={labelId}
            product={product}
            labelId={labelId}
            isThermal={isThermal}
            paperSize={paperSize}
            labelBorder={labelBorder}
            currency={appSettings.currency}
            pad={labelPadding}
            ratio={contentScale}
            fs={barcodeFontSize}
            barH={barcodeHeight}
            barcodeBarWidth={barcodeBarWidth}
            barcodeScale={barcodeScale}
            barcodeZoom={barcodeZoom}
            barcodeFontSize={barcodeFontSize}
            showBarcode={Boolean(showBarcode)}
            showQr={Boolean(showQr)}
            showName={Boolean(showName)}
            showPrice={Boolean(showPrice)}
            showCategory={Boolean(showCategory)}
            showSku={Boolean(showSku)}
            nameLines={nameLines}
            qrSz={qrSize}
            previewScale={previewScale}
            cellW={cellW as any}
            cellH={cellH as any}
            marginX={marginX}
            marginY={marginY}
        />
    );

    return (
        <div className="flex flex-col h-full min-h-0 w-full bg-white dark:bg-surface overflow-hidden relative border-t border-neutral-200 dark:border-white/[0.08]">
            <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 md:px-5 py-2.5 border-b border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 bg-neutral-100 dark:bg-white/[0.06] rounded flex-shrink-0">
                        <Printer className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white leading-none truncate">Barcode Print Engine</h2>
                        <p className="hidden sm:block text-[11px] text-neutral-500 mt-0.5 truncate">Configure and print barcode labels</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="hidden sm:inline-flex text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                        {totalLabels} {totalLabels === 1 ? 'label' : 'labels'} ({pages.length} {pages.length === 1 ? 'page' : 'pages'})
                    </span>
                    <Button
                        onClick={handlePrint}
                        disabled={totalLabels === 0}
                        variant="primary"
                        size="sm"
                        icon={<Printer className="h-3.5 w-3.5 flex-shrink-0" />}
                    >
                        <span>Print Labels</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onClose} icon={<X className="h-4 w-4" />} />
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
                <BarcodeSidebar
                    settings={settings}
                    localProducts={localProducts}
                    setLocalProducts={setLocalProducts}
                    quantities={quantities}
                    setQuantities={setQuantities}
                    updateQty={updateQty}
                    setGlobalQty={setGlobalQty}
                    onClearAll={handleClearAll}
                    unprintedMap={unprintedMap}
                    onLoadUnprinted={handleLoadUnprinted}
                />
                <BarcodePreviewArea
                    previewAreaRef={previewAreaRef}
                    componentRef={componentRef}
                    paperSize={paperSize}
                    pages={pages}
                    allLabels={allLabels}
                    previewScale={previewScale}
                    autoScale={autoScale}
                    zoomDelta={zoomDelta}
                    setZoomDelta={setZoomDelta}
                    calcAutoScale={calcAutoScale}
                    a4Columns={a4Columns}
                    a4Rows={a4Rows}
                    gapX={gapX}
                    gapY={gapY}
                    renderCard={renderCard}
                />
            </div>
        </div>
    );
}

export default BarcodeGenerator;
