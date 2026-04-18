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
  mergeLionVerdictSummaryBody,
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

const STRESS_SECTION_H2: React.CSSProperties = {
  fontFamily: CB_FONT_SERIF,
  fontSize: '13px',
  fontWeight: 700,
  color: PRINT_TEXT,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '10px',
  paddingBottom: '6px',
  borderBottom: `1px solid ${PRINT_BORDER}`,
  lineHeight: 1.35,
};

function PrintStageLabel({ children }: { children: React.ReactNode }) {
  return <p className="cb-print-stage-label">{children}</p>;
}

type StressVerdictBucket = 'Safe' | 'Fragile' | 'Dangerous';

type StressVerdictChip = {
  bucket: StressVerdictBucket;
  /** Calm, colour-blind-friendly paint for the coloured badge. */
  fill: string;
  border: string;
  /** Dark text colour that sits on the fill. */
  text: string;
};

/**
 * 5-tier FragilityIndexTier -> 3-bucket {Safe, Fragile, Dangerous} per dashboard spec.
 * FORTIFIED / Highly Robust / Stable -> Safe (green)
 * Fragile -> Fragile (amber)
 * Critical -> Dangerous (red)
 */
function stressVerdictFromFiTier(fiTier: FragilityIndexTier): StressVerdictChip {
  if (fiTier === 'Critical') return { bucket: 'Dangerous', fill: '#F4D6D2', border: '#CD5B52', text: '#7A1D16' };
  if (fiTier === 'Fragile') return { bucket: 'Fragile', fill: '#F9E2BE', border: '#D9A441', text: '#6A4B15' };
  return { bucket: 'Safe', fill: '#D4ECDB', border: '#55B685', text: '#134F2C' };
}

