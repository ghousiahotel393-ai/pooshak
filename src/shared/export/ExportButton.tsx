import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import { Button, BottomSheet } from '../ui';
import { AppIcons } from '../../lib/icons';
import { sonner } from '../../lib/sonner';
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  printReport,
  DEFAULT_BRAND,
  type ExportFormat,
  type ExportColumn,
  type ReportExportConfig,
} from './exportEngine';
import { useSettingsStore } from '../../stores';
import { getCurrencySymbol } from '../../lib/currencies';
import { PdfLayoutPicker } from './PdfLayoutPicker';

export interface ExportButtonProps {
  data: Record<string, any>[];
  columns: ExportColumn[];
  title: string;
  subtitle?: string;
  filtersSummary?: string;
  formats?: ExportFormat[];
  compact?: boolean;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  maxRows?: number;
  filename?: string;
  currencySymbol?: string;
  brand?: { name: string; logo?: string };
  paperSize?: string;
}

function resolveSelectedPaperSize(propSize?: string): string {
  if (propSize && propSize.trim()) return propSize.trim();
  const storeSettings = useSettingsStore.getState().settings || ({} as any);
  if (storeSettings.receiptPaperSize) {
    const s = String(storeSettings.receiptPaperSize).trim();
    if (s) return s;
  }
  try {
    const raw = localStorage.getItem('pos_hardware_printer_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.paperSize) return String(parsed.paperSize).trim();
    }
  } catch {}
  return '80mm';
}

const FORMAT_META: Record<ExportFormat, { label: string; icon: React.ReactNode }> = {
  pdf: { label: 'Export as PDF', icon: <AppIcons.file className="w-4 h-4" /> },
  xlsx: { label: 'Export as Excel', icon: <AppIcons.spreadsheet className="w-4 h-4" /> },
  csv: { label: 'Export as CSV', icon: <AppIcons.fileDown className="w-4 h-4" /> },
  print: { label: 'Print', icon: <AppIcons.printer className="w-4 h-4" /> },
};

const ALL_FORMATS: ExportFormat[] = ['pdf', 'xlsx', 'csv', 'print'];

