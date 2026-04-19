import React, { useState } from 'react';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { formatCurrency } from '../utils/format';
import { NumberInput } from './ui/NumberInput';

type ViewMode = 'monthly' | 'annual';

export const ExpensesInput: React.FC = () => {
  const currency = useCalculatorStore((s) => s.currency);
  const monthlyExpenses = useCalculatorStore((s) => s.monthlyExpenses);
  const setMonthlyExpenses = useCalculatorStore((s) => s.setMonthlyExpenses);
  const getCurrencyConfig = useCalculatorStore((s) => s.getCurrencyConfig);
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');

  const cfg = getCurrencyConfig();
  const isAtMax = monthlyExpenses >= cfg.maxMonthlyExpenses;
  const annualMax = cfg.maxMonthlyExpenses * 12;
  const displayValue = viewMode === 'annual' ? monthlyExpenses * 12 : monthlyExpenses;
  const maxDisplay = viewMode === 'annual' ? annualMax : cfg.maxMonthlyExpenses;

  const handleChange = (v: number) => {
    if (viewMode === 'annual') setMonthlyExpenses(Math.min(v / 12, cfg.maxMonthlyExpenses));
    else setMonthlyExpenses(Math.min(v, cfg.maxMonthlyExpenses));
  };

  return (
    <div className="space-y-3" aria-labelledby="expenses-label">
      <div>
        <p id="expenses-label" className="text-xs font-medium uppercase tracking-wider text-[#B8B5AE] mb-1">
          {viewMode === 'annual' ? 'Desired Yearly Expenses' : 'Desired Monthly Expenses'}
        </p>
        <div className="flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-[#FFCC6A]/25 bg-[#0A2E18] pl-3 pr-3 py-2 focus-within:ring-2 focus-within:ring-[#FFCC6A]/50 focus-within:border-[#FFCC6A]/60 transition-colors touch-manipulation">
          <span className="text-sm text-[#F6F5F1] shrink-0">{currency === 'RM' ? 'RM' : currency}</span>
          <NumberInput
            value={Math.round(displayValue)}
            onChange={handleChange}
            min={0}
            max={maxDisplay}
            inputMode="numeric"
            aria-label={viewMode === 'annual' ? 'Yearly Expenses Amount' : 'Monthly Expenses Amount'}
            className="min-h-[40px] flex-1 min-w-0 border-0 bg-transparent p-0 text-sm text-[#F6F5F1] focus:ring-0 focus:outline-none touch-manipulation"
          />
        </div>
      </div>
      <div className="flex gap-1 rounded-lg p-0.5 bg-[#0f2e1c]">
        <button
          type="button"
          onClick={() => setViewMode('monthly')}
          className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
            viewMode === 'monthly' ? 'bg-[#FFCC6A] text-[#0D3A1D]' : 'text-[#B8B5AE] hover:text-[#F6F5F1]'
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setViewMode('annual')}
          className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
            viewMode === 'annual' ? 'bg-[#FFCC6A] text-[#0D3A1D]' : 'text-[#B8B5AE] hover:text-[#F6F5F1]'
          }`}
        >
          Annual
        </button>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={cfg.maxMonthlyExpenses}
          step={500}
          value={monthlyExpenses}
          onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
          aria-valuenow={monthlyExpenses}
          aria-valuetext={formatCurrency(monthlyExpenses, currency)}
          className="flex-1 h-8 accent-[#FFCC6A] touch-manipulation"
        />
        <span className="min-w-[5rem] text-right text-xs font-semibold text-[#FFCC6A] tabular-nums">
          {formatCurrency(monthlyExpenses, currency)}
        </span>
      </div>
      {isAtMax && (
        <p className="text-xs text-red-400" role="alert">
          Max for {currency}: {formatCurrency(cfg.maxMonthlyExpenses, currency)}/month.
        </p>
      )}
    </div>
  );
};
