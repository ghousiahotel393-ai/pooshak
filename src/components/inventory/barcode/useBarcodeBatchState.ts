import { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../../../types';
import { sonner } from '../../../lib/sonner';
import { calculateUnprintedQuantities } from '../../../lib/services/inventory/barcodePrintTracker';

export let persistedBarcodeProducts: Product[] = [];
export let persistedBarcodeQuantities: Record<string, number> = {};

export function clearPersistedBarcodeState() {
  persistedBarcodeProducts = [];
  persistedBarcodeQuantities = {};
}

interface UseBarcodeBatchStateProps {
  products: Product[];
  onProductsChange?: (nextProducts: Product[]) => void;
  onClearAll?: () => void;
}

export function useBarcodeBatchState({ products, onProductsChange, onClearAll }: UseBarcodeBatchStateProps) {
  const [localProducts, setLocalProducts] = useState<Product[]>(() => {
    return persistedBarcodeProducts.length > 0 ? persistedBarcodeProducts : products;
  });

  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    if (Object.keys(persistedBarcodeQuantities).length > 0) return persistedBarcodeQuantities;
    try {
      const saved = localStorage.getItem('barcode_selected_quantities');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [unprintedMap, setUnprintedMap] = useState<Record<string, number>>({});

  const refreshUnprinted = useCallback(async (prods: Product[]) => {
    if (prods.length === 0) return;
    const unprinted = await calculateUnprintedQuantities(prods);
    setUnprintedMap(unprinted);
  }, []);

  useEffect(() => {
    refreshUnprinted(localProducts);
  }, [localProducts, refreshUnprinted]);

  useEffect(() => {
    persistedBarcodeProducts = localProducts;
    persistedBarcodeQuantities = quantities;
    try {
      localStorage.setItem('barcode_selected_quantities', JSON.stringify(quantities));
    } catch {}
    if (onProductsChange) onProductsChange(localProducts);
  }, [localProducts, quantities, onProductsChange]);

  useEffect(() => {
    if (products.length > 0 && localProducts.length === 0) {
      setLocalProducts(products);
    }
  }, [products, localProducts.length]);

  const seededRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const present = new Set(localProducts.map(p => p.id));
    for (const id of Array.from(seededRef.current)) {
      if (!present.has(id)) seededRef.current.delete(id);
    }
    setQuantities(prev => {
      const next = { ...prev };
      let changed = false;
      for (const p of localProducts) {
        if (seededRef.current.has(p.id)) continue;
        if (prev[p.id] !== undefined) { seededRef.current.add(p.id); continue; }
        if (p.id in unprintedMap) {
          const u = unprintedMap[p.id];
          next[p.id] = u > 0 ? u : 1;
          seededRef.current.add(p.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [localProducts, unprintedMap]);

  const updateQty = (id: string, d: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] !== undefined ? prev[id] : 1) + d)
    }));
  };

  const setGlobalQty = (qty: number) => {
    const q: Record<string, number> = {};
    localProducts.forEach(p => { q[p.id] = Math.max(0, qty); });
    setQuantities(q);
  };

  const handleLoadUnprinted = () => {
    setQuantities(prev => {
      const next = { ...prev };
      localProducts.forEach(p => {
        const unprinted = unprintedMap[p.id];
        next[p.id] = (unprinted !== undefined && unprinted > 0) ? unprinted : (prev[p.id] || 1);
      });
      return next;
    });
    sonner.success('Loaded unprinted batch quantities!');
  };

  const handleClearAll = () => {
    setLocalProducts([]);
    setQuantities({});
    clearPersistedBarcodeState();
    try {
      localStorage.removeItem('barcode_selected_product_ids');
      localStorage.removeItem('barcode_selected_quantities');
    } catch {}
    if (onClearAll) onClearAll();
    if (onProductsChange) onProductsChange([]);
    sonner.success('Cleared all items & quantities');
  };

  return {
    localProducts,
    setLocalProducts,
    quantities,
    setQuantities,
    unprintedMap,
    refreshUnprinted,
    updateQty,
    setGlobalQty,
    handleLoadUnprinted,
    handleClearAll,
  };
}