export function ExportButton({
  data,
  columns,
  title,
  subtitle,
  filtersSummary,
  formats = ALL_FORMATS,
  compact = false,
  icon,
  className,
  disabled = false,
  maxRows,
  filename,
  currencySymbol,
  brand = DEFAULT_BRAND,
  paperSize,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pdfChoiceOpen, setPdfChoiceOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeAll = () => {
    setIsOpen(false);
    setPdfChoiceOpen(false);
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!isOpen || isMobile) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeAll();
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen, isMobile]);

  const activePrinterSize = resolveSelectedPaperSize(paperSize);

  const run = async (format: ExportFormat, paperOverride?: string) => {
    if (busy) return;

    setBusy(format);
    try {
      let rows = data;
      if (maxRows && data.length > maxRows) {
        rows = data.slice(0, maxRows);
        sonner.warning(`Large dataset — exporting first ${maxRows.toLocaleString()} rows`);
      }

      const storeSettings = useSettingsStore.getState().settings || ({} as any);
      const activeCurrencySymbol = currencySymbol || getCurrencySymbol(storeSettings.currency || 'PKR');
      const activeBrand = brand && brand.name !== DEFAULT_BRAND.name ? brand : {
        name: storeSettings.storeName || DEFAULT_BRAND.name,
        logo: storeSettings.storeLogo || (storeSettings as any).logoUrl || DEFAULT_BRAND.logo,
      };

      const selectedPaper = paperOverride || activePrinterSize;
      const config: ReportExportConfig = {
        title,
        subtitle,
        columns,
        rows,
        filtersSummary,
        filename,
        currencySymbol: activeCurrencySymbol,
        brand: activeBrand,
        paperSize: selectedPaper,
      };

      if (format === 'print') {
        const res = await printReport(config);
        if (res.method === 'failed') {
          sonner.error(`Print failed — ${res.error || 'unable to open print view'}`);
        } else if (res.method === 'pdf-fallback') {
          sonner.success(`${title} ready to print (AirPrint / Save)`);
        } else {
          sonner.success(`${title} sent to print`);
        }
        return;
      }

      let res;
      if (format === 'csv') res = await exportToCSV(config);
      else if (format === 'xlsx') res = await exportToExcel(config);
      else res = await exportToPDF(config);

      switch (res.method) {
        case 'failed':
          sonner.error(`Export failed — ${res.error || 'could not save file'}`);
          break;
        case 'cancelled':
          sonner.info('Export cancelled');
          break;
        case 'capacitor-write':
          sonner.success(`${title} saved to Documents`);
          break;
        case 'capacitor-share':
        case 'web-share':
          sonner.success(`${title} ready to save/share`);
          break;
        default:
          sonner.success(`${title} exported successfully`);
      }
    } catch (error) {
      console.error(`[Export] ${format} failed:`, error);
      sonner.error(`Export failed — ${(error as Error)?.message || 'unknown error'}`);
    } finally {
      setBusy(null);
      closeAll();
    }
  };

  const trigger = (
    <Button
      variant="secondary"
      size="md"
      onClick={() => {
        if (isOpen) closeAll();
        else setIsOpen(true);
      }}
      disabled={disabled || data.length === 0}
      loading={!!busy}
      icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (icon ?? <AppIcons.download className="h-4 w-4" />)}
      className={
        compact
          ? `!h-8 !w-8 !p-0 !rounded-md !bg-white dark:!bg-surface !border !border-neutral-200 dark:!border-white/[0.08] !text-neutral-600 dark:!text-neutral-300 hover:!text-primary ${className || ''}`
          : `!h-8 !px-3 !rounded-md !text-[13px] ${className || ''}`
      }
    >
      {!compact && <span>Export</span>}
    </Button>
  );

  const renderContent = () => {
    if (pdfChoiceOpen) {
      return (
        <PdfLayoutPicker
          activePrinterSize={activePrinterSize}
          busy={busy}
          onBack={() => setPdfChoiceOpen(false)}
          onSelect={paper => run('pdf', paper)}
        />
      );
    }

    return (
      <div className="w-full space-y-0.5">
        {formats.map(f => {
          const isPdf = f === 'pdf';
          return (
            <button
              key={f}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isPdf) setPdfChoiceOpen(true);
                else run(f);
              }}
              disabled={!!busy}
              className="w-full flex items-center justify-between px-2.5 h-8 rounded text-[12px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 active:bg-neutral-200 dark:active:bg-white/10 transition-colors disabled:opacity-40 text-left cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <span className="text-primary">{FORMAT_META[f].icon}</span>
                <span>{FORMAT_META[f].label}</span>
              </div>
              {isPdf ? (
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              ) : (
                busy === f && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary ml-auto" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        {trigger}

        {isOpen && !isMobile && (
          <div className="absolute right-0 top-full mt-1 z-[60] min-w-[215px] bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-lg p-1.5 animate-in fade-in zoom-in-95 duration-150">
            {!pdfChoiceOpen && (
              <div className="px-2.5 py-1 text-[10px] font-mono text-neutral-400 dark:text-neutral-500 border-b border-neutral-100 dark:border-white/[0.04] mb-1">
                Printer: {activePrinterSize}
              </div>
            )}
            {renderContent()}
          </div>
        )}
      </div>

      {isOpen && isMobile && (
        <BottomSheet
          open={isOpen}
          onClose={closeAll}
          title={pdfChoiceOpen ? 'Select PDF Layout' : 'Export Report'}
          subtitle={`${title} • ${activePrinterSize}`}
          maxWidth="md"
        >
          <div className="px-1 pb-2">
            {renderContent()}
          </div>
        </BottomSheet>
      )}
    </>
  );
}
