import React from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { DEFAULT_BARCODE_DIMENSIONS } from './useBarcodeSettings';

export const SectionTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={`text-[9px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest ${className ?? 'mb-2.5'}`}>{children}</p>
);

export const SliderRow = ({ label, disp, min, max, step, val, set, defaultVal }: {
    label: string; disp: string; min: number; max: number; step: number; val: number; set: (v: number) => void; defaultVal?: number;
}) => {
    const handleAdjust = (dir: number) => {
        const precision = step.toString().split('.')[1]?.length || 0;
        const next = parseFloat((val + (dir * step)).toFixed(precision));
        set(Math.max(min, Math.min(max, next)));
    };

    const isModified = defaultVal !== undefined && Math.abs(val - defaultVal) > 0.001;

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none">{label}</span>
                <div className="flex items-center gap-1.5">
                    {isModified && (
                        <button
                            type="button"
                            onClick={() => set(defaultVal)}
                            className="text-[9px] text-neutral-400 hover:text-primary dark:hover:text-emerald-400 transition-colors flex items-center gap-0.5"
                            title={`Reset to default (${defaultVal})`}
                        >
                            <RotateCcw className="h-2.5 w-2.5" />
                        </button>
                    )}
                    <span className="text-[10px] font-black text-primary dark:text-emerald-400 min-w-[32px] text-right leading-none">{disp}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleAdjust(-1)}
                    className="!min-h-0 !w-6 !h-6 !p-0 !rounded-lg !bg-gray-50 dark:!bg-white/5 !border !border-gray-200/50 dark:!border-white/5 !text-gray-500 hover:!text-gray-900 dark:hover:!text-white active:!scale-90"
                    icon={<Minus className="h-2.5 w-2.5" />}
                />

                <input type="range" min={min} max={max} step={step} value={val}
                    onChange={e => set(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-gray-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-primary" />

                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleAdjust(1)}
                    className="!min-h-0 !w-6 !h-6 !p-0 !rounded-lg !bg-gray-50 dark:!bg-white/5 !border !border-gray-200/50 dark:!border-white/5 !text-gray-500 hover:!text-gray-900 dark:hover:!text-white active:!scale-90"
                    icon={<Plus className="h-2.5 w-2.5" />}
                />
            </div>
        </div>
    );
};

interface BarcodeDimensionsSectionProps {
    settings: any;
}

