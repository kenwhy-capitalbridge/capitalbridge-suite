import React, { useMemo } from 'react';
import {
  buildLionVerdictClientReportFromIncomeEngineering,
  formatLionPublicStatusLabel,
} from '@cb/advisory-graph/lionsVerdict';
import { formatCurrency } from '../utils/format';
import type { CurrencyCode } from '../config/currency';
import type { SummaryKPIs } from '../types/calculator';
import type { IncomeRow, AssetUnlock, InvestmentBucket } from '../types/calculator';
import type { SustainabilityStatus } from '../types/calculator';
import { MECHANISM_LABELS } from '../lib/assetUnlockDefaults';
import { getUnlockedLiquidity, getLoanForAsset } from '../lib/assetUnlockToLoans';
import { monthlyPayment } from '../lib/amortize';
import { INVESTMENT_CATEGORIES } from '../config/investmentCategories';

function coveragePct(totalIncome: number, totalExpenses: number): number {
  if (totalExpenses <= 0) return 100;
  return (totalIncome / totalExpenses) * 100;
}

function getStatusLabel(tier: SustainabilityStatus): string {
  if (tier === 'green') return 'SUSTAINABLE';
  if (tier === 'amber') return 'PLAUSIBLE';
  if (tier === 'red') return 'UNSUSTAINABLE';
  return 'INVALID';
}

function getOptimisationContent(
  status: SustainabilityStatus,
  _medianCoverage: number,
  _worstMonthCoverage: number,
  invalidReason?: string
): { sectionTitle: string; summary: string; subheading: string; suggestions: string[]; tagline: string } {
  if (status === 'invalid') {
    const summary = invalidReason
      ? `The numbers don't fit the limits (${invalidReason}). Lower your spending or total investments to stay within the allowed range.`
      : 'Your totals are over the allowed limits. Try lowering monthly spending or total investments.';
    return {
      sectionTitle: 'Optimisation recommendations',
      summary,
      subheading: 'What you could do',
      suggestions: [
        'Lower monthly spending to the max allowed for your currency.',
        'Lower total investments to the max allowed.',
        'Double-check that no single value is above the limits shown.',
        'Come back to the calculator every month to check your STATUS.',
      ],
      tagline: '',
    };
  }
  if (status === 'green') {
    return {
      sectionTitle: 'Optimisation recommendations',
      summary: 'Your plan is healthy and steady. Your income and investment returns are covering your expenses and loans. Even in your most challenging month, you are still above 100%. This shows good balance and strong control.',
      subheading: 'Where strength meets structure',
      suggestions: [
        'Keep using realistic numbers. Do not overestimate returns.',
        'Review your plan if your income or expenses change.',
        'Check your plan once a year to stay on track.',
        'Review your status every month to stay confident and prepared.',
      ],
      tagline: 'You are in control. Now focus on steady progress.',
    };
  }
  if (status === 'amber') {
    return {
      sectionTitle: 'Optimisation recommendations',
      summary: 'Your plan is close to stable, but the margin is thin. Most months are covered, but there is little room for unexpected changes. Small problems can affect the structure.',
      subheading: 'Strength needs adjustment',
      suggestions: [
        'Review your income and investment return assumptions carefully.',
        'Reduce or adjust some expenses if possible.',
        'Build a small safety buffer to protect against surprises.',
        'Monitor your plan monthly until coverage is clearly above 100%.',
      ],
      tagline: 'You are close. A few smart adjustments can make the plan strong.',
    };
  }
  return {
    sectionTitle: 'Structural review required',
    summary: 'Your current income and returns are not enough to cover your expenses and loan commitments. If no changes are made, the gap may grow over time.',
    subheading: 'Restore balance',
    suggestions: [
      'Review your income stability and future outlook.',
      'Cut or delay non-essential expenses.',
      'Consider restructuring or extending loan commitments if needed.',
      'Adjust your investment strategy to reduce risk and improve stability.',
    ],
    tagline: 'Take action early. Stability comes before growth.',
  };
}

interface PrintReportViewProps {
  summary: SummaryKPIs;
  currency: CurrencyCode;
  totalCapital: number;
  monthlyExpenses: number;
  incomeRows: IncomeRow[];
  assetUnlocks: AssetUnlock[];
  investmentBuckets: InvestmentBucket[];
  medianCoverage: number;
  worstMonthCoverage: number;
}

