import React from 'react';
import { Loader2, ArrowLeft, FileText, Receipt } from 'lucide-react';
import type { ExportFormat } from './exportEngine';

interface PdfLayoutPickerProps {
  activePrinterSize: string;
  busy: ExportFormat | null;
  onBack: () => void;
  onSelect: (paperSize: string) => void;
}

export function PdfLayoutPicker({
  activePrinterSize,
  busy,
  onBack,
  onSelect,
}: PdfLayoutPickerProps) {
  const thermalLabel = activePrinterSize === 'A4' ? '80mm' : activePrinterSize;

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between px-1 pb-1 border-b border-neutral-100 dark:border-white/[0.04] mb-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
          className="flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <span className="text-[10px] font-mono text-neutral-400">PDF Layout</span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect('A4');
        }}
        disabled={!!busy}
        className="w-full flex items-start gap-2.5 px-2.5 py-1.5 rounded text-left hover:bg-neutral-100 dark:hover:bg-white/5 active:bg-neutral-200 dark:active:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer select-none"
      >
        <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-neutral-800 dark:text-neutral-200">A4 Document</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-primary/10 text-primary font-medium">Recommended</span>
          </div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
            Full table • All columns
          </p>
        </div>
        {busy === 'pdf' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary ml-auto mt-1" />}
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(thermalLabel);
        }}
        disabled={!!busy}
        className="w-full flex items-start gap-2.5 px-2.5 py-1.5 rounded text-left hover:bg-neutral-100 dark:hover:bg-white/5 active:bg-neutral-200 dark:active:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer select-none"
      >
        <Receipt className="w-4 h-4 text-neutral-500 dark:text-neutral-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium text-neutral-800 dark:text-neutral-200">
            Receipt Roll ({thermalLabel})
          </div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
            Thermal slip • Primary columns
          </p>
        </div>
        {busy === 'pdf' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary ml-auto mt-1" />}
      </button>
    </div>
  );
}