export function BarcodeDimensionsSection({ settings }: BarcodeDimensionsSectionProps) {
    const {
        contentScale, setContentScale,
        barcodeZoom, setBarcodeZoom,
        showBarcode, barcodeScale, setBarcodeScale,
        barcodeHeight, setBarcodeHeight,
        barcodeBarWidth, setBarcodeBarWidth,
        showQr, qrSize, setQrSize,
        barcodeFontSize, setBarcodeFontSize,
        labelPadding, setLabelPadding,
        marginX, setMarginX,
        marginY, setMarginY,
        gapX, setGapX,
        gapY, setGapY,
        resetDimensionsToDefault
    } = settings;

    const handleResetAll = () => {
        if (typeof resetDimensionsToDefault === 'function') {
            resetDimensionsToDefault();
        } else {
            setContentScale(DEFAULT_BARCODE_DIMENSIONS.contentScale);
            setBarcodeZoom(DEFAULT_BARCODE_DIMENSIONS.barcodeZoom);
            setBarcodeScale(DEFAULT_BARCODE_DIMENSIONS.barcodeScale);
            setBarcodeHeight(DEFAULT_BARCODE_DIMENSIONS.barcodeHeight);
            setBarcodeBarWidth(DEFAULT_BARCODE_DIMENSIONS.barcodeBarWidth);
            setQrSize(DEFAULT_BARCODE_DIMENSIONS.qrSize);
            setBarcodeFontSize(DEFAULT_BARCODE_DIMENSIONS.barcodeFontSize);
            setLabelPadding(DEFAULT_BARCODE_DIMENSIONS.labelPadding);
            setMarginX(DEFAULT_BARCODE_DIMENSIONS.marginX);
            setMarginY(DEFAULT_BARCODE_DIMENSIONS.marginY);
            setGapX(DEFAULT_BARCODE_DIMENSIONS.gapX);
            setGapY(DEFAULT_BARCODE_DIMENSIONS.gapY);
        }
    };

    return (
        <section className="border-t border-gray-200 dark:border-white/5 pt-3 pb-1">
            <div className="flex items-center justify-between mb-2.5">
                <SectionTitle className="!mb-0">Barcode Dimensions</SectionTitle>
                <button
                    type="button"
                    onClick={handleResetAll}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded hover:bg-neutral-100 dark:hover:bg-white/[0.06] transition-colors"
                    title="Reset all dimensions to default"
                >
                    <RotateCcw className="h-2.5 w-2.5" />
                    <span>Reset Default</span>
                </button>
            </div>
            <div className="space-y-3">
                <SliderRow label={"Overall Content Scale"} disp={contentScale.toFixed(2) + 'x'} min={0.3} max={3.0} step={0.05} val={contentScale} set={setContentScale} defaultVal={DEFAULT_BARCODE_DIMENSIONS.contentScale} />
                <SliderRow label={"Barcode Zoom"} disp={barcodeZoom.toFixed(2) + 'x'} min={0.5} max={3.0} step={0.05} val={barcodeZoom} set={setBarcodeZoom} defaultVal={DEFAULT_BARCODE_DIMENSIONS.barcodeZoom} />
                {showBarcode && (
                    <>
                        <SliderRow label={"Barcode Width"} disp={barcodeScale.toFixed(1) + 'x'} min={0.5} max={3} step={0.1} val={barcodeScale} set={setBarcodeScale} defaultVal={DEFAULT_BARCODE_DIMENSIONS.barcodeScale} />
                        <SliderRow label={"Barcode Height"} disp={barcodeHeight + 'px'} min={15} max={80} step={5} val={barcodeHeight} set={v => setBarcodeHeight(Math.round(v))} defaultVal={DEFAULT_BARCODE_DIMENSIONS.barcodeHeight} />
                        <SliderRow label={"Bar Thickness"} disp={barcodeBarWidth.toFixed(1)} min={0.5} max={5.0} step={0.1} val={barcodeBarWidth} set={setBarcodeBarWidth} defaultVal={DEFAULT_BARCODE_DIMENSIONS.barcodeBarWidth} />
                    </>
                )}
                {showQr && (
                    <SliderRow label={"QR Size"} disp={qrSize + 'px'} min={15} max={200} step={5} val={qrSize} set={v => setQrSize(Math.round(v))} defaultVal={DEFAULT_BARCODE_DIMENSIONS.qrSize} />
                )}
                <SliderRow label={"Number Size"} disp={barcodeFontSize + 'px'} min={5} max={30} step={1} val={barcodeFontSize} set={v => setBarcodeFontSize(Math.round(v))} defaultVal={DEFAULT_BARCODE_DIMENSIONS.barcodeFontSize} />
                <SliderRow label={"Cell Padding"} disp={labelPadding + 'px'} min={0} max={20} step={1} val={labelPadding} set={v => setLabelPadding(Math.round(v))} defaultVal={DEFAULT_BARCODE_DIMENSIONS.labelPadding} />
                <SliderRow label={"Margin X"} disp={marginX + 'px'} min={-50} max={50} step={1} val={marginX} set={v => setMarginX(Math.round(v))} defaultVal={DEFAULT_BARCODE_DIMENSIONS.marginX} />
                <SliderRow label={"Margin Y"} disp={marginY + 'px'} min={-50} max={50} step={1} val={marginY} set={v => setMarginY(Math.round(v))} defaultVal={DEFAULT_BARCODE_DIMENSIONS.marginY} />
                <SliderRow label={"Gap X"} disp={gapX + 'px'} min={0} max={50} step={1} val={gapX} set={v => setGapX(Math.round(v))} defaultVal={DEFAULT_BARCODE_DIMENSIONS.gapX} />
                <SliderRow label={"Gap Y"} disp={gapY + 'px'} min={0} max={50} step={1} val={gapY} set={v => setGapY(Math.round(v))} defaultVal={DEFAULT_BARCODE_DIMENSIONS.gapY} />
            </div>

            <div className="pt-3">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetAll}
                    className="w-full !h-8 !text-[11px] !font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center justify-center gap-1.5"
                >
                    <RotateCcw className="h-3 w-3" />
                    Reset Dimensions to Default
                </Button>
            </div>
        </section>
    );
}
