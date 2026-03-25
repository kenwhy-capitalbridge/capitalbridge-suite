import React from 'react';
import { formatCurrency } from '../utils/format';
import type { CurrencyCode } from '../config/currency';
import type { SummaryKPIs } from '../types/calculator';
import { SustainabilityBadge } from './SustainabilityBadge';

interface SummaryAtGlanceProps {
  kpis: SummaryKPIs;
  currency: CurrencyCode;
}

export const SummaryAtGlance: React.FC<SummaryAtGlanceProps> = ({ kpis, currency }) => (
  <div className="grid grid-cols-2 gap-3 sm:gap-4">
    <div className="rounded-xl border border-[#1A4D2E] bg-[#0D3A1D]/80 p-3 sm:p-4">
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-[#B8B5AE] truncate">CURRENT INCOMES (MONTHLY)</p>
      <p className="mt-0.5 sm:mt-1 text-sm sm:text-lg font-bold text-[#F6F5F1] truncate" title={formatCurrency(kpis.monthlyIncome, currency)}>{formatCurrency(kpis.monthlyIncome, currency)}</p>
    </div>
    <div className="rounded-xl border border-[#1A4D2E] bg-[#0D3A1D]/80 p-3 sm:p-4">
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-[#B8B5AE] truncate">MONTHLY EXPENSES</p>
      <p className="mt-0.5 sm:mt-1 text-sm sm:text-lg font-bold text-[#F6F5F1] truncate" title={formatCurrency(kpis.monthlyExpenses, currency)}>{formatCurrency(kpis.monthlyExpenses, currency)}</p>
    </div>
    <div className="rounded-xl border border-[#1A4D2E] bg-[#0D3A1D]/80 p-3 sm:p-4">
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-[#B8B5AE] truncate">LOAN REPAYMENTS</p>
      <p className="mt-0.5 sm:mt-1 text-sm sm:text-lg font-bold text-[#F6F5F1] truncate" title={formatCurrency(kpis.monthlyLoanRepayments, currency)}>{formatCurrency(kpis.monthlyLoanRepayments, currency)}</p>
    </div>
    <div className="rounded-xl border border-[#1A4D2E] bg-[#0D3A1D]/80 p-3 sm:p-4">
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-[#B8B5AE] truncate">EST. INV. INCOME</p>
      <p className="mt-0.5 sm:mt-1 text-sm sm:text-lg font-bold text-[#F6F5F1] truncate" title={formatCurrency(kpis.estimatedMonthlyInvestmentIncome, currency)}>{formatCurrency(kpis.estimatedMonthlyInvestmentIncome, currency)}</p>
    </div>
    <div className="rounded-xl border border-[#1A4D2E] bg-[#0D3A1D]/80 p-3 sm:p-4">
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-[#B8B5AE] truncate">NET SURPLUS</p>
      <p className={`mt-0.5 sm:mt-1 text-sm sm:text-lg font-bold truncate ${kpis.netMonthlySurplusShortfall >= 0 ? 'text-[#2ECC71]' : 'text-[#F29E38]'}`} title={formatCurrency(kpis.netMonthlySurplusShortfall, currency)}>
        {formatCurrency(kpis.netMonthlySurplusShortfall, currency)}
      </p>
    </div>
    <div className="flex items-center rounded-xl border border-[#1A4D2E] bg-[#0D3A1D]/80 p-3 sm:p-4 min-h-[52px]">
      <SustainabilityBadge
        status={kpis.sustainabilityStatus}
        currency={currency}
        invalidReason={kpis.invalidReason}
      />
    </div>
  </div>
);