/** High (>=75) / Medium (50-74) / Low (<50) from the 0-100 resilience score. */
function confidenceLevelFromScore(score0to100: number): 'High' | 'Medium' | 'Low' {
  if (score0to100 >= 75) return 'High';
  if (score0to100 >= 50) return 'Medium';
  return 'Low';
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
    const ctx = buildLionContext({
      currency: currencyLabel,
      monthlyIncome: years > 0 ? mcResult.simulatedAverage / (years * 12) : mcResult.simulatedAverage,
      monthlyExpense: withdrawal,
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
        <PdfAdvisorySectionLead
          stageLabel="Section A — Opening"
          title="Opening"
          whatThisShows="Step 3 in the Capital Bridge journey — how your structure behaves under many simulated paths — then headline metrics and charts on the same assumptions."
          whyThisMatters="Sets the thread before Section B numbers and Section C visuals, consistent with Forever, Income Engineering, and Capital Health."
        />
        <section style={STRESS_SECTION_BLOCK}>
          <p style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_TEXT, margin: '0 0 0.35em', letterSpacing: '0.04em' }}>
            CAPITAL BRIDGE JOURNEY
          </p>
          <p style={{ fontSize: '10pt', fontWeight: 700, color: PRINT_TEXT, margin: '0 0 0.75em' }}>How to read this report</p>
          <p style={{ fontSize: '10pt', fontWeight: 700, color: PRINT_TEXT, margin: '0 0 0.5em' }}>
            Step 3 — How does your structure behave under stress?
          </p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.35em' }}>This report follows:</p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.2em' }}>• Step 1 — Forever Income (Can your structure last?)</p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.2em' }}>• Step 1B — Income Engineering (How can capital be structured?)</p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.65em' }}>• Step 2 — Capital Health (Is the structure sustainable?)</p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.35em' }}>At this stage, the question becomes:</p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.2em' }}>• What happens if markets move against you?</p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.2em' }}>• How stable is your structure across different scenarios?</p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.85em' }}>• Where does pressure begin to emerge over time?</p>
          <p style={{ fontSize: '8.5pt', fontWeight: 700, color: PRINT_TEXT, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.35em' }}>
            What this model does
          </p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.35em' }}>
            The Capital Stress Model simulates many possible market paths using your current assumptions.
          </p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.25em' }}>It shows:</p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.2em' }}>• how capital may evolve under uncertainty</p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.2em' }}>• how often outcomes fall within expected ranges</p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.65em' }}>• where downside risk becomes meaningful</p>
          <p style={{ fontSize: '8.5pt', fontWeight: 700, color: PRINT_TEXT, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 0.35em' }}>
            Why this matters
          </p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.5em' }}>
            A structure that works in one scenario may not hold across many.
          </p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.25em' }}>This model allows:</p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.2em' }}>• resilience to be tested beyond a single projection</p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.2em' }}>• downside risk to be understood clearly</p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: 0 }}>• confidence to be built before execution</p>
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
              <PdfLionsVerdictBlock
                scoreAndStatusLine={`Lion score: ${lionScorePrint} / 100 · ${lionPublicLabelPrint}`}
                narrativeQuote={lionPdfDataPrint.lion.headline}
                summary={mergeLionVerdictSummaryBody(lionPdfDataPrint.summary.keyPoint, lionPdfDataPrint.lion.guidance)}
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

      <PdfSection className="print-section section print-page-break-before key-outcomes" aria-label="Section B — Plain Read">
        <PdfAdvisorySectionLead
          stageLabel="Section B — Plain Read"
          title="Plain Read"
          whatThisShows="Headline resilience metrics, a plain-language read of what they mean, and the scenario assumptions this report used."
          whyThisMatters="A simple read comes first, then the evidence charts in Section C."
        />
        <PrintStageLabel>Top summary</PrintStageLabel>
        {(() => {
          const verdictChip = stressVerdictFromFiTier(fiTier);
          const confidenceLabel = confidenceLevelFromScore(lionScorePrint);
          const runwayLabel = capitalRunwayLabel(
            mcResult.survivalProbability,
            mcResult.depletionRateByYear,
            years,
          );
          return (
            <section style={STRESS_SECTION_BLOCK}>
              <h2 style={STRESS_SECTION_H2}>Top summary</h2>
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
                    Stress verdict
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: 4,
                      background: verdictChip.fill,
                      border: `1px solid ${verdictChip.border}`,
                      color: verdictChip.text,
                      fontWeight: 700,
                      fontSize: '10pt',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {verdictChip.bucket}
                  </span>
                  <div style={{ fontSize: '8.5pt', color: PRINT_TEXT, marginTop: 4 }}>
                    Detail tier: {fiTier}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: PRINT_TEXT, marginBottom: 4 }}>
                    Confidence level
                  </div>
                  <div style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_TEXT }}>{confidenceLabel}</div>
                  <div style={{ fontSize: '8.5pt', color: PRINT_TEXT, marginTop: 4 }}>
                    Based on resilience score {lionScorePrint}/100
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
                    Typical outcome
                  </div>
                  <div style={{ fontSize: '10pt', fontWeight: 700, color: PRINT_TEXT }}>{formatCurrency(mcResult.simulatedAverage)}</div>
                  <div style={{ fontSize: '8.5pt', color: PRINT_TEXT, marginTop: 4 }}>
                    Range (Downside → Favourable): {formatCurrency(mcResult.percentile5)} — {formatCurrency(mcResult.percentile95)}
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
          <PrintStageLabel>What this means</PrintStageLabel>
          <h2 style={{ ...STRESS_SECTION_H2, marginTop: 0 }}>What this means</h2>
          <p style={{ fontSize: '10pt', color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.65em' }}>{overallAssessment}</p>
          <p style={{ fontSize: '10pt', color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.65em' }}>{riskDriversText}</p>
          <p style={{ fontSize: '10pt', color: PRINT_TEXT, lineHeight: 1.55, margin: 0 }}>{suggestedFocus}</p>
        </section>
        {(() => {
          const verdictChip = stressVerdictFromFiTier(fiTier);
          const guidance =
            verdictChip.bucket === 'Safe'
              ? {
                  title: 'Deploy capital with discipline',
                  lines: [
                    'The structure shows resilience under many simulated paths.',
                    'The next step is putting surplus capital to work — align flows, rebalance, and keep rules simple.',
                    'Review withdrawals and return assumptions periodically so the plan stays current.',
                  ],
                }
              : verdictChip.bucket === 'Fragile'
                ? {
                    title: 'Improve resilience',
                    lines: [
                      'The structure holds up on average but is sensitive to market or withdrawal pressure.',
                      'Small moves help: trim non-essential withdrawals, extend the horizon, or rebalance toward steadier returns.',
                      'Re-run this model after any change so the new read is clear.',
                    ],
                  }
                : {
                    title: 'Reduce the gap — or make it intentional',
                    lines: [
                      'Under the current assumptions, the structure is under meaningful pressure.',
                      'Either close the gap (lower withdrawals, raise returns within reason, or extend the horizon) — or decide the drawdown is intentional and plan for it.',
                      'Pairing this report with your income and structure reports gives a single picture of the trade-off.',
                    ],
                  };
          return (
            <section style={STRESS_SECTION_BLOCK}>
              <PrintStageLabel>What to do next</PrintStageLabel>
              <h2 style={{ ...STRESS_SECTION_H2, marginTop: 0 }}>What to do next</h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: '0.65em',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: 10,
                    background: verdictChip.border,
                  }}
                  aria-hidden
                />
                <span style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_TEXT }}>{guidance.title}</span>
              </div>
              <ul style={{ fontSize: '10pt', color: PRINT_TEXT, lineHeight: 1.55, margin: 0, paddingLeft: '1.2em' }}>
                {guidance.lines.map((line) => (
                  <li key={line} style={{ marginBottom: '0.35em' }}>{line}</li>
                ))}
              </ul>
            </section>
          );
        })()}
        <section style={STRESS_SECTION_BLOCK}>
          <h2 style={STRESS_SECTION_H2}>Assumptions captured here</h2>
          <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.65em', lineHeight: 1.55 }}>
            The model explores many possible paths — not one forecast — given your capital, withdrawals, horizon, return range, and inflation.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', color: PRINT_TEXT }}>
            <tbody>
              <tr>
                <td colSpan={2} style={{ padding: '4px 0', fontWeight: 700 }}>
                  Monte Carlo simulation: {mcResult.simulationCount.toLocaleString()} possible paths tested
                </td>
              </tr>
              <tr><td style={{ padding: '4px 0' }}>Starting capital</td><td style={{ padding: '4px 0', textAlign: 'right' }}>{formatCurrency(investment)}</td></tr>
              <tr><td style={{ padding: '4px 0' }}>Yearly withdrawal</td><td style={{ padding: '4px 0', textAlign: 'right' }}>{formatCurrency(withdrawal)}</td></tr>
              <tr><td style={{ padding: '4px 0' }}>Time horizon</td><td style={{ padding: '4px 0', textAlign: 'right' }}>{years} years</td></tr>
              <tr><td style={{ padding: '4px 0' }}>Return range (assumed)</td><td style={{ padding: '4px 0', textAlign: 'right' }}>{formatPercent(lowerPct)} to {formatPercent(upperPct)}</td></tr>
              <tr><td style={{ padding: '4px 0' }}>Inflation (assumed)</td><td style={{ padding: '4px 0', textAlign: 'right' }}>{effectiveInflation}% p.a.</td></tr>
            </tbody>
          </table>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0.75em 0 0' }}>
            This model evaluates a wide range of potential market conditions based on your assumptions — not a single forecast.
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

        <PrintStageLabel>Charts and visuals</PrintStageLabel>
        <div className="print-page-break-before" />

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

      {/* Possible Capital Outcomes + Durability Curve */}
      <div className="print-section section print-page-break-before">
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Simulated Average Outcome
        </h2>
        <p style={{ fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '1em' }}>{formatCurrency(mcResult.simulatedAverage)}</p>
        <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '1.5em' }}>After inflation ({effectiveInflation}% p.a.): {formatCurrency(mcResult.simulatedAverage / Math.pow(1 + effectiveInflation / 100, years))}</p>

        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Possible Capital Outcomes
        </h2>
        <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.75em' }}>
          We simulate thousands of possible paths. These show the range of outcomes.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5em', fontSize: '10pt', marginBottom: '1.5em' }}>
          <div>Typical Outcome <span style={{ color: PRINT_TEXT, opacity: 0.7 }}>(50th %)</span>: {formatCurrency(mcResult.percentile50)}</div>
          <div>Middle 50% range: {formatCurrency(mcResult.percentile25)} – {formatCurrency(mcResult.percentile75)}</div>
          <div>Downside Scenario <span style={{ color: PRINT_TEXT, opacity: 0.7 }}>(5th %)</span>: {formatCurrency(mcResult.percentile5)}</div>
          <div>Favourable Scenario <span style={{ color: PRINT_TEXT, opacity: 0.7 }}>(95th %)</span>: {formatCurrency(mcResult.percentile95)}</div>
        </div>

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
        <div className="print-chart-wrap chart-block" style={{ minHeight: 200 }}>
          {mcResult.yearlyPercentileBands.length > 0 && (() => {
            const bands = mcResult.yearlyPercentileBands;
            const maxVal = Math.max(...bands.map(b => b.p95), investment * 1.2, 1);
            const scale = (v: number) => Math.min(100, Math.max(0, (v / maxVal) * 95));
            const w = 100 / (bands.length - 1 || 1);
            const xScale = 4;
            const plotWidth = 100 * xScale;
            const viewWidth = 14 + plotWidth + 8;
            const yTickCount = 5;
            const yTicks = Array.from({ length: yTickCount }, (_, i) => (i / (yTickCount - 1)) * maxVal);
            return (
              <svg viewBox={`-14 -6 ${viewWidth} 118`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 200 }} aria-label="Capital durability curve">
                <defs>
                  <linearGradient id="printBandGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1b4d3e" stopOpacity="0.28" /><stop offset="100%" stopColor="#1b4d3e" stopOpacity="0.06" /></linearGradient>
                  <linearGradient id="printBandOuter" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1b4d3e" stopOpacity="0.12" /><stop offset="100%" stopColor="#1b4d3e" stopOpacity="0.02" /></linearGradient>
                </defs>
                <line x1={0} y1={0} x2={0} y2={100} stroke={CHART_AXIS} strokeOpacity="0.55" strokeWidth="0.3" />
                <line x1={0} y1={100} x2={plotWidth} y2={100} stroke={CHART_AXIS} strokeOpacity="0.55" strokeWidth="0.3" />
                {yTicks.map((val, i) => {
                  const y = 100 - scale(val);
                  return (
                    <g key={`y-${i}`}>
                      <line x1={0} y1={y} x2={-0.8} y2={y} stroke={CHART_AXIS} strokeOpacity="0.5" strokeWidth="0.25" />
                      <text x={-2.2} y={y} fontSize="2.8" fill={PRINT_TEXT} textAnchor="end" dominantBaseline="middle">{formatCurrency(Math.round(val))}</text>
                    </g>
                  );
                })}
                {bands.slice(0, -1).map((b, i) => {
                  const x = i * w * xScale;
                  const next = bands[i + 1];
                  const x2 = (i + 1) * w * xScale;
                  const outerPts = `${x},${100 - scale(b.p5)} ${x2},${100 - scale(next.p5)} ${x2},${100 - scale(next.p95)} ${x},${100 - scale(b.p95)}`;
                  const innerPts = `${x},${100 - scale(b.p25)} ${x2},${100 - scale(next.p25)} ${x2},${100 - scale(next.p75)} ${x},${100 - scale(b.p75)}`;
                  return (
                    <g key={i}>
                      <polygon points={outerPts} fill="url(#printBandOuter)" />
                      <polygon points={innerPts} fill="url(#printBandGrad)" />
                    </g>
                  );
                })}
                <polyline fill="none" stroke={CHART_MEDIAN_BAR} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" points={bands.map((b, i) => `${i * w * xScale},${100 - scale(b.p50)}`).join(' ')} />
                {bands.map((b, i) => (
                  <circle key={i} cx={i * w * xScale} cy={100 - scale(b.p50)} r="0.8" fill={CHART_MEDIAN_BAR} />
                ))}
              </svg>
            );
          })()}
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
          const midCount = Math.round(maxCount / 2);
          const barW = 100 / bins;
          const medianVal = mcResult.percentile50;
          const medianBin = Math.min(bins - 1, Math.max(0, Math.floor((medianVal - minV) / step)));
          const plotTop = 8;
          const plotBase = 70;
          const plotH = plotBase - plotTop;
          const xMid = minV + range / 2;
          return (
            <>
              <p style={{ fontSize: '9pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.25em' }}>Vertical scale: how many paths ended in each band</p>
              <p style={{ fontSize: '8pt', color: PRINT_TEXT, marginBottom: '0.5em', lineHeight: 1.45 }}>
                Taller bars mean more paths finished near that level of capital; short bars mean that ending was uncommon.
              </p>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <div
                  style={{
                    width: 36,
                    height: 168,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    fontSize: '8pt',
                    color: PRINT_TEXT,
                    textAlign: 'right',
                    paddingBottom: 26,
                    flexShrink: 0,
                  }}
                >
                  <span>{maxCount}</span>
                  <span>{midCount}</span>
                  <span>0</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="print-chart-wrap chart-block" style={{ height: 168 }}>
                    <svg viewBox="0 0 100 78" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block' }} aria-label="Capital outcome distribution">
                      <line x1="0" y1={plotBase} x2="100" y2={plotBase} stroke={CHART_AXIS} strokeWidth="0.45" strokeOpacity={0.9} />
                      <line x1="0" y1={plotTop} x2="0" y2={plotBase} stroke={CHART_AXIS} strokeWidth="0.45" strokeOpacity={0.9} />
                      {[0.5, 1].map((t) => (
                        <line
                          key={t}
                          x1="0"
                          y1={plotBase - t * plotH}
                          x2="100"
                          y2={plotBase - t * plotH}
                          stroke={PRINT_BORDER}
                          strokeWidth="0.2"
                          strokeDasharray="1 1"
                        />
                      ))}
                      {hist.map((count, i) => {
                        const h = (count / maxCount) * (plotH - 2);
                        return (
                          <rect
                            key={i}
                            x={i * barW + 0.12}
                            y={plotBase - h}
                            width={barW - 0.28}
                            height={Math.max(h, count > 0 ? 0.8 : 0)}
                            fill={i === medianBin ? CHART_MEDIAN_BAR : 'rgba(13, 58, 29, 0.22)'}
                            stroke={i === medianBin ? CHART_MEDIAN_BAR : 'rgba(13, 58, 29, 0.15)'}
                            strokeWidth="0.15"
                          />
                        );
                      })}
                    </svg>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '8pt',
                      color: PRINT_TEXT,
                      marginTop: 4,
                      gap: 4,
                    }}
                  >
                    <span style={{ flex: 1, textAlign: 'left' }}>{formatCurrency(Math.round(minV))}</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>{formatCurrency(Math.round(xMid))}</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>{formatCurrency(Math.round(maxV))}</span>
                  </div>
                  <p style={{ fontSize: '8pt', color: PRINT_TEXT, marginTop: 8, lineHeight: 1.45, textAlign: 'center' }}>
                    <strong>Horizontal axis: ending capital</strong> ({bins} steps from lowest to highest ending balance in the test).
                  </p>
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
                <p style={{ fontSize: '9pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.25em' }}>Typical outcome (median)</p>
                <p style={{ fontSize: '9pt', color: PRINT_TEXT, margin: 0, lineHeight: 1.45 }}>
                  {formatCurrency(medianVal)} — the highlighted bar marks the band that holds this typical ending. If the tallest bars sit left of it, more paths end below typical; if weight sits to the right, more paths end above typical.
                </p>
              </div>
              <p style={{ fontSize: '9pt', color: PRINT_TEXT, marginTop: '0.75em', lineHeight: 1.5, marginBottom: 0 }}>
                <strong>How to read this:</strong> One tall peak means most paths end near the same place; a wide spread means endings vary a lot. Heavy weight near the left means many paths finish with little capital — weigh that against how much downside you can live with. Use this together with the Downside / Typical / Favourable summary above.
              </p>
            </>
          );
        })()}
        </PdfChartBlock>
      </div>

      {/* Capital Stress Timeline + Capital Breakpoint Indicator */}
      <div className="print-section section print-page-break-before">
        <PdfChartBlock
          title="Capital Stress Timeline"
          titleStyle={STRESS_CHART_TITLE_STYLE}
          whatThisShows="Year-by-year probability of depletion versus structural stress."
          whyThisMatters="Shows when stress tends to appear later in the horizon, not only at the end."
          interpretation={
            <>
              <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.5em', lineHeight: 1.45 }}>
                Two metrics by year: probability of full capital depletion (balance ≤ 0) and probability of structural capital stress (capital below 50% of
                initial).
              </p>
              <p style={{ fontSize: '9pt', color: PRINT_TEXT, marginBottom: '0.35em', lineHeight: 1.45 }}>
                Solid line: probability of full capital depletion. Dashed line: probability of structural capital stress (capital below 50% of initial).
                Early stability means low percentages; rising stress means increasing percentages over time.
              </p>
              <p style={{ fontSize: '9pt', color: PRINT_TEXT, fontStyle: 'italic', marginBottom: '0.75em', lineHeight: 1.45 }}>
                {mcResult.structuralStressRateByYear
                  ? 'While full capital depletion may remain unlikely under current assumptions, the probability of structural capital stress can gradually increase later in the investment horizon.'
                  : 'Full depletion and structural stress (capital below 50% of initial) are shown when available.'}
              </p>
            </>
          }
        >
        <div className="print-chart-wrap chart-block" style={{ minHeight: 240 }}>
          {mcResult.depletionRateByYear && mcResult.depletionRateByYear.length > 0 && (() => {
            const depletionData = mcResult.depletionRateByYear;
            const stressData = mcResult.structuralStressRateByYear ?? depletionData.map(() => 0);
            const allPcts = [...depletionData.map(d => d * 100), ...stressData.map(s => s * 100)];
            const maxPct = Math.max(...allPcts, 5);
            const yMax = Math.max(10, Math.ceil(maxPct / 5) * 5);
            const plotLeft = 36;
            const plotRight = 380;
            const plotTop = 20;
            const plotBottom = 180;
            const plotWidth = plotRight - plotLeft;
            const plotHeight = plotBottom - plotTop;
            const scaleY = (pct: number) => plotBottom - (pct / yMax) * plotHeight;
            const n = depletionData.length;
            const step = n > 1 ? (plotWidth / (n - 1)) : 0;
            const xFor = (i: number) => plotLeft + i * step;
            const depletionPts = depletionData.map((d, i) => `${xFor(i)},${scaleY(d * 100)}`).join(' ');
            const stressPts = stressData.length >= n ? stressData.slice(0, n).map((s, i) => `${xFor(i)},${scaleY(s * 100)}`).join(' ') : depletionPts;
            const xStep = years <= 10 ? 2 : years <= 20 ? 5 : Math.ceil(years / 5);
            const xTickYears = Array.from({ length: Math.floor(years / xStep) + 1 }, (_, i) => i * xStep).filter(y => y <= years);
            const yTicks = [0, Math.round(yMax * 0.25), Math.round(yMax * 0.5), Math.round(yMax * 0.75), yMax];
            return (
              <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 240 }} aria-label="Capital Stress Timeline" shapeRendering="geometricPrecision">
                <defs>
                  <linearGradient id="printStressZone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E3A539" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#E3A539" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke={CHART_AXIS} strokeWidth="1.2" strokeOpacity="0.75" />
                <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke={CHART_AXIS} strokeWidth="1.2" strokeOpacity="0.75" />
                <text x={plotLeft - 4} y={plotTop - 6} fontSize="9" fill={PRINT_TEXT} fontWeight="bold">% of paths</text>
                {yTicks.map((pct, i) => {
                  const y = scaleY(pct);
                  return (
                    <g key={i}>
                      <line x1={plotLeft} y1={y} x2={plotLeft - 4} y2={y} stroke={CHART_AXIS} strokeWidth="0.8" strokeOpacity="0.65" />
                      <text x={plotLeft - 8} y={y} fontSize="8" fill={PRINT_TEXT} textAnchor="end" dominantBaseline="middle">{pct}%</text>
                    </g>
                  );
                })}
                {xTickYears.map(y => {
                  const x = n > 1 ? plotLeft + (y / (n - 1)) * plotWidth : plotLeft;
                  return (
                    <g key={y}>
                      <line x1={x} y1={plotBottom} x2={x} y2={plotBottom + 4} stroke={CHART_AXIS} strokeWidth="0.8" strokeOpacity="0.65" />
                      <text x={x} y={plotBottom + 14} fontSize="8" fill={PRINT_TEXT} textAnchor="middle">Year {y}</text>
                    </g>
                  );
                })}
                <polyline fill="none" stroke={CHART_MEDIAN_BAR} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={depletionPts} />
                {depletionData.map((d, i) => (
                  <circle key={`d-${i}`} cx={xFor(i)} cy={scaleY(d * 100)} r="2.5" fill={CHART_MEDIAN_BAR} stroke={PRINT_TEXT} strokeWidth="0.8" />
                ))}
                <polyline fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,3" points={stressPts} />
                {stressData.slice(0, n).map((s, i) => (
                  <circle key={`s-${i}`} cx={xFor(i)} cy={scaleY(s * 100)} r="2" fill="#D97706" stroke={PRINT_TEXT} strokeWidth="0.6" />
                ))}
                <text x={plotRight - 80} y={plotTop - 2} fontSize="8" fill={CHART_MEDIAN_BAR} fontWeight="600">— Depletion</text>
                <text x={plotRight - 80} y={plotTop + 10} fontSize="8" fill="#D97706" fontWeight="600">— Structural stress</text>
              </svg>
            );
          })()}
        </div>
        </PdfChartBlock>

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

      {/* Projected Capital vs Starting + Simulated Capital Journey */}
      <div className="print-section section print-page-break-before">
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Projected Capital vs Starting Capital
        </h2>
        <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '1em' }}>
          Simulated average ending capital vs initial: {investment > 0 ? ((mcResult.simulatedAverage / investment) * 100).toFixed(1) : '—'}%
        </p>

        <PdfChartBlock
          title="Simulated Capital Journey"
          titleStyle={{ ...STRESS_CHART_TITLE_STYLE, marginTop: '0.25em' }}
          className="print-keep-with-next"
          whatThisShows="Median-year account balances along the modelled path."
          whyThisMatters="Gives a concrete year-by-year trajectory to pair with the statistical charts above."
          interpretation="Typical market path (median outcomes). Rows stop when capital reaches zero."
        >
        <div className="print-journey-table chart-block" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', fontSize: '10pt', borderCollapse: 'collapse' }}>
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
                return (
                  <>
                    {rowsToShow.map((value, index) => {
                      let estReturnPct: number | null = null;
                      const prev = index > 0 ? medianPathYearly[index - 1] : 0;
                      if (index > 0 && prev > 0 && value > 0) {
                        const endBeforeWithdrawal = value + withdrawal;
                        estReturnPct = (endBeforeWithdrawal / prev - 1) * 100;
                      }
                      return (
                        <tr key={index} style={{ borderBottom: `1px solid ${PRINT_BORDER}` }}>
                          <td style={{ padding: '6px 8px', color: PRINT_TEXT }}>{index} Yr</td>
                          <td style={{ padding: '6px 8px', color: PRINT_TEXT }}>{index === 0 || estReturnPct === null ? '—' : formatPercentSmall(estReturnPct)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', color: PRINT_TEXT }}>{formatCurrency(Math.max(0, value))}</td>
                        </tr>
                      );
                    })}
                    {depleted && (
                      <tr>
                        <td colSpan={3} style={{ padding: '8px 8px', fontSize: '9pt', fontStyle: 'italic', color: PRINT_TEXT, borderTop: `1px solid ${PRINT_BORDER}` }}>
                          Capital fully depleted in Year {lastIndex} under this simulated path.
                        </td>
                      </tr>
                    )}
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
        <ul style={{ fontSize: '10pt', color: PRINT_TEXT, marginLeft: '1.25em', marginBottom: '1.5em', lineHeight: 1.5 }}>
          {keyTakeaways.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>

        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Recommended Adjustments
        </h2>
        <ul style={{ fontSize: '10pt', color: PRINT_TEXT, marginLeft: '1.25em', marginBottom: '1.5em', lineHeight: 1.5 }}>
          {recommendedAdjustments.map((line, i) => (
            <li key={i}>{line}</li>
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

      <PdfSection className="cb-appendix cb-page-break print-disclosure-page print-section section" aria-label="Appendix and closing">
        <PdfAdvisorySectionLead
          stageLabel="Appendix & closing"
          title="Disclosures and next step"
          whatThisShows="How to use this report, the disclaimer that applies, and the next step in the Capital Bridge journey."
          whyThisMatters="Closes with a clear handoff: what this document is for, and how to move into execution."
        />
        <PrintStageLabel>Closing</PrintStageLabel>
        <div
          style={{
            borderTop: '1px solid rgba(13, 58, 29, 0.14)',
            marginTop: '2em',
            paddingTop: '1.35em',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: CB_FONT_SERIF,
              fontSize: '13pt',
              fontWeight: 700,
              color: PRINT_TEXT,
              margin: '0 auto 0.65em',
              maxWidth: '36em',
              lineHeight: 1.35,
            }}
          >
            Disclosures & how to use this report
          </h2>
          <p style={{ fontSize: '10pt', fontWeight: 300, color: PRINT_TEXT, lineHeight: 1.5, margin: '0 auto', maxWidth: '36em' }}>
            This document comes from the Capital Bridge Capital Stress model and is meant to help you understand your own structure. It is not personal advice. The footer carries the full legal notice.
          </p>
          <p
            style={{
              fontSize: '10pt',
              fontWeight: 700,
              color: PRINT_TEXT,
              marginTop: '0.85em',
              marginBottom: '0.35em',
              maxWidth: '36em',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            How to use this report
          </p>
          <ul
            style={{
              fontSize: '10pt',
              color: PRINT_TEXT,
              textAlign: 'left',
              margin: '0 auto 1em',
              maxWidth: '32em',
              lineHeight: 1.5,
              paddingLeft: '1.25em',
            }}
          >
            <li style={{ marginBottom: '0.35em' }}>Use it to stress-test withdrawals, horizon, and return assumptions.</li>
            <li style={{ marginBottom: '0.35em' }}>Treat paths as illustrative; update the live model when inputs change materially.</li>
          </ul>
          <div
            style={{
              maxWidth: '34em',
              margin: '0 auto 1.15em',
              padding: '1em 1.1em',
              border: `1px solid ${PRINT_BORDER}`,
              borderRadius: 8,
              background: 'rgba(255, 252, 245, 0.95)',
              textAlign: 'left',
            }}
          >
            <p
              style={{
                fontFamily: CB_FONT_SERIF,
                fontSize: '13pt',
                fontWeight: 700,
                color: PRINT_TEXT,
                margin: '0 0 0.5em',
                lineHeight: 1.3,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                textAlign: 'center',
              }}
            >
              Request Execution Plan
            </p>
            <p style={{ fontSize: '10.5pt', color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.85em', textAlign: 'center' }}>
              We help implement this structure through aligned partners.
            </p>
            <p style={{ fontSize: '10pt', color: PRINT_TEXT, lineHeight: 1.5, margin: '0 0 0.5em' }}>
              At this stage, your structure has been:
            </p>
            <ul
              style={{
                fontSize: '10pt',
                color: PRINT_TEXT,
                lineHeight: 1.5,
                margin: '0 0 0.75em',
                paddingLeft: '1.25em',
                textAlign: 'left',
              }}
            >
              <li style={{ marginBottom: '0.25em' }}>evaluated for sustainability</li>
              <li style={{ marginBottom: '0.25em' }}>engineered for capital flow</li>
              <li style={{ marginBottom: '0.25em' }}>tested under stress</li>
            </ul>
            <p style={{ fontSize: '10pt', color: PRINT_TEXT, lineHeight: 1.55, margin: '0 0 0.85em' }}>
              When the structure remains coherent across these stages, the next step is execution — putting the plan into practice with disciplined follow-through.
            </p>
            <p
              style={{
                fontSize: '11pt',
                fontWeight: 700,
                color: PRINT_TEXT,
                margin: 0,
                textAlign: 'center',
              }}
            >
              <a href={strategicExecutionUrl} style={{ color: PRINT_TEXT, textDecoration: 'underline' }}>
                Request Execution Plan →
              </a>
            </p>
            <p style={{ fontSize: '9pt', color: PRINT_TEXT, lineHeight: 1.45, margin: '0.5em 0 0', textAlign: 'center' }}>
              Or visit {strategicExecutionUrl}
            </p>
          </div>
          <p style={{ fontSize: '10pt', fontWeight: 300, color: PRINT_TEXT, lineHeight: 1.5, margin: '0 auto', maxWidth: '36em' }}>
            This report is for educational purposes only. Illustrations rest on your assumptions and are not a guarantee of future performance.
          </p>
          <p style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_TEXT, marginTop: '0.55em', lineHeight: 1.45 }}>
            Please save or print a copy for your records.
          </p>
        </div>
      </PdfSection>
    </PdfLayout>
    </div>
  );
}
