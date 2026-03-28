import React, { useEffect, useCallback } from 'react';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { formatCurrency } from '../utils/format';
import { RETURN_MAX, RETURN_STEP } from '../config/constants';
import { INVESTMENT_CATEGORIES, getDefaultInvestmentBuckets } from '../config/investmentCategories';
import { NumberInput } from './ui/NumberInput';
import { CurrencyAmountInput } from './ui/CurrencyAmountInput';
import type { InvestmentBucket } from '../types/calculator';

/** Monthly investment income from allocation: allocation × (annual return / 12). Payout only; no compounding. */
function estimatedMonthlyReturn(allocation: number, annualPercent: number): number {
  if (allocation <= 0) return 0;
  return allocation * (annualPercent / 100 / 12);
}

/** Yearly return from allocation and annual rate % */
function estimatedYearlyReturn(allocation: number, annualPercent: number): number {
  if (allocation <= 0) return 0;
  return allocation * (annualPercent / 100);
}

export const InvestmentBucketsPanel: React.FC = () => {
  const currency = useCalculatorStore((s) => s.currency);
  const investmentBuckets = useCalculatorStore((s) => s.investmentBuckets);
  const setInvestmentBuckets = useCalculatorStore((s) => s.setInvestmentBuckets);

  const getBucketForCategory = useCallback(
    (categoryId: string, defaultReturn: number): InvestmentBucket => {
      const b = investmentBuckets.find((x) => x.id === categoryId);
      const cat = INVESTMENT_CATEGORIES.find((c) => c.id === categoryId);
      if (b) return b;
      return {
        id: categoryId,
        label: cat?.title ?? categoryId,
        allocation: 0,
        expectedReturnAnnual: defaultReturn,
        includeInReinvest: true,
      };
    },
    [investmentBuckets]
  );

  // Ensure store has a bucket for every category so allocation/return updates persist
  useEffect(() => {
    const expectedCount = INVESTMENT_CATEGORIES.length;
    const hasAll = INVESTMENT_CATEGORIES.every((c) => investmentBuckets.some((b) => b.id === c.id));
    if (!hasAll || investmentBuckets.length !== expectedCount) {
      const merged = getDefaultInvestmentBuckets().map(
        (def) => investmentBuckets.find((b) => b.id === def.id) ?? def
      );
      setInvestmentBuckets(merged);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount to sync buckets with categories

  const handleAllocationChange = useCallback(
    (categoryId: string, value: number) => {
      const updated = INVESTMENT_CATEGORIES.map((cat) => {
        const b = getBucketForCategory(cat.id, cat.defaultReturnAnnual);
        return cat.id === categoryId ? { ...b, allocation: Math.max(0, value) } : b;
      });
      setInvestmentBuckets(updated);
    },
    [getBucketForCategory, setInvestmentBuckets]
  );

  const handleReturnChange = useCallback(
    (categoryId: string, value: number) => {
      const updated = INVESTMENT_CATEGORIES.map((cat) => {
        const b = getBucketForCategory(cat.id, cat.defaultReturnAnnual);
        return cat.id === categoryId ? { ...b, expectedReturnAnnual: value } : b;
      });
      setInvestmentBuckets(updated);
    },
    [getBucketForCategory, setInvestmentBuckets]
  );

  // Total = sum of all displayed categories (matches what user sees in allocation inputs)
  const totalAllocation = INVESTMENT_CATEGORIES.reduce(
    (sum, cat) => sum + (Number(getBucketForCategory(cat.id, cat.defaultReturnAnnual).allocation) || 0),
    0
  );
  const totalDisplay = Number.isFinite(totalAllocation) ? totalAllocation : 0;

  return (
    <section className="rounded-xl border border-[#FFCC6A]/25 bg-[#163d28] p-4 sm:p-6" aria-labelledby="investments-label">
      <h2 id="investments-label" className="font-serif-section mb-1 text-base font-bold uppercase sm:text-lg">
        Investment Assumptions
      </h2>
      <p className="mb-2 text-xs text-[#B8B5AE] opacity-90">
        Set realistic return expectations for where your money is invested today.
      </p>
      <div className="mb-4 rounded-xl border-2 border-[#FFCC6A] bg-[#FFCC6A]/15 px-4 py-2.5 inline-block">
        <span className="text-sm font-bold text-[#FFCC6A] tabular-nums">
          Total: {formatCurrency(totalDisplay, currency)}
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-4">
        {INVESTMENT_CATEGORIES.map((cat) => {
          const bucket = getBucketForCategory(cat.id, cat.defaultReturnAnnual);
          const monthlyEst = estimatedMonthlyReturn(bucket.allocation, bucket.expectedReturnAnnual);
          const yearlyEst = estimatedYearlyReturn(bucket.allocation, bucket.expectedReturnAnnual);
          return (
            <li key={cat.id} className="rounded-xl border border-[#FFCC6A]/25 bg-[#0f2e1c]/80 p-3 sm:p-4">
              <h3 className="font-serif-section mb-0.5 text-sm font-bold uppercase text-[#FFCC6A]">
                {cat.title}
              </h3>
              <p className="mb-3 text-xs text-[#B8B5AE]">{cat.microcopy}</p>
              <p className="mb-3 text-[10px] text-[#9CA3AF]">
                Default: {cat.defaultReturnAnnual}% p.a.
              </p>
              <div className="mb-3">
                <label className="text-xs text-[#B8B5AE] mb-1 block">Allocation</label>
                <CurrencyAmountInput
                  value={bucket.allocation}
                  onChange={(v) => handleAllocationChange(cat.id, v)}
                  currency={currency}
                  min={0}
                  ariaLabel={`Allocation for ${cat.title}`}
                />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-[#B8B5AE] shrink-0">Est. Return (%)</span>
                <input
                  type="range"
                  min={0}
                  max={RETURN_MAX}
                  step={RETURN_STEP}
                  value={bucket.expectedReturnAnnual}
                  onChange={(e) => handleReturnChange(cat.id, Number(e.target.value))}
                  className="flex-1 accent-[#FFCC6A] h-8"
                  aria-valuenow={bucket.expectedReturnAnnual}
                  aria-valuetext={`${bucket.expectedReturnAnnual.toFixed(1)}%`}
                />
                <span className="min-w-[3.5rem] text-right text-sm font-bold text-[#FFCC6A] tabular-nums">
                  {bucket.expectedReturnAnnual.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-[#F6F5F1] flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2">
                  <span className="text-[#B8B5AE]">Monthly Return:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded border font-bold tabular-nums shrink-0 ${
                      monthlyEst >= 0 ? 'bg-[#11B981] text-white border-[#11B981]' : 'bg-[#DD524C] text-white border-[#DD524C]'
                    }`}
                  >
                    {formatCurrency(monthlyEst, currency)}
                  </span>
                </span>
                <span className="h-4 w-px bg-[#FFCC6A]/50 shrink-0" aria-hidden="true" />
                <span className="flex items-center gap-2">
                  <span className="text-[#B8B5AE]">Yearly Return:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded border font-bold tabular-nums shrink-0 ${
                      yearlyEst >= 0 ? 'bg-[#11B981] text-white border-[#11B981]' : 'bg-[#DD524C] text-white border-[#DD524C]'
                    }`}
                  >
                    {formatCurrency(yearlyEst, currency)}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
