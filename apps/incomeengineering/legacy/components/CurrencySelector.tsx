import React, { useState } from 'react';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { CURRENCY_LIST, CURRENCIES } from '../config/currency';
import type { CurrencyCode } from '../config/currency';
import { formatCurrency } from '../utils/format';

export const CurrencySelector: React.FC = () => {
  const currency = useCalculatorStore((s) => s.currency);
  const confirmCurrencyChange = useCalculatorStore((s) => s.confirmCurrencyChange);
  const getCurrencyConfig = useCalculatorStore((s) => s.getCurrencyConfig);
  const [pending, setPending] = useState<CurrencyCode | null>(null);

  const handleSelect = (code: CurrencyCode) => {
    if (code === currency) return;
    setPending(code);
  };

  const handleConfirm = () => {
    if (pending) {
      confirmCurrencyChange(pending);
      setPending(null);
    }
  };

  const handleCancel = () => setPending(null);

  const cfg = pending ? CURRENCIES[pending] : getCurrencyConfig();

  const content = (
    <>
      <div className="flex w-full gap-1.5 sm:gap-2">
        {CURRENCY_LIST.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => handleSelect(code)}
            aria-pressed={currency === code}
            aria-label={`Select ${code}`}
            className={`flex flex-1 min-w-0 min-h-[36px] sm:min-h-[38px] items-center justify-center rounded-lg py-1.5 text-xs sm:text-sm font-semibold transition-all touch-manipulation active:scale-[0.98] ${
              currency === code
                ? 'bg-[#FFCC6A] text-[#0D3A1D]'
                : 'bg-[#0F4222]/60 text-[#B8B5AE] hover:bg-[#1A4D2E] hover:text-[#F6F5F1]'
            }`}
          >
            {code}
          </button>
        ))}
      </div>
      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="currency-confirm-title"
          className="mt-3 rounded-lg border border-[#FFCC6A]/40 bg-[#0A2E18] p-3"
        >
          <p id="currency-confirm-title" className="text-sm font-medium text-[#F6F5F1]">
            Changing currency will reset all amounts to avoid incorrect assumptions.
          </p>
          <p className="mt-1 text-xs text-[#B8B5AE]">
            Defaults for {pending}: {formatCurrency(cfg.defaultMonthlyExpenses, pending)} monthly expenses,{' '}
            {formatCurrency(cfg.defaultInvestmentPool, pending)} investment pool.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-lg bg-[#FFCC6A] px-3 py-1.5 text-sm font-bold text-[#0D3A1D]"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-[#1A4D2E] px-3 py-1.5 text-sm text-[#B8B5AE] hover:bg-[#0F4222]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <section className="rounded-xl border border-[#1A4D2E] bg-[#0D3A1D]/60 p-4" aria-labelledby="currency-label">
      <h2 id="currency-label" className="font-serif-section mb-2 text-sm font-bold uppercase">Currency</h2>
      <p className="mb-2 text-xs text-[#B8B5AE]">All numbers in this currency</p>
      {content}
    </section>
  );
}

export function CurrencySelectorEmbedded() {
  const currency = useCalculatorStore((s) => s.currency);
  const confirmCurrencyChange = useCalculatorStore((s) => s.confirmCurrencyChange);
  const getCurrencyConfig = useCalculatorStore((s) => s.getCurrencyConfig);
  const [pending, setPending] = useState<CurrencyCode | null>(null);
  const handleSelect = (code: CurrencyCode) => { if (code !== currency) setPending(code); };
  const handleConfirm = () => { if (pending) { confirmCurrencyChange(pending); setPending(null); } };
  const handleCancel = () => setPending(null);
  const cfg = pending ? CURRENCIES[pending] : getCurrencyConfig();
  return (
    <>
      <div className="flex w-full gap-1.5 sm:gap-2">
        {CURRENCY_LIST.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => handleSelect(code)}
            aria-pressed={currency === code}
            aria-label={`Select ${code}`}
            className={`flex flex-1 min-w-0 min-h-[36px] sm:min-h-[38px] items-center justify-center rounded-lg py-1.5 text-xs sm:text-sm font-semibold transition-all touch-manipulation active:scale-[0.98] ${
              currency === code ? 'bg-[#FFCC6A] text-[#0D3A1D]' : 'bg-[#0F4222]/60 text-[#B8B5AE] hover:bg-[#1A4D2E] hover:text-[#F6F5F1]'
            }`}
          >
            {code}
          </button>
        ))}
      </div>
      {pending && (
        <div role="dialog" aria-modal="true" aria-labelledby="currency-confirm-title" className="mt-3 rounded-lg border border-[#FFCC6A]/40 bg-[#0A2E18] p-3">
          <p id="currency-confirm-title" className="text-sm font-medium text-[#F6F5F1]">Changing currency will reset all amounts.</p>
          <p className="mt-1 text-xs text-[#B8B5AE]">Defaults for {pending}: {formatCurrency(cfg.defaultMonthlyExpenses, pending)} monthly expenses.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={handleConfirm} className="rounded-lg bg-[#FFCC6A] px-3 py-1.5 text-sm font-bold text-[#0D3A1D]">Confirm</button>
            <button type="button" onClick={handleCancel} className="rounded-lg border border-[#1A4D2E] px-3 py-1.5 text-sm text-[#B8B5AE] hover:bg-[#0F4222]">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
