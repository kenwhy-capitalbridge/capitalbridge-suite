import React from 'react';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { Plus, Trash2 } from 'lucide-react';
import { NumberInput } from './ui/NumberInput';
import type { IncomeRow } from '../types/calculator';

/** Input wrapper matching refinance: same height, border, focus. Currency prefix inside the field. */
const currencyInputWrapperClass =
  'flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-[#FFCC6A]/25 bg-[#0A2E18] pl-3 pr-3 py-2 focus-within:ring-2 focus-within:ring-[#FFCC6A]/50 focus-within:border-[#FFCC6A]/60 transition-colors touch-manipulation';

const labelClass = 'text-xs text-[#B8B5AE] mb-1 block';

export const IncomeInputs: React.FC = () => {
  const currency = useCalculatorStore((s) => s.currency);
  const incomeRows = useCalculatorStore((s) => s.incomeRows);
  const setIncomeRow = useCalculatorStore((s) => s.setIncomeRow);
  const setIncomeLabel = useCalculatorStore((s) => s.setIncomeLabel);
  const addIncomeRow = useCalculatorStore((s) => s.addIncomeRow);
  const removeIncomeRow = useCalculatorStore((s) => s.removeIncomeRow);

  const currencyPrefix = currency === 'RM' ? 'RM' : currency;

  return (
    <section
      className="rounded-xl border border-[#FFCC6A]/25 bg-[#163d28] p-4 sm:p-6"
      aria-labelledby="incomes-label"
    >
      <h2 id="incomes-label" className="font-serif-section mb-1 text-sm font-bold uppercase tracking-wide">
        Monthly Income
      </h2>
      <p className="mb-4 text-xs text-[#B8B5AE] opacity-90">Salary, rental, and other regular income</p>
      <ul className="space-y-4">
        {incomeRows.map((row: IncomeRow) => (
          <li key={row.id} className="space-y-2">
            <label className="block">
              <input
                type="text"
                value={row.label}
                onChange={(e) => setIncomeLabel(row.id, e.target.value)}
                aria-label="Income type"
                placeholder="Income source"
                className="mb-1 block w-full border-0 border-b border-transparent bg-transparent p-0 text-xs text-[#B8B5AE] placeholder:text-[#B8B5AE]/70 focus:border-[#FFCC6A]/50 focus:outline-none"
              />
              <div className="flex gap-2">
                <div className={currencyInputWrapperClass}>
                  <span className="text-sm text-[#F6F5F1] shrink-0">{currencyPrefix}</span>
                  <NumberInput
                    value={row.amount}
                    onChange={(v) => setIncomeRow(row.id, v)}
                    min={0}
                    inputMode="numeric"
                    aria-label={`Amount for ${row.label}`}
                    className="min-h-[40px] flex-1 min-w-0 border-0 bg-transparent p-0 text-sm text-[#F6F5F1] focus:ring-0 focus:outline-none touch-manipulation"
                  />
                </div>
                {incomeRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIncomeRow(row.id)}
                    aria-label={`Remove ${row.label}`}
                    className="min-h-[44px] min-w-[44px] flex shrink-0 items-center justify-center rounded-lg border border-[#FFCC6A]/25 bg-[#0A2E18] text-[#B8B5AE] hover:bg-[#134833] hover:text-[#F6F5F1] touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#FFCC6A]/50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => addIncomeRow()}
        className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#FFCC6A]/60 px-3 py-2.5 text-xs text-[#F6F5F1]/90 hover:bg-[#134833]/50 focus:outline-none focus:ring-2 focus:ring-[#FFCC6A]/50 touch-manipulation"
      >
        <Plus className="h-4 w-4 shrink-0" /> Add Income
      </button>
    </section>
  );
};
