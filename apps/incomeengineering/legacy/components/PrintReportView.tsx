import React, { useMemo, useRef } from 'react';
import {
  buildLionVerdictClientReportFromIncomeEngineering,
  formatLionPublicStatusLabel,
} from '@cb/advisory-graph/lionsVerdict';
import { CB_REPORT_PLAYWRIGHT_PDF_SHORT_FOOTER } from '@cb/shared/legalMonocopy';
import { formatReportGeneratedAtLabel } from '@cb/shared/reportIdentity';
import {
  CB_REPORT_SOFT_PANEL_BG,
  CB_REPORT_SOFT_PANEL_BORDER,
} from '@cb/shared/cbReportTemplate';
import { createReportAuditMeta, type ReportAuditMeta } from '@cb/shared/reportTraceability';
import { CB_FONT_SERIF } from '@cb/shared/typography';
import { pricingReturnModelDashboardUrl } from '@cb/shared/urls';
import { buildLionContext, generateLionDecisions, generateLionNarrative } from '@cb/lion-verdict';
import { buildPdfNarrative } from '@cb/pdf/build-narrative';
import {
  mergeLionVerdictSummaryBody,
  PdfAdvisoryCoverPage,
  PdfAdvisorySectionLead,
  PdfChartBlock,
  PdfLayout,
  PdfLionsVerdictBlock,
  PdfSection,
  PDF_TOC_INCOME_ENGINEERING,
} from '@cb/pdf/shared';
import { ReportTrialSnapshotCaption } from '@cb/advisory-graph/reports';
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
      ? `Some inputs sit outside the ranges this model can illustrate (${invalidReason}). Your adviser can help adjust spending or capital figures so the picture is usable.`
      : 'Some totals sit outside the ranges this model can illustrate. Try easing spending or capital assumptions with your adviser, then refresh the scenario.';
    return {
      sectionTitle: 'What this means',
      summary,
      subheading: 'Practical next steps',
      suggestions: [
        'Align monthly spending and capital entries with the limits your adviser explains.',
        'Revisit income and return assumptions so they feel defendable in a client meeting.',
        'Re-run the model after changes and bring the updated readout to your next review.',
      ],
      tagline: '',
    };
  }
  if (status === 'green') {
    return {
      sectionTitle: 'What this means',
      summary:
        'On these assumptions, recurring inflows and modelled investment income cover expenses and loan commitments comfortably, including in a weaker month. The structure looks balanced for the story you told the model.',
      subheading: 'Keeping the plan credible',
      suggestions: [
        'Keep return assumptions conservative enough to survive scrutiny.',
        'Revisit the scenario when income, expenses, or debt service changes.',
        'Schedule an annual check-in even when the picture looks strong.',
      ],
      tagline: 'Steady structure deserves steady discipline — not complacency.',
    };
  }
  if (status === 'amber') {
    return {
      sectionTitle: 'What this means',
      summary:
        'The plan is close: most months work, but the cushion is thin. A few adverse months or a small assumption miss could tilt the read from comfortable to pressured.',
      subheading: 'Where to tighten the story',
      suggestions: [
        'Stress-test income and return assumptions with your adviser.',
        'Identify expenses that could flex if conditions tighten.',
        'Build or preserve a modest buffer before relying on this structure long term.',
      ],
      tagline: 'Small adjustments now often prevent larger ones later.',
    };
  }
  return {
    sectionTitle: 'What this means',
    summary:
      'On these inputs, recurring inflows and modelled returns do not fully cover expenses and loan commitments. Without change, pressure is likely to build over time.',
    subheading: 'Restore balance with your adviser',
    suggestions: [
      'Review income durability and any planned changes to earnings.',
      'Separate essential spending from discretionary until coverage improves.',
      'Discuss debt structure, term, and cost where loans are material.',
      'Align portfolio risk and return expectations with the sustainability you need.',
    ],
    tagline: 'Addressing pressure early keeps more options on the table.',
  };
}

function PrintStageLabel({ children }: { children: React.ReactNode }) {
  return <p className="cb-print-stage-label">{children}</p>;
}

function lionPublicStatusTierChipClass(status: string): string {
  const u = status.toUpperCase().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    STRONG: 'cb-forever-tier-chip cb-forever-tier-chip--strong',
    STABLE: 'cb-forever-tier-chip cb-forever-tier-chip--stable',
    FRAGILE: 'cb-forever-tier-chip cb-forever-tier-chip--fragile',
    AT_RISK: 'cb-forever-tier-chip cb-forever-tier-chip--at-risk',
    NOT_SUSTAINABLE: 'cb-forever-tier-chip cb-forever-tier-chip--not-sustainable',
  };
  return map[u] ?? 'cb-forever-tier-chip';
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
  /** Present after a download is requested; echoed on the cover for the captured PDF. */
  auditMeta?: ReportAuditMeta | null;
  /** Adds Execution Pathway (Early Access) to the Lion PDF block when true. */
  hasStrategicInterest?: boolean;
}

