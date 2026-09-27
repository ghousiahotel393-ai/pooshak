import { CustomerLedger } from '../../types';
import { formatCurrency } from '../../lib/currencies';
import { formatAppDateTime } from '../../lib/dateUtils';
import { LEDGER_TYPE_LABELS } from './customerManagerUtils';

interface CustomerLedgerTableProps {
  pageItems: CustomerLedger[];
  currency: string;
}

export function CustomerLedgerTable({ pageItems, currency }: CustomerLedgerTableProps) {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse text-[13px]">
          <thead>
            <tr className="h-8 bg-neutral-50/50 dark:bg-white/[0.02] border-b border-neutral-200 dark:border-white/[0.08]">
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">Date & Time</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">Type</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">Note / Ref</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-right">Debit</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-right">Credit</th>
              <th className="px-3.5 text-[11px] font-medium uppercase text-neutral-500 dark:text-neutral-400 tracking-wider text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
            {pageItems.map(entry => {
              const meta = LEDGER_TYPE_LABELS[entry.type] || { label: entry.type, color: 'bg-neutral-100 text-neutral-600 dark:bg-white/[0.06] dark:text-neutral-300' };
              return (
                <tr key={entry.id} className="h-10 hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-3.5 text-neutral-600 dark:text-neutral-400 whitespace-nowrap font-mono text-[12px]">
                    {formatAppDateTime(entry.createdAt)}
                  </td>
                  <td className="px-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/[0.08]">
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-3.5 text-neutral-700 dark:text-neutral-300 max-w-[150px] truncate">
                    {entry.note || entry.reference || '—'}
                  </td>
                  <td className="px-3.5 text-right font-mono tabular-nums text-[13px]">
                    {entry.debit > 0 ? (
                      <span className="text-rose-500 font-medium">{formatCurrency(entry.debit, currency)}</span>
                    ) : <span className="text-neutral-400 opacity-40">—</span>}
                  </td>
                  <td className="px-3.5 text-right font-mono tabular-nums text-[13px]">
                    {entry.credit > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(entry.credit, currency)}</span>
                    ) : <span className="text-neutral-400 opacity-40">—</span>}
                  </td>
                  <td className="px-3.5 text-right font-mono tabular-nums font-semibold text-[13px]">
                    <span className={entry.balanceAfter > 0 ? 'text-amber-600 dark:text-amber-400' : entry.balanceAfter < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}>
                      {formatCurrency(Math.abs(entry.balanceAfter), currency)}
                    </span>
                    {entry.balanceAfter !== 0 && (
                      <span className="text-[9px] ml-1 opacity-70 uppercase">
                        {entry.balanceAfter > 0 ? 'DR' : 'CR'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Native Card View (Zero horizontal scroll) */}
      <div className="lg:hidden p-3 space-y-2 flex-1">
        {pageItems.map(entry => {
          const meta = LEDGER_TYPE_LABELS[entry.type] || { label: entry.type, color: 'bg-neutral-100 text-neutral-600 dark:bg-white/[0.06] dark:text-neutral-300' };
          return (
            <div key={entry.id} className="p-3 rounded-md bg-white dark:bg-surface border border-neutral-200 dark:border-white/[0.08] shadow-none space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-white/[0.08]">
                  {meta.label}
                </span>
                <span className="text-[11px] font-mono text-neutral-500">
                  {formatAppDateTime(entry.createdAt)}
                </span>
              </div>
              {entry.note || entry.reference ? (
                <p className="text-[12px] text-neutral-700 dark:text-neutral-300 truncate">
                  {entry.note || entry.reference}
                </p>
              ) : null}
              <div className="pt-1.5 border-t border-neutral-100 dark:border-white/[0.04] flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-3">
                  {entry.debit > 0 && (
                    <span><span className="text-[10px] uppercase text-neutral-400 mr-1">Dr:</span><span className="text-rose-500 font-mono font-medium">{formatCurrency(entry.debit, currency)}</span></span>
                  )}
                  {entry.credit > 0 && (
                    <span><span className="text-[10px] uppercase text-neutral-400 mr-1">Cr:</span><span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">{formatCurrency(entry.credit, currency)}</span></span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase text-neutral-400 mr-1">Bal:</span>
                  <span className={`font-mono font-bold ${entry.balanceAfter > 0 ? 'text-amber-600 dark:text-amber-400' : entry.balanceAfter < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
                    {formatCurrency(Math.abs(entry.balanceAfter), currency)} {entry.balanceAfter !== 0 ? (entry.balanceAfter > 0 ? 'DR' : 'CR') : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
