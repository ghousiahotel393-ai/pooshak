import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '../../../shared/ui';

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[9px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest mb-2.5">{children}</p>
);

export const SliderRow = ({ label, disp, min, max, step, val, set }: {
    label: string; disp: string; min: number; max: number; step: number; val: number; set: (v: number) => void;
}) => {
    const handleAdjust = (dir: number) => {
        const precision = step.toString().split('.')[1]?.length || 0;
        const next = parseFloat((val + (dir * step)).toFixed(precision));
        set(Math.max(min, Math.min(max, next)));
    };

    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none">{label}</span>
                <span className="text-[10px] font-black text-primary dark:text-emerald-400 min-w-[32px] text-right leading-none">{disp}</span>
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
        gapY, setGapY
    } = settings;

    return (
        <section className="border-t border-gray-200 dark:border-white/5 pt-3 pb-1">
            <SectionTitle>Barcode Dimensions</SectionTitle>
            <div className="space-y-3">
                <SliderRow label={"Overall Content Scale"} disp={contentScale.toFixed(2) + 'x'} min={0.3} max={3.0} step={0.05} val={contentScale} set={setContentScale} />
                <SliderRow label={"Barcode Zoom"} disp={barcodeZoom.toFixed(2) + 'x'} min={0.5} max={3.0} step={0.05} val={barcodeZoom} set={setBarcodeZoom} />
                {showBarcode && (
                    <>
                        <SliderRow label={"Barcode Width"} disp={barcodeScale.toFixed(1) + 'x'} min={0.5} max={3} step={0.1} val={barcodeScale} set={setBarcodeScale} />
                        <SliderRow label={"Barcode Height"} disp={barcodeHeight + 'px'} min={15} max={80} step={5} val={barcodeHeight} set={v => setBarcodeHeight(Math.round(v))} />
                        <SliderRow label={"Bar Thickness"} disp={barcodeBarWidth.toFixed(1)} min={0.5} max={5.0} step={0.1} val={barcodeBarWidth} set={setBarcodeBarWidth} />
                    </>
                )}
                {showQr && (
                    <SliderRow label={"QR Size"} disp={qrSize + 'px'} min={15} max={200} step={5} val={qrSize} set={v => setQrSize(Math.round(v))} />
                )}
                <SliderRow label={"Number Size"} disp={barcodeFontSize + 'px'} min={5} max={30} step={1} val={barcodeFontSize} set={v => setBarcodeFontSize(Math.round(v))} />
                <SliderRow label={"Cell Padding"} disp={labelPadding + 'px'} min={0} max={20} step={1} val={labelPadding} set={v => setLabelPadding(Math.round(v))} />
                <SliderRow label={"Margin X"} disp={marginX + 'px'} min={-50} max={50} step={1} val={marginX} set={v => setMarginX(Math.round(v))} />
                <SliderRow label={"Margin Y"} disp={marginY + 'px'} min={-50} max={50} step={1} val={marginY} set={v => setMarginY(Math.round(v))} />
                <SliderRow label={"Gap X"} disp={gapX + 'px'} min={0} max={50} step={1} val={gapX} set={v => setGapX(Math.round(v))} />
                <SliderRow label={"Gap Y"} disp={gapY + 'px'} min={0} max={50} step={1} val={gapY} set={v => setGapY(Math.round(v))} />
            </div>
        </section>
    );
}