const sectionHeading: React.CSSProperties = {
  fontFamily: CB_FONT_SERIF,
  fontSize: '13px',
  fontWeight: 700,
  color: '#0D3A1D',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginBottom: '10px',
  paddingBottom: '6px',
  borderBottom: '1px solid rgba(255, 204, 106, 0.55)',
  lineHeight: 1.35,
};

const sectionBlock: React.CSSProperties = {
  marginBottom: '22px',
  padding: '16px 18px',
  background: CB_REPORT_SOFT_PANEL_BG,
  borderRadius: '8px',
  border: `1px solid ${CB_REPORT_SOFT_PANEL_BORDER}`,
  breakInside: 'avoid',
  pageBreakInside: 'avoid',
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
  auditMeta = null,
  hasStrategicInterest = false,
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

  const lionPdfDataIe = useMemo(() => {
    if (!lionAccessEnabled || !lionReport) return null;
    const ctx = buildLionContext({
      currency,
      monthlyIncome: totalIncome,
      monthlyExpense: totalExpenses,
      totalCapital,
      targetCapital: totalExpenses * 12,
      coverageRatio: totalExpenses > 0 ? totalIncome / totalExpenses : 1,
      sustainabilityYears: net < 0 ? totalCapital / (Math.abs(net) * 12) : undefined,
      depletionPressure: summary.sustainabilityStatus,
      modelType: 'IE',
    });
    const narrative = generateLionNarrative({ ...ctx, lionScore: lionReport.verdict.score });
    const decisions = generateLionDecisions({ ...ctx, lionScore: lionReport.verdict.score });
    return buildPdfNarrative(
      {
        ...ctx,
        clientName: reportClientDisplayName,
        lionScore: lionReport.verdict.score,
        hasStrategicInterest,
      },
      narrative,
      decisions,
    );
  }, [
    lionAccessEnabled,
    lionReport,
    reportClientDisplayName,
    totalIncome,
    totalExpenses,
    currency,
    totalCapital,
    net,
    summary.sustainabilityStatus,
    hasStrategicInterest,
  ]);

  const reportGeneratedAtLabel = useMemo(() => formatReportGeneratedAtLabel(), []);
  const capitalHealthDashboardUrl = useMemo(
    () => pricingReturnModelDashboardUrl('capitalhealth') ?? 'https://capitalhealth.thecapitalbridge.com/dashboard',
    [],
  );

  const fallbackAuditRef = useRef<ReportAuditMeta | null>(null);
  if (fallbackAuditRef.current === null) {
    fallbackAuditRef.current = createReportAuditMeta({
      modelCode: 'INCOME',
      userDisplayName: reportClientDisplayName ?? 'Client',
    });
  }
  const layoutAudit = auditMeta ?? fallbackAuditRef.current;

  const totalAllocation = investmentBuckets.reduce((s, b) => s + (b.allocation ?? 0), 0);
  const getBucket = (id: string) => {
    const cat = INVESTMENT_CATEGORIES.find((c) => c.id === id);
    const b = investmentBuckets.find((x) => x.id === id);
    return { allocation: b?.allocation ?? 0, expectedReturnAnnual: b?.expectedReturnAnnual ?? cat?.defaultReturnAnnual ?? 0 };
  };

  const generatedLabel = auditMeta?.generatedAtLabel ?? reportGeneratedAtLabel;

  return (
    <PdfLayout
      audit={layoutAudit}
      shortFooterLegal={CB_REPORT_PLAYWRIGHT_PDF_SHORT_FOOTER}
      documentRootId="print-report"
    >
      <PdfSection className="cb-advisory-doc-cover cb-page-break-after" aria-label="Cover">
        <PdfAdvisoryCoverPage
          title="INCOME ENGINEERING — STRATEGIC WEALTH REPORT"
          subtitle="Income sustainability: offsets, unlocking capital, and allocation under your stated assumptions."
          preparedForName={reportClientDisplayName ?? 'Client'}
          generatedAtLabel={generatedLabel}
          toc={PDF_TOC_INCOME_ENGINEERING}
        />
      </PdfSection>

      <PdfSection className="cb-advisory-doc-opening" aria-label="Section A — Opening">
        <PdfAdvisorySectionLead
          stageLabel="Section A — Opening"
          title="Opening"
          whatThisShows={
            lionAccessEnabled
              ? "Where Income Engineering sits in the Capital Bridge journey, then — when your plan includes it — the Lion’s Verdict on income structure, using the same numbers as Section B."
              : "Where Income Engineering sits in the Capital Bridge journey and how to read the evidence in Section B — full Lion’s Verdict narrative is available on paid plans."
          }
          whyThisMatters="Orientation and judgement come first, then the fact base, so the read follows a natural advisory sequence."
        />

        {!lionAccessEnabled ? <ReportTrialSnapshotCaption isTrial /> : null}

        <section className="section" style={sectionBlock}>
          <PrintStageLabel>Capital Bridge framework</PrintStageLabel>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#0D3A1D', margin: '0 0 4px', letterSpacing: '0.04em' }}>
            CAPITAL BRIDGE ADVISORY JOURNEY
          </p>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#0D3A1D', margin: '0 0 10px' }}>How to read this report</p>

          <p style={{ fontSize: '11px', fontWeight: 700, color: '#0D3A1D', margin: '0 0 8px' }}>
            Step 1B — Engineer your income structure
          </p>
          <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.55, margin: '0 0 8px' }}>
            This report follows your sustainability check (Forever Income).
          </p>
          <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.55, margin: '0 0 4px' }}>
            At this stage, the question shifts from:
          </p>
          <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.55, margin: '0 0 4px', fontStyle: 'italic' }}>
            &ldquo;Can this structure last?&rdquo;
          </p>
          <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.55, margin: '0 0 8px' }}>to:</p>
          <ul
            style={{
              margin: '0 0 14px',
              paddingLeft: '20px',
              color: '#374151',
              lineHeight: 1.55,
              fontSize: '11px',
            }}
          >
            <li style={{ marginBottom: '6px' }}>Where can income be strengthened within the current setup?</li>
            <li style={{ marginBottom: '6px' }}>Which assets can be unlocked into usable capital?</li>
            <li style={{ marginBottom: 0 }}>How can surplus be intentionally converted into long-term capital growth?</li>
          </ul>

          <p
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#0D3A1D',
              margin: '0 0 6px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            What this model does
          </p>
          <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.55, margin: '0 0 6px' }}>
            The Income Engineering Model focuses on how capital moves, not just how it sits.
          </p>
          <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.55, margin: '0 0 6px' }}>It shows:</p>
          <ul
            style={{
              margin: '0 0 14px',
              paddingLeft: '20px',
              color: '#374151',
              lineHeight: 1.55,
              fontSize: '11px',
            }}
          >
            <li style={{ marginBottom: '6px' }}>Where income already exceeds requirements (surplus)</li>
            <li style={{ marginBottom: '6px' }}>Where capital may be unlocked from existing assets</li>
            <li style={{ marginBottom: 0 }}>How structured use of capital (including borrowing) affects long-term outcomes</li>
          </ul>

          <p
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#0D3A1D',
              margin: '0 0 6px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Why this matters
          </p>
          <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.55, margin: '0 0 8px' }}>
            Different structures can produce very different outcomes over time.
          </p>
          <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.55, margin: '0 0 6px' }}>
            Rather than assuming what should or should not be done, this model allows:
          </p>
          <ul
            style={{
              margin: '0 0 8px',
              paddingLeft: '20px',
              color: '#374151',
              lineHeight: 1.55,
              fontSize: '11px',
            }}
          >
            <li style={{ marginBottom: '6px' }}>the cost of capital to be compared against expected outcomes</li>
            <li style={{ marginBottom: '6px' }}>the impact of each decision to be observed under consistent assumptions</li>
            <li style={{ marginBottom: 0 }}>the structure to be evaluated as a system, not in isolation</li>
          </ul>
          <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.55, margin: 0 }}>
            All results remain scenario-based and are not guaranteed.
          </p>

          <p
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#0D3A1D',
              margin: '14px 0 6px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            What happens next
          </p>
          <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.55, margin: '0 0 6px' }}>
            From here, the advisory journey continues:
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: '20px',
              color: '#374151',
              lineHeight: 1.55,
              fontSize: '11px',
            }}
          >
            <li style={{ marginBottom: '6px' }}>
              Capital Health → assesses whether the structure remains sustainable over time
            </li>
            <li style={{ marginBottom: 0 }}>
              Capital Stress → evaluates how the structure behaves under changing conditions
            </li>
          </ul>
        </section>

        {lionAccessEnabled && lionPdfDataIe && lionReport ? (
          <div
            className="lion-section lion-verdict-one-page"
            data-cb-lion-print-wrap
            style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
          >
            <section className="section lion-verdict" style={sectionBlock}>
              <PdfLionsVerdictBlock
                tierChip={
                  <span className={lionPublicStatusTierChipClass(lionReport.verdict.status)}>
                    {formatLionPublicStatusLabel(lionReport.verdict.status)}
                  </span>
                }
                scoreAndStatusLine={`Lion score: ${lionReport.verdict.score} / 100 · ${formatLionPublicStatusLabel(lionReport.verdict.status)}`}
                narrativeQuote={lionPdfDataIe.lion.headline}
                summary={mergeLionVerdictSummaryBody(lionPdfDataIe.summary.keyPoint, lionPdfDataIe.lion.guidance)}
                whyThisIsHappening={lionPdfDataIe.diagnosis.why}
                systemState={lionPdfDataIe.diagnosis.state}
                nextActions={lionPdfDataIe.actions}
                executionPathway={lionPdfDataIe.executionPathway ?? undefined}
                titleColor="#0D3A1D"
                labelColor="#0D3A1D"
                scoreLineColor="#0D3A1D"
                textColor="#2d3748"
                accentColor="#FFCC6A"
                fontSerif={CB_FONT_SERIF}
                titleStyle={{
                  marginBottom: '10px',
                  paddingBottom: '6px',
                  borderBottom: '1px solid rgba(255, 204, 106, 0.55)',
                  lineHeight: 1.35,
                  letterSpacing: '0.08em',
                }}
              />
            </section>
          </div>
        ) : null}
      </PdfSection>

        <PdfSection className="cb-page-break" aria-label="Section B — Advisor Read">
        <PdfAdvisorySectionLead
          stageLabel="Section B — Advisor Read"
          title="Advisor Read"
          whatThisShows="Expectations, income, loans, unlocking capital lines, allocations, coverage, and headline status — the numbers you are reviewing together."
          whyThisMatters="One agreed fact base before Section C, so you can separate what the model says from what you might change next."
        />

        <section className="section" style={sectionBlock}>
          <PrintStageLabel>Input Summary</PrintStageLabel>
          <h2 style={sectionHeading}>Your model inputs</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#4b5563', lineHeight: 1.55 }}>
            The tables below reflect the assumptions you agreed for this review: expectations, income, any loans from unlocking capital, each unlock line, and investment buckets.
          </p>
        </section>

        <section className="section" style={sectionBlock}>
          <h2 style={sectionHeading}>Expectations</h2>
          <p style={{ margin: '0 0 4px', color: '#2d3748' }}><strong style={{ color: '#0D3A1D' }}>Currency:</strong> {currency}</p>
          <p style={{ margin: 0, color: '#2d3748' }}><strong style={{ color: '#0D3A1D' }}>Desired monthly expenses:</strong> {formatCurrency(monthlyExpenses, currency)}</p>
        </section>

        <section className="section" style={sectionBlock}>
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

        <section className="section" style={sectionBlock}>
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

        <section className="section" style={sectionBlock}>
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

        <section className="section chart-block" style={sectionBlock}>
          <PrintStageLabel>Visual Analysis</PrintStageLabel>
          <PdfChartBlock
            title="Coverage (from your inputs)"
            titleStyle={{ fontFamily: CB_FONT_SERIF, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '13px', color: '#0D3A1D', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid rgba(255, 204, 106, 0.55)' }}
            whatThisShows="How far monthly inflows (including modelled investment income) cover total outflows in a typical month versus the weakest month you modelled."
            whyThisMatters="Advisory conversations often anchor on an average that hides a thin month — pairing median and weakest-month coverage keeps both in view."
            interpretation={
              <p style={{ margin: 0, fontSize: '12px', color: '#2d3748', lineHeight: 1.58 }}>
                Together, these two reads show whether the income story is robust or merely &ldquo;usually fine&rdquo; on the assumptions captured in this report.
              </p>
            }
          >
            <p style={{ margin: 0, fontSize: '12px', color: '#2d3748', lineHeight: 1.58 }}>
              Median monthly coverage: <strong style={{ color: '#0D3A1D' }}>{(medianCoverage * 100).toFixed(1)}%</strong>
              {' · '}
              Weakest month: <strong style={{ color: '#0D3A1D' }}>{(worstMonthCoverage * 100).toFixed(1)}%</strong>
            </p>
          </PdfChartBlock>
        </section>

        <section className="section key-outcomes" style={sectionBlock}>
          <PrintStageLabel>Key Outcomes</PrintStageLabel>
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
        </PdfSection>

      <PdfSection className="cb-page-break" aria-label="Section C — Deeper analysis">
      <PdfAdvisorySectionLead
        stageLabel="Section C — Deeper analysis"
        title="Deeper analysis"
        whatThisShows="Interpretation of sustainability, practical next steps, and the improvement story that fits the Section B picture."
        whyThisMatters="Keeps judgement and options after the facts, so the conversation can move from alignment to action."
      />
      <section className="section" style={sectionBlock}>
        <PrintStageLabel>Strategic Interpretation</PrintStageLabel>
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
        <p style={{ marginBottom: '12px', color: '#2d3748', lineHeight: 1.58 }}>{optSummary}</p>
        <PrintStageLabel>Next Steps</PrintStageLabel>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', marginBottom: '8px', lineHeight: 1.35 }}>{optSubheading}</h3>
        <ol style={{ margin: 0, paddingLeft: '20px', color: '#2d3748' }}>
          {suggestions.map((s, i) => (
            <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
          ))}
        </ol>
        {optTagline ? (
          <p style={{ marginTop: '14px', fontSize: '13px', fontStyle: 'italic', fontWeight: 300, color: '#0D3A1D' }}>&ldquo;{optTagline}&rdquo;</p>
        ) : null}
      </section>
      </PdfSection>

      <PdfSection className="cb-appendix cb-page-break" aria-label="Appendix and closing">
        <PdfAdvisorySectionLead
          stageLabel="Appendix & closing"
          title="Disclosures and next steps"
          whatThisShows="How to use this report, regulatory context, and the next step in the Capital Bridge journey."
          whyThisMatters="Closes with a clear handoff: what this document is for, and where to go next with your adviser."
        />
        <section className="section" style={sectionBlock}>
          <h2 style={sectionHeading}>Disclosures & how to use this report</h2>
          <p style={{ marginBottom: '12px', color: '#2d3748', lineHeight: 1.58 }}>
            This document comes from the Capital Bridge Income Engineering model and is meant for discussion with your adviser. It is not personal advice. The footer on each page carries the full legal notice.
          </p>
          <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', marginBottom: '8px', lineHeight: 1.35 }}>How to use this report</h3>
          <ul style={{ margin: '0 0 16px', paddingLeft: '20px', color: '#2d3748', lineHeight: 1.55 }}>
            <li style={{ marginBottom: '6px' }}>Review it in a client meeting alongside your live model inputs.</li>
            <li style={{ marginBottom: '6px' }}>Treat illustrations as scenario-based, not guaranteed outcomes.</li>
            <li style={{ marginBottom: '6px' }}>When assumptions change materially, refresh the live model before the next review.</li>
          </ul>
          <div
            style={{
              marginTop: '8px',
              padding: '14px 16px',
              background: CB_REPORT_SOFT_PANEL_BG,
              border: `1px solid ${CB_REPORT_SOFT_PANEL_BORDER}`,
              borderRadius: '8px',
              breakInside: 'avoid',
              pageBreakInside: 'avoid',
            }}
          >
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', fontFamily: CB_FONT_SERIF, margin: '0 0 10px', lineHeight: 1.35 }}>
              Recommended next step — Capital Health
            </h3>
            <p style={{ margin: '0 0 12px', color: '#2d3748', fontSize: '10pt', lineHeight: 1.55 }}>
              Capital Health summarises withdrawal sustainability, structural confidence, and capital trajectory under your assumptions — a natural follow-on once income and allocation are aligned in this model.
            </p>
            <p style={{ margin: 0, fontSize: '10pt', fontWeight: 600, color: '#0D3A1D' }}>
              Next:&nbsp;
              <a href={capitalHealthDashboardUrl} style={{ color: '#0D3A1D', textDecoration: 'underline' }}>
                Run Capital Health
              </a>
              &nbsp;to continue your advisory journey.
            </p>
          </div>
        </section>
      </PdfSection>

        <div
          style={{
            marginTop: '24px',
            borderTop: `1px solid ${CB_REPORT_SOFT_PANEL_BORDER}`,
            paddingTop: '22px',
            textAlign: 'center',
          }}
        >
        <PrintStageLabel>Closing</PrintStageLabel>
        <p
          style={{
            fontSize: '11px',
            color: '#5f6b67',
            lineHeight: 1.55,
            maxWidth: '36em',
            margin: '0 auto',
          }}
        >
          This report is for advisory purposes only. Illustrations rest on your assumptions and are not a guarantee of future outcomes.
          The footer on each page carries the full legal notice.
        </p>
      </div>
    </PdfLayout>
  );
};
