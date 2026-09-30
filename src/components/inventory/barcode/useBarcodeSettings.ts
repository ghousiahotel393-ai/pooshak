import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../../stores';
import { settingsService } from '../../../lib/services';
import { sonner } from '../../../lib/sonner';
import { AppSettings } from '../../../types';
import type { PaperSize } from './BarcodeCard';

const STORAGE_KEY = 'barcode_generator_settings';

const getStoredSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const toBool = (val: any, fallback: boolean): boolean => {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  if (typeof val === 'string') return val === 'true' || val === '1';
  return Boolean(val);
};

export const DEFAULT_BARCODE_DIMENSIONS = {
  contentScale: 1.0,
  barcodeZoom: 1.0,
  barcodeScale: 1.0,
  barcodeHeight: 30,
  barcodeBarWidth: 1.1,
  qrSize: 30,
  barcodeFontSize: 8,
  labelPadding: 8,
  marginX: 0,
  marginY: 0,
  gapX: 0,
  gapY: 0,
};

export function useBarcodeSettings() {
  const appSettings = useSettingsStore(s => s.settings);
  const stored = getStoredSettings() || {};

  const [paperSize, setPaperSize] = useState<PaperSize>(stored.paperSize || (appSettings.barcodePaperSize as PaperSize) || 'A4');
  const [a4Columns, setA4Columns] = useState<number>(stored.a4Columns ?? appSettings.barcodeA4Columns ?? 3);
  const [a4Rows, setA4Rows] = useState<number>(stored.a4Rows ?? appSettings.barcodeA4Rows ?? 10);
  const [showPrice, setShowPrice] = useState<boolean>(toBool(stored.showPrice ?? appSettings.barcodeShowPrice, true));
  const [showName, setShowName] = useState<boolean>(toBool(stored.showName ?? appSettings.barcodeShowName, true));
  const [showSku, setShowSku] = useState<boolean>(toBool(stored.showSku ?? appSettings.barcodeShowSku, false));
  const [showCategory, setShowCategory] = useState<boolean>(toBool(stored.showCategory ?? appSettings.barcodeShowCategory, false));
  const [barcodeScale, setBarcodeScale] = useState<number>(stored.barcodeScale ?? appSettings.barcodeScale ?? DEFAULT_BARCODE_DIMENSIONS.barcodeScale);
  const [barcodeHeight, setBarcodeHeight] = useState<number>(stored.barcodeHeight ?? appSettings.barcodeHeight ?? DEFAULT_BARCODE_DIMENSIONS.barcodeHeight);
  const [labelPadding, setLabelPadding] = useState<number>(stored.labelPadding ?? appSettings.barcodePadding ?? DEFAULT_BARCODE_DIMENSIONS.labelPadding);
  const [labelBorder, setLabelBorder] = useState<boolean>(toBool(stored.labelBorder ?? appSettings.barcodeBorder, true));
  const [showBarcode, setShowBarcode] = useState<boolean>(toBool(stored.showBarcode ?? appSettings.barcodeShowBarcode, true));
  const [showQr, setShowQr] = useState<boolean>(toBool(stored.showQr ?? appSettings.barcodeShowQr, false));
  const [qrSize, setQrSize] = useState<number>(stored.qrSize ?? appSettings.barcodeQrSize ?? DEFAULT_BARCODE_DIMENSIONS.qrSize);
  const [nameLines, setNameLines] = useState<1 | 2 | 3>(stored.nameLines ?? (appSettings.barcodeNameLines as 1 | 2 | 3) ?? 2);
  const [barcodeFontSize, setBarcodeFontSize] = useState<number>(stored.barcodeFontSize ?? appSettings.barcodeFontSize ?? DEFAULT_BARCODE_DIMENSIONS.barcodeFontSize);
  const [contentScale, setContentScale] = useState<number>(stored.contentScale ?? appSettings.barcodeContentScale ?? DEFAULT_BARCODE_DIMENSIONS.contentScale);
  const [marginX, setMarginX] = useState<number>(stored.marginX ?? appSettings.barcodeMarginX ?? DEFAULT_BARCODE_DIMENSIONS.marginX);
  const [marginY, setMarginY] = useState<number>(stored.marginY ?? appSettings.barcodeMarginY ?? DEFAULT_BARCODE_DIMENSIONS.marginY);
  const [gapX, setGapX] = useState<number>(stored.gapX ?? appSettings.barcodeGapX ?? DEFAULT_BARCODE_DIMENSIONS.gapX);
  const [gapY, setGapY] = useState<number>(stored.gapY ?? appSettings.barcodeGapY ?? DEFAULT_BARCODE_DIMENSIONS.gapY);
  const [barcodeBarWidth, setBarcodeBarWidth] = useState<number>(stored.barcodeBarWidth ?? appSettings.barcodeBarWidth ?? DEFAULT_BARCODE_DIMENSIONS.barcodeBarWidth);
  const [barcodeZoom, setBarcodeZoom] = useState<number>(stored.barcodeZoom ?? DEFAULT_BARCODE_DIMENSIONS.barcodeZoom);
  const [isSaving, setIsSaving] = useState(false);

  // Automatically persist all settings changes locally so they survive reload
  useEffect(() => {
    try {
      const stateToSave = {
        paperSize, a4Columns, a4Rows, showPrice, showName, showSku, showCategory,
        barcodeScale, barcodeHeight, labelPadding, labelBorder, showBarcode, showQr,
        qrSize, nameLines, barcodeFontSize, contentScale, marginX, marginY,
        gapX, gapY, barcodeBarWidth, barcodeZoom
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch {
      // Ignore quota errors
    }
  }, [
    paperSize, a4Columns, a4Rows, showPrice, showName, showSku, showCategory,
    barcodeScale, barcodeHeight, labelPadding, labelBorder, showBarcode, showQr,
    qrSize, nameLines, barcodeFontSize, contentScale, marginX, marginY,
    gapX, gapY, barcodeBarWidth, barcodeZoom
  ]);

  const saveAsDefault = async () => {
    try {
      setIsSaving(true);
      const s: Partial<AppSettings> = {
        barcodePaperSize: paperSize, barcodeA4Columns: a4Columns, barcodeA4Rows: a4Rows,
        barcodeShowPrice: showPrice, barcodeShowName: showName, barcodeShowSku: showSku,
        barcodeShowCategory: showCategory, barcodeScale, barcodeHeight,
        barcodePadding: labelPadding, barcodeBorder: labelBorder, 
        barcodeShowBarcode: showBarcode, barcodeShowQr: showQr, barcodeQrSize: qrSize,
        barcodeNameLines: nameLines, barcodeFontSize, barcodeContentScale: contentScale,
        barcodeMarginX: marginX, barcodeMarginY: marginY,
        barcodeGapX: gapX, barcodeGapY: gapY, barcodeBarWidth: barcodeBarWidth,
      };
      await settingsService.update(s);
      const prev = JSON.parse(localStorage.getItem('pos_advanced_settings') || '{}');
      localStorage.setItem('pos_advanced_settings', JSON.stringify({ ...prev, ...s }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...s, paperSize, a4Columns, a4Rows, showPrice, showName, showSku, showCategory,
        barcodeScale, barcodeHeight, labelPadding, labelBorder, showBarcode, showQr,
        qrSize, nameLines, barcodeFontSize, contentScale, marginX, marginY,
        gapX, gapY, barcodeBarWidth, barcodeZoom
      }));
      useSettingsStore.getState().setSettings(s);
      sonner.success('Settings saved as default!');
    } catch { sonner.error('Failed to save settings'); }
    finally { setIsSaving(false); }
  };

  const resetDimensionsToDefault = () => {
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
    sonner.success('Dimensions reset to default');
  };

  return {
    paperSize, setPaperSize,
    a4Columns, setA4Columns,
    a4Rows, setA4Rows,
    showPrice, setShowPrice,
    showName, setShowName,
    showSku, setShowSku,
    showCategory, setShowCategory,
    barcodeScale, setBarcodeScale,
    barcodeHeight, setBarcodeHeight,
    labelPadding, setLabelPadding,
    labelBorder, setLabelBorder,
    showBarcode, setShowBarcode,
    showQr, setShowQr,
    qrSize, setQrSize,
    nameLines, setNameLines,
    barcodeFontSize, setBarcodeFontSize,
    contentScale, setContentScale,
    marginX, setMarginX,
    marginY, setMarginY,
    gapX, setGapX,
    gapY, setGapY,
    barcodeBarWidth, setBarcodeBarWidth,
    barcodeZoom, setBarcodeZoom,
    isSaving, saveAsDefault,
    resetDimensionsToDefault,
    appSettings
  };
}
