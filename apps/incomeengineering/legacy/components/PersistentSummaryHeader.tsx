import React from 'react';
import { formatCurrency } from '../utils/format';
import type { CurrencyCode } from '../config/currency';
import type { SummaryKPIs } from '../types/calculator';

interface PersistentSummaryHeaderProps {
  summary: SummaryKPIs;
  currency: CurrencyCode;
  /** Total capital = unlocked liquidity (all assets) + investment assumptions total allocation */
  totalCapital?: number;
}

/** Coverage % = (Total Income ÷ Total Expenses) × 100. If Total Expenses ≤ 0, treat as 100%. */
function coveragePct(totalIncome: number, totalExpenses: number): number {
  if (totalExpenses <= 0) return 100;
  return (totalIncome / totalExpenses) * 100;
}

/** Status label from simulation result (uses same thresholds as simulation: 98% / 75%). */
function statusLabelFromSummary(status: SummaryKPIs['sustainabilityStatus']): string {
  if (status === 'green') return 'SUSTAINABLE';
  if (status === 'amber') return 'PLAUSIBLE';
  if (status === 'red') return 'UNSUSTAINABLE';
  return 'INVALID';
}

const cardBase =
  'rounded-xl flex flex-col overflow-hidden bg-[#163d28] flex-1 min-w-0 border border-[#FFCC6A]/50';

const contentSize = 'text-xs sm:text-sm';

/** Two rectangular header cards. Card 1: Structure. Card 2: Investment effect, coverage, status. */
export const PersistentSummaryHeader: React.FC<PersistentSummaryHeaderProps> = ({
  summary,
  currency,
  totalCapital = 0,
}) => {
  const totalIncome = summary.monthlyIncome + summary.estimatedMonthlyInvestmentIncome;
  const totalExpenses = summary.monthlyExpenses + summary.monthlyLoanRepayments;
  const net = totalIncome - totalExpenses;

  /** Net effect of investments and unlocking capital (excl. baseline income/expenses). */
  const investmentNet = summary.estimatedMonthlyInvestmentIncome - summary.monthlyLoanRepayments;
  const investmentNetSign = investmentNet >= 0 ? '+' : '−';
  const investmentNetAbs = Math.abs(investmentNet);

  const pct = coveragePct(totalIncome, totalExpenses);
  const status = summary.sustainabilityStatus;
  const statusLabel = statusLabelFromSummary(status);

  const isSurplus = pct >= 100;
  const deficitSurplusLabel = isSurplus ? 'SURPLUS' : 'DEFICIT';
  const deficitSurplusColor = isSurplus ? 'text-[#11B981]' : 'text-[#DD524C]';

  const statusChipStyles =
    status === 'green'
      ? 'bg-[#11B981] text-white border-[#11B981]'
      : status === 'amber'
        ? 'bg-[#FFAB40] text-[#0D3A1D] border-[#FFAB40]'
        : 'bg-[#DD524C] text-white border-[#DD524C]';

  return (
    <header
      className="fixed top-14 left-0 right-0 z-40 border-b border-[#1A4D2E]/80 bg-[#0D3A1D] shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
      aria-label="Summary"
    >
      <div className="mx-auto w-full max-w-[100%] px-3 py-3 min-[641px]:max-w-[var(--container-tablet-max)] min-[641px]:px-4 min-[1025px]:max-w-[var(--container-desktop-max)] min-[1025px]:px-6 min-[1025px]:max-w-[1200px] min-[1441px]:max-w-[1440px] min-[1441px]:px-8">
        <div className="flex flex-row flex-wrap gap-3 min-[641px]:gap-4 justify-center">
          {/* Card 1 — STRUCTURE OVERVIEW */}
          <div
            className={`${cardBase} p-4 sm:p-5 min-h-0 basis-0 min-[640px]:min-w-[220px]`}
          >
            <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.15em] text-[#FFCC6A]/80 mb-3">
              Structure overview
            </p>
            <div className="space-y-2">
              <p className={`${contentSize} text-[#F6F5F1] leading-snug`}>
                Monthly Income: <span className="font-bold tabular-nums">{formatCurrency(totalIncome, currency)}</span>
              </p>
              <p className={`${contentSize} text-[#F6F5F1] leading-snug`}>
                Monthly Expenses: <span className="font-bold tabular-nums">{formatCurrency(totalExpenses, currency)}</span>
              </p>
            </div>
            <hr className="border-t border-[#FFCC6A]/50 my-3" aria-hidden="true" />
            <p className={`${contentSize} text-[#F6F5F1] leading-snug`}>
              Net Total: <span className="font-bold tabular-nums">{formatCurrency(net, currency)}</span>
            </p>
          </div>

          {/* Card 2 — STATUS */}
          <div
            className={`${cardBase} p-4 sm:p-5 min-h-0 basis-0 min-[640px]:min-w-[220px]`}
          >
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.15em] text-[#FFCC6A]/80 mb-3">
              Status
            </p>
            <div className="space-y-2">
              <p className={`${contentSize} text-[#F6F5F1] leading-snug`}>
                Investment Income: <span className="font-bold tabular-nums">{investmentNetSign}{formatCurrency(investmentNetAbs, currency)}</span>
              </p>
              <p className={`${contentSize} text-[#F6F5F1] leading-snug`}>
                Total Capital: <span className="font-bold tabular-nums">{formatCurrency(totalCapital, currency)}</span>
              </p>
            </div>
            <hr className="border-t border-[#FFCC6A]/50 my-3" aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-2">
                <p className={`${contentSize} font-bold tabular-nums leading-snug ${deficitSurplusColor}`}>
                  {deficitSurplusLabel} {pct.toFixed(1)}%
                </p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] sm:text-xs font-bold uppercase tracking-wider shrink-0 ${statusChipStyles}`}
                >
                  {statusLabel}
                </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
