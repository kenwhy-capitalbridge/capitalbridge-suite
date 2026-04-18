/**
 * Dedicated print-only report layout for the Capital Stress Model.
 * Rendered only when printing; not the live UI. White background, section flow, no repeated header.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { CB_REPORT_PLAYWRIGHT_PDF_CANONICAL_FOOTER } from '@cb/shared/legalMonocopy';
import {
  CB_REPORT_SOFT_PANEL_BG,
  CB_REPORT_SOFT_PANEL_BORDER,
} from '@cb/shared/cbReportTemplate';
import { createReportAuditMeta, type ReportAuditMeta } from '@cb/shared/reportTraceability';
import {
  beginReportReadyCycle,
  completeReportReadyCycle,
  subscribeReportReadyOnPrint,
} from '@cb/pdf';
import {
  PdfAdvisoryCoverPage,
  PdfAdvisorySectionLead,
  PdfChartBlock,
  PdfLayout,
  PdfLionsVerdictBlock,
  PdfSection,
  PDF_TOC_CAPITAL_STRESS,
} from '@cb/pdf/shared';
import { formatReportGeneratedAtLabel } from '@cb/shared/reportIdentity';
import { CB_FONT_SERIF } from '@cb/shared/typography';
import type { MonteCarloResult, StressScenarioResult } from './types';
import type { DepletionBarOutput } from './DepletionBarContext';
import type { LionStressAdvisoryInputs, LionVerdictOutput } from '@cb/advisory-graph/lionsVerdict';
import {
  formatLionPublicStatusLabel,
  lionPublicStatusFromScore0to100,
  lionStrongEligibilityFromStressInputs,
  stressScoreToDisplay0to100,
} from '@cb/advisory-graph/lionsVerdict';
import type { VerdictNarrative } from './services/advisory_engine';
import { getDepletionBarOutput } from './services/mathUtils';
import { buildLionContext, generateLionDecisions, generateLionNarrative } from '@cb/lion-verdict';
import { buildPdfNarrative } from '@cb/pdf/build-narrative';
import {
  SYSTEM_INSIGHT_LIMITED_LINES,
  SYSTEM_INSIGHT_LIMITED_TITLE,
} from '../../../packages/lion-verdict/systemInsightCopy';
import { PLATFORM_APP_URL } from '@cb/shared/urls';
import {
  CapitalTimelinePrintSection,
  type CapitalTimelinePrintPayload,
} from '@cb/advisory-graph/reports';

type CapitalHealthStatus = 'Strong' | 'Stable' | 'Watchful' | 'Needs Attention' | 'Critical';
type FragilityIndexTier = 'FORTIFIED' | 'Highly Robust' | 'Stable' | 'Fragile' | 'Critical';

export interface PrintReportProps {
  mcResult: MonteCarloResult;
  depletionBarOutput: DepletionBarOutput | null;
  investment: number;
  withdrawal: number;
  years: number;
  confidence: number;
  lowerPct: number;
  upperPct: number;
  effectiveInflation: number;
  stressScenarioResults: StressScenarioResult[] | null;
  adjustmentResults: {
    reduceWithdrawal: MonteCarloResult | null;
    extendHorizon: MonteCarloResult | null;
    improveReturns: MonteCarloResult | null;
  } | null;
  formatCurrency: (n: number) => string;
  formatPercent: (n: number) => string;
  formatPercentSmall: (n: number) => string;
  formatSignedPct: (n: number) => string;
  healthStatus: CapitalHealthStatus;
  fragilityIndex: number;
  fiTier: FragilityIndexTier;
  verdict: VerdictNarrative | null;
  /** Full engine output (score, lists, if-you-do-nothing); single source with live UI. */
  lionVerdictOutput: LionVerdictOutput | null;
  /** Same shape as live Stress advisory inputs — used for public status STRONG gate on PDF. */
  stressAdvisoryInputs: LionStressAdvisoryInputs | null;
  keyTakeaways: string[];
  recommendedAdjustments: string[];
  microSignals: { type: 'warn' | 'ok'; text: string }[];
  medianPathYearly: number[];
  reportClientDisplayName?: string;
  /** When false, print omits full Lion Verdict narrative and engine lists (trial). */
  lionAccessEnabled?: boolean;
  /** Set immediately before `window.print()` for traceability header/footer. */
  auditMeta?: ReportAuditMeta | null;
  /** Optional progression page — only passed when prior saved reports exist. */
  capitalTimelinePrintPayload?: CapitalTimelinePrintPayload | null;
  /** Adds Execution Pathway (Early Access) to the Lion PDF block when true. */
  hasStrategicInterest?: boolean;
}

const PRINT_TEXT = '#0D3A1D';
/** Cover logo uses brand gold in `PdfAdvisoryCoverPage`; report body stays #0D3A1D for legibility. */
const PRINT_BORDER = 'rgba(13, 58, 29, 0.18)';
const CHART_AXIS = 'rgba(13, 58, 29, 0.5)';
const CHART_MEDIAN_BAR = '#1b4d3e';

/** Slightly smaller body for print flow (was 10pt); tweak ±1pt to balance page breaks. */
const BODY_PT = '9pt';
const BODY_PT_SMALL = '8.5pt';

/** Policy B gradient (matches live Depletion Pressure gauge). */
const DEPLETION_GAUGE_COLORS = ['#CA3A2E', '#D27A1F', '#E3A539', '#9BAA23', '#1F8A4D'] as const;

function depletionPressureInterpretationForPdf(pillLabel: string): string {
  switch (pillLabel) {
    case 'Stable':
      return 'Withdrawals are currently manageable but may place pressure on capital sustainability over time.';
    case 'Watchful':
      return 'Withdrawals are within a manageable range; monitor as conditions change.';
    case 'Vulnerable':
      return 'Withdrawals are beginning to place noticeable pressure on capital sustainability.';
    case 'Fragile':
      return 'Withdrawals are placing significant pressure on long-term capital sustainability.';
    case 'Critical':
      return 'Withdrawals are currently placing heavy strain on long-term capital sustainability.';
    default:
      return 'This indicator shows whether withdrawals are placing strain on the sustainability of your capital.';
  }
}

function pillTextColorForDepletionPill(label: string): string {
  return label === 'Watchful' || label === 'Vulnerable' ? '#0D3A1D' : '#FFFFFF';
}

const STRESS_CHART_TITLE_STYLE: React.CSSProperties = {
  fontFamily: CB_FONT_SERIF,
  fontSize: '13pt',
  fontWeight: 700,
  color: PRINT_TEXT,
  marginBottom: '0.5em',
  textTransform: 'uppercase',
};

const STRESS_SECTION_BLOCK: React.CSSProperties = {
  marginBottom: '1.25em',
  padding: '16px 18px',
  background: CB_REPORT_SOFT_PANEL_BG,
  borderRadius: '8px',
  border: `1px solid ${CB_REPORT_SOFT_PANEL_BORDER}`,
  breakInside: 'avoid',
  pageBreakInside: 'avoid',
};

/**
 * Section H2 style used across Section B / C blocks.
 * Uses `pt` (not `px`) so it scales with the rest of the print stylesheet.
 */
const STRESS_SECTION_H2: React.CSSProperties = {
  fontFamily: CB_FONT_SERIF,
  fontSize: '12pt',
  fontWeight: 700,
  color: PRINT_TEXT,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginTop: 0,
  marginBottom: '0.6em',
  paddingBottom: '0.35em',
  borderBottom: `1px solid ${PRINT_BORDER}`,
  lineHeight: 1.35,
};

/**
 * Print-only stage label. `keepWithNext` pins the label to the block that
 * follows it (prevents "Charts and visuals" ending up alone on a page
 * when the next chart wraps to the following page).
 */
function PrintStageLabel({
  children,
  keepWithNext,
}: {
  children: React.ReactNode;
  keepWithNext?: boolean;
}) {
  const style: React.CSSProperties | undefined = keepWithNext
    ? { pageBreakAfter: 'avoid', breakAfter: 'avoid' }
    : undefined;
  return (
    <p className="cb-print-stage-label" style={style}>
      {children}
    </p>
  );
}

type StressVerdictBucket = 'Safe' | 'Fragile' | 'Dangerous';

function stressVerdictBucketAllCaps(bucket: StressVerdictBucket): string {
  return bucket === 'Dangerous' ? 'DANGEROUS' : bucket.toUpperCase();
}

type StressVerdictChip = {
  bucket: StressVerdictBucket;
  /** Calm, colour-blind-friendly paint for the coloured badge. */
  fill: string;
  border: string;
  /** Dark text colour that sits on the fill. */
  text: string;
};

const STRESS_CHIP_SAFE: Omit<StressVerdictChip, 'bucket'> = { fill: '#D4ECDB', border: '#55B685', text: '#134F2C' };
const STRESS_CHIP_FRAGILE: Omit<StressVerdictChip, 'bucket'> = { fill: '#F9E2BE', border: '#D9A441', text: '#6A4B15' };
const STRESS_CHIP_DANGEROUS: Omit<StressVerdictChip, 'bucket'> = { fill: '#F4D6D2', border: '#CD5B52', text: '#7A1D16' };

/** Base 5-tier -> 3-bucket mapping (no context overrides applied). */
function baseVerdictFromFiTier(fiTier: FragilityIndexTier): StressVerdictChip {
  if (fiTier === 'Critical') return { bucket: 'Dangerous', ...STRESS_CHIP_DANGEROUS };
  if (fiTier === 'Fragile') return { bucket: 'Fragile', ...STRESS_CHIP_FRAGILE };
  return { bucket: 'Safe', ...STRESS_CHIP_SAFE };
}

/**
 * 5-tier FragilityIndexTier -> 3-bucket {Safe, Fragile, Dangerous} with override:
 *
 *   If base verdict is Safe AND survivalProbability is high AND capital erosion > 25%,
 *   the verdict is downgraded to Fragile. This avoids the "safe but eroding capital"
 *   contradiction where paths don't deplete but typical ending capital is meaningfully
 *   lower than what was put in.
 *
 * "Capital erosion" is measured as `1 - typicalEndingCapital / initialCapital`, i.e. how
 * much lower the median outcome is than the starting capital (purchasing power before
 * inflation is handled elsewhere in the report).
 */
function computeStressVerdict(args: {
  fiTier: FragilityIndexTier;
  survivalProbability: number;
  initialCapital: number;
  typicalEndingCapital: number;
}): { chip: StressVerdictChip; erosionPct: number; overrideApplied: boolean } {
  const base = baseVerdictFromFiTier(args.fiTier);
  const erosionPct =
    args.initialCapital > 0
      ? Math.max(0, 1 - args.typicalEndingCapital / args.initialCapital)
      : 0;
  const overrideApplied =
    base.bucket === 'Safe' && args.survivalProbability >= 0.9 && erosionPct >= 0.25;
  if (overrideApplied) {
    return { chip: { bucket: 'Fragile', ...STRESS_CHIP_FRAGILE }, erosionPct, overrideApplied };
  }
  return { chip: base, erosionPct, overrideApplied };
}

/** High (>=75) / Medium (50-74) / Low (<50) from the 0-100 resilience score. */
function confidenceLevelFromScore(score0to100: number): 'High' | 'Medium' | 'Low' {
  if (score0to100 >= 75) return 'High';
  if (score0to100 >= 50) return 'Medium';
  return 'Low';
}

/** One-line explainer for each confidence level (shown next to the label). */
const CONFIDENCE_EXPLAINER: Record<'High' | 'Medium' | 'Low', string> = {
  High: 'Outcomes are consistent across most scenarios.',
  Medium: 'Outcomes may vary depending on market conditions.',
  Low: 'Results are highly sensitive and may change significantly.',
};

/**
 * Compact Ringgit formatter for chart tick labels — `RM0`, `RM900k`, `RM1.5M`, `RM3M`.
 * Keeps axes scannable without long zero strings.
 */
function formatRmCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    const precision = m >= 10 || Math.abs(m - Math.round(m)) < 0.05 ? 0 : 1;
    return `${sign}RM${m.toFixed(precision)}M`;
  }
  if (abs >= 1_000) return `${sign}RM${Math.round(abs / 1_000)}k`;
  if (abs === 0) return 'RM0';
  return `${sign}RM${Math.round(abs)}`;
}

