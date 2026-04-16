import React, { useMemo, useRef } from 'react';
import {
  buildLionVerdictClientReportFromIncomeEngineering,
  formatLionPublicStatusLabel,
} from '@cb/advisory-graph/lionsVerdict';
import { CB_REPORT_PLAYWRIGHT_PDF_CANONICAL_FOOTER } from '@cb/shared/legalMonocopy';
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
import {
  buildOptimisationDecisionView,
  type OptimisationQuality,
  type TriState,
} from '../lib/optimisationDecisionEngine';
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

function triLabelPdf(t: TriState): string {
  if (t === 'yes') return 'Yes';
  if (t === 'no') return 'No';
  return 'Partially';
}

function pdfQualityHeading(q: OptimisationQuality): string {
  if (q.kind === 'deficit') {
    if (q.label === 'GOOD_DEFICIT') return 'GOOD DEFICIT';
    if (q.label === 'BAD_DEFICIT') return 'BAD DEFICIT';
    return 'WATCHLIST DEFICIT';
  }
  if (q.kind === 'surplus') {
    return q.label === 'PRODUCTIVE_SURPLUS' ? 'PRODUCTIVE SURPLUS' : 'IDLE SURPLUS';
  }
  return 'BALANCED POSITION';
}

/** Pill colours aligned with report status semantics (amber ≈ plausible-style caution). */
function pdfClassificationPillColors(q: OptimisationQuality): { bg: string; border: string } {
  if (q.kind === 'deficit') {
    if (q.label === 'GOOD_DEFICIT') return { bg: '#11B981', border: '#11B981' };
    if (q.label === 'BAD_DEFICIT') return { bg: '#DD524C', border: '#DD524C' };
    return { bg: '#F59E0B', border: '#F59E0B' };
  }
  if (q.kind === 'surplus') {
    if (q.label === 'PRODUCTIVE_SURPLUS') return { bg: '#11B981', border: '#11B981' };
    return { bg: '#64748B', border: '#64748B' };
  }
  return { bg: '#6B7280', border: '#6B7280' };
}

function pdfInterpretiveTracePair(q: OptimisationQuality): [string, string] {
  if (q.kind === 'deficit') {
    if (q.label === 'GOOD_DEFICIT') {
      return [
        'Deficit is driven by capital deployment, not pure shortfall.',
        'Capital unlocked contributes to future income generation.',
      ];
    }
    if (q.label === 'BAD_DEFICIT') {
      return [
        'Deficit is large relative to current income.',
        'Capital outcome is weak, unclear, or not strong enough to justify the pressure.',
      ];
    }
    return [
      'Deficit may be manageable, but the margin is thin.',
      'Outcome depends on assumptions holding.',
    ];
  }
  if (q.kind === 'surplus') {
    if (q.label === 'PRODUCTIVE_SURPLUS') {
      return [
        'Surplus exists alongside active capital deployment.',
        'Structure appears to strengthen long-term income or capital.',
      ];
    }
    return [
      'Surplus exists, but capital deployment is limited.',
      'Structure may be underutilising available capital.',
    ];
  }
  return [
    'Inflows and outflows are closely matched on these inputs.',
    'Small assumption changes could tilt the picture either way.',
  ];
}

function pdfClassificationInterpretationParagraph(q: OptimisationQuality): string {
  if (q.kind === 'deficit') {
    if (q.label === 'GOOD_DEFICIT') {
      return 'This deficit appears to be strategic. It creates short-term pressure but may strengthen long-term capital and income.';
    }
    if (q.label === 'BAD_DEFICIT') {
      return 'This deficit appears to weaken the structure. The pressure is not clearly justified by long-term benefit.';
    }
    return 'This deficit may be manageable, but the margin is thin and should be monitored carefully.';
  }
  if (q.kind === 'surplus') {
    if (q.label === 'PRODUCTIVE_SURPLUS') {
      return 'This surplus supports the structure and appears to strengthen long-term capital.';
    }
    return 'This surplus is stable, but may not be fully utilised to build future income.';
  }
  return 'Inflows and outflows are closely matched on these inputs. Small changes could tilt the picture either way.';
}

type PdfIeTraceMode = 'full' | 'compact' | 'minimal';