const sectionHeading: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#0D3A1D',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginBottom: '10px',
  paddingBottom: '6px',
  borderBottom: '1px solid #FFCC6A',
};

const sectionBlock: React.CSSProperties = {
  marginBottom: '20px',
  padding: '14px 16px',
  background: '#f8fbf8',
  borderRadius: '8px',
  border: '1px solid rgba(255, 204, 106, 0.4)',
};

const reportBoxStyle: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  padding: '32px',
  color: '#1a1a1a',
  fontSize: '14px',
  lineHeight: 1.5,
  border: '3px solid #FFCC6A',
  borderRadius: '16px',
  background: '#fff',
  boxShadow: '0 0 0 1px rgba(13, 58, 29, 0.08)',
};

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  summary,
  currency,
  totalCapital,
  monthlyExpenses,
  incomeRows,
  assetUnlocks,
  investmentBuckets,
  medianCoverage,
  worstMonthCoverage,
}) => {
  const totalIncome = summary.monthlyIncome + summary.estimatedMonthlyInvestmentIncome;
  const totalExpenses = summary.monthlyExpenses + summary.monthlyLoanRepayments;
  const net = totalIncome - totalExpenses;
  const pct = coveragePct(totalIncome, totalExpenses);
  const isSurplus = pct >= 100;
  const deficitSurplusLabel = isSurplus ? 'SURPLUS' : 'DEFICIT';
  const statusLabel = getStatusLabel(summary.sustainabilityStatus);
  const investmentNet = summary.estimatedMonthlyInvestmentIncome - summary.monthlyLoanRepayments;
  const investmentNetSign = investmentNet >= 0 ? '+' : '−';

  const statusColor =
    summary.sustainabilityStatus === 'green' ? '#11B981' :
    summary.sustainabilityStatus === 'amber' ? '#FFAB40' :
    summary.sustainabilityStatus === 'red' ? '#DD524C' : '#6B7280';

  const { sectionTitle: optSectionTitle, summary: optSummary, subheading: optSubheading, suggestions, tagline: optTagline } = getOptimisationContent(
    summary.sustainabilityStatus,
    medianCoverage,
    worstMonthCoverage,
    summary.invalidReason
  );

  const lionReport = useMemo(
    () =>
      buildLionVerdictClientReportFromIncomeEngineering(
        {
          medianCoveragePct: medianCoverage,
          worstMonthCoveragePct: worstMonthCoverage,
          sustainabilityStatus: summary.sustainabilityStatus,
          totalMonthlyIncome: totalIncome,
          totalMonthlyExpenses: totalExpenses,
          monthlyNetCashflow: net,
          totalCapital,
        },
        { formatCurrency: (n) => formatCurrency(n, currency) },
      ),
    [
      medianCoverage,
      worstMonthCoverage,
      summary.sustainabilityStatus,
      totalIncome,
      totalExpenses,
      net,
      totalCapital,
      currency,
    ],
  );

  const totalAllocation = investmentBuckets.reduce((s, b) => s + (b.allocation ?? 0), 0);
  const getBucket = (id: string) => {
    const cat = INVESTMENT_CATEGORIES.find((c) => c.id === id);
    const b = investmentBuckets.find((x) => x.id === id);
    return { allocation: b?.allocation ?? 0, expectedReturnAnnual: b?.expectedReturnAnnual ?? cat?.defaultReturnAnnual ?? 0 };
  };

  return (
    <div className="print-report" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Part 1: through Monthly Income (page break after this in PDF) */}
      <div data-pdf-part="1" style={reportBoxStyle}>
        <div style={{ textAlign: 'center', marginBottom: '28px', paddingBottom: '20px', borderBottom: '2px solid #FFCC6A' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: '#0D3A1D', letterSpacing: '0.15em', margin: 0, textTransform: 'uppercase' }}>
            Capital Bridge Advisory Framework
          </p>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#0D3A1D',
              letterSpacing: '0.12em',
              margin: '6px 0 0',
              textTransform: 'uppercase',
            }}
          >
            Capital Engineering Model — Report
          </h1>
          <p style={{ fontSize: '11px', color: '#0D3A1D', marginTop: '4px', marginBottom: 0 }}>
            Income Sustainability Analysis
          </p>
          <p style={{ fontSize: '12px', color: '#0D3A1D', opacity: 0.85, marginTop: '10px', marginBottom: 0 }}>
            Generated {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <section style={sectionBlock}>
          <h2 style={sectionHeading}>Structure overview</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={{ padding: '6px 0', color: '#2d3748' }}>Monthly Income</td><td style={{ textAlign: 'right', fontWeight: 600, color: '#0D3A1D' }}>{formatCurrency(totalIncome, currency)}</td></tr>
              <tr><td style={{ padding: '6px 0', color: '#2d3748' }}>Monthly Expenses</td><td style={{ textAlign: 'right', fontWeight: 600, color: '#0D3A1D' }}>{formatCurrency(totalExpenses, currency)}</td></tr>
              <tr><td style={{ padding: '8px 0 0', borderTop: '1px solid rgba(255,204,106,0.5)', color: '#2d3748' }}>Net Total</td><td style={{ textAlign: 'right', fontWeight: 600, borderTop: '1px solid rgba(255,204,106,0.5)', color: net >= 0 ? '#11B981' : '#DD524C' }}>{formatCurrency(net, currency)}</td></tr>
            </tbody>
          </table>
        </section>

        <section style={sectionBlock}>
          <h2 style={sectionHeading}>Status</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={{ padding: '6px 0', color: '#2d3748' }}>Investment Income</td><td style={{ textAlign: 'right', fontWeight: 600, color: '#0D3A1D' }}>{investmentNetSign}{formatCurrency(Math.abs(investmentNet), currency)}</td></tr>
              <tr><td style={{ padding: '6px 0', color: '#2d3748' }}>Total Capital</td><td style={{ textAlign: 'right', fontWeight: 600, color: '#0D3A1D' }}>{formatCurrency(totalCapital, currency)}</td></tr>
              <tr><td style={{ padding: '6px 0', color: '#2d3748' }}>{deficitSurplusLabel}</td><td style={{ textAlign: 'right', fontWeight: 600, color: isSurplus ? '#11B981' : '#DD524C' }}>{pct.toFixed(1)}%</td></tr>
              <tr><td style={{ padding: '6px 0', color: '#2d3748' }}>Status</td><td style={{ textAlign: 'right', fontWeight: 700, color: statusColor }}>{statusLabel}</td></tr>
            </tbody>
          </table>
        </section>

        <section style={sectionBlock}>
          <h2 style={sectionHeading}>Expectations</h2>
          <p style={{ margin: 0, color: '#2d3748' }}><strong style={{ color: '#0D3A1D' }}>Currency:</strong> {currency}</p>
          <p style={{ margin: '8px 0 0', color: '#2d3748' }}><strong style={{ color: '#0D3A1D' }}>Desired Monthly Expenses:</strong> {formatCurrency(monthlyExpenses, currency)}</p>
        </section>

        <section style={sectionBlock}>
          <h2 style={sectionHeading}>Monthly Income</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {incomeRows.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: '4px 0', color: '#2d3748' }}>{row.label || 'Income'}</td>
                  <td style={{ textAlign: 'right', color: '#0D3A1D' }}>{formatCurrency(row.amount, currency)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid rgba(255,204,106,0.5)' }}>
                <td style={{ padding: '6px 0', fontWeight: 600, color: '#0D3A1D' }}>Total Recurring Income</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#0D3A1D' }}>{formatCurrency(summary.monthlyIncome, currency)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      {/* Part 2: Unlocking Capital onward (starts on new page in PDF) */}
      <div data-pdf-part="2" style={reportBoxStyle}>
      {assetUnlocks.length > 0 && (
        <section style={sectionBlock}>
          <h2 style={sectionHeading}>Unlocking Capital</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              {assetUnlocks.map((asset) => {
                const loan = getLoanForAsset(asset);
                const liquidity = getUnlockedLiquidity(asset);
                const repayment = loan ? monthlyPayment(loan.principal, loan.annualRate, loan.tenureYears) : 0;
                const label = asset.label || MECHANISM_LABELS[asset.mechanism];
                return (
                  <tr key={asset.id}>
                    <td style={{ padding: '6px 0', verticalAlign: 'top', color: '#2d3748' }}>{label}</td>
                    <td style={{ textAlign: 'right', padding: '6px 0', color: '#0D3A1D' }}>
                      Liquidity: {formatCurrency(liquidity, currency)}
                      {repayment > 0 && <> · Repayment: {formatCurrency(repayment, currency)}/mo</>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section style={sectionBlock}>
        <h2 style={sectionHeading}>Investment Assumptions</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {INVESTMENT_CATEGORIES.map((cat) => {
              const b = getBucket(cat.id);
              return (
                <tr key={cat.id}>
                  <td style={{ padding: '4px 0', color: '#2d3748' }}>{cat.title}</td>
                  <td style={{ textAlign: 'right', color: '#0D3A1D' }}>{formatCurrency(b.allocation, currency)} · {b.expectedReturnAnnual}% p.a.</td>
                </tr>
              );
            })}
            <tr style={{ borderTop: '1px solid rgba(255,204,106,0.5)' }}>
              <td style={{ padding: '6px 0', fontWeight: 600, color: '#0D3A1D' }}>Total Allocation</td>
              <td style={{ textAlign: 'right', fontWeight: 600, color: '#0D3A1D' }}>{formatCurrency(totalAllocation, currency)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={sectionBlock}>
        <h2 style={sectionHeading}>{optSectionTitle}</h2>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#fff',
            backgroundColor: statusColor,
            border: `1px solid ${statusColor}`,
            marginBottom: '12px',
          }}
        >
          {statusLabel}
        </span>
        <p style={{ marginBottom: '12px', color: '#2d3748' }}>{optSummary}</p>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', marginBottom: '8px' }}>{optSubheading}</h3>
        <ol style={{ margin: 0, paddingLeft: '20px', color: '#2d3748' }}>
          {suggestions.map((s, i) => (
            <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
          ))}
        </ol>
        {optTagline ? (
          <p style={{ marginTop: '14px', fontSize: '13px', fontStyle: 'italic', fontWeight: 300, color: '#0D3A1D' }}>&ldquo;{optTagline}&rdquo;</p>
        ) : null}
      </section>

      <section style={sectionBlock}>
        <h2 style={sectionHeading}>The Lion&apos;s Verdict</h2>
        <p style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 700, color: '#0D3A1D' }}>
          Lion score: {lionReport.verdict.score} / 100 · {formatLionPublicStatusLabel(lionReport.verdict.status)}
        </p>
        <p style={{ margin: '0 0 14px', color: '#2d3748', lineHeight: 1.55 }}>{lionReport.verdict.summary}</p>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', marginBottom: '6px' }}>Strengths</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: '20px', color: '#2d3748', lineHeight: 1.5 }}>
          {lionReport.strengths.map((s, i) => (
            <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
          ))}
        </ul>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', marginBottom: '6px' }}>Risks</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: '20px', color: '#2d3748', lineHeight: 1.5 }}>
          {lionReport.risks.map((s, i) => (
            <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
          ))}
        </ul>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', marginBottom: '6px' }}>Strategic options</h3>
        <ol style={{ margin: '0 0 12px', paddingLeft: '20px', color: '#2d3748', lineHeight: 1.5 }}>
          {lionReport.strategic_options.map((o, i) => (
            <li key={i} style={{ marginBottom: '6px' }}>
              <strong>{o.type}:</strong> {o.action} — {o.impact}
            </li>
          ))}
        </ol>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', marginBottom: '6px' }}>Priority actions</h3>
        <ul style={{ margin: '0 0 12px', paddingLeft: '20px', color: '#2d3748', lineHeight: 1.5 }}>
          {lionReport.priority_actions.map((s, i) => (
            <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
          ))}
        </ul>
        <p style={{ margin: '0 0 8px', color: '#2d3748', lineHeight: 1.55 }}>{lionReport.do_nothing_outcome}</p>
        <p style={{ margin: 0, fontSize: '13px', fontStyle: 'italic', fontWeight: 300, color: '#0D3A1D' }}>{lionReport.closing_line}</p>
      </section>

      <p style={{ fontSize: '12px', color: '#4a5568', marginTop: '20px' }}>
        This calculator is for advisory purposes only. Projections are based on your assumptions and do not guarantee future performance.
      </p>

      <p style={{ fontSize: '13px', fontWeight: 700, color: '#0D3A1D', marginTop: '14px', padding: '14px 16px', background: 'linear-gradient(135deg, #E8F5E9 0%, #f0fdf4 100%)', borderLeft: '4px solid #FFCC6A', borderRadius: '6px' }}>
        Please save or print a copy for your records. Capital Bridge does not save or store your personal information.
      </p>
      </div>
    </div>
  );
};