/** Plain-English runway read from engine outputs. */
function capitalRunwayLabel(
  survivalProbability: number,
  depletionRateByYear: readonly number[] | undefined,
  horizonYears: number,
): string {
  if (survivalProbability >= 0.95) return `Lasts the full ${horizonYears}-year horizon`;
  const arr = depletionRateByYear ?? [];
  const firstBreak = arr.findIndex((r, i) => i > 0 && r >= 0.5);
  if (firstBreak > 0 && firstBreak <= horizonYears) return `About ${firstBreak} years before pressure shows`;
  if (survivalProbability >= 0.7) return `Likely to last most of the ${horizonYears}-year horizon`;
  return `Shortens meaningfully before ${horizonYears} years`;
}

export function PrintReport(props: PrintReportProps) {
  const {
    mcResult,
    depletionBarOutput,
    investment,
    withdrawal,
    years,
    confidence,
    lowerPct,
    upperPct,
    effectiveInflation,
    stressScenarioResults,
    adjustmentResults,
    formatCurrency,
    formatPercent,
    formatPercentSmall,
    formatSignedPct,
    healthStatus,
    fragilityIndex,
    fiTier,
    verdict,
    lionVerdictOutput,
    stressAdvisoryInputs,
    keyTakeaways,
    recommendedAdjustments,
    microSignals,
    medianPathYearly,
    reportClientDisplayName = 'Client',
    lionAccessEnabled = true,
    auditMeta = null,
    capitalTimelinePrintPayload = null,
    hasStrategicInterest = false,
  } = props;
  const currencyLabel = useMemo(
    () => formatCurrency(0).replace(/[\d\s,.\-]/g, "").trim() || "RM",
    [formatCurrency],
  );
  const strategicExecutionUrl = `${PLATFORM_APP_URL.replace(/\/+$/, '')}/solutions`;

  const fallbackAuditRef = useRef<ReportAuditMeta | null>(null);
  if (fallbackAuditRef.current === null) {
    fallbackAuditRef.current = createReportAuditMeta({
      modelCode: 'STRESS',
      userDisplayName: reportClientDisplayName ?? 'Client',
    });
  }
  const layoutAudit = auditMeta ?? fallbackAuditRef.current;

  const depletionLabel = depletionBarOutput?.pillLabel ?? '—';
  const lionScorePrint = stressScoreToDisplay0to100(mcResult.capitalResilienceScore);
  const bandStressInputs: LionStressAdvisoryInputs =
    stressAdvisoryInputs ??
    ({
      capitalResilienceScore: mcResult.capitalResilienceScore,
      tier: mcResult.tier,
      fragilityIndicator: 'Watchful',
      initialCapital: investment,
      withdrawalAmount: withdrawal,
      timeHorizonYears: years,
      simulatedAverageOutcome: mcResult.simulatedAverage,
      maximumDrawdownPct: mcResult.maxDrawdownPctAvg,
      worstCaseOutcome: mcResult.percentile5,
    } satisfies LionStressAdvisoryInputs);
  const lionTierPrint = lionPublicStatusFromScore0to100(
    lionScorePrint,
    lionStrongEligibilityFromStressInputs(bandStressInputs),
  );
  const lionPublicLabelPrint = formatLionPublicStatusLabel(lionTierPrint);

  const lionPdfDataPrint = useMemo(() => {
    if (!lionAccessEnabled) return null;
    /**
     * The app captures a YEARLY withdrawal (see "YEARLY WITHDRAWAL" input). The Lion
     * engine fields are named `monthlyIncome` / `monthlyExpense` and its narrative
     * hard-codes "each month" phrasing, so we normalise yearly inputs → monthly here
     * to keep the engine's generated prose internally consistent. The PDF's own
     * top-summary panel reads these same underlying inputs in yearly form (see the
     * "Annual gap" block) — both representations are derived from the same source.
     */
    const assumedAnnualReturnForLion = ((lowerPct + upperPct) / 2) / 100;
    const monthlyIncomeForLion = (investment * assumedAnnualReturnForLion) / 12;
    const monthlyExpenseForLion = withdrawal / 12;
    const ctx = buildLionContext({
      currency: currencyLabel,
      monthlyIncome: monthlyIncomeForLion,
      monthlyExpense: monthlyExpenseForLion,
      totalCapital: mcResult.simulatedAverage,
      targetCapital: investment,
      coverageRatio: lionScorePrint / 100,
      sustainabilityYears: years,
      depletionPressure: lionPublicLabelPrint,
      modelType: 'STRESS',
    });
    const narrative = generateLionNarrative({ ...ctx, lionScore: lionScorePrint });
    const decisions = generateLionDecisions({ ...ctx, lionScore: lionScorePrint });
    return buildPdfNarrative(
      {
        ...ctx,
        clientName: reportClientDisplayName,
        lionScore: lionScorePrint,
        hasStrategicInterest,
      },
      narrative,
      decisions,
    );
  }, [
    lionAccessEnabled,
    reportClientDisplayName,
    lionScorePrint,
    investment,
    mcResult.simulatedAverage,
    currencyLabel,
    years,
    withdrawal,
    lowerPct,
    upperPct,
    lionPublicLabelPrint,
    hasStrategicInterest,
  ]);

  const reportGeneratedAt = auditMeta?.generatedAtLabel ?? formatReportGeneratedAtLabel();

  // Executive summary copy
  const overallAssessment =
    healthStatus === 'Strong' || healthStatus === 'Stable'
      ? 'The capital structure appears strong or stable under the current assumptions and is well positioned for the selected horizon.'
      : healthStatus === 'Watchful'
        ? 'The capital structure is watchful; monitoring and modest adjustments may improve resilience.'
        : healthStatus === 'Needs Attention'
          ? 'The capital structure needs attention; several risk factors suggest reinforcing the plan.'
          : 'The capital structure is under meaningful pressure; recommended adjustments should be considered.';

  const primaryRiskDrivers = [
    depletionLabel !== 'Stable' && depletionLabel !== '—' && 'Withdrawal pressure',
    fragilityIndex > 60 && 'Market sensitivity',
    mcResult.maxDrawdownPctAvg > 25 && 'Volatility exposure',
  ].filter(Boolean) as string[];
  const riskDriversText = primaryRiskDrivers.length > 0
    ? `Primary risk drivers: ${primaryRiskDrivers.join(', ')}.`
    : 'Key risk drivers are within a manageable range.';

  const suggestedFocus =
    healthStatus === 'Strong' || healthStatus === 'Stable'
      ? 'Consider periodic reviews to keep assumptions aligned with goals.'
      : 'Suggested focus: reducing withdrawals, improving return efficiency, or extending the investment horizon where possible.';

  const printReadyTokenRef = useRef(0);

  const printStableKey = useMemo(
    () =>
      [
        mcResult.capitalResilienceScore,
        mcResult.tier,
        mcResult.simulatedAverage,
        mcResult.percentile5,
        mcResult.maxDrawdownPctAvg,
        investment,
        withdrawal,
        years,
        confidence,
        lowerPct,
        upperPct,
        effectiveInflation,
        depletionLabel,
        healthStatus,
        fragilityIndex,
        fiTier,
        lionVerdictOutput?.score0to100 ?? 'none',
        lionVerdictOutput?.ifYouDoNothing ?? '',
        verdict?.opening ?? '',
        lionAccessEnabled,
        lionPdfDataPrint?.lion.headline ?? '',
        auditMeta?.reportId ?? '',
        keyTakeaways.join('\n'),
        recommendedAdjustments.join('\n'),
        microSignals.map((m) => m.text).join('\n'),
        medianPathYearly.length,
        medianPathYearly[0],
        medianPathYearly[medianPathYearly.length - 1] ?? '',
        stressScenarioResults?.length ?? 0,
        adjustmentResults?.reduceWithdrawal?.capitalResilienceScore ?? '',
        capitalTimelinePrintPayload?.points.map((p) => `${p.t}:${p.y}`).join(',') ?? '',
        hasStrategicInterest ? '1' : '0',
      ].join('|'),
    [
      mcResult,
      investment,
      withdrawal,
      years,
      confidence,
      lowerPct,
      upperPct,
      effectiveInflation,
      depletionLabel,
      healthStatus,
      fragilityIndex,
      fiTier,
      lionVerdictOutput,
      verdict,
      lionAccessEnabled,
      lionPdfDataPrint,
      auditMeta,
      keyTakeaways,
      recommendedAdjustments,
      microSignals,
      medianPathYearly,
      stressScenarioResults,
      adjustmentResults,
      capitalTimelinePrintPayload,
      hasStrategicInterest,
    ],
  );

  useLayoutEffect(() => {
    const token = beginReportReadyCycle();
    printReadyTokenRef.current = token;
    if (typeof window !== "undefined" && window.matchMedia("(print)").matches) {
      queueMicrotask(() => {
        void completeReportReadyCycle(token);
      });
    }
  }, [printStableKey]);

  const scheduleReportReady = useCallback(() => {
    void completeReportReadyCycle(printReadyTokenRef.current);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(print)').matches) {
      scheduleReportReady();
    }
  }, [printStableKey, scheduleReportReady]);

  useEffect(() => {
    return subscribeReportReadyOnPrint(scheduleReportReady);
  }, [scheduleReportReady]);

  useEffect(() => {
    const onResize = () => {
      if (typeof window !== 'undefined' && window.matchMedia('(print)').matches) {
        scheduleReportReady();
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [scheduleReportReady]);

  return (
    <div data-pdf-part="1">
    <PdfLayout
      audit={layoutAudit}
      shortFooterLegal={CB_REPORT_PLAYWRIGHT_PDF_CANONICAL_FOOTER}
      documentRootId="print-report"
      className="cb-capital-stress-pdf-doc"
      printHeaderVisibility={{ showModelName: true, showReportId: false, showVersion: false }}
    >
      <PdfSection className="cb-advisory-doc-cover cb-page-break-after print-section section cb-print-cover" aria-label="Cover">
        <PdfAdvisoryCoverPage
          title="CAPITAL STRESS — STRATEGIC WEALTH REPORT"
          subtitle="How your capital may behave under stress — withdrawals, time horizon, and range of outcomes from the assumptions below."
          preparedForName={reportClientDisplayName}
          generatedAtLabel={reportGeneratedAt}
          toc={PDF_TOC_CAPITAL_STRESS}
        />
      </PdfSection>

      <PdfSection className="cb-advisory-doc-opening print-section section" aria-label="Section A — Opening">
        {/* Inline opener (rich body with bullets) — visually matches PdfAdvisorySectionLead but allows block-level children. */}
        <header className="cb-advisory-doc-section-divider">
          <div className="cb-print-stage-label cb-advisory-doc-stage-label">Section A — Opening</div>
          <h2
            className="cb-advisory-doc-section-divider-title"
            style={{
              fontFamily: CB_FONT_SERIF,
              fontSize: '15pt',
              fontWeight: 700,
              color: PRINT_TEXT,
              margin: '0 0 0.75em',
              letterSpacing: '0.01em',
            }}
          >
            Opening
          </h2>
          <h3
            className="cb-avoid-orphan-heading"
            style={{
              fontSize: BODY_PT,
              fontWeight: 700,
              color: PRINT_TEXT,
              margin: '0 0 0.45em',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            What this shows
          </h3>
          <p style={{ fontSize: BODY_PT, color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.55em' }}>
            Step 3 — Stress Testing your capital structure.
          </p>
          <p style={{ fontSize: BODY_PT, color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.55em' }}>
            This report shows how your capital behaves under different market conditions — not just one outcome, but{' '}
            <strong style={{ fontWeight: 700 }}>{mcResult.simulationCount.toLocaleString()} possible paths</strong>
            {' '}(Regime-Based Monte Carlo over your investment length of {years} year{years !== 1 ? 's' : ''}).
          </p>
          <p style={{ fontSize: BODY_PT, color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.3em' }}>You’ll see:</p>
          <ul style={{ fontSize: BODY_PT, color: PRINT_TEXT, lineHeight: 1.6, margin: '0 0 1em', paddingLeft: '1.3em', listStyleType: 'disc' }}>
            <li>What typically happens</li>
            <li>What happens in weaker scenarios</li>
            <li>Where pressure may start to appear</li>
          </ul>
          <h3
            className="cb-avoid-orphan-heading"
            style={{
              fontSize: BODY_PT,
              fontWeight: 700,
              color: PRINT_TEXT,
              margin: '0 0 0.45em',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Why this matters
          </h3>
          <p style={{ fontSize: BODY_PT, color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.55em' }}>
            A structure that looks fine in one scenario may fail in others.
          </p>
          <p style={{ fontSize: BODY_PT, color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.3em' }}>This step helps you understand:</p>
          <ul style={{ fontSize: BODY_PT, color: PRINT_TEXT, lineHeight: 1.6, margin: '0 0 0.25em', paddingLeft: '1.3em', listStyleType: 'disc' }}>
            <li>How stable your structure really is</li>
            <li>Where risks begin to build</li>
            <li>Whether your plan can hold over time</li>
          </ul>
        </header>
        <section style={STRESS_SECTION_BLOCK}>
          <p style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_TEXT, margin: '0 0 0.25em', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Capital Bridge Journey
          </p>
          <p style={{ fontSize: BODY_PT, fontWeight: 700, color: PRINT_TEXT, margin: '0 0 1em', letterSpacing: '0.03em' }}>
            How to read this report
          </p>
          {/* Highlight Step 3 so the reader immediately sees where they are in the Capital Bridge arc. */}
          <div
            style={{
              borderLeft: `3px solid ${CHART_MEDIAN_BAR}`,
              padding: '0.35em 0.85em',
              marginBottom: '1em',
              background: 'rgba(230, 187, 82, 0.08)',
            }}
          >
            <p style={{ fontSize: '10.5pt', fontWeight: 700, color: PRINT_TEXT, margin: '0 0 0.2em' }}>
              Step 3 — Capital Stress-Test
            </p>
            <p style={{ fontSize: BODY_PT, color: PRINT_TEXT, lineHeight: 1.5, margin: 0 }}>
              How does your structure behave under stress?
            </p>
          </div>
          <p style={{ fontSize: BODY_PT, color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.45em' }}>
            This report follows your full journey:
          </p>
          <ul style={{ fontSize: BODY_PT, color: PRINT_TEXT, lineHeight: 1.6, margin: '0 0 1em', paddingLeft: '1.3em', listStyleType: 'disc' }}>
            <li style={{ marginBottom: '0.4em' }}>
              <span style={{ fontWeight: 700 }}>Step 1 — Forever Income</span>
              <br />
              <span>Can your structure last?</span>
            </li>
            <li style={{ marginBottom: '0.4em' }}>
              <span style={{ fontWeight: 700 }}>Step 1B — Income Engineering</span>
              <br />
              <span>How is your capital structured?</span>
            </li>
            <li style={{ marginBottom: '0.4em' }}>
              <span style={{ fontWeight: 700 }}>Step 2 — Capital Health</span>
              <br />
              <span>Is the structure sustainable?</span>
            </li>
            <li style={{ marginBottom: 0 }}>
              <span style={{ fontWeight: 700 }}>Step 3 — Capital Stress-Test</span>
              <br />
              <span>What happens when conditions change?</span>
            </li>
          </ul>
          <p style={{ fontSize: BODY_PT, color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.45em' }}>
            At this stage, the focus is simple:
          </p>
          <ul style={{ fontSize: BODY_PT, color: PRINT_TEXT, lineHeight: 1.6, margin: 0, paddingLeft: '1.3em', listStyleType: 'disc' }}>
            <li>Does your structure hold under pressure?</li>
            <li>Where do risks begin to appear?</li>
            <li>How stable is it over time?</li>
          </ul>
        </section>
      </PdfSection>

      <PdfSection
        className="cb-lion-verdict print-section section print-page-break-before"
        aria-label="The Lion's Verdict"
      >
        <div
          className="lion-section"
          data-cb-lion-print-wrap
          style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
        >
          <div className="lion-verdict lion-verdict-one-page">
            {lionAccessEnabled && lionPdfDataPrint ? (
              (() => {
                /**
                 * Input-driven Lion's Verdict summary: replaces the engine's merged
                 * keyPoint+guidance with a short, consistent 3-line narrative that
                 * uses the same yearly income / withdrawal / gap framing as the Top Summary
                 * panel (annual gap). The other Lion fields (quote, why, system
                 * state, actions) still come from the engine.
                 */
                /**
                 * Yearly framing — user choice. Puts income and withdrawal on the same
                 * time basis so the "annual gap" figure is mathematically consistent.
                 * midReturnRate is the midpoint of the assumed return range.
                 */
                const midReturnRate = ((lowerPct + upperPct) / 2) / 100;
                const yearlyIncomeLocal = investment * midReturnRate;
                const yearlyWithdrawalLocal = withdrawal;
                const annualGapLocal = yearlyWithdrawalLocal - yearlyIncomeLocal;
                const incomeCovers = annualGapLocal <= 0;
                const verdictNow = computeStressVerdict({
                  fiTier,
                  survivalProbability: mcResult.survivalProbability,
                  initialCapital: investment,
                  typicalEndingCapital: mcResult.percentile50,
                });
                const bucket = verdictNow.chip.bucket;
                const stabilityClause =
                  bucket === 'Safe'
                    ? 'Your capital structure remains stable over time'
                    : bucket === 'Fragile'
                      ? 'Your capital structure is holding, but under pressure'
                      : 'Your capital structure is under meaningful stress';
                const incomeClause = incomeCovers
                  ? 'and your income currently covers your withdrawals.'
                  : 'but your income does not cover your withdrawals.';
                const gapLine = incomeCovers
                  ? `You are generating ${formatCurrency(yearlyIncomeLocal)} against ${formatCurrency(yearlyWithdrawalLocal)}, leaving an annual surplus of ${formatCurrency(Math.abs(annualGapLocal))}.`
                  : `You are generating ${formatCurrency(yearlyIncomeLocal)} against ${formatCurrency(yearlyWithdrawalLocal)}, resulting in an annual gap of ${formatCurrency(Math.abs(annualGapLocal))}.`;
                const bulletsBlock = incomeCovers
                  ? `This means:\n• Ongoing withdrawals are supported by current income\n• The structure ${bucket === 'Safe' ? 'supports itself without drawing down capital' : 'is holding, but sensitive to change'}`
                  : `This means:\n• Capital is being drawn down to support your lifestyle\n• ${bucket === 'Dangerous' ? 'The structure is on course to deplete under current conditions' : 'The structure survives, but depends on depletion'}`;
                const inputDrivenSummary = `${stabilityClause}, ${incomeClause}\n\n${gapLine}\n\n${bulletsBlock}`;
                return (
                  <PdfLionsVerdictBlock
                    scoreAndStatusLine={`Lion score: ${lionScorePrint} / 100 · ${lionPublicLabelPrint}`}
                    narrativeQuote={lionPdfDataPrint.lion.headline}
                    summary={inputDrivenSummary}
                    whyThisIsHappening={lionPdfDataPrint.diagnosis.why}
                    systemState={lionPdfDataPrint.diagnosis.state}
                    nextActions={lionPdfDataPrint.actions}
                    executionPathway={lionPdfDataPrint.executionPathway ?? undefined}
                    microSignals={microSignals}
                    titleColor={PRINT_TEXT}
                    labelColor={PRINT_TEXT}
                    scoreLineColor={PRINT_TEXT}
                    textColor={PRINT_TEXT}
                    accentColor={PRINT_TEXT}
                    fontSerif={CB_FONT_SERIF}
                  />
                );
              })()
            ) : !lionAccessEnabled ? (
              <>
                <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
                  {SYSTEM_INSIGHT_LIMITED_TITLE}
                </h2>
                <ul style={{ fontSize: '10pt', color: PRINT_TEXT, marginLeft: '1.25em', marginBottom: '0.75em', lineHeight: 1.5 }}>
                  {SYSTEM_INSIGHT_LIMITED_LINES.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p style={{ fontSize: '9pt', color: PRINT_TEXT, lineHeight: 1.45, margin: 0 }}>
                  Educational planning only — not a promise of outcomes.
                </p>
              </>
            ) : null}
          </div>
        </div>

        <section style={{ ...STRESS_SECTION_BLOCK, marginTop: '1.25em' }}>
          <h2 style={{ ...STRESS_SECTION_H2, marginTop: 0 }}>Confidence note</h2>
          <p style={{ fontSize: '10pt', color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.65em' }}>
            Where your structure remains stable across multiple simulated paths, this indicates a level of robustness under varied conditions.
          </p>
          <p style={{ fontSize: '10pt', color: PRINT_TEXT, lineHeight: 1.55, margin: 0 }}>
            While no model can remove uncertainty, alignment across sustainability, structure, and stress testing provides a stronger basis for moving forward with discipline.
          </p>
        </section>
      </PdfSection>

      <PdfSection className="print-section section print-page-break-before key-outcomes" aria-label="Section B — Key Insights">
        <PdfAdvisorySectionLead
          stageLabel="Section B — Key Insights"
          title="Key Insights"
          whatThisShows="Headline resilience metrics, a plain-language read of what they mean, and the scenario assumptions this report used."
          whyThisMatters="The key read comes first, then the evidence charts in Section C."
        />
        <PrintStageLabel>Top summary</PrintStageLabel>
        {(() => {
          const verdict = computeStressVerdict({
            fiTier,
            survivalProbability: mcResult.survivalProbability,
            initialCapital: investment,
            typicalEndingCapital: mcResult.percentile50,
          });
          const verdictChip = verdict.chip;
          const confidenceLabel = confidenceLevelFromScore(lionScorePrint);
          const confidenceExplainer = CONFIDENCE_EXPLAINER[confidenceLabel];
          const runwayLabel = capitalRunwayLabel(
            mcResult.survivalProbability,
            mcResult.depletionRateByYear,
            years,
          );
          /**
           * Cashflow framing — yearly. The app input `withdrawal` is a *yearly* figure
           * (see "YEARLY WITHDRAWAL" field in Scenario Builder), so everything here
           * stays on a yearly basis to avoid the mixed-unit "monthly vs yearly" trap.
           */
          const assumedAnnualReturn = ((lowerPct + upperPct) / 2) / 100;
          const yearlyIncomeFromCapital = investment * assumedAnnualReturn;
          const yearlyWithdrawalFigure = withdrawal;
          const annualGap = yearlyIncomeFromCapital - yearlyWithdrawalFigure;
          const annualGapLabel = `${annualGap >= 0 ? '+' : '−'}${formatCurrency(Math.abs(annualGap))}`;
          const annualGapTone: 'surplus' | 'deficit' = annualGap >= 0 ? 'surplus' : 'deficit';
          return (
            <section style={STRESS_SECTION_BLOCK}>
              <h2 style={STRESS_SECTION_H2}>Top summary</h2>
              {/* Focal element: Stress Verdict across full width. */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 6,
                  padding: '14px 16px',
                  background: verdictChip.fill,
                  border: `1.5px solid ${verdictChip.border}`,
                  borderRadius: 6,
                  marginBottom: '0.85em',
                }}
              >
                <div style={{ fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: verdictChip.text }}>
                  Stress verdict
                </div>
                <div
                  style={{
                    fontSize: '15pt',
                    fontWeight: 800,
                    color: verdictChip.text,
                    lineHeight: 1.1,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {stressVerdictBucketAllCaps(verdictChip.bucket)}
                </div>
                {(() => {
                  const erosionPctDisplay = Math.round(verdict.erosionPct * 100);
                  const bucket = verdictChip.bucket;
                  const detailLines =
                    bucket === 'Safe'
                      ? [`Your structure is stable across the ${years}-year horizon, with capital largely preserved.`]
                      : bucket === 'Fragile'
                        ? erosionPctDisplay >= 5
                          ? [
                              `Your structure remains stable, but capital gradually declines (~${erosionPctDisplay}%) over time.`,
                              `It does not run out, but it weakens under long-term pressure.`,
                            ]
                          : [`Your structure is holding, but sensitive to market or withdrawal pressure over the ${years}-year horizon.`]
                        : [`Your structure is under meaningful pressure and depletes under current conditions.`];
                  return (
                    <div style={{ fontSize: '9.5pt', color: verdictChip.text, lineHeight: 1.55, marginTop: 2 }}>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>Detail:</div>
                      {detailLines.map((line, idx) => (
                        <div key={idx} style={{ marginBottom: idx < detailLines.length - 1 ? 2 : 0 }}>
                          {line}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.85em',
                  fontSize: '10pt',
                  color: PRINT_TEXT,
                }}
              >
                <div>
                  <div style={{ fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: PRINT_TEXT, marginBottom: 4 }}>
                    Annual gap
                  </div>
                  <div style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_TEXT }}>
                    {annualGapLabel}
                  </div>
                  <div style={{ fontSize: '8.5pt', color: PRINT_TEXT, marginTop: 4 }}>
                    Expected yearly return on capital {annualGapTone === 'surplus' ? 'exceeds' : 'falls short of'} yearly withdrawal ({formatCurrency(yearlyWithdrawalFigure)}).
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: PRINT_TEXT, marginBottom: 4 }}>
                    Typical outcome
                  </div>
                  <div style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_TEXT }}>{formatCurrency(mcResult.simulatedAverage)}</div>
                  <div style={{ fontSize: '8.5pt', color: PRINT_TEXT, marginTop: 4 }}>
                    Range (Downside → Favourable): {formatCurrency(mcResult.percentile5)} — {formatCurrency(mcResult.percentile95)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: PRINT_TEXT, marginBottom: 4 }}>
                    Capital runway
                  </div>
                  <div style={{ fontSize: '10pt', fontWeight: 700, color: PRINT_TEXT }}>{runwayLabel}</div>
                  <div style={{ fontSize: '8.5pt', color: PRINT_TEXT, marginTop: 4 }}>
                    Capital survival: {Math.round(mcResult.survivalProbability * 100)}% of paths
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: PRINT_TEXT, marginBottom: 4 }}>
                    Confidence level
                  </div>
                  <div style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_TEXT }}>{confidenceLabel}</div>
                  <div style={{ fontSize: '8.5pt', color: PRINT_TEXT, marginTop: 4 }}>
                    {confidenceExplainer}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '9pt', color: PRINT_TEXT, lineHeight: 1.45, margin: '0.85em 0 0' }}>
                We simulate thousands of possible paths. These show the range of outcomes — not a single forecast.
              </p>
            </section>
          );
        })()}
        <section style={STRESS_SECTION_BLOCK}>
          <h2 style={{ ...STRESS_SECTION_H2, marginTop: 0 }}>What this means for you</h2>
          <ul
            style={{
              fontSize: '10pt',
              color: PRINT_TEXT,
              lineHeight: 1.55,
              margin: 0,
              paddingLeft: '1.2em',
              listStyleType: 'disc',
            }}
          >
            <li style={{ marginBottom: '0.45em' }}>{overallAssessment}</li>
            <li style={{ marginBottom: '0.45em' }}>{riskDriversText}</li>
            <li style={{ marginBottom: 0 }}>{suggestedFocus}</li>
          </ul>
        </section>
        {(() => {
          const verdict = computeStressVerdict({
            fiTier,
            survivalProbability: mcResult.survivalProbability,
            initialCapital: investment,
            typicalEndingCapital: mcResult.percentile50,
          });
          const verdictChip = verdict.chip;
          /**
           * Three decision paths aligned with the Capital Bridge framework:
           * Evaluate -> Engineer -> Stress -> Execute. Exactly one path is shown,
           * driven by the verdict bucket (including the Safe->Fragile override).
           */
          const path =
            verdictChip.bucket === 'Safe'
              ? {
                  key: 'STRENGTHEN',
                  headline: 'Strengthen your position',
                  body: [
                    'Your structure is stable and holding well.',
                    'The next step is not further analysis — it’s execution.',
                  ],
                  actions: [
                    'Validate your structure for execution readiness',
                    'Align capital for income and growth objectives',
                    'Request access to Strategic Execution',
                  ],
                  changes: [
                    'Turns a stable plan into an active structure',
                    'Converts surplus into long-term income',
                    'Moves from planning into implementation',
                  ],
                }
              : verdictChip.bucket === 'Fragile'
                ? {
                    key: 'STABILISE',
                    headline: 'Stabilise your structure',
                    body: [
                      'Your structure is holding, but under pressure.',
                      'Small adjustments can significantly improve resilience.',
                    ],
                    actions: [
                      'Reduce the income gap where possible',
                      'Rebalance how capital supports your income',
                      'Extend your capital runway',
                    ],
                    changes: [
                      'Improves consistency across scenarios',
                      'Reduces risk of future capital depletion',
                      'Strengthens stability under changing conditions',
                    ],
                  }
                : {
                    key: 'CORRECT',
                    headline: 'Correct the structure immediately',
                    body: [
                      'Your current structure is not sustainable.',
                      'Capital will be depleted under current conditions.',
                    ],
                    actions: [
                      'Reduce withdrawals or expenses',
                      'Increase income or restructure capital',
                      'Close the gap or make it intentional with a clear plan',
                    ],
                    changes: [
                      'Prevents early capital depletion',
                      'Restores sustainability to the structure',
                      'Brings the system back into a viable range',
                    ],
                  };
          return (
            <section style={STRESS_SECTION_BLOCK}>
              <h2 style={{ ...STRESS_SECTION_H2, marginTop: 0 }}>What to do next</h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: '0.65em',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    fontSize: '8pt',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: verdictChip.text,
                    background: verdictChip.fill,
                    border: `1px solid ${verdictChip.border}`,
                    borderRadius: 3,
                  }}
                  aria-hidden
                >
                  {path.key}
                </span>
                <span style={{ fontSize: '12pt', fontWeight: 700, color: PRINT_TEXT }}>{path.headline}</span>
              </div>
              {path.body.map((line) => (
                <p key={line} style={{ fontSize: '10pt', color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.5em' }}>
                  {line}
                </p>
              ))}
              <div style={{ marginTop: '0.75em' }}>
                <div style={{ fontSize: '8.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: PRINT_TEXT, marginBottom: 4 }}>
                  Actions
                </div>
                <ul
                  style={{
                    fontSize: '10pt',
                    color: PRINT_TEXT,
                    lineHeight: 1.55,
                    margin: 0,
                    paddingLeft: '1.2em',
                    listStyleType: 'disc',
                  }}
                >
                  {path.actions.map((line) => (
                    <li key={line} style={{ marginBottom: '0.3em' }}>{line}</li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: '0.75em' }}>
                <div style={{ fontSize: '8.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: PRINT_TEXT, marginBottom: 4 }}>
                  What this changes
                </div>
                <ul
                  style={{
                    fontSize: '10pt',
                    color: PRINT_TEXT,
                    lineHeight: 1.55,
                    margin: 0,
                    paddingLeft: '1.2em',
                    listStyleType: 'disc',
                  }}
                >
                  {path.changes.map((line) => (
                    <li key={line} style={{ marginBottom: '0.3em' }}>{line}</li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })()}
        <section style={STRESS_SECTION_BLOCK}>
          <h2 style={STRESS_SECTION_H2}>Assumptions captured here</h2>
          <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.85em', lineHeight: 1.6 }}>
            This model uses Regime-Based Monte Carlo modelling to simulate{' '}
            <strong style={{ fontWeight: 700 }}>{mcResult.simulationCount.toLocaleString()} possible paths</strong> — not a single forecast.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', color: PRINT_TEXT }}>
            <tbody>
              <tr><td style={{ padding: '5px 0' }}>Starting capital</td><td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(investment)}</td></tr>
              <tr><td style={{ padding: '5px 0' }}>Yearly withdrawal</td><td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(withdrawal)}</td></tr>
              <tr><td style={{ padding: '5px 0' }}>Time horizon</td><td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600 }}>{years} years</td></tr>
              <tr><td style={{ padding: '5px 0' }}>Return range</td><td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600 }}>{formatPercent(lowerPct)} to {formatPercent(upperPct)}</td></tr>
              <tr><td style={{ padding: '5px 0' }}>Inflation</td><td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600 }}>{effectiveInflation}% per year</td></tr>
            </tbody>
          </table>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.55, margin: '0.85em 0 0' }}>
            This shows how your structure behaves across a wide range of conditions, not just one expected outcome.
          </p>
        </section>
      </PdfSection>

      <PdfSection className="print-section section print-page-break-before" aria-label="Section C — Deeper look">
        <PdfAdvisorySectionLead
          stageLabel="Section C — Deeper look"
          title="Deeper look"
          whatThisShows="Charts and tables that unpack resilience: what this shows, how capital may evolve, and what happens if key assumptions worsen."
          whyThisMatters="Concrete visuals for tail risk and trade-offs — still anchored to the Section B headline."
        />
        <PrintStageLabel>Scenario summary</PrintStageLabel>
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Scenario Summary
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75em', fontSize: '10pt', marginBottom: '1.5em', padding: '0.75em', border: `1px solid ${PRINT_BORDER}`, borderRadius: 4 }}>
          <div><strong style={{ color: PRINT_TEXT }}>Structure Health</strong><br />{healthStatus}</div>
          <div><strong style={{ color: PRINT_TEXT }}>Time Horizon</strong><br />{years} years</div>
          <div><strong style={{ color: PRINT_TEXT }}>Typical Outcome</strong><br />{formatCurrency(mcResult.simulatedAverage)}</div>
          <div><strong style={{ color: PRINT_TEXT }}>Initial Capital</strong><br />{formatCurrency(investment)}</div>
          <div><strong style={{ color: PRINT_TEXT }}>Depletion Pressure</strong><br />{depletionLabel}</div>
          <div><strong style={{ color: PRINT_TEXT }}>Withdrawal</strong><br />{formatCurrency(withdrawal)}</div>
        </div>

        <PrintStageLabel keepWithNext>Charts and visuals</PrintStageLabel>

        <PdfChartBlock
          title="Structural Stability Map"
          titleStyle={STRESS_CHART_TITLE_STYLE}
          whatThisShows="Where this scenario sits on withdrawal pressure versus market sensitivity — the same headline read you saw with the Lion in Section A, shown as a simple map."
          whyThisMatters="Shows whether the story is driven more by spending pressure, market sensitivity, or both — a useful anchor before the curves and tables below."
          interpretation={
            <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: 0, lineHeight: 1.45 }}>
              Horizontal axis: lighter to heavier withdrawal pressure. Vertical axis: stronger resilience (lower) to higher market sensitivity (upper).
              Depletion label: {depletionLabel}
              {depletionBarOutput != null ? ` (${formatSignedPct(depletionBarOutput.displayValue)})` : ''}.
            </p>
          }
        >
        <div className="print-chart-wrap chart-block" style={{ minHeight: 320 }}>
          {(() => {
            const mapDepletion = depletionBarOutput ?? getDepletionBarOutput(mcResult.depletionPressurePct);
            const pressure = mapDepletion.pressure;
            const xNorm = Math.max(0, Math.min(100, ((pressure + 125) / 250) * 100));
            const yNorm = 100 - fragilityIndex;
            const zone = (x: number, y: number) => {
              const lowDep = x < 50;
              const lowFrag = y > 50;
              if (lowDep && lowFrag) return 'Strong Structure';
              if (!lowDep && lowFrag) return 'Withdrawal Risk';
              if (lowDep && !lowFrag) return 'Market Fragility';
              return 'Structural Stress';
            };
            const currentZone = zone(xNorm, yNorm);
            const mapPillLabel = mapDepletion.pillLabel;
            return (
              <>
                <svg viewBox="-18 -18 136 136" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', maxWidth: 400, height: 320 }} aria-label="Structural Stability Map">
                  <defs>
                    <linearGradient id="printZoneStrong" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#1F8A4D" stopOpacity="0.4"/><stop offset="100%" stopColor="#1F8A4D" stopOpacity="0.12"/></linearGradient>
                    <linearGradient id="printZoneWithdrawal" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#E3A539" stopOpacity="0.4"/><stop offset="100%" stopColor="#E3A539" stopOpacity="0.12"/></linearGradient>
                    <linearGradient id="printZoneMarket" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#0D9488" stopOpacity="0.4"/><stop offset="100%" stopColor="#0D9488" stopOpacity="0.12"/></linearGradient>
                    <linearGradient id="printZoneStress" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#CA3A2E" stopOpacity="0.4"/><stop offset="100%" stopColor="#CA3A2E" stopOpacity="0.12"/></linearGradient>
                  </defs>
                  <text x="50" y="116" textAnchor="middle" fontSize="4" fill={PRINT_TEXT} fontWeight="bold">Depletion Pressure</text>
                  <text x="50" y="122" textAnchor="middle" fontSize="2.6" fill={PRINT_TEXT}>← Lower pressure</text>
                  <text x="50" y="122" textAnchor="end" dx="48" fontSize="2.6" fill={PRINT_TEXT}>Heavier pressure →</text>
                  <text x="-10" y="50" textAnchor="middle" fontSize="4" fill={PRINT_TEXT} fontWeight="bold" transform="rotate(-90 -10 50)">Fragility Index</text>
                  <text x="-14" y="85" textAnchor="middle" fontSize="2.6" fill={PRINT_TEXT} transform="rotate(-90 -14 85)">↓ Stronger resilience</text>
                  <text x="-14" y="15" textAnchor="middle" fontSize="2.6" fill={PRINT_TEXT} transform="rotate(-90 -14 15)">↑ Higher sensitivity</text>
                  <rect x="0" y="50" width="50" height="50" fill="url(#printZoneStrong)" stroke={CHART_AXIS} strokeOpacity="0.45" strokeWidth="0.35"/>
                  <rect x="50" y="50" width="50" height="50" fill="url(#printZoneWithdrawal)" stroke={CHART_AXIS} strokeOpacity="0.45" strokeWidth="0.35"/>
                  <rect x="0" y="0" width="50" height="50" fill="url(#printZoneMarket)" stroke={CHART_AXIS} strokeOpacity="0.45" strokeWidth="0.35"/>
                  <rect x="50" y="0" width="50" height="50" fill="url(#printZoneStress)" stroke={CHART_AXIS} strokeOpacity="0.45" strokeWidth="0.35"/>
                  <line x1="50" y1="0" x2="50" y2="100" stroke={CHART_AXIS} strokeOpacity="0.55" strokeWidth="0.3"/>
                  <line x1="0" y1="50" x2="100" y2="50" stroke={CHART_AXIS} strokeOpacity="0.55" strokeWidth="0.3"/>
                  <text x="25" y="72" textAnchor="middle" fontSize="3.2" fill={PRINT_TEXT} fontWeight="600">Strong Structure</text>
                  <text x="75" y="72" textAnchor="middle" fontSize="3.2" fill={PRINT_TEXT} fontWeight="600">Withdrawal Risk</text>
                  <text x="25" y="22" textAnchor="middle" fontSize="3.2" fill={PRINT_TEXT} fontWeight="600">Market Fragility</text>
                  <text x="75" y="22" textAnchor="middle" fontSize="3.2" fill={PRINT_TEXT} fontWeight="600">Structural Stress</text>
                  <circle cx={xNorm} cy={yNorm} r="2.8" fill={CHART_MEDIAN_BAR} stroke={PRINT_TEXT} strokeWidth="0.6"/>
                  <text x={Math.min(92, xNorm + 5)} y={yNorm} textAnchor={xNorm > 70 ? 'end' : 'start'} dx={xNorm > 70 ? -4 : 4} fontSize="2.8" fill={PRINT_TEXT} fontWeight="bold">Current Position</text>
                </svg>
                <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginTop: '0.75em', marginBottom: 0, fontWeight: 600 }}>
                  Current Position: {currentZone} Zone
                </p>
                <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginTop: '0.25em', marginBottom: 0 }}>
                  Fragility Index: {fragilityIndex} · Depletion Pressure: {mapPillLabel}
                </p>
              </>
            );
          })()}
        </div>
        </PdfChartBlock>

      {/* Simulated average headline + Durability Curve (outcome grid lives under Simulated Capital Journey) */}
      <div className="print-section section print-page-break-before">
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Simulated Average Outcome
        </h2>
        <p style={{ fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.65em' }}>{formatCurrency(mcResult.simulatedAverage)}</p>
        <p style={{ fontSize: BODY_PT, color: PRINT_TEXT, marginBottom: '1.25em', lineHeight: 1.55 }}>
          After inflation ({effectiveInflation}% p.a.): {formatCurrency(mcResult.simulatedAverage / Math.pow(1 + effectiveInflation / 100, years))}
        </p>

        <PdfChartBlock
          title="Capital Durability Curve"
          titleStyle={STRESS_CHART_TITLE_STYLE}
          whatThisShows="Typical capital path through time, with bands for the middle range of outcomes and a wider outer band for stress."
          whyThisMatters="Withdrawals and returns interact over the horizon — this chart shows how wide that story can be, not just the middle case."
          interpretation={
            <>
              <p style={{ fontSize: '9pt', color: PRINT_TEXT, marginBottom: '0.75em', lineHeight: 1.45 }}>
                Year 0 — Year {years}. Inner shading: where roughly half of outcomes fall; outer shading: a wider stress range.
              </p>
              <div style={{ border: `1px solid ${PRINT_BORDER}`, borderRadius: 4, padding: '0.75em 1em', marginBottom: 0 }}>
                <h3 style={{ fontSize: '10pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.25em' }}>Capital Survival Probability</h3>
                <p style={{ fontSize: '10pt', color: PRINT_TEXT, margin: 0, lineHeight: 1.45 }}>
                  In about {Math.round(mcResult.survivalProbability * 100)}% of paths tested, capital stays positive through the full {years}-year horizon. The
                  Resilience Score blends that survival read with how often capital stays above half of where you started — so it reflects both running out and
                  being worn down.
                </p>
              </div>
            </>
          }
        >
        <div className="print-chart-wrap chart-block" style={{ minHeight: 260 }}>
          {mcResult.yearlyPercentileBands.length > 0 && (() => {
            const bands = mcResult.yearlyPercentileBands;
            const maxVal = Math.max(...bands.map(b => b.p95), investment * 1.2, 1);
            const scale = (v: number) => Math.min(100, Math.max(0, (v / maxVal) * 95));
            const w = 100 / (bands.length - 1 || 1);
            const xScale = 4;
            const plotWidth = 100 * xScale;
            const marginLeft = 32;
            const marginRight = 6;
            const marginBottom = 22;
            const viewWidth = marginLeft + plotWidth + marginRight;
            const viewHeight = 100 + marginBottom;
            const yTickCount = 5;
            const yTicks = Array.from({ length: yTickCount }, (_, i) => (i / (yTickCount - 1)) * maxVal);
            const xTickYears = (() => {
              const step = years <= 10 ? 2 : years <= 20 ? 5 : Math.max(5, Math.ceil(years / 6));
              const ticks = [0];
              for (let y = step; y < years; y += step) ticks.push(y);
              if (ticks[ticks.length - 1] !== years) ticks.push(years);
              return ticks;
            })();
            const xForYear = (y: number) => (y / Math.max(years, 1)) * plotWidth;
            return (
              <svg
                viewBox={`-${marginLeft} -6 ${viewWidth} ${viewHeight + 6}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ width: '100%', height: 260 }}
                aria-label="Capital durability curve"
                shapeRendering="geometricPrecision"
              >
                <defs>
                  {/* Inner band: middle 50% of outcomes — light green with higher opacity for clear legibility. */}
                  <linearGradient id="printBandInner" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#55B685" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#55B685" stopOpacity="0.18" />
                  </linearGradient>
                  {/* Outer band: 5th-95th percentile — deep Capital Bridge green, still visible in print. */}
                  <linearGradient id="printBandOuter" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D3A1D" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#0D3A1D" stopOpacity="0.08" />
                  </linearGradient>
                </defs>
                {/* axes */}
                <line x1={0} y1={0} x2={0} y2={100} stroke={PRINT_TEXT} strokeOpacity="0.85" strokeWidth="0.45" />
                <line x1={0} y1={100} x2={plotWidth} y2={100} stroke={PRINT_TEXT} strokeOpacity="0.85" strokeWidth="0.45" />
                {/* gridlines + Y ticks */}
                {yTicks.map((val, i) => {
                  const y = 100 - scale(val);
                  return (
                    <g key={`y-${i}`}>
                      <line x1={0} y1={y} x2={plotWidth} y2={y} stroke={PRINT_BORDER} strokeWidth="0.3" strokeDasharray="1.2 1.8" />
                      <line x1={0} y1={y} x2={-1.4} y2={y} stroke={PRINT_TEXT} strokeOpacity="0.8" strokeWidth="0.45" />
                      <text x={-2.8} y={y} fontSize="4.2" fill={PRINT_TEXT} textAnchor="end" dominantBaseline="middle" fontWeight="500">
                        {formatRmCompact(Math.round(val))}
                      </text>
                    </g>
                  );
                })}
                {/* outer band (5-95) */}
                {bands.slice(0, -1).map((b, i) => {
                  const x = i * w * xScale;
                  const next = bands[i + 1];
                  const x2 = (i + 1) * w * xScale;
                  const outerPts = `${x},${100 - scale(b.p5)} ${x2},${100 - scale(next.p5)} ${x2},${100 - scale(next.p95)} ${x},${100 - scale(b.p95)}`;
                  const innerPts = `${x},${100 - scale(b.p25)} ${x2},${100 - scale(next.p25)} ${x2},${100 - scale(next.p75)} ${x},${100 - scale(b.p75)}`;
                  return (
                    <g key={i}>
                      <polygon points={outerPts} fill="url(#printBandOuter)" />
                      <polygon points={innerPts} fill="url(#printBandInner)" />
                    </g>
                  );
                })}
                {/* median line */}
                <polyline
                  fill="none"
                  stroke={CHART_MEDIAN_BAR}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={bands.map((b, i) => `${i * w * xScale},${100 - scale(b.p50)}`).join(' ')}
                />
                {bands.map((b, i) => (
                  <circle key={i} cx={i * w * xScale} cy={100 - scale(b.p50)} r="1.2" fill={CHART_MEDIAN_BAR} />
                ))}
                {/* X ticks + year labels */}
                {xTickYears.map((yt) => {
                  const x = xForYear(yt);
                  return (
                    <g key={`xt-${yt}`}>
                      <line x1={x} y1={100} x2={x} y2={102.2} stroke={PRINT_TEXT} strokeOpacity="0.85" strokeWidth="0.45" />
                      <text x={x} y={108} fontSize="4" fill={PRINT_TEXT} textAnchor="middle" fontWeight="500">{yt}</text>
                    </g>
                  );
                })}
                {/* X-axis title */}
                <text x={plotWidth / 2} y={118} fontSize="4.4" fill={PRINT_TEXT} textAnchor="middle" fontWeight="700">
                  Years (0–{years})
                </text>
                {/* Y-axis title (vertical) */}
                <text
                  x={-22}
                  y={50}
                  fontSize="4.4"
                  fill={PRINT_TEXT}
                  textAnchor="middle"
                  fontWeight="700"
                  transform={`rotate(-90 ${-22} 50)`}
                >
                  Capital (RM)
                </text>
              </svg>
            );
          })()}
          {/* Legend */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              fontSize: '9pt',
              color: PRINT_TEXT,
              marginTop: 8,
              paddingLeft: 4,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 18, height: 2, background: CHART_MEDIAN_BAR }} aria-hidden /> Typical path (median)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 18, height: 10, background: 'rgba(85,182,133,0.45)', border: '1px solid rgba(85,182,133,0.7)' }} aria-hidden /> Middle 50% of outcomes
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 18, height: 10, background: 'rgba(13,58,29,0.18)', border: '1px solid rgba(13,58,29,0.35)' }} aria-hidden /> Full range (Downside → Favourable)
            </span>
          </div>
        </div>
        </PdfChartBlock>
      </div>

      {/* Outcome Probability Distribution */}
      <div className="print-section section print-page-break-before">
        <PdfChartBlock
          title="Capital Outcome Probability Distribution"
          titleStyle={STRESS_CHART_TITLE_STYLE}
          whatThisShows="How often test paths finish with different ending capital amounts."
          whyThisMatters="A tight cluster means similar endings; weight on the left means more paths finish with little capital — worth weighing against how much downside you can live with."
          interpretation={
            <p style={{ fontSize: '9pt', color: PRINT_TEXT, lineHeight: 1.5, margin: 0 }}>
              Use the highlighted median band together with bar shape: one tall peak means most paths land near the same ending; a wide spread means more dispersion — always read alongside the headline Downside / Typical / Favourable in Section B.
            </p>
          }
        >
        <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.5em', lineHeight: 1.5 }}>
          Each bar is a band of <strong>ending capital</strong> after {years} year{years !== 1 ? 's' : ''}; bar height is how many of the {mcResult.simulationCount.toLocaleString()} tested paths landed there. The <strong style={{ color: CHART_MEDIAN_BAR }}>highlighted</strong> bar sits in the band that contains the <strong>typical (median)</strong> outcome.
        </p>
        {(() => {
          const finals = mcResult.paths.map((p) => p.finalCapital).filter((x) => x >= 0);
          if (finals.length === 0) {
            return <p style={{ fontSize: '10pt', color: PRINT_TEXT }}>No distribution data available.</p>;
          }
          const minV = Math.min(...finals);
          const maxV = Math.max(...finals);
          const range = maxV - minV || 1;
          const bins = 24;
          const step = range / bins;
          const hist: number[] = Array(bins).fill(0);
          finals.forEach((v) => {
            const idx = Math.min(bins - 1, Math.floor((v - minV) / step));
            hist[idx]++;
          });
          const maxCount = Math.max(...hist, 1);
          const medianVal = mcResult.percentile50;
          const medianBin = Math.min(bins - 1, Math.max(0, Math.floor((medianVal - minV) / step)));
          const marginLeft = 34;
          const marginRight = 6;
          const marginBottom = 24;
          const plotTop = 6;
          const plotBase = 78;
          const plotWidth = 240;
          const plotH = plotBase - plotTop;
          const viewWidth = marginLeft + plotWidth + marginRight;
          const viewHeight = plotBase + marginBottom;
          const barW = plotWidth / bins;
          const yTickCount = 5;
          const yTicks = Array.from({ length: yTickCount }, (_, i) => Math.round((i / (yTickCount - 1)) * maxCount));
          const xLabelVals = [minV, minV + range / 4, minV + range / 2, minV + (3 * range) / 4, maxV];
          return (
            <>
              <div className="print-chart-wrap chart-block" style={{ width: '100%', minHeight: 260 }}>
                <svg
                  viewBox={`-${marginLeft} -${plotTop} ${viewWidth} ${viewHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                  style={{ width: '100%', height: 260, display: 'block' }}
                  aria-label="Capital outcome distribution"
                  shapeRendering="geometricPrecision"
                >
                  {/* axes */}
                  <line x1={0} y1={plotTop} x2={0} y2={plotBase} stroke={PRINT_TEXT} strokeOpacity="0.85" strokeWidth="0.5" />
                  <line x1={0} y1={plotBase} x2={plotWidth} y2={plotBase} stroke={PRINT_TEXT} strokeOpacity="0.85" strokeWidth="0.5" />
                  {/* Y gridlines + ticks */}
                  {yTicks.map((val, i) => {
                    const y = plotBase - (val / maxCount) * plotH;
                    return (
                      <g key={`hist-y-${i}`}>
                        <line x1={0} y1={y} x2={plotWidth} y2={y} stroke={PRINT_BORDER} strokeWidth="0.35" strokeDasharray="1.5 2" />
                        <line x1={-1.6} y1={y} x2={0} y2={y} stroke={PRINT_TEXT} strokeOpacity="0.85" strokeWidth="0.5" />
                        <text x={-3} y={y} fontSize="4.2" fill={PRINT_TEXT} textAnchor="end" dominantBaseline="middle" fontWeight="500">{val}</text>
                      </g>
                    );
                  })}
                  {/* Bars — non-median = deep green, median band = gold (highlighted). */}
                  {hist.map((count, i) => {
                    const h = (count / maxCount) * (plotH - 1);
                    const isMedian = i === medianBin;
                    return (
                      <rect
                        key={i}
                        x={i * barW + 0.6}
                        y={plotBase - h}
                        width={Math.max(0, barW - 1.2)}
                        height={Math.max(h, count > 0 ? 0.8 : 0)}
                        fill={isMedian ? CHART_MEDIAN_BAR : '#0D3A1D'}
                        fillOpacity={isMedian ? 1 : 0.55}
                        stroke={isMedian ? CHART_MEDIAN_BAR : '#0D3A1D'}
                        strokeOpacity={isMedian ? 1 : 0.75}
                        strokeWidth="0.25"
                      />
                    );
                  })}
                  {/* X-axis ticks + labels */}
                  {xLabelVals.map((xv, i) => {
                    const x = ((xv - minV) / (range || 1)) * plotWidth;
                    return (
                      <g key={`hist-xt-${i}`}>
                        <line x1={x} y1={plotBase} x2={x} y2={plotBase + 1.8} stroke={PRINT_TEXT} strokeOpacity="0.85" strokeWidth="0.5" />
                        <text x={x} y={plotBase + 7} fontSize="4" fill={PRINT_TEXT} textAnchor="middle" fontWeight="500">
                          {formatRmCompact(Math.round(xv))}
                        </text>
                      </g>
                    );
                  })}
                  {/* X-axis title */}
                  <text x={plotWidth / 2} y={plotBase + 16} fontSize="4.4" fill={PRINT_TEXT} textAnchor="middle" fontWeight="700">
                    Ending capital after {years} year{years !== 1 ? 's' : ''}
                  </text>
                  {/* Y-axis title — stacked (Number / of / Paths) */}
                  <text x={-24} y={plotTop + plotH / 2 - 6} fontSize="4.6" fill={PRINT_TEXT} textAnchor="middle" fontWeight="700">Number</text>
                  <text x={-24} y={plotTop + plotH / 2} fontSize="4.6" fill={PRINT_TEXT} textAnchor="middle" fontWeight="500">of</text>
                  <text x={-24} y={plotTop + plotH / 2 + 6} fontSize="4.6" fill={PRINT_TEXT} textAnchor="middle" fontWeight="700">Paths</text>
                </svg>
                {/* Legend */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 16,
                    fontSize: '9pt',
                    color: PRINT_TEXT,
                    marginTop: 8,
                    paddingLeft: 4,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 14, height: 10, background: CHART_MEDIAN_BAR }} aria-hidden /> Typical (median) band
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 14, height: 10, background: 'rgba(13,58,29,0.55)' }} aria-hidden /> Other outcomes
                  </span>
                </div>
              </div>
              <div
                style={{
                  marginTop: '0.75em',
                  padding: '0.75em 1em',
                  border: `1px solid ${PRINT_BORDER}`,
                  borderRadius: 6,
                  backgroundColor: 'rgba(255, 252, 245, 0.95)',
                }}
              >
                <p style={{ fontSize: '9.5pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.25em' }}>Typical outcome (median)</p>
                <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, margin: 0, lineHeight: 1.5 }}>
                  {formatCurrency(medianVal)} — the highlighted bar marks the band that holds this typical ending. If the tallest bars sit left of it, more paths end below typical; if weight sits to the right, more paths end above typical.
                </p>
              </div>
              <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, marginTop: '0.85em', lineHeight: 1.55, marginBottom: 0 }}>
                <strong>How to read this:</strong> One tall peak means most paths end near the same place; a wide spread means endings vary a lot. Heavy weight near the left means many paths finish with little capital — weigh that against how much downside you can live with. Use this together with the Downside / Typical / Favourable summary above.
              </p>
            </>
          );
        })()}
        </PdfChartBlock>
      </div>

      {/* Capital Stress Timeline: depletion gauge only (keeps gauge on same page as title; line chart removed for print). */}
      <div className="print-section section print-page-break-before">
        <figure
          className="cb-report-chart-wrap cb-stress-timeline-standalone"
          style={{
            margin: '0.5em 0',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}
        >
          <h2 style={{ ...STRESS_CHART_TITLE_STYLE, marginTop: 0 }}>Capital Stress Timeline</h2>
          <p style={{ fontSize: BODY_PT_SMALL, color: PRINT_TEXT, lineHeight: 1.45, margin: '0 0 0.45em' }}>
            Same headline gauge as the live model. Path dispersion over time is shown in the Capital Durability Curve and outcome distribution earlier in this
            report.
          </p>
          {(() => {
            const dep = depletionBarOutput ?? getDepletionBarOutput(mcResult.depletionPressurePct);
            const s = dep.segmentStops;
            const barX = 72;
            const barW = 336;
            const barY = 22;
            const barH = 14;
            const markerX = barX + (dep.pos / 100) * barW;
            const gradId = 'pdf-depletion-grad-stress';
            return (
              <div
                style={{
                  padding: '10px 12px',
                  border: `1px solid ${PRINT_BORDER}`,
                  borderRadius: 8,
                  background: CB_REPORT_SOFT_PANEL_BG,
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                }}
              >
                <p
                  style={{
                    fontSize: '8.5pt',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: PRINT_TEXT,
                    margin: '0 0 0.25em',
                  }}
                >
                  Depletion pressure
                </p>
                <p style={{ fontSize: BODY_PT_SMALL, color: PRINT_TEXT, margin: '0 0 0.15em', lineHeight: 1.4 }}>
                  Step 3: are withdrawals creating pressure? Further toward <strong>Stable</strong> on the right is better — left is heavier pressure.
                </p>
                <svg
                  viewBox="0 0 480 58"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ width: '100%', height: 'auto', maxHeight: 72, display: 'block', marginTop: 2 }}
                  aria-label="Depletion pressure gauge"
                >
                  <defs>
                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                      {s.map((pct, i) => (
                        <stop key={`gs-${i}`} offset={`${pct}%`} stopColor={DEPLETION_GAUGE_COLORS[Math.min(i, 4)]} />
                      ))}
                    </linearGradient>
                  </defs>
                  <text x={barX} y={10} fontSize="9" fill={PRINT_TEXT} fontWeight="700" opacity={0.75}>
                    Critical
                  </text>
                  <text x={barX + barW} y={10} fontSize="9" fill={PRINT_TEXT} fontWeight="700" textAnchor="end" opacity={0.75}>
                    Stable
                  </text>
                  <rect x={barX} y={barY} width={barW} height={barH} rx={barH / 2} fill={`url(#${gradId})`} stroke={PRINT_BORDER} strokeWidth="0.6" />
                  <line
                    x1={markerX}
                    y1={barY - 8}
                    x2={markerX}
                    y2={barY + barH + 8}
                    stroke="#D9A441"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <text x={barX + barW / 2} y={52} fontSize="11" fill={PRINT_TEXT} textAnchor="middle" fontWeight="800">
                    {formatSignedPct(dep.displayValue)}
                  </text>
                </svg>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      fontSize: '8.5pt',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      borderRadius: 4,
                      backgroundColor: DEPLETION_GAUGE_COLORS[Math.min(Math.max(dep.segmentIndex, 0), 4)],
                      color: pillTextColorForDepletionPill(dep.pillLabel),
                    }}
                  >
                    {dep.pillLabel}
                  </span>
                </div>
                <p style={{ fontSize: BODY_PT_SMALL, color: PRINT_TEXT, margin: '0.65em 0 0', fontStyle: 'italic', lineHeight: 1.5 }}>
                  {depletionPressureInterpretationForPdf(dep.pillLabel)}
                </p>
              </div>
            );
          })()}
          <h3
            className="cb-avoid-orphan-heading"
            style={{
              fontSize: '10pt',
              fontWeight: 700,
              color: PRINT_TEXT,
              marginTop: '0.85em',
              marginBottom: '0.4em',
            }}
          >
            Interpretation
          </h3>
          <p style={{ fontSize: BODY_PT, color: PRINT_TEXT, marginBottom: '0.5em', lineHeight: 1.45, marginTop: 0 }}>
            The <strong>depletion pressure</strong> strip matches the live scenario view: it summarises whether yearly withdrawals are straining long-term
            sustainability. Further toward <strong>Stable</strong> (right) means lower pressure; toward <strong>Critical</strong> (left) means withdrawals are
            consuming more runway.
          </p>
          <p style={{ fontSize: BODY_PT_SMALL, color: PRINT_TEXT, lineHeight: 1.45, margin: 0 }}>
            Use the <strong>Capital Durability Curve</strong> and <strong>Capital Outcome Probability Distribution</strong> in this report for how capital may
            evolve year by year and how ending outcomes spread across simulated paths.
          </p>
        </figure>

        <div style={{ border: `1px solid ${PRINT_BORDER}`, borderRadius: 4, padding: '0.75em 1em', marginTop: '0.75em' }}>
          <h3 style={{ fontSize: '10pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.25em' }}>Capital Breakpoint Indicator</h3>
          {(() => {
            const CRITICAL_THRESHOLD = 0.10;
            const arr = mcResult.depletionRateByYear ?? [];
            const breakpointYear = arr.findIndex((r, i) => i > 0 && r >= CRITICAL_THRESHOLD);
            const breakYear = breakpointYear >= 0 ? breakpointYear : (arr.length > 0 ? years + 1 : null);
            if (breakYear != null && breakYear <= years) {
              return (
                <>
                  <p style={{ fontSize: '10pt', color: PRINT_TEXT, margin: 0, fontWeight: 600 }}>
                    Based on the current assumptions, structural capital stress begins to appear around Year {breakYear}.
                  </p>
                  <p style={{ fontSize: '9pt', color: PRINT_TEXT, marginTop: '0.5em', marginBottom: 0 }}>
                    The Capital Breakpoint indicates the approximate year when structural stress begins to emerge across simulated scenarios (when the probability of capital depletion crosses a critical threshold).
                  </p>
                </>
              );
            }
            return (
              <>
                <p style={{ fontSize: '10pt', color: PRINT_TEXT, margin: 0, fontWeight: 600 }}>
                  Under current assumptions, structural stress remains below the critical threshold through the {years}-year horizon.
                </p>
                <p style={{ fontSize: '9pt', color: PRINT_TEXT, marginTop: '0.5em', marginBottom: 0 }}>
                  The Capital Breakpoint indicates the approximate year when structural stress would begin to emerge across simulated scenarios. In this scenario, depletion probability stays under the threshold for the full period.
                </p>
              </>
            );
          })()}
        </div>
      </div>

      {/* Projected Capital vs Starting + Simulated Capital Journey (kept on one flow where possible) */}
      <div className="print-section section" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.45em', textTransform: 'uppercase' }}>
          Projected Capital at End of {years} Years
        </h2>
        {(() => {
          const pctVsStart = investment > 0 ? (mcResult.simulatedAverage / investment) * 100 : null;
          const finals = mcResult.paths.map((p) => p.finalCapital);
          const inIqr = finals.filter((v) => v >= mcResult.percentile25 && v <= mcResult.percentile75).length;
          const withinRangePct = finals.length > 0 ? (inIqr / finals.length) * 100 : 0;
          const cardBase: React.CSSProperties = {
            padding: '12px 14px',
            border: `1px solid ${PRINT_BORDER}`,
            borderRadius: 8,
            background: 'rgba(255, 252, 245, 0.98)',
            breakInside: 'avoid',
            pageBreakInside: 'avoid',
          };
          const cardLabel: React.CSSProperties = {
            fontSize: '8.5pt',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: CHART_MEDIAN_BAR,
            marginBottom: 6,
          };
          const cardValue: React.CSSProperties = {
            fontSize: '13pt',
            fontWeight: 800,
            color: PRINT_TEXT,
            marginBottom: 6,
            lineHeight: 1.15,
          };
          const cardDesc: React.CSSProperties = {
            fontSize: BODY_PT_SMALL,
            color: PRINT_TEXT,
            lineHeight: 1.45,
            margin: 0,
            opacity: 0.92,
          };
          return (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75em',
                  marginBottom: '0.85em',
                }}
              >
                <div style={cardBase}>
                  <div style={cardLabel}>Vs. starting capital</div>
                  <div style={cardValue}>{pctVsStart != null ? `${pctVsStart.toFixed(1)}%` : '—'}</div>
                  <p style={cardDesc}>Simulated average ending capital vs. initial capital.</p>
                </div>
                <div style={cardBase}>
                  <div style={cardLabel}>Within expected range</div>
                  <div style={cardValue}>{withinRangePct.toFixed(1)}%</div>
                  <p style={cardDesc}>
                    If you ran this plan many times, the percentage of your ending capital would land in this typical range.
                  </p>
                </div>
              </div>
              <p style={{ fontSize: BODY_PT, color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.9em' }}>
                <strong>Insight:</strong> Using the simulated average reduces path-to-path noise to show a more stable headline than any single draw. It is
                anchored to the same {mcResult.simulationCount.toLocaleString()} Regime-Based Monte Carlo paths as the rest of this report.
              </p>
            </>
          );
        })()}

        <PdfChartBlock
          title="Simulated Capital Journey"
          titleStyle={{ ...STRESS_CHART_TITLE_STYLE, marginTop: '0.15em' }}
          className="print-keep-with-next"
          whatThisShows="Possible ending capital outcomes (distribution summary) plus a compact median-path table."
          whyThisMatters="Connects the headline average to the range of endings and a concrete year-by-year median trajectory."
          interpretation={
            <div style={{ marginBottom: '0.65em' }}>
              <p style={{ fontSize: BODY_PT, color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.5em' }}>
                The four tiles mirror the live &quot;Possible capital outcomes&quot; view: typical outcome, middle range, downside tail, and strong-market tail.
                The table below samples the <strong>median simulated path</strong> (year-end balances) so you can see how a representative trajectory evolves without
                printing every year.
              </p>
              <p style={{ fontSize: BODY_PT_SMALL, color: PRINT_TEXT, lineHeight: 1.5, margin: 0 }}>
                <strong>Read together:</strong> if downside and typical sit far apart, outcomes are dispersed; if the median path weakens steadily, withdrawals may
                be grinding capital even when a full depletion event is still unlikely.
              </p>
            </div>
          }
        >
          {(() => {
            const cardBase: React.CSSProperties = {
              padding: '12px 14px',
              border: `1px solid ${PRINT_BORDER}`,
              borderRadius: 8,
              background: 'rgba(255, 252, 245, 0.98)',
              breakInside: 'avoid',
              pageBreakInside: 'avoid',
            };
            const cardLabel: React.CSSProperties = {
              fontSize: '8.5pt',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: CHART_MEDIAN_BAR,
              marginBottom: 6,
            };
            const cardValue: React.CSSProperties = {
              fontSize: '12.5pt',
              fontWeight: 800,
              color: PRINT_TEXT,
              marginBottom: 6,
              lineHeight: 1.15,
            };
            const cardDesc: React.CSSProperties = {
              fontSize: BODY_PT_SMALL,
              color: PRINT_TEXT,
              lineHeight: 1.45,
              margin: 0,
              opacity: 0.92,
            };
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65em', marginBottom: '0.75em' }}>
                <div style={cardBase}>
                  <div style={cardLabel}>Typical outcome</div>
                  <div style={cardValue}>{formatCurrency(mcResult.percentile50)}</div>
                  <p style={cardDesc}>The typical result across all simulations (median ending capital).</p>
                </div>
                <div style={cardBase}>
                  <div style={cardLabel}>Most likely range</div>
                  <div style={cardValue}>
                    {formatCurrency(mcResult.percentile25)} – {formatCurrency(mcResult.percentile75)}
                  </div>
                  <p style={cardDesc}>The range where the middle 50% of outcomes fall.</p>
                </div>
                <div style={cardBase}>
                  <div style={cardLabel}>Downside scenario</div>
                  <div style={cardValue}>{formatCurrency(mcResult.percentile5)}</div>
                  <p style={cardDesc}>A downside result observed in roughly the weakest simulated market environments (5th percentile).</p>
                </div>
                <div style={cardBase}>
                  <div style={cardLabel}>Strong market scenario</div>
                  <div style={cardValue}>{formatCurrency(mcResult.percentile95)}</div>
                  <p style={cardDesc}>A strong environment represented by the top simulated outcomes (95th percentile).</p>
                </div>
              </div>
            );
          })()}
          <p style={{ fontSize: BODY_PT_SMALL, color: PRINT_TEXT, margin: '0 0 0.5em', lineHeight: 1.45 }}>
            Median-path table: sampled year-ends for print (full {years}-year horizon in the model).
          </p>
          <div className="print-journey-table chart-block" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', fontSize: BODY_PT, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${PRINT_BORDER}` }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: PRINT_TEXT }}>Year</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: PRINT_TEXT }}>Est. Return %</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', color: PRINT_TEXT }}>Account Balance</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const depletedAt = medianPathYearly.findIndex((v, i) => i > 0 && v <= 0);
                  const rowsToShow = depletedAt >= 0 ? medianPathYearly.slice(0, depletedAt + 1) : medianPathYearly;
                  const lastIndex = rowsToShow.length - 1;
                  const depleted = depletedAt >= 0;
                  const maxRows = 15;
                  const stride = Math.max(1, Math.ceil(rowsToShow.length / maxRows));
                  const pickIndex = (index: number) =>
                    index === 0 || index === lastIndex || index % stride === 0;
                  const rowIndices = rowsToShow
                    .map((_, index) => index)
                    .filter((index) => pickIndex(index));
                  const unique = Array.from(new Set(rowIndices)).sort((a, b) => a - b);
                  return (
                    <>
                      {unique.map((index) => {
                        const value = rowsToShow[index]!;
                        let estReturnPct: number | null = null;
                        const prev = index > 0 ? rowsToShow[index - 1]! : 0;
                        if (index > 0 && prev > 0 && value > 0) {
                          const endBeforeWithdrawal = value + withdrawal;
                          estReturnPct = (endBeforeWithdrawal / prev - 1) * 100;
                        }
                        return (
                          <tr key={index} style={{ borderBottom: `1px solid ${PRINT_BORDER}` }}>
                            <td style={{ padding: '6px 8px', color: PRINT_TEXT }}>{index} Yr</td>
                            <td style={{ padding: '6px 8px', color: PRINT_TEXT }}>
                              {index === 0 || estReturnPct === null ? '—' : formatPercentSmall(estReturnPct)}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: PRINT_TEXT }}>{formatCurrency(Math.max(0, value))}</td>
                          </tr>
                        );
                      })}
                      {depleted ? (
                        <tr>
                          <td
                            colSpan={3}
                            style={{
                              padding: '8px 8px',
                              fontSize: BODY_PT_SMALL,
                              fontStyle: 'italic',
                              color: PRINT_TEXT,
                              borderTop: `1px solid ${PRINT_BORDER}`,
                            }}
                          >
                            Capital fully depleted in Year {lastIndex} under this median path.
                          </td>
                        </tr>
                      ) : null}
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </PdfChartBlock>
      </div>

      {/* Biggest Impact + Capital Adjustment Simulator */}
      {adjustmentResults != null && (() => {
        const baseLion = stressScoreToDisplay0to100(mcResult.capitalResilienceScore);
        const scenarios = [
          { key: 'reduceWithdrawal' as const, label: 'Reduce withdrawals by 10%', result: adjustmentResults.reduceWithdrawal, withdrawalUsed: withdrawal * 0.9, yearsUsed: years, lowerUsed: lowerPct, upperUsed: upperPct },
          { key: 'extendHorizon' as const, label: 'Extend investment horizon by 5 years', result: adjustmentResults.extendHorizon, withdrawalUsed: withdrawal, yearsUsed: years + 5, lowerUsed: lowerPct, upperUsed: upperPct },
          { key: 'improveReturns' as const, label: 'Improve portfolio returns by 1%', result: adjustmentResults.improveReturns, withdrawalUsed: withdrawal, yearsUsed: years, lowerUsed: lowerPct + 1, upperUsed: upperPct + 1 },
        ].filter((s): s is typeof s & { result: MonteCarloResult } => s.result != null);
        const withDelta = scenarios.map(s => ({ ...s, delta: stressScoreToDisplay0to100(s.result.capitalResilienceScore) - baseLion })).sort((a, b) => b.delta - a.delta);
        return (
          <div className="print-section section print-page-break-before">
            <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
              Biggest Impact Improvements
            </h2>
            <ol style={{ fontSize: '10pt', color: PRINT_TEXT, marginLeft: '1.25em', marginBottom: '1em' }}>
              {withDelta.slice(0, 3).map((s, i) => (
                <li key={s.key}>{s.label}</li>
              ))}
            </ol>

            {/* Force the simulator onto its own page so the grid of scenarios doesn't orphan-split. */}
            <div className="print-page-break-before" />
            <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
              Capital Adjustment Simulator
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75em' }}>
              {withDelta.map(s => {
                const r = s.result;
                const depBar = getDepletionBarOutput(r.depletionPressurePct);
                const adjLion = stressScoreToDisplay0to100(r.capitalResilienceScore);
                const scenarioStress: LionStressAdvisoryInputs = {
                  capitalResilienceScore: r.capitalResilienceScore,
                  tier: r.tier,
                  fragilityIndicator: depBar.pillLabel as LionStressAdvisoryInputs['fragilityIndicator'],
                  initialCapital: investment,
                  withdrawalAmount: s.withdrawalUsed,
                  timeHorizonYears: s.yearsUsed,
                  simulatedAverageOutcome: r.simulatedAverage,
                  maximumDrawdownPct: r.maxDrawdownPctAvg,
                  worstCaseOutcome: r.percentile5,
                };
                const adjPub = formatLionPublicStatusLabel(
                  lionPublicStatusFromScore0to100(adjLion, lionStrongEligibilityFromStressInputs(scenarioStress)),
                );
                return (
                  <div key={s.key} style={{ border: `1px solid ${PRINT_BORDER}`, padding: '0.75em', borderRadius: 4 }}>
                    <p style={{ fontWeight: 700, fontSize: '10pt', color: PRINT_TEXT }}>{s.label}</p>
                    <p style={{ fontSize: '10pt', color: PRINT_TEXT }}>Lion score: {adjLion} · {adjPub} · Depletion: {depBar.pillLabel}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Capital Stress Radar */}
      <div className="print-section section print-page-break-before">
        <PdfChartBlock
          title="Capital Stress Radar"
          titleStyle={STRESS_CHART_TITLE_STYLE}
          whatThisShows="Relative sensitivity scores across five structural risk drivers."
          whyThisMatters="Highlights which levers (returns, withdrawals, inflation, volatility, drawdown) dominate vulnerability."
          interpretation="Higher scores on a spoke mean greater vulnerability on that driver — use it to decide what to look at first."
        >
        <div className="print-chart-wrap chart-block" style={{ maxWidth: 280, margin: '0 auto' }}>
          {(() => {
            const returnRange = upperPct - lowerPct;
            const returnSens = Math.min(100, Math.max(0, (returnRange - 5) * 10));
            const withdrawalSens = investment > 0 ? Math.min(100, (withdrawal / investment) * 500) : 0;
            const inflationSens = Math.min(100, effectiveInflation * 25);
            const volSens = Math.min(100, mcResult.maxDrawdownPctAvg * 2);
            const drawdownSens = Math.min(100, mcResult.maxDrawdownPctAvg * 2.5);
            const axes = [
              { label: 'Return Sensitivity', value: returnSens },
              { label: 'Withdrawal Pressure', value: withdrawalSens },
              { label: 'Inflation Exposure', value: inflationSens },
              { label: 'Volatility Impact', value: volSens },
              { label: 'Capital Drop Risk', value: drawdownSens },
            ];
            const size = 58;
            const cx = 50;
            const cy = 50;
            const gridRadius = size / 2;
            const angleStep = (2 * Math.PI) / 5;
            const points = axes.map((a, i) => {
              const a0 = -Math.PI / 2 + i * angleStep;
              const r = (a.value / 100) * gridRadius;
              return { x: cx + r * Math.cos(a0), y: cy + r * Math.sin(a0), label: a.label };
            });
            const poly = points.map(p => `${p.x},${p.y}`).join(' ');
            const labelRadius = 42;
            return (
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: 280 }} preserveAspectRatio="xMidYMid meet">
                {[20, 40, 60, 80].map(r => <circle key={r} cx={cx} cy={cy} r={r * size / 200} fill="none" stroke={CHART_AXIS} strokeOpacity="0.35" />)}
                {axes.map((_, i) => {
                  const a0 = -Math.PI / 2 + i * angleStep;
                  const x2 = cx + gridRadius * Math.cos(a0);
                  const y2 = cy + gridRadius * Math.sin(a0);
                  return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke={CHART_AXIS} strokeOpacity="0.35" />;
                })}
                <polygon points={poly} fill={CHART_MEDIAN_BAR} fillOpacity="0.18" stroke={CHART_MEDIAN_BAR} strokeWidth="0.5" />
                {points.map((p, i) => (<text key={i} x={p.x} y={p.y} textAnchor="middle" fontSize="3" fill={PRINT_TEXT}>{axes[i].value.toFixed(0)}</text>))}
                {axes.map((a, i) => {
                  const a0 = -Math.PI / 2 + i * angleStep;
                  const lx = cx + labelRadius * Math.cos(a0);
                  const ly = cy + labelRadius * Math.sin(a0);
                  return (
                    <text key={`l-${i}`} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="2.8" fill={PRINT_TEXT}>
                      {a.label.length > 14 ? (
                        <><tspan x={lx} dy="-0.5em">{a.label.split(' ')[0]}</tspan><tspan x={lx} dy="1.2em">{a.label.split(' ').slice(1).join(' ')}</tspan></>
                      ) : a.label}
                    </text>
                  );
                })}
              </svg>
            );
          })()}
        </div>
        </PdfChartBlock>
      </div>

      {/* Further Structural Stress Test */}
      <div className="print-section section print-page-break-before">
        <PdfChartBlock
          title="Further Structural Stress Test"
          titleStyle={STRESS_CHART_TITLE_STYLE}
          whatThisShows="Ending capital and depletion pressure under stressed assumption rows."
          whyThisMatters="Shows directional impact when returns, withdrawals, or inflation move against you."
          interpretation="How the capital structure responds when key assumptions deteriorate."
        >
        {stressScenarioResults && stressScenarioResults.length > 0 ? (
          <div className="print-chart-wrap chart-block" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', fontSize: '10pt', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${PRINT_BORDER}` }}>
                  <th style={{ padding: '6px 8px', color: PRINT_TEXT, textAlign: 'center' }}>Stress Driver</th>
                  <th style={{ padding: '6px 8px', color: PRINT_TEXT, textAlign: 'center' }}>If Stress Level</th>
                  <th style={{ padding: '6px 8px', color: PRINT_TEXT, textAlign: 'center' }}>Depletion Pressure</th>
                  <th style={{ padding: '6px 8px', color: PRINT_TEXT, textAlign: 'center' }}>Ending Capital</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { driver: 'Market Returns', indices: [0, 1] },
                  { driver: 'Withdrawals', indices: [2, 3] },
                  { driver: 'Inflation', indices: [4, 5] },
                ].flatMap(({ driver, indices }) =>
                  indices.map((idx, rowInGroup) => {
                    const s = stressScenarioResults[idx];
                    if (!s) return null;
                    const isFirstRowOfGroup = rowInGroup === 0;
                    return (
                      <tr key={idx} style={{ borderBottom: `1px solid ${PRINT_BORDER}` }}>
                        {isFirstRowOfGroup && (
                          <td rowSpan={indices.length} style={{ padding: '6px 8px', textAlign: 'center', color: PRINT_TEXT }}>{driver}</td>
                        )}
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: PRINT_TEXT }}>{s.label}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: PRINT_TEXT }}>{formatSignedPct(s.depletionPressurePct)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center', color: PRINT_TEXT }}>{formatCurrency(s.simulatedEndingCapital)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: '10pt', color: PRINT_TEXT }}>No stress scenarios available.</p>
        )}
        </PdfChartBlock>
      </div>

      {/* Key Takeaways + Recommended Adjustments + Lion's Verdict */}
      <div className="print-section section print-page-break-before">
        <PrintStageLabel>Next Steps</PrintStageLabel>
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Key Takeaways
        </h2>
        <ul
          style={{
            fontSize: BODY_PT,
            color: PRINT_TEXT,
            marginLeft: '1.25em',
            marginBottom: '1.5em',
            lineHeight: 1.55,
            listStyleType: 'disc',
            paddingLeft: '0.5em',
          }}
        >
          {keyTakeaways.map((line, i) => (
            <li key={i} style={{ marginBottom: '0.35em' }}>
              {line}
            </li>
          ))}
        </ul>

        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Recommended Adjustments
        </h2>
        <ul
          style={{
            fontSize: BODY_PT,
            color: PRINT_TEXT,
            marginLeft: '1.25em',
            marginBottom: '1.5em',
            lineHeight: 1.55,
            listStyleType: 'disc',
            paddingLeft: '0.5em',
          }}
        >
          {recommendedAdjustments.map((line, i) => (
            <li key={i} style={{ marginBottom: '0.35em' }}>
              {line}
            </li>
          ))}
        </ul>
      </div>
      </PdfSection>

      {capitalTimelinePrintPayload ? (
        <CapitalTimelinePrintSection
          payload={capitalTimelinePrintPayload}
          fontSerif={CB_FONT_SERIF}
          textColor={PRINT_TEXT}
          accentColor={PRINT_TEXT}
          borderColor={PRINT_BORDER}
        />
      ) : null}

      <PdfSection className="cb-appendix cb-page-break print-disclosure-page print-section section" aria-label="Disclosures and Next Steps">
        {/*
          Left-aligned closing block. Removed the separate "Closing" stage label
          and the decorative border-top per the premium-advisory spec — keeps
          everything anchored to the left margin for scannability.
        */}
        <PdfAdvisorySectionLead
          stageLabel="Disclosures and Next Steps"
          title="Disclosures and next step"
          whatThisShows="How to use this report, the disclaimer that applies, and the next step in the Capital Bridge journey."
          whyThisMatters="Closes with a clear handoff: what this document is for, and how to move into execution."
        />
        <div style={{ marginTop: '1.5em', textAlign: 'left' }}>
          <h2
            style={{
              fontFamily: CB_FONT_SERIF,
              fontSize: '14pt',
              fontWeight: 700,
              color: PRINT_TEXT,
              margin: '0 0 0.65em',
              lineHeight: 1.3,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            Disclosures &amp; how to use this report
          </h2>
          <p style={{ fontSize: '10.5pt', color: PRINT_TEXT, lineHeight: 1.6, margin: '0 0 1em' }}>
            This report helps you understand how your capital structure behaves. It is not personal advice.
          </p>

          <p style={{ fontSize: '10.5pt', fontWeight: 700, color: PRINT_TEXT, lineHeight: 1.6, margin: '0 0 0.4em', letterSpacing: '0.06em' }}>
            HOW TO USE THIS REPORT
          </p>
          <p style={{ fontSize: '10.5pt', color: PRINT_TEXT, lineHeight: 1.6, margin: '0 0 0.35em' }}>Use it to:</p>
          <ul
            style={{
              fontSize: '10.5pt',
              color: PRINT_TEXT,
              lineHeight: 1.65,
              margin: '0 0 0.85em',
              paddingLeft: '1.3em',
              listStyleType: 'disc',
            }}
          >
            <li style={{ marginBottom: '0.25em' }}>Test withdrawals</li>
            <li style={{ marginBottom: '0.25em' }}>Test time horizon</li>
            <li style={{ marginBottom: '0.25em' }}>Test return assumptions</li>
          </ul>
          <p style={{ fontSize: '10.5pt', color: PRINT_TEXT, lineHeight: 1.6, margin: '0 0 0.45em' }}>
            Treat scenarios as guidance, not prediction.
          </p>
          <p style={{ fontSize: '10.5pt', color: PRINT_TEXT, lineHeight: 1.6, margin: '0 0 1.75em' }}>
            Update inputs when your situation changes.
          </p>

          <div
            style={{
              padding: '1.25em 1.35em',
              border: `1px solid ${PRINT_BORDER}`,
              borderRadius: 8,
              background: 'rgba(255, 252, 245, 0.95)',
              marginBottom: '1.25em',
            }}
          >
            <h2
              style={{
                fontFamily: CB_FONT_SERIF,
                fontSize: '14pt',
                fontWeight: 700,
                color: PRINT_TEXT,
                margin: '0 0 0.55em',
                lineHeight: 1.3,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Request Execution Plan
            </h2>
            <p style={{ fontSize: '10.5pt', color: PRINT_TEXT, lineHeight: 1.6, margin: '0 0 1em' }}>
              We help implement this structure through aligned partners.
            </p>
            <p style={{ fontSize: '10.5pt', color: PRINT_TEXT, lineHeight: 1.6, margin: '0 0 0.4em' }}>
              At this stage, your structure has been:
            </p>
            <ul
              style={{
                fontSize: '10.5pt',
                color: PRINT_TEXT,
                lineHeight: 1.65,
                margin: '0 0 0.9em',
                paddingLeft: '1.3em',
                listStyleType: 'disc',
              }}
            >
              <li style={{ marginBottom: '0.25em' }}>Evaluated for sustainability</li>
              <li style={{ marginBottom: '0.25em' }}>Structured for income</li>
              <li style={{ marginBottom: '0.25em' }}>Tested under stress</li>
            </ul>
            <p style={{ fontSize: '10.5pt', color: PRINT_TEXT, lineHeight: 1.6, margin: '0 0 0.65em' }}>
              When these align, the next step is execution.
            </p>
            <p style={{ fontSize: '10.5pt', fontWeight: 700, color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.35em' }}>
              <a href={strategicExecutionUrl} style={{ color: PRINT_TEXT, textDecoration: 'underline' }}>
                Click here to Request Execution Plan
              </a>
            </p>
            <p style={{ fontSize: '9pt', color: PRINT_TEXT, lineHeight: 1.5, margin: 0 }}>
              Or visit {strategicExecutionUrl}
            </p>
          </div>

        </div>
      </PdfSection>
    </PdfLayout>
    </div>
  );
}
