import React from 'react';
import { Minus, Plus, X, Package, Sparkles, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { ProductThumb } from '../../../shared/ui/ProductThumb';
import { Product } from '../../../types';
import { SectionTitle } from './BarcodeDimensionsSection';

interface BarcodeQuantitiesSectionProps {
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

export function BarcodeQuantitiesSection({
    localProducts,
    setLocalProducts,
    quantities,
    setQuantities,
    updateQty,
    setGlobalQty,
    onClearAll,
    unprintedMap,
    onLoadUnprinted
}: BarcodeQuantitiesSectionProps) {
    const totalUnprinted = localProducts.reduce((sum, p) => sum + (unprintedMap[p.id] || 0), 0);

    return (
        <section className="border-t border-neutral-200 dark:border-white/[0.08] pt-3">
            <div className="flex items-center justify-between mb-2">
                <SectionTitle>Print Quantities</SectionTitle>
                <div className="flex items-center gap-1 -mt-2.5 flex-wrap justify-end">
                    <Button
                        variant="ghost"
                        onClick={onLoadUnprinted}
                        title="Auto-load unprinted received stock batches"
                        className="!min-h-0 !px-2 !py-0.5 !rounded !text-[11px] !font-semibold !normal-case !tracking-normal !bg-emerald-50 hover:!bg-emerald-100 dark:!bg-emerald-500/10 dark:hover:!bg-emerald-500/20 !text-emerald-700 dark:!text-emerald-400 !border !border-emerald-300/60 dark:!border-emerald-500/30"
                    >
                        <Sparkles className="h-3 w-3 mr-1 inline" />
                        <span>Auto Unprinted{totalUnprinted > 0 ? ` (${totalUnprinted})` : ''}</span>
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            const q: Record<string, number> = {};
                            localProducts.forEach(p => { q[p.id] = 1; });
                            setQuantities(q);
                        }}
                        title="Reset all quantities to 1"
                        className="!min-h-0 !px-1.5 !py-0.5 !rounded !text-[11px] !font-medium !normal-case !tracking-normal !bg-neutral-100 dark:!bg-white/5 !text-neutral-600 dark:!text-neutral-400"
                    >
                        <RotateCcw className="h-2.5 w-2.5 mr-0.5 inline" />
                        1x
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            const v = prompt('Copies for all:', '5');
                            if (v) {
                                const n = parseInt(v);
                                if (!isNaN(n)) setGlobalQty(n);
                            }
                        }}
                        className="!min-h-0 !px-2 !py-0.5 !rounded !text-[11px] !font-medium !normal-case !tracking-normal"
                    >
                        Set All
                    </Button>
                    {onClearAll && (
                        <Button
                            variant="ghost"
                            onClick={onClearAll}
                            title="Clear all selected items"
                            className="!min-h-0 !px-1.5 !py-0.5 !rounded !text-[11px] !font-medium !normal-case !tracking-normal !text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10"
                        >
                            <Trash2 className="h-2.5 w-2.5 mr-0.5 inline" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5 custom-scrollbar">
                {localProducts.map(p => {
                    const unprinted = unprintedMap[p.id] || 0;
                    return (
                        <div
                            key={p.id}
                            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.05] transition-colors group/item"
                        >
                            <Button
                                variant="ghost"
                                onClick={() => setLocalProducts(localProducts.filter(x => x.id !== p.id))}
                                className="!min-h-0 !p-1 !rounded !bg-transparent !text-neutral-400 hover:!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10 flex-shrink-0"
                                icon={<X className="h-3.5 w-3.5" />}
                            />

                            <div className="w-8 h-8 rounded bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/[0.08] overflow-hidden flex-shrink-0 flex items-center justify-center">
                                <ProductThumb
                                    image={p.image}
                                    alt={p.name}
                                    imgClassName="w-full h-full object-cover"
                                    fallback={<Package className="h-3.5 w-3.5 text-neutral-400" />}
                                />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-medium text-neutral-900 dark:text-white truncate leading-tight" title={p.name}>
                                    {p.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="text-[10px] text-neutral-500 font-mono leading-tight">
                                        {p.barcodeValue || p.barcode || p.sku || 'NO-SKU'}
                                    </span>
                                    {unprinted > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setQuantities(q => ({ ...q, [p.id]: unprinted }))}
                                            title="Click to set quantity to unprinted batch amount"
                                            className="text-[9px] px-1 py-0.2 rounded font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                                        >
                                            +{unprinted} unprinted
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center bg-white dark:bg-surface rounded border border-neutral-200 dark:border-white/[0.08] p-0.5 flex-shrink-0">
                                <Button
                                    variant="ghost"
                                    onClick={() => updateQty(p.id, -1)}
                                    className="!min-h-0 !w-5 !h-5 !p-0 !rounded-sm !bg-transparent !text-neutral-500 hover:!text-rose-500"
                                    icon={<Minus className="h-2.5 w-2.5" />}
                                />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={quantities[p.id] !== undefined ? quantities[p.id] : 0}
                                    onChange={e => {
                                        let str = e.target.value.replace(/^0+/, '');
                                        if (str === '') str = '0';
                                        const v = Math.max(0, Math.min(999, parseInt(str) || 0));
                                        setQuantities(q => ({ ...q, [p.id]: v }));
                                    }}
                                    className="w-9 text-center text-[12px] font-mono font-medium bg-transparent border-none focus:ring-0 text-neutral-900 dark:text-white p-0 [appearance:textfield]"
                                />
                                <Button
                                    variant="ghost"
                                    onClick={() => updateQty(p.id, 1)}
                                    className="!min-h-0 !w-5 !h-5 !p-0 !rounded-sm !bg-transparent !text-neutral-500 hover:!text-emerald-500"
                                    icon={<Plus className="h-2.5 w-2.5" />}
                                />
                            </div>
                        </div>
                    );
                })}
                {localProducts.length === 0 && (
                    <div className="text-center py-4 text-neutral-400 text-[12px]">
                        No Products Selected
                    </div>
                )}
            </div>
        </section>
    );
}
