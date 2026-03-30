import React, { useMemo } from 'react';
import {
  buildLionVerdictClientReportFromIncomeEngineering,
  formatLionPublicStatusLabel,
} from '@cb/advisory-graph/lionsVerdict';
import { advisoryFrameworkPdfIntro } from '@cb/shared/advisoryFramework';
import { formatReportGeneratedAtLabel, reportPreparedForLine } from '@cb/shared/reportIdentity';
import { CB_FONT_SERIF } from '@cb/shared/typography';
import { LionVerdictLocked } from "../../../../packages/lion-verdict/LionVerdictLocked";
import { formatCurrency } from '../utils/format';
import type { CurrencyCode } from '../config/currency';
import type { SummaryKPIs } from '../types/calculator';
import type {
  AssetSaleParams,
  AssetUnlock,
  FDPledgeParams,
  IncomeRow,
  InvestmentBucket,
  LifePolicyParams,
  LoanRow,
  RefinancingParams,
  SBLParams,
  ShortTermLoanParams,
  SPLOCParams,
  TermLoanParams,
} from '../types/calculator';
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

function summarizeUnlockParams(asset: AssetUnlock, currency: CurrencyCode): string {
  const c = (n: number) => formatCurrency(n, currency);
  const p = asset.params;
  switch (asset.mechanism) {
    case 'refinancing': {
      const x = p as RefinancingParams;
      return `Property value ${c(x.currentValue)} · Target LTV ${x.targetLTV}% · Interest ${x.interestRate}% p.a. · Tenure ${x.tenureYears} yr`;
    }
    case 'sploc': {
      const x = p as SPLOCParams;
      return `Portfolio ${c(x.portfolioValue)} · Allowed LTV ${x.allowedLTV}% · Rate ${x.interestRate}% p.a. · Tenure ${x.tenureYears} yr · Margin buffer ${x.marginCallBufferPercent}%`;
    }
    case 'sbl': {
      const x = p as SBLParams;
      return `Portfolio ${c(x.portfolioValue)} · Advance ${x.advanceRate}% · Rate ${x.rate}% p.a. · Tenure ${x.tenureYears} yr`;
    }
    case 'fd_pledge': {
      const x = p as FDPledgeParams;
      return `Deposit / collateral ${c(x.depositValue)} · Advance ${x.advanceRate}% · Rate ${x.rate}% p.a. · Tenure ${x.tenureYears} yr`;
    }
    case 'life_policy': {
      const x = p as LifePolicyParams;
      return `Cash surrender value ${c(x.cashSurrenderValue)} · Advance ${x.advanceRate}% · Rate ${x.rate}% p.a. · Tenure ${x.tenureYears} yr`;
    }
    case 'term_loan': {
      const x = p as TermLoanParams;
      return `Principal ${c(x.amount)} · Rate ${x.rate}% p.a. · Tenure ${x.tenureYears} yr`;
    }
    case 'short_term_loan': {
      const x = p as ShortTermLoanParams;
      return `Principal ${c(x.amount)} · Rate ${x.rate}% p.a. · Tenure ${x.tenureYears} yr`;
    }
    case 'asset_sale': {
      const x = p as AssetSaleParams;
      const useFor = x.useProceedsFor === 'investments' ? 'investments' : 'debt paydown';
      return `Value ${c(x.currentValue)} · Sell ${x.percentToSell}% · Fees ${x.feesPercent}% · Taxes ${x.taxesPercent}% · Proceeds to ${useFor}`;
    }
    default:
      return '';
  }
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
  /** Loan rows derived from enabled unlocking-capital mechanisms (matches simulation). */
  loans: LoanRow[];
  assetUnlocks: AssetUnlock[];
  investmentBuckets: InvestmentBucket[];
  medianCoverage: number;
  worstMonthCoverage: number;
  lionAccessEnabled: boolean;
  reportClientDisplayName?: string;
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

const lionVerdictSectionHeading: React.CSSProperties = {
  ...sectionHeading,
  fontFamily: CB_FONT_SERIF,
};

const sectionBlock: React.CSSProperties = {
  marginBottom: '20px',
  padding: '14px 16px',
  background: '#f8fbf8',
  borderRadius: '8px',
  border: '1px solid rgba(255, 204, 106, 0.4)',
  breakInside: 'avoid',
  pageBreakInside: 'avoid',
};

/** `clone` repeats border/background on each page fragment so the gold frame closes at page bottoms (print/PDF). */
const reportBoxStyle: React.CSSProperties = {
  fontFamily: CB_FONT_SERIF,
  padding: '32px',
  paddingBottom: '36px',
  color: '#1a1a1a',
  fontSize: '14px',
  lineHeight: 1.5,
  border: '3px solid #FFCC6A',
  borderRadius: '16px',
  background: '#fff',
  boxShadow: '0 0 0 1px rgba(13, 58, 29, 0.08)',
  WebkitBoxDecorationBreak: 'clone',
  boxDecorationBreak: 'clone',
};

/** Part 2 follows part 1 in one print/PDF flow — start on a new sheet like the in-app PDF path. */
const reportBoxPart2Style: React.CSSProperties = {
  ...reportBoxStyle,
  breakBefore: 'page',
  pageBreakBefore: 'always',
};

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  summary,
  currency,
  totalCapital,
  monthlyExpenses,
  incomeRows,
  loans,
  assetUnlocks,
  investmentBuckets,
  medianCoverage,
  worstMonthCoverage,
  lionAccessEnabled,
  reportClientDisplayName = 'Client',
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

  const lionReport = useMemo(() => {
    if (!lionAccessEnabled) return null;
    return buildLionVerdictClientReportFromIncomeEngineering(
      {
        // Simulation stores coverage as income/denominator ratio (1.0 = 100%); Lion expects 0–100+ %.
        medianCoveragePct: medianCoverage * 100,
        worstMonthCoveragePct: worstMonthCoverage * 100,
        sustainabilityStatus: summary.sustainabilityStatus,
        totalMonthlyIncome: totalIncome,
        totalMonthlyExpenses: totalExpenses,
        monthlyNetCashflow: net,
        totalCapital,
      },
      { formatCurrency: (n) => formatCurrency(n, currency) },
    );
  }, [
    lionAccessEnabled,
    medianCoverage,
    worstMonthCoverage,
    summary.sustainabilityStatus,
    totalIncome,
    totalExpenses,
    net,
    totalCapital,
    currency,
  ]);

  const incomeFrameworkIntro = useMemo(
    () => advisoryFrameworkPdfIntro('sustainability_income'),
    [],
  );

  const reportGeneratedAtLabel = useMemo(() => formatReportGeneratedAtLabel(), []);
  const preparedForLine = useMemo(
    () => reportPreparedForLine(reportClientDisplayName),
    [reportClientDisplayName],
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
            {preparedForLine}
          </p>
          <p style={{ fontSize: '12px', color: '#0D3A1D', opacity: 0.85, marginTop: '6px', marginBottom: 0 }}>
            Report generated: {reportGeneratedAtLabel}
          </p>
        </div>

        <div
          style={{
            marginBottom: '24px',
            padding: '14px 16px',
            borderLeft: '4px solid #FFCC6A',
            background: 'rgba(255, 252, 245, 0.98)',
            textAlign: 'left',
            breakInside: 'avoid',
            pageBreakInside: 'avoid',
          }}
        >
          <p
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: '#8B6914',
              letterSpacing: '0.12em',
              margin: '0 0 6px',
              textTransform: 'uppercase',
            }}
          >
            {incomeFrameworkIntro.eyebrow}
          </p>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#0D3A1D', margin: '0 0 4px' }}>
            {incomeFrameworkIntro.title}
          </p>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#0D3A1D', margin: '0 0 8px' }}>
            {incomeFrameworkIntro.youAreHere}
          </p>
          <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.55, margin: 0 }}>{incomeFrameworkIntro.body}</p>
        </div>

        <section style={sectionBlock}>
          <h2 style={sectionHeading}>Your model inputs</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#4b5563', lineHeight: 1.55 }}>
            Values in the following sections match what you entered in the calculator (expectations, income, loans from unlocking capital, each unlock line, and investment buckets).
          </p>
        </section>

        <section style={sectionBlock}>
          <h2 style={sectionHeading}>Expectations</h2>
          <p style={{ margin: '0 0 4px', color: '#2d3748' }}><strong style={{ color: '#0D3A1D' }}>Currency:</strong> {currency}</p>
          <p style={{ margin: 0, color: '#2d3748' }}><strong style={{ color: '#0D3A1D' }}>Desired monthly expenses:</strong> {formatCurrency(monthlyExpenses, currency)}</p>
        </section>

        <section style={sectionBlock}>
          <h2 style={sectionHeading}>Monthly income</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {incomeRows.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: '4px 0', color: '#2d3748' }}>{row.label || 'Income'}</td>
                  <td style={{ textAlign: 'right', color: '#0D3A1D' }}>{formatCurrency(row.amount, currency)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid rgba(255,204,106,0.5)' }}>
                <td style={{ padding: '6px 0', fontWeight: 600, color: '#0D3A1D' }}>Total recurring income</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#0D3A1D' }}>{formatCurrency(summary.monthlyIncome, currency)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={sectionBlock}>
          <h2 style={sectionHeading}>Loan repayments (from unlocking capital)</h2>
          {loans.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {loans.map((loan) => {
                  const pay = monthlyPayment(loan.principal, loan.annualRate, loan.tenureYears);
                  return (
                    <tr key={loan.id}>
                      <td style={{ padding: '4px 0', color: '#2d3748', verticalAlign: 'top' }}>{loan.label}</td>
                      <td style={{ textAlign: 'right', color: '#0D3A1D' }}>
                        Principal {formatCurrency(loan.principal, currency)} · {loan.annualRate}% p.a. · {loan.tenureYears} yr · {formatCurrency(pay, currency)}/mo
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: '1px solid rgba(255,204,106,0.5)' }}>
                  <td style={{ padding: '6px 0', fontWeight: 600, color: '#0D3A1D' }}>Total monthly loan repayments</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#0D3A1D' }}>{formatCurrency(summary.monthlyLoanRepayments, currency)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p style={{ margin: 0, color: '#2d3748' }}>No loan facilities modelled from unlocking capital.</p>
          )}
        </section>

        <section style={sectionBlock}>
          <h2 style={sectionHeading}>Unlocking capital</h2>
          {assetUnlocks.length > 0 ? (
            <div>
              {assetUnlocks.map((asset) => {
                const label = asset.label || MECHANISM_LABELS[asset.mechanism];
                const liq = getUnlockedLiquidity(asset);
                const loan = getLoanForAsset(asset);
                const repayment = loan ? monthlyPayment(loan.principal, loan.annualRate, loan.tenureYears) : 0;
                const invRet = asset.estimatedInvestmentReturnPercent;
                const yieldM = asset.estimatedMonthlyYield;
                return (
                  <div
                    key={asset.id}
                    style={{
                      marginBottom: '12px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid rgba(255,204,106,0.35)',
                    }}
                  >
                    <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#0D3A1D' }}>{label}</p>
                    <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#6b7280' }}>{MECHANISM_LABELS[asset.mechanism]} · {asset.enabled ? 'Enabled' : 'Disabled'}</p>
                    <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#2d3748', lineHeight: 1.5 }}>{summarizeUnlockParams(asset, currency)}</p>
                    {(asset.enabled && (liq > 0 || repayment > 0)) && (
                      <p style={{ margin: 0, fontSize: '12px', color: '#2d3748' }}>
                        Modelled liquidity: {formatCurrency(liq, currency)}
                        {repayment > 0 && <> · Repayment: {formatCurrency(repayment, currency)}/mo</>}
                      </p>
                    )}
                    {(invRet != null && invRet > 0) || (yieldM != null && yieldM > 0) ? (
                      <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#2d3748' }}>
                        {yieldM != null && yieldM > 0 && <>Est. monthly yield: {formatCurrency(yieldM, currency)} · </>}
                        {invRet != null && invRet > 0 && <>Reinvest assumption: {invRet}% p.a.</>}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ margin: 0, color: '#2d3748' }}>No unlocking-capital lines added.</p>
          )}
        </section>

        <section style={sectionBlock}>
          <h2 style={sectionHeading}>Investment buckets</h2>
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
                <td style={{ padding: '6px 0', fontWeight: 600, color: '#0D3A1D' }}>Total allocation</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#0D3A1D' }}>{formatCurrency(totalAllocation, currency)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={sectionBlock}>
          <h2 style={sectionHeading}>Coverage (from your inputs)</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#2d3748', lineHeight: 1.55 }}>
            Median monthly coverage: <strong style={{ color: '#0D3A1D' }}>{(medianCoverage * 100).toFixed(1)}%</strong>
            {' · '}
            Weakest month: <strong style={{ color: '#0D3A1D' }}>{(worstMonthCoverage * 100).toFixed(1)}%</strong>
            {' '}(recurring income + modelled investment income vs expenses + loan repayments).
          </p>
        </section>

        {lionAccessEnabled && lionReport ? (
        <section style={sectionBlock}>
          <h2 style={lionVerdictSectionHeading}>THE LION&apos;S VERDICT</h2>
          <p style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 700, color: '#0D3A1D' }}>
            Lion score: {lionReport.verdict.score} / 100 · {formatLionPublicStatusLabel(lionReport.verdict.status)}
          </p>
          <p
            style={{
              margin: '0 0 14px',
              color: '#2d3748',
              lineHeight: 1.55,
              fontFamily: CB_FONT_SERIF,
              fontStyle: 'italic',
              fontWeight: 700,
              textTransform: 'capitalize',
            }}
          >
            {lionReport.verdict.summary}
          </p>
          <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', marginBottom: '8px' }}>Strengths</h3>
          <ul style={{ margin: '0 0 12px', paddingLeft: '20px', color: '#2d3748', lineHeight: 1.5 }}>
            {lionReport.strengths.map((s, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
            ))}
          </ul>
          <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', marginBottom: '8px' }}>Risks</h3>
          <ul style={{ margin: '0 0 12px', paddingLeft: '20px', color: '#2d3748', lineHeight: 1.5 }}>
            {lionReport.risks.map((s, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
            ))}
          </ul>
          <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', marginBottom: '8px' }}>Strategic options</h3>
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
      ) : (
        <LionVerdictLocked />
      )}

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
      </div>

      {/* Part 2: optimisation + disclaimers (inputs and Lion live in part 1) */}
      <div data-pdf-part="2" style={reportBoxPart2Style}>
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

      <div
        style={{
          marginTop: '20px',
          borderTop: '1px solid rgba(255, 204, 106, 0.45)',
          paddingTop: '18px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '12px', color: '#4a5568', margin: 0, lineHeight: 1.55 }}>
          This calculator is for advisory purposes only. Projections are based on your assumptions and do not guarantee future performance.
        </p>
        <p
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#0D3A1D',
            marginTop: '0.65em',
            marginBottom: 0,
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #E8F5E9 0%, #f0fdf4 100%)',
            borderLeft: '4px solid #FFCC6A',
            borderRadius: '6px',
            breakInside: 'avoid',
            pageBreakInside: 'avoid',
          }}
        >
          Please save or print a copy for your records.
        </p>
      </div>
      </div>
    </div>
  );
};