function pdfIeTraceDensityScore(args: {
  loanCount: number;
  assetUnlockCount: number;
  suggestionCount: number;
  lionEnabled: boolean;
}): number {
  let s = 0;
  s += Math.min(4, args.loanCount * 2);
  s += Math.min(3, args.assetUnlockCount);
  if (args.suggestionCount >= 4) s += 1;
  if (args.lionEnabled) s += 1;
  return s;
}

function pdfIeTraceModeFromScore(score: number, invalid: boolean): PdfIeTraceMode {
  if (invalid) return 'minimal';
  if (score >= 8) return 'minimal';
  if (score >= 4) return 'compact';
  return 'full';
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
        'The plan is close to working, but the margin is thin. A few weaker months or a small miss in assumptions could quickly put the structure under pressure.',
      subheading: 'Where to strengthen the plan',
      suggestions: [
        'Stress-test income and return assumptions with your adviser.',
        'Identify expenses that can be reduced or made more flexible if conditions tighten.',
        'Build or preserve a modest buffer before relying on this structure over the long term.',
      ],
      tagline: 'Small adjustments made early can reduce bigger problems later.',
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

export interface PrintReportViewProps {
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

  const ieOptimisationPdf = useMemo(() => {
    const decision = buildOptimisationDecisionView({ summary, totalCapital, loans });
    const invalid = summary.sustainabilityStatus === 'invalid';
    const density = pdfIeTraceDensityScore({
      loanCount: loans.length,
      assetUnlockCount: assetUnlocks.length,
      suggestionCount: suggestions.length,
      lionEnabled: lionAccessEnabled,
    });
    const traceMode = pdfIeTraceModeFromScore(density, invalid);
    const c = (n: number) => formatCurrency(n, currency);
    const f = decision.formulaParts;
    const positionRaw = decision.positionRaw;
    const magnitude = decision.magnitude;
    const flowWord: 'deficit' | 'surplus' | null =
      positionRaw > 0 ? 'deficit' : positionRaw < 0 ? 'surplus' : null;

    const statusLabelLocal = getStatusLabel(summary.sustainabilityStatus);

    const maxLoanY = decision.funding.longestLoanYears;
    const positiveTenures = loans.map((l) => l.tenureYears).filter((y) => Number.isFinite(y) && y > 0);
    const loanYearsForPressure = maxLoanY ?? (positiveTenures.length ? Math.max(...positiveTenures) : null);
    const loanPressureBullet =
      loans.length === 0
        ? `Loan pressure: ${c(0)} per month (no modelled loans).`
        : `Loan pressure: ${c(summary.monthlyLoanRepayments)} per month over ${loanYearsForPressure ?? 'modelled'} years.`;

    const netBullet = `Net monthly position: ${c(magnitude)}${flowWord ? ` ${flowWord}` : ''}.`;
    const unlockedBullet = `Total capital unlocked: ${c(decision.funding.totalUnlocked)}.`;
    const structureBullet = `Structure status: ${statusLabelLocal}.`;

    const [interp1, interp2] = pdfInterpretiveTracePair(decision.quality);

    const showClassification = !invalid;

    let whyBullets: string[];
    if (!showClassification) {
      whyBullets = [
        structureBullet,
        'Review inputs with your adviser until the scenario falls within illustrated ranges.',
      ];
    } else if (traceMode === 'minimal') {
      whyBullets = [structureBullet, interp1];
    } else if (traceMode === 'compact') {
      whyBullets =
        loans.length >= 1
          ? [netBullet, loanPressureBullet, interp1]
          : [netBullet, structureBullet, interp1];
    } else {
      whyBullets =
        loans.length >= 1
          ? [netBullet, unlockedBullet, loanPressureBullet, interp1, interp2]
          : [netBullet, unlockedBullet, structureBullet, interp1, interp2];
    }

    const capitalOutcomeBody =
      decision.capitalOutcome.remainingAfterLoans != null
        ? `After loan periods, the model still points to roughly ${c(decision.capitalOutcome.remainingAfterLoans)} in additional capital where that figure is available.`
        : 'This model shows your portfolio and unlocked liquidity today. It does not project balances after every loan has fully repaid, so long-term capital persistence is described in cautious terms only.';

    const incomeGrowthLine =
      decision.capitalOutcome.incomeGrowthHint === 'likely_supportive'
        ? 'On these inputs, unlocked capital and investment income appear to support stronger long-term, income-generating capital.'
        : decision.capitalOutcome.incomeGrowthHint === 'uncertain'
          ? 'Unlocked capital is present, but the long-term income effect depends on how it stays invested and how loans evolve.'
          : 'With little or no unlocking capital on these inputs, the structure is less clearly adding long-term income-generating capital from that lever.';

    const tenureLine =
      decision.funding.shortestLoanYears != null && decision.funding.longestLoanYears != null
        ? decision.funding.shortestLoanYears === decision.funding.longestLoanYears
          ? `${decision.funding.shortestLoanYears} years`
          : `${decision.funding.shortestLoanYears} to ${decision.funding.longestLoanYears} years`
        : loans.length
          ? 'See loan table above for tenures.'
          : 'Not modelled (no loans from unlocking capital).';

    return {
      decision,
      traceMode,
      showClassification,
      whyBullets,
      capitalOutcomeBody,
      incomeGrowthLine,
      tenureLine,
      pillColors: pdfClassificationPillColors(decision.quality),
      formulaLineDisplay: `(${c(f.expenses)} + ${c(f.loanRepayments)}) − (${c(f.recurringIncome)} + ${c(f.investmentIncome)}) = ${c(magnitude)}${flowWord ? ` ${flowWord}` : ''}`,
      netHeadline: `Net monthly position: ${c(magnitude)}${flowWord ? ` ${flowWord}` : ''}`,
      interpretationParagraph: showClassification
        ? pdfClassificationInterpretationParagraph(decision.quality)
        : 'Critical inputs sit outside illustrated limits. Stabilise the scenario with your adviser before relying on this narrative.',
    };
  }, [
    summary,
    totalCapital,
    loans,
    assetUnlocks.length,
    suggestions.length,
    lionAccessEnabled,
    currency,
  ]);

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
      shortFooterLegal={CB_REPORT_PLAYWRIGHT_PDF_CANONICAL_FOOTER}
      documentRootId="print-report"
      printHeaderVisibility={{ showModelName: true, showReportId: false, showVersion: false }}
    >
      <div data-pdf-part="1">
      <PdfSection className="cb-advisory-doc-cover cb-page-break-after" aria-label="Cover">
        <PdfAdvisoryCoverPage
          title="INCOME ENGINEERING — STRATEGIC WEALTH REPORT"
          subtitle="Income Engineering: shows where capital can be unlocked, allocated, or strengthened under your stated assumptions."
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
              ? "Where this report fits in your Capital Bridge journey, and your Lion’s Verdict if it is included in your plan."
              : "Where Income Engineering sits in the Capital Bridge journey and how to read the evidence in Section B — full Lion’s Verdict narrative is available on paid plans."
          }
          whyThisMatters="This gives context first, then the supporting numbers, so the report is easier to follow."
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
            This report follows your sustainability check in Forever Income.
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
            <li style={{ marginBottom: '6px' }}>Where can income be improved within your current structure?</li>
            <li style={{ marginBottom: '6px' }}>Which assets can be turned into usable capital?</li>
            <li style={{ marginBottom: 0 }}>How can surplus be used to build long-term capital growth?</li>
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
            The Income Engineering Model looks at how your capital can be used, not just where it sits.
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
            <li style={{ marginBottom: '6px' }}>Where income already exceeds your needs (surplus)</li>
            <li style={{ marginBottom: '6px' }}>Where capital may be unlocked from existing assets</li>
            <li style={{ marginBottom: 0 }}>How using capital, including borrowing, may affect long-term outcomes</li>
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
            Different capital structures can lead to very different outcomes over time.
          </p>
          <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.55, margin: '0 0 6px' }}>
            Instead of assuming the right answer, this model helps you compare options by showing:
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
            <li style={{ marginBottom: '6px' }}>How the cost of capital compares with expected outcomes</li>
            <li style={{ marginBottom: '6px' }}>How each decision affects the overall picture under the same assumptions</li>
            <li style={{ marginBottom: 0 }}>How the structure performs as a whole</li>
          </ul>
          <p style={{ fontSize: '11px', color: '#374151', lineHeight: 1.55, margin: 0 }}>
            All results are based on the assumptions in this report and are not guaranteed.
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
            From here, the journey continues:
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
              Capital Health → shows whether the structure remains sustainable over time
            </li>
            <li style={{ marginBottom: 0 }}>
              Capital Stress → shows how the structure may behave under changing conditions
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
      </div>

      <div data-pdf-part="2">
        <PdfSection className="cb-page-break" aria-label="Section B — Advisor Read">
        <PdfAdvisorySectionLead
          stageLabel="Section B — Advisor Read"
          title="Advisor Read"
          whatThisShows="Your assumptions, income, loans, capital unlocking lines, allocations, coverage, and headline results — the key numbers being reviewed."
          whyThisMatters="This gives you one clear set of numbers before moving into deeper analysis and next steps."
        />

        <section className="section" style={sectionBlock}>
          <PrintStageLabel>Input Summary</PrintStageLabel>
          <h2 style={sectionHeading}>Your model inputs</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#4b5563', lineHeight: 1.55 }}>
            The tables below show the assumptions used for this review, including your targets, income, any loans used to unlock capital, each capital unlocking line, and your investment buckets.
          </p>
        </section>

        <section className="section" style={sectionBlock}>
          <h2 style={sectionHeading}>Expectations</h2>
          <p style={{ margin: '0 0 4px', color: '#2d3748' }}><strong style={{ color: '#0D3A1D' }}>Currency:</strong> {currency}</p>
          <p style={{ margin: 0, color: '#2d3748' }}><strong style={{ color: '#0D3A1D' }}>Target monthly expenses:</strong> {formatCurrency(monthlyExpenses, currency)}</p>
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
                <td style={{ padding: '6px 0', fontWeight: 600, color: '#0D3A1D' }}>Total monthly recurring income</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#0D3A1D' }}>{formatCurrency(summary.monthlyIncome, currency)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="section" style={sectionBlock}>
          <h2 style={sectionHeading}>Loan repayments from capital unlocking</h2>
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
          <h2 style={sectionHeading}>Capital unlocking options</h2>
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
                        Estimated capital unlocked: {formatCurrency(liq, currency)}
                        {repayment > 0 && <> · Monthly repayment: {formatCurrency(repayment, currency)}/mo</>}
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
            title="Coverage based on your inputs"
            titleStyle={{ fontFamily: CB_FONT_SERIF, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '13px', color: '#0D3A1D', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid rgba(255, 204, 106, 0.55)' }}
            whatThisShows="How much of your total monthly outflows are covered by monthly inflows, including modelled investment income, in both a typical month and the weakest month modelled."
            whyThisMatters="An average month can hide a weaker one. Looking at both the typical month and the weakest month gives a clearer picture."
            interpretation={
              <p style={{ margin: 0, fontSize: '12px', color: '#2d3748', lineHeight: 1.58 }}>
                Together, these two views show whether the income structure is genuinely robust or only appears workable under normal conditions.
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
      </div>

      <div data-pdf-part="3">
      <PdfSection className="cb-page-break" aria-label="Section C — Deeper analysis">
      <PdfAdvisorySectionLead
        stageLabel="Section C — Deeper analysis"
        title="Deeper analysis"
        whatThisShows="What the results mean, what may need attention, and what to consider next."
        whyThisMatters="This helps turn the numbers into practical next steps."
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
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', margin: '0 0 8px', lineHeight: 1.35 }}>
          Net monthly position
        </h3>
        <p style={{ margin: '0 0 6px', color: '#2d3748', lineHeight: 1.58, fontWeight: 600 }}>{ieOptimisationPdf.netHeadline}</p>
        <p style={{ margin: '0 0 6px', color: '#2d3748', lineHeight: 1.58 }}>
          <strong style={{ color: '#0D3A1D' }}>What this shows</strong>
        </p>
        <p style={{ margin: '0 0 8px', color: '#2d3748', lineHeight: 1.58 }}>
          Your total monthly position after accounting for all inflows and outflows.
        </p>
        <p style={{ margin: '0 0 4px', color: '#2d3748', lineHeight: 1.58 }}>
          <strong style={{ color: '#0D3A1D' }}>Calculation</strong>
        </p>
        <p style={{ margin: '0 0 2px', color: '#2d3748', lineHeight: 1.58, fontSize: '11px' }}>
          (Total expenses + total loan repayments) − (total income + total investment income)
        </p>
        <p style={{ margin: '0 0 10px', color: '#2d3748', lineHeight: 1.58, fontSize: '11px' }}>
          {ieOptimisationPdf.formulaLineDisplay}
        </p>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', margin: '0 0 10px', lineHeight: 1.35 }}>
          Structure classification
        </h3>
        {ieOptimisationPdf.showClassification ? (
          <div style={{ margin: '14px 0 20px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '10px 22px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#fff',
                lineHeight: 1.35,
                backgroundColor: ieOptimisationPdf.pillColors.bg,
                border: `1px solid ${ieOptimisationPdf.pillColors.border}`,
              }}
            >
              {pdfQualityHeading(ieOptimisationPdf.decision.quality)}
            </span>
          </div>
        ) : (
          <div style={{ margin: '14px 0 20px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '10px 22px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#fff',
                lineHeight: 1.35,
                backgroundColor: '#6B7280',
                border: '1px solid #6B7280',
              }}
            >
              Not available
            </span>
            <p style={{ margin: '10px 0 0', color: '#2d3748', lineHeight: 1.58, fontSize: '11px' }}>
              Inputs sit outside illustrated ranges.
            </p>
          </div>
        )}
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', margin: '0 0 8px', lineHeight: 1.35 }}>
          Why this classification
        </h3>
        <ul
          style={{
            margin: '0 0 12px',
            paddingLeft: '20px',
            color: '#2d3748',
            lineHeight: 1.55,
            fontSize: '11px',
            listStyleType: 'disc',
            listStylePosition: 'outside',
          }}
        >
          {ieOptimisationPdf.whyBullets.map((line, i) => (
            <li key={i} style={{ marginBottom: i === ieOptimisationPdf.whyBullets.length - 1 ? 0 : '6px' }}>
              {line}
            </li>
          ))}
        </ul>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', margin: '0 0 8px', lineHeight: 1.35 }}>
          What is driving this
        </h3>
        <ul
          style={{
            margin: '0 0 12px',
            paddingLeft: '20px',
            color: '#2d3748',
            lineHeight: 1.55,
            fontSize: '11px',
            listStyleType: 'disc',
            listStylePosition: 'outside',
          }}
        >
          <li style={{ marginBottom: '6px' }}>
            Covered by existing capital: {triLabelPdf(ieOptimisationPdf.decision.funding.capitalCover)}.
          </li>
          <li style={{ marginBottom: '6px' }}>
            Covered by investment income: {triLabelPdf(ieOptimisationPdf.decision.funding.investmentIncomeCover)}.
          </li>
          <li style={{ marginBottom: '6px' }}>
            Pressure period (loan tenure range): {ieOptimisationPdf.tenureLine}
          </li>
          <li style={{ marginBottom: 0 }}>
            Total capital unlocked: {formatCurrency(ieOptimisationPdf.decision.funding.totalUnlocked, currency)}.
          </li>
        </ul>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', margin: '0 0 8px', lineHeight: 1.35 }}>
          Capital outcome if maintained
        </h3>
        <ul
          style={{
            margin: '0 0 12px',
            paddingLeft: '20px',
            color: '#2d3748',
            lineHeight: 1.55,
            fontSize: '11px',
            listStyleType: 'disc',
            listStylePosition: 'outside',
          }}
        >
          <li style={{ marginBottom: '6px' }}>
            Total capital unlocked: {formatCurrency(ieOptimisationPdf.decision.capitalOutcome.totalUnlocked, currency)}.
          </li>
          <li style={{ marginBottom: '6px' }}>{ieOptimisationPdf.capitalOutcomeBody}</li>
          <li style={{ marginBottom: 0 }}>{ieOptimisationPdf.incomeGrowthLine}</li>
        </ul>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', margin: '0 0 8px', lineHeight: 1.35 }}>
          Interpretation
        </h3>
        <ul
          style={{
            margin: '0 0 8px',
            paddingLeft: '20px',
            color: '#2d3748',
            lineHeight: 1.55,
            fontSize: '11px',
            listStyleType: 'disc',
            listStylePosition: 'outside',
          }}
        >
          <li style={{ marginBottom: '6px' }}>A surplus does not always mean the structure is strong.</li>
          <li style={{ marginBottom: 0 }}>A deficit does not always mean the structure is weak.</li>
        </ul>
        <p style={{ margin: '0 0 12px', color: '#2d3748', lineHeight: 1.58, fontSize: '11px' }}>
          {ieOptimisationPdf.interpretationParagraph}
        </p>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', margin: '0 0 8px', lineHeight: 1.35 }}>
          Short-term vs long-term
        </h3>
        <p style={{ margin: '0 0 12px', color: '#2d3748', lineHeight: 1.58, fontSize: '11px' }}>
          In the short term, modelled loan pressure is spread over about {ieOptimisationPdf.tenureLine}. {ieOptimisationPdf.incomeGrowthLine}
        </p>
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', margin: '0 0 8px', lineHeight: 1.35 }}>
          What to do next
        </h3>
        <p style={{ margin: '0 0 8px', color: '#2d3748', lineHeight: 1.58, fontSize: '11px' }}>{optSubheading}</p>
        <ol style={{ margin: '0 0 12px', paddingLeft: '20px', color: '#2d3748' }}>
          {(ieOptimisationPdf.showClassification ? ieOptimisationPdf.decision.nextSteps : suggestions).map((s, i) => (
            <li key={i} style={{ marginBottom: '4px', fontSize: '11px', lineHeight: 1.55 }}>
              {s}
            </li>
          ))}
        </ol>
        {optTagline ? (
          <p style={{ marginTop: '14px', fontSize: '13px', fontStyle: 'italic', fontWeight: 300, color: '#0D3A1D' }}>&ldquo;{optTagline}&rdquo;</p>
        ) : null}
      </section>
      </PdfSection>

      <PdfSection className="cb-appendix cb-page-break" aria-label="Appendix and closing">
        <PdfAdvisorySectionLead
          stageLabel="Appendix and next steps"
          title="Disclosures and next steps"
          whatThisShows="How to use this report, the regulatory context, and the next step in your Capital Bridge journey."
          whyThisMatters="This closes the report clearly by explaining what it is for and what to review next with your adviser."
        />
        <section className="section" style={sectionBlock}>
          <h2 style={sectionHeading}>Disclosures and how to use this report</h2>
          <p style={{ marginBottom: '12px', color: '#2d3748', lineHeight: 1.58 }}>
            This document is generated from the Capital Bridge Income Engineering model and is intended for discussion with your adviser. It does not constitute personal advice. The footer on each page contains the legal notice.
          </p>
          <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#0D3A1D', textTransform: 'uppercase', marginBottom: '8px', lineHeight: 1.35 }}>How to use this report</h3>
          <ul style={{ margin: '0 0 16px', paddingLeft: '20px', color: '#2d3748', lineHeight: 1.55 }}>
            <li style={{ marginBottom: '6px' }}>Review it alongside your live model inputs during an advisory discussion.</li>
            <li style={{ marginBottom: '6px' }}>Treat all illustrations as scenario-based, not guaranteed outcomes.</li>
            <li style={{ marginBottom: '6px' }}>If assumptions change materially, refresh the live model before the next review.</li>
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
              Recommended next step: Capital Health
            </h3>
            <p style={{ margin: '0 0 12px', color: '#2d3748', fontSize: '10pt', lineHeight: 1.55 }}>
              Capital Health shows whether your capital structure can remain sustainable over time under your stated assumptions. It is the natural next step once income and allocation are aligned in this model.
            </p>
            <p style={{ margin: 0, fontSize: '10pt', fontWeight: 600, color: '#0D3A1D' }}>
              Next step:&nbsp;
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
            paddingTop: '8px',
            textAlign: 'center',
          }}
        >
        <p
          style={{
            fontSize: '11px',
            color: '#5f6b67',
            lineHeight: 1.55,
            maxWidth: '36em',
            margin: '0 auto',
          }}
        >
          This report is for advisory purposes only. All illustrations are based on your assumptions and are not a guarantee of future outcomes. The footer on each page contains the legal notice.
        </p>
      </div>
      </div>
    </PdfLayout>
  );
};
