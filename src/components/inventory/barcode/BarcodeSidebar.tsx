import React from 'react';
import { Save, Layout } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { SearchableSelect } from '../../../shared/ui/SearchableSelect';
import { Product } from '../../../types';
import type { PaperSize } from './BarcodeCardView';
import { SectionTitle, SliderRow, BarcodeDimensionsSection } from './BarcodeDimensionsSection';
import { BarcodeQuantitiesSection } from './BarcodeQuantitiesSection';

interface BarcodeSidebarProps {
    settings: any;
    localProducts: Product[];
    setLocalProducts: (products: Product[]) => void;
    quantities: Record<string, number>;
    setQuantities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    updateQty: (id: string, d: number) => void;
    setGlobalQty: (v: number) => void;
    onClearAll?: () => void;
    unprintedMap: Record<string, number>;
    onLoadUnprinted: () => void;
}

export function BarcodeSidebar({
    settings,
    localProducts,
    setLocalProducts,
    quantities,
    setQuantities,
    updateQty,
    setGlobalQty,
    onClearAll,
    unprintedMap,
    onLoadUnprinted
}: BarcodeSidebarProps) {
    const {
        paperSize, setPaperSize,
        a4Columns, setA4Columns,
        a4Rows, setA4Rows,
        showPrice, setShowPrice,
        showName, setShowName,
        showSku, setShowSku,
        showCategory, setShowCategory,
        labelBorder, setLabelBorder,
        showBarcode, setShowBarcode,
        showQr, setShowQr,
        nameLines, setNameLines,
        isSaving, saveAsDefault
    } = settings;

    return (
        <div className="
            w-full lg:w-72 xl:w-80
            flex flex-col
            bg-white dark:bg-surface
            border-t lg:border-t-0 lg:border-r border-gray-200 dark:border-white/5
            order-2 lg:order-1
            overflow-hidden
            flex-1 lg:flex-none lg:h-full
        ">
            <div className="flex-1 overflow-y-auto px-4 py-3 pb-12 space-y-4 scrollbar-hide min-h-0">

                <section>
                    <SectionTitle>Layout Configuration</SectionTitle>
                    <div className="space-y-3">
                        <div>
                            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wide">Symbols</span>
                            <div className="grid grid-cols-2 gap-1.5 mt-1">
                                <button
                                    onClick={() => setShowBarcode(!showBarcode)}
                                    className={`h-8 text-[11px] font-mono rounded transition-colors border ${showBarcode ? 'bg-primary/10 border-primary text-primary dark:text-emerald-400 font-medium' : 'bg-white dark:bg-white/[0.02] border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400'}`}
                                >
                                    Barcode
                                </button>
                                <button
                                    onClick={() => setShowQr(!showQr)}
                                    className={`h-8 text-[11px] font-mono rounded transition-colors border ${showQr ? 'bg-primary/10 border-primary text-primary dark:text-emerald-400 font-medium' : 'bg-white dark:bg-white/[0.02] border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400'}`}
                                >
                                    QR Code
                                </button>
                            </div>
                        </div>

                        <div>
                            <span className="text-[9px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Paper Type</span>
                            <div className="mt-1 relative z-30">
                                <SearchableSelect
                                    options={[
                                        { id: 'A4', label: "Standard A4 Sheet" },
                                        { id: 'Thermal-50x25', label: "Thermal 50x25" },
                                        { id: 'Thermal-40x30', label: "Thermal 40x30" },
                                        { id: 'Thermal-50x30', label: "Thermal 50x30" },
                                        { id: 'Thermal-50x40', label: "Thermal 50x40" },
                                        { id: 'Thermal-60x40', label: "Thermal 60x40" },
                                        { id: 'Thermal-80x40', label: "Thermal 80x40" },
                                        { id: 'Thermal-80x50', label: "Thermal 80x50" }
                                    ]}
                                    value={paperSize}
                                    onChange={(val) => setPaperSize(val as PaperSize)}
                                    placeholder={"Select Size..."}
                                    icon={Layout}
                                />
                            </div>
                        </div>

                        {paperSize === 'A4' && (
                            <>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Columns</span>
                                        <span className="text-[10px] font-black text-primary dark:text-emerald-400">{a4Columns}</span>
                                    </div>
                                    <div className="flex bg-neutral-100 dark:bg-white/[0.05] p-0.5 rounded-md border border-neutral-200 dark:border-white/[0.08]">
                                        {[2, 3, 4, 5, 6].map(n => (
                                            <button
                                                key={n}
                                                onClick={() => setA4Columns(n)}
                                                className={`flex-1 py-1 text-[12px] font-mono font-medium rounded transition-colors ${a4Columns === n ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <SliderRow
                                    label={"Rows per Page"}
                                    disp={String(a4Rows)}
                                    min={3}
                                    max={20}
                                    step={1}
                                    val={a4Rows}
                                    set={v => setA4Rows(Math.round(v))}
                                />
                                <p className="text-[11px] text-neutral-500 italic -mt-1">Labels auto-scale to fit rows & columns</p>
                            </>
                        )}
                    </div>
                </section>

                <BarcodeQuantitiesSection
                    localProducts={localProducts}
                    setLocalProducts={setLocalProducts}
                    quantities={quantities}
                    setQuantities={setQuantities}
                    updateQty={updateQty}
                    setGlobalQty={setGlobalQty}
                    onClearAll={onClearAll}
                    unprintedMap={unprintedMap}
                    onLoadUnprinted={onLoadUnprinted}
                />

                <section className="border-t border-neutral-200 dark:border-white/[0.08] pt-3">
                    <SectionTitle>Content Options</SectionTitle>
                    <div className="grid grid-cols-3 gap-1.5">
                        {([
                            { label: "Name", val: Boolean(showName), set: setShowName },
                            { label: "Price", val: Boolean(showPrice), set: setShowPrice },
                            { label: "SKU", val: Boolean(showSku), set: setShowSku },
                            { label: "Category", val: Boolean(showCategory), set: setShowCategory },
                            { label: "Border", val: Boolean(labelBorder), set: setLabelBorder },
                        ] as const).map(({ label, val, set }) => (
                            <button
                                key={label}
                                onClick={() => (set as any)(!val)}
                                className={`py-1 rounded border text-[11px] font-medium transition-colors ${val
                                    ? 'bg-primary/10 border-primary/30 text-emerald-400'
                                    : 'bg-white dark:bg-white/[0.02] border-neutral-200 dark:border-white/[0.08] text-neutral-600 dark:text-neutral-400'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {showName && (
                        <div className="mt-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">Name Lines</span>
                                <span className="text-[11px] font-mono text-primary">{nameLines} {nameLines > 1 ? "Lines" : "Line"}</span>
                            </div>
                            <div className="flex bg-neutral-100 dark:bg-white/[0.05] p-0.5 rounded-md border border-neutral-200 dark:border-white/[0.08]">
                                {([1, 2, 3] as const).map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setNameLines(n as any)}
                                        className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors ${nameLines === n ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'}`}
                                    >
                                        {n} {n > 1 ? "Lines" : "Line"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                <BarcodeDimensionsSection settings={settings} />
            </div>

            <div className="flex-shrink-0 relative z-10 px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-surface border-t border-neutral-200 dark:border-white/[0.08] shadow-none">
                <Button
                    variant="primary"
                    size="sm"
                    onClick={saveAsDefault}
                    disabled={isSaving}
                    className="w-full"
                >
                    {isSaving
                        ? <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : <Save className="h-3.5 w-3.5" />}
                    {isSaving ? "Saving..." : "Save Settings"}
                </Button>
            </div>
        </div>
    );
}

export { SectionTitle, SliderRow };
