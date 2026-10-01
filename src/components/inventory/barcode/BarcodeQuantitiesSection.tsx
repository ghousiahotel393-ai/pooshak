import React, { useState } from 'react';
import { Minus, Plus, X, Package } from 'lucide-react';
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
    // Everything in this section operates ONLY on `localProducts` — the products
    // ticked in the products table and passed into this engine. It never reads or
    // writes the global catalog.
    const selectedCount = localProducts.length;
    const hasSelection = selectedCount > 0;
    const totalUnprinted = localProducts.reduce((sum, p) => sum + (unprintedMap[p.id] || 0), 0);

    // Inline value for "Set all selected" (replaces the old prompt() popup).
    const [bulkQty, setBulkQty] = useState('5');
    const applyBulk = () => {
        const n = Math.max(0, Math.min(999, parseInt(bulkQty, 10) || 0));
        setGlobalQty(n);
    };
    const resetToOne = () => {
        const q: Record<string, number> = {};
        localProducts.forEach(p => { q[p.id] = 1; });
        setQuantities(q);
    };

    // Shared control classes — one radius, one font size/weight, equal height (44px touch).
    const ctrlBase = 'h-11 inline-flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none select-none';
    const ctrlOutline = `${ctrlBase} px-3 border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/[0.05]`;

    return (
        <section className="border-t border-neutral-200 dark:border-white/[0.08] pt-3">
            {/* Header: label on its own line + live selected count */}
            <div className="flex items-center justify-between mb-2.5">
                <SectionTitle>Print Quantities</SectionTitle>
                <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 tabular-nums">
                    {selectedCount} selected
                </span>
            </div>

            {/* Toolbar — equal-height controls, 2-column grid so nothing wraps unevenly */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={onLoadUnprinted}
                    disabled={!hasSelection}
                    title="Set each selected product's quantity to its own unprinted count"
                    className={`${ctrlOutline} col-span-2`}
                >
                    <span className="truncate">Unprinted</span>
                    {totalUnprinted > 0 && (
                        <span className="tabular-nums text-neutral-500 dark:text-neutral-400">({totalUnprinted})</span>
                    )}
                </button>

                <input
                    type="text"
                    inputMode="numeric"
                    value={bulkQty}
                    onChange={e => {
                        const str = e.target.value.replace(/[^0-9]/g, '');
                        setBulkQty(str);
                    }}
                    onBlur={() => { if (bulkQty === '') setBulkQty('1'); }}
                    disabled={!hasSelection}
                    aria-label="Quantity to set for all selected products"
                    className={`${ctrlBase} w-full border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] text-center tabular-nums text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield]`}
                />
                <button
                    type="button"
                    onClick={applyBulk}
                    disabled={!hasSelection}
                    title="Apply this quantity to every selected product"
                    className={`${ctrlBase} px-3 bg-primary text-white hover:opacity-90`}
                >
                    Set all selected
                </button>

                <button
                    type="button"
                    onClick={resetToOne}
                    disabled={!hasSelection}
                    title="Reset selected products to 1 each"
                    className={`${ctrlBase} px-3 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/[0.05] ${onClearAll ? '' : 'col-span-2'}`}
                >
                    Reset
                </button>
                {onClearAll && (
                    <button
                        type="button"
                        onClick={onClearAll}
                        disabled={!hasSelection}
                        title="Clear quantities for selected products"
                        className={`${ctrlBase} px-3 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10`}
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Tile list — scrollable box so products don't stretch the whole sidebar */}
            <div className="space-y-1.5 mt-3 max-h-64 sm:max-h-72 overflow-y-auto pr-1 overscroll-contain">
                {localProducts.map(p => {
                    const unprinted = unprintedMap[p.id] || 0;
                    const qty = quantities[p.id] !== undefined ? quantities[p.id] : 0;
                    return (
                        <div
                            key={p.id}
                            className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02]"
                        >
                            <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/[0.08] overflow-hidden flex-shrink-0 flex items-center justify-center">
                                <ProductThumb
                                    image={p.image}
                                    alt={p.name}
                                    imgClassName="w-full h-full object-cover"
                                    fallback={<Package className="h-3.5 w-3.5 text-neutral-400" />}
                                />
                            </div>

                            <div className="min-w-0 flex-1">
                                {/* Full title, no truncation — wraps onto as many lines as needed */}
                                <p className="text-[13px] font-medium text-neutral-900 dark:text-white leading-snug break-words">
                                    {p.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                    <span className="text-[11px] text-neutral-500 font-mono">
                                        {p.barcodeValue || p.barcode || p.sku || 'NO-SKU'}
                                    </span>
                                    {unprinted > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setQuantities(q => ({ ...q, [p.id]: unprinted }))}
                                            title="Set this product's quantity to its unprinted count"
                                            className="inline-flex items-center whitespace-nowrap text-[10px] px-1.5 py-0.5 rounded-md font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition active:scale-95"
                                        >
                                            +{unprinted} unprinted
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Right column: remove-x on top, stepper below — never pushes the name content */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setLocalProducts(localProducts.filter(x => x.id !== p.id))}
                                    title="Remove from list"
                                    className="p-1 -mr-1 -mt-1 rounded-md text-neutral-300 dark:text-neutral-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition active:scale-90"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>

                                <div className="flex items-center rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-surface overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => updateQty(p.id, -1)}
                                        aria-label="Decrease quantity"
                                        className="w-8 h-11 inline-flex items-center justify-center text-neutral-500 hover:text-rose-500 hover:bg-neutral-50 dark:hover:bg-white/5 transition active:scale-90"
                                    >
                                        <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={qty}
                                        onChange={e => {
                                            let str = e.target.value.replace(/^0+/, '');
                                            if (str === '') str = '0';
                                            const v = Math.max(0, Math.min(999, parseInt(str, 10) || 0));
                                            setQuantities(q => ({ ...q, [p.id]: v }));
                                        }}
                                        aria-label={`Quantity for ${p.name}`}
                                        className="w-9 h-11 text-center text-[13px] font-medium tabular-nums bg-transparent border-x border-neutral-200 dark:border-white/[0.08] focus:outline-none focus:ring-0 text-neutral-900 dark:text-white p-0 [appearance:textfield]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => updateQty(p.id, 1)}
                                        aria-label="Increase quantity"
                                        className="w-8 h-11 inline-flex items-center justify-center text-neutral-500 hover:text-emerald-500 hover:bg-neutral-50 dark:hover:bg-white/5 transition active:scale-90"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {!hasSelection && (
                    <div className="text-center py-6 text-neutral-400 text-[12px]">
                        No products selected
                    </div>
                )}
            </div>
        </section>
    );
}
