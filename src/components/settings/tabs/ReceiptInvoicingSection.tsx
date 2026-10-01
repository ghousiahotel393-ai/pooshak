import React, { useMemo } from 'react';
import { Hash, RotateCcw, Eye, AlertTriangle } from 'lucide-react';
import { Button, SearchableSelect } from '../../../shared/ui';
import { useSalesStore } from '../../../stores';
import type { ReceiptSettingsFormProps } from './ReceiptSettingsForm.types';

export function ReceiptInvoicingSection({
  formData,
  handleChange,
  handleRepairCounter,
  canEditSettings,
}: ReceiptSettingsFormProps) {
  const prefix = (formData.invoicePrefix || 'INV').trim().toUpperCase();
  const counterNum = parseInt(formData.invoiceCounter, 10) || 1;
  const padDigits = formData.invoicePadDigits !== undefined ? parseInt(formData.invoicePadDigits, 10) : 4;

  const sampleSerial = padDigits > 0
    ? counterNum.toString().padStart(padDigits, '0')
    : counterNum.toString();

  const previewInvoice = `${prefix ? prefix + '-' : ''}${sampleSerial}`;

  // Highest invoice serial already saved (computed from the in-memory sales store — instant,
  // no query/lag). Numbering always continues from MAX(this, entered) + 1, so a value at/below
  // this is auto-advanced past — warn the user instead of letting them think it will "go back".
  const sales = useSalesStore((s) => s.sales);
  const highestUsed = useMemo(() => {
    let max = 0;
    for (const s of sales) {
      const inv = (s as any).invoiceNumber as string | undefined;
      if (!inv) continue;
      const last = parseInt(inv.split('-').pop() || '', 10);
      if (!isNaN(last) && last > max) max = last;
    }
    return max;
  }, [sales]);

  const willCollide = highestUsed > 0 && counterNum <= highestUsed;
  const nextFree = highestUsed + 1;
  const nextFreeSerial = padDigits > 0 ? nextFree.toString().padStart(padDigits, '0') : nextFree.toString();
  const nextFreeInvoice = `${prefix ? prefix + '-' : ''}${nextFreeSerial}`;

  return (
    <div className="p-4 sm:p-5 bg-white dark:bg-surface rounded-md border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-4">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-neutral-200 dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-center text-neutral-600 dark:text-neutral-300">
            <Hash className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-neutral-900 dark:text-white tracking-[-0.01em]">
              Business Logic & Invoicing
            </h3>
            <p className="text-[11px] text-neutral-500 font-mono tracking-tight">
              Prefix, starting serial, and numbering controls
            </p>
          </div>
        </div>

        {handleRepairCounter && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRepairCounter}
            disabled={!canEditSettings}
            icon={<RotateCcw className="w-3 h-3 text-neutral-500" />}
            className="h-7 px-2 text-[11px] font-medium"
            title="Scan local sales to auto-sync next serial counter"
          >
            <span className="hidden sm:inline">Sync with Sales</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            Invoice Prefix
          </label>
          <input
            type="text"
            name="invoicePrefix"
            value={formData.invoicePrefix || ''}
            onChange={handleChange}
            placeholder="INV"
            disabled={!canEditSettings}
            className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary font-mono uppercase"
          />
          <p className="text-[10px] text-neutral-600 dark:text-neutral-300">
            e.g. INV, BILL, POS, or leave empty
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            Next Serial Number
          </label>
          <input
            type="number"
            name="invoiceCounter"
            min="1"
            value={formData.invoiceCounter || '1'}
            onChange={handleChange}
            disabled={!canEditSettings}
            className="w-full h-8 px-2.5 rounded bg-white dark:bg-app border border-neutral-200 dark:border-white/[0.08] text-[13px] text-neutral-900 dark:text-white focus:outline-none focus:border-primary font-mono tabular-nums"
          />
          <p className="text-[10px] text-neutral-600 dark:text-neutral-300">
            Sequence starts or increments from here
          </p>
          {willCollide && (
            <div className="flex items-start gap-1.5 mt-1 p-1.5 rounded bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-[1px]" />
              <p className="text-[10px] leading-snug text-amber-700 dark:text-amber-400">
                #{prefix ? prefix + '-' : ''}{highestUsed} already exists. Numbering can't go back —
                the next sale will use <span className="font-semibold">#{nextFreeInvoice}</span>.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            Number Length / Padding
          </label>
          <SearchableSelect
            options={[
              { id: '4', label: '4 Digits (e.g. 0001)' },
              { id: '5', label: '5 Digits (e.g. 00001)' },
              { id: '6', label: '6 Digits (e.g. 000001)' },
              { id: '0', label: 'No Leading Zeros (e.g. 1, 2, 3)' },
            ]}
            value={padDigits}
            onChange={(value) => handleChange({ target: { name: 'invoicePadDigits', value } })}
            disabled={!canEditSettings}
            placeholder="Select padding"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
            Live Sample Preview
          </label>
          <div className="h-8 px-3 rounded bg-neutral-100 dark:bg-white/[0.04] border border-neutral-200 dark:border-white/[0.08] flex items-center justify-between font-mono">
            <span className="text-[11px] text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
              <Eye className="w-3 h-3 text-neutral-500" />
              Receipt #:
            </span>
            <span className="text-[13px] font-bold text-primary tracking-wide">
              #{previewInvoice}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
