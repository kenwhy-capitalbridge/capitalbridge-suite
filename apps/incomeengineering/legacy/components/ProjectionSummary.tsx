import React from 'react';
import { formatCurrency } from '../utils/format';
import type { CurrencyCode } from '../config/currency';
import type { SimulationResult } from '../lib/simulation';

interface ProjectionSummaryProps {
  result: SimulationResult;
  currency: CurrencyCode;
  timeHorizonYears: number;
}

export const ProjectionSummary: React.FC<ProjectionSummaryProps> = ({
  result,
  currency,
  timeHorizonYears,
}) => {
  const rows = result.monthlyRows;
  const startPortfolio = rows[0]?.startingPortfolio ?? 0;
  const endPortfolio = rows.length > 0 ? rows[rows.length - 1].endingPortfolio : 0;
  const totalContributions = rows.reduce((s, r) => s + r.newContributions, 0);
  const totalReturn = rows.reduce((s, r) => s + r.investmentReturn, 0);

  return (
    <div className="rounded-xl border border-[#1A4D2E] bg-[#0D3A1D]/60 p-4 sm:p-6" aria-labelledby="projection-summary-label">
      <h2 id="projection-summary-label" className="font-serif-section mb-2 text-sm font-bold uppercase">
        Projection over {timeHorizonYears} {timeHorizonYears === 1 ? 'year' : 'years'}
      </h2>
      <p className="mb-4 text-xs text-[#B8B5AE]">How your portfolio and coverage change over time</p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div>
          <dt className="text-[#B8B5AE] font-medium">Starting portfolio</dt>
          <dd className="mt-0.5 font-bold text-[#F6F5F1]">{formatCurrency(startPortfolio, currency)}</dd>
        </div>
        <div>
          <dt className="text-[#B8B5AE] font-medium">Projected ending portfolio</dt>
          <dd className="mt-0.5 font-bold text-[#FFCC6A]">{formatCurrency(endPortfolio, currency)}</dd>
        </div>
        <div>
          <dt className="text-[#B8B5AE] font-medium">Total surplus reinvested</dt>
          <dd className="mt-0.5 font-bold text-[#F6F5F1]">{formatCurrency(totalContributions, currency)}</dd>
        </div>
        <div>
          <dt className="text-[#B8B5AE] font-medium">Total investment return</dt>
          <dd className="mt-0.5 font-bold text-[#F6F5F1]">{formatCurrency(totalReturn, currency)}</dd>
        </div>
        <div>
          <dt className="text-[#B8B5AE] font-medium">Median coverage</dt>
          <dd className="mt-0.5 font-bold text-[#F6F5F1]">{(result.medianCoverage * 100).toFixed(1)}%</dd>
        </div>
        <div>
          <dt className="text-[#B8B5AE] font-medium">Worst month coverage</dt>
          <dd className="mt-0.5 font-bold text-[#F6F5F1]">{(result.worstMonthCoverage * 100).toFixed(1)}%</dd>
        </div>
      </dl>
    </div>
  );
};
