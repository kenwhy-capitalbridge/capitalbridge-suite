/**
 * Dedicated print-only report layout for the Capital Stress Model.
 * Rendered only when printing; not the live UI. White background, section flow, no repeated header.
 */

import React from 'react';
import { advisoryFrameworkPdfIntro } from '@cb/shared/advisoryFramework';
import { formatReportGeneratedAtLabel, reportPreparedForLine } from '@cb/shared/reportIdentity';
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
}

const PRINT_TEXT = '#0D3A1D';
const PRINT_ACCENT = '#C6A24D';
const PRINT_BORDER = 'rgba(13, 58, 29, 0.2)';

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
  } = props;

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
  const lionPublicLabelPrint = formatLionPublicStatusLabel(
    lionPublicStatusFromScore0to100(lionScorePrint, lionStrongEligibilityFromStressInputs(bandStressInputs)),
  );
  const preparedForCover = reportPreparedForLine(reportClientDisplayName);
  const reportGeneratedAt = formatReportGeneratedAtLabel();

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

  const stressFrameworkIntro = advisoryFrameworkPdfIntro('risk_resilience_stress');

  return (
    <div id="print-report" className="print-report-root">
      {/* Page 1: Cover */}
      <div className="print-section" style={{ padding: '2em 0', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <h1 style={{ fontFamily: CB_FONT_SERIF, fontSize: '28pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.25em' }}>
          Capital Stress Model
        </h1>
        <p style={{ fontSize: '14pt', color: PRINT_TEXT, marginBottom: '2em' }}>Capital Structure Diagnostic Report</p>
        <p style={{ fontSize: '11pt', color: PRINT_TEXT }}>{preparedForCover}</p>
        <p style={{ fontSize: '11pt', color: PRINT_TEXT }}>Generated by: Capital Bridge</p>
        <p style={{ fontSize: '11pt', color: PRINT_TEXT, marginTop: '1em' }}>Report generated: {reportGeneratedAt}</p>
        <div style={{ maxWidth: '38em', margin: '2em auto 0', padding: '0 1.25em', textAlign: 'left' }}>
          <p
            style={{
              fontSize: '9pt',
              fontWeight: 700,
              color: PRINT_ACCENT,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '0.35em',
            }}
          >
            {stressFrameworkIntro.eyebrow}
          </p>
          <p style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_TEXT, margin: '0 0 0.25em' }}>
            {stressFrameworkIntro.title}
          </p>
          <p style={{ fontSize: '10pt', fontWeight: 700, color: PRINT_TEXT, margin: '0 0 0.5em' }}>
            {stressFrameworkIntro.youAreHere}
          </p>
          <p style={{ fontSize: '9.5pt', color: PRINT_TEXT, lineHeight: 1.5, margin: 0 }}>{stressFrameworkIntro.body}</p>
        </div>
      </div>

      {/* Page 2: Executive Summary */}
      <div className="print-section print-page-break-before">
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '18pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '1em', borderBottom: `2px solid ${PRINT_ACCENT}`, paddingBottom: '0.25em' }}>
          Executive Summary
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1em', marginBottom: '1.5em' }}>
          <div style={{ border: `1px solid ${PRINT_BORDER}`, borderRadius: 4, padding: '1em', textAlign: 'center' }}>
            <div style={{ fontSize: '9pt', color: PRINT_ACCENT, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25em' }}>Capital Health Status</div>
            <div style={{ fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT }}>{healthStatus}</div>
          </div>
          <div style={{ border: `1px solid ${PRINT_BORDER}`, borderRadius: 4, padding: '1em', textAlign: 'center' }}>
            <div style={{ fontSize: '9pt', color: PRINT_ACCENT, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25em' }}>Lion Score (0–100)</div>
            <div style={{ fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT }}>{lionScorePrint}</div>
            <div style={{ fontSize: '9pt', color: PRINT_TEXT }}>{lionPublicLabelPrint}</div>
          </div>
          <div style={{ border: `1px solid ${PRINT_BORDER}`, borderRadius: 4, padding: '1em', textAlign: 'center' }}>
            <div style={{ fontSize: '9pt', color: PRINT_ACCENT, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25em' }}>Depletion Pressure</div>
            <div style={{ fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT }}>{depletionLabel}</div>
          </div>
          <div style={{ border: `1px solid ${PRINT_BORDER}`, borderRadius: 4, padding: '1em', textAlign: 'center' }}>
            <div style={{ fontSize: '9pt', color: PRINT_ACCENT, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25em' }}>Typical Outcome</div>
            <div style={{ fontSize: '12pt', fontWeight: 700, color: PRINT_TEXT }}>{formatCurrency(mcResult.simulatedAverage)}</div>
          </div>
        </div>
        <div style={{ marginTop: '1em' }}>
          <h3 style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.5em' }}>Overall Assessment</h3>
          <p style={{ fontSize: '10pt', color: PRINT_TEXT, lineHeight: 1.5 }}>{overallAssessment}</p>
          <h3 style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_TEXT, marginTop: '1em', marginBottom: '0.5em' }}>Primary Risk Drivers</h3>
          <p style={{ fontSize: '10pt', color: PRINT_TEXT, lineHeight: 1.5 }}>{riskDriversText}</p>
          <h3 style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_TEXT, marginTop: '1em', marginBottom: '0.5em' }}>Suggested Focus Areas</h3>
          <p style={{ fontSize: '10pt', color: PRINT_TEXT, lineHeight: 1.5 }}>{suggestedFocus}</p>
        </div>
        <h3 style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_TEXT, marginTop: '1.25em', marginBottom: '0.5em' }}>Model Snapshot</h3>
        <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.5em' }}>Transparency on how the simulation was produced. Results are derived from a structured Monte Carlo model.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5em 2em', fontSize: '10pt', color: PRINT_TEXT }}>
          <div><strong style={{ color: PRINT_ACCENT }}>Simulation Engine:</strong> Monte Carlo</div>
          <div><strong style={{ color: PRINT_ACCENT }}>Simulation Paths:</strong> {mcResult.simulationCount.toLocaleString()} scenarios tested</div>
          <div><strong style={{ color: PRINT_ACCENT }}>Initial Capital:</strong> {formatCurrency(investment)}</div>
          <div><strong style={{ color: PRINT_ACCENT }}>Yearly Withdrawal:</strong> {formatCurrency(withdrawal)}</div>
          <div><strong style={{ color: PRINT_ACCENT }}>Time Horizon:</strong> {years} years</div>
          <div><strong style={{ color: PRINT_ACCENT }}>Return Range Assumption:</strong> {formatPercent(lowerPct)} to {formatPercent(upperPct)}</div>
          <div><strong style={{ color: PRINT_ACCENT }}>Inflation Assumption:</strong> {effectiveInflation}% p.a.</div>
        </div>
      </div>

      {/* Page 3: Scenario Summary (one-time header metrics) + Capital Diagnosis */}
      <div className="print-section print-page-break-before">
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Scenario Summary
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75em', fontSize: '10pt', marginBottom: '1.5em', padding: '0.75em', border: `1px solid ${PRINT_BORDER}`, borderRadius: 4 }}>
          <div><strong style={{ color: PRINT_ACCENT }}>Structure Health</strong><br />{healthStatus}</div>
          <div><strong style={{ color: PRINT_ACCENT }}>Time Horizon</strong><br />{years} years</div>
          <div><strong style={{ color: PRINT_ACCENT }}>Typical Outcome</strong><br />{formatCurrency(mcResult.simulatedAverage)}</div>
          <div><strong style={{ color: PRINT_ACCENT }}>Initial Capital</strong><br />{formatCurrency(investment)}</div>
          <div><strong style={{ color: PRINT_ACCENT }}>Depletion Pressure</strong><br />{depletionLabel}</div>
          <div><strong style={{ color: PRINT_ACCENT }}>Withdrawal</strong><br />{formatCurrency(withdrawal)}</div>
        </div>

        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Capital Diagnosis
        </h2>
        <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '1em' }}>
          This system evaluates your capital structure using your Lion score (0–100), depletion pressure from withdrawals, and sensitivity charts below. The Lion score is the single headline measure for this report.
        </p>
        <p style={{ fontSize: '10pt', color: PRINT_TEXT }}>
          Think of your capital structure like a car: <strong>Lion score</strong> is overall structural strength; <strong>Depletion pressure</strong> is how quickly the fuel is being consumed; the map and radar show where assumptions are most sensitive.
        </p>
      </div>

      {/* Capital Structure Health + Depletion + Structural Stability Map */}
      <div className="print-section print-page-break-before">
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.75em', textTransform: 'uppercase' }}>
          Capital Structure Health
        </h2>
        <div style={{ border: `1px solid ${PRINT_BORDER}`, padding: '1em', borderRadius: 4, marginBottom: '1em' }}>
          <h3 style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.25em' }}>Lion Score (0–100)</h3>
          <p style={{ fontSize: '10pt', color: PRINT_TEXT }}>{lionScorePrint} — {lionPublicLabelPrint}</p>
          <p style={{ fontSize: '9pt', color: PRINT_TEXT, marginTop: '0.25em', marginBottom: 0 }}>Single headline score for this model, aligned with Lion&apos;s Verdict below.</p>
        </div>
        <div style={{ marginBottom: '1em' }}>
          <h3 style={{ fontSize: '11pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.25em' }}>Depletion Pressure</h3>
          <p style={{ fontSize: '10pt', color: PRINT_TEXT }}>{depletionLabel} {depletionBarOutput != null && `(${formatSignedPct(depletionBarOutput.displayValue)})`}</p>
        </div>

        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginTop: '1em', marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Structural Stability Map
        </h2>
        <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.75em' }}>
          Horizontal axis: Depletion Pressure (left = lower withdrawal pressure, right = heavier withdrawal pressure). Vertical axis: Fragility Index (lower = stronger structural resilience, upper = higher market sensitivity).
        </p>
        <div className="print-chart-wrap" style={{ minHeight: 320 }}>
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
                  <text x="50" y="116" textAnchor="middle" fontSize="4" fill={PRINT_ACCENT} fontWeight="bold">Depletion Pressure</text>
                  <text x="50" y="122" textAnchor="middle" fontSize="2.6" fill={PRINT_TEXT}>← Lower pressure</text>
                  <text x="50" y="122" textAnchor="end" dx="48" fontSize="2.6" fill={PRINT_TEXT}>Heavier pressure →</text>
                  <text x="-10" y="50" textAnchor="middle" fontSize="4" fill={PRINT_ACCENT} fontWeight="bold" transform="rotate(-90 -10 50)">Fragility Index</text>
                  <text x="-14" y="85" textAnchor="middle" fontSize="2.6" fill={PRINT_TEXT} transform="rotate(-90 -14 85)">↓ Stronger resilience</text>
                  <text x="-14" y="15" textAnchor="middle" fontSize="2.6" fill={PRINT_TEXT} transform="rotate(-90 -14 15)">↑ Higher sensitivity</text>
                  <rect x="0" y="50" width="50" height="50" fill="url(#printZoneStrong)" stroke={PRINT_ACCENT} strokeOpacity="0.4" strokeWidth="0.35"/>
                  <rect x="50" y="50" width="50" height="50" fill="url(#printZoneWithdrawal)" stroke={PRINT_ACCENT} strokeOpacity="0.4" strokeWidth="0.35"/>
                  <rect x="0" y="0" width="50" height="50" fill="url(#printZoneMarket)" stroke={PRINT_ACCENT} strokeOpacity="0.4" strokeWidth="0.35"/>
                  <rect x="50" y="0" width="50" height="50" fill="url(#printZoneStress)" stroke={PRINT_ACCENT} strokeOpacity="0.4" strokeWidth="0.35"/>
                  <line x1="50" y1="0" x2="50" y2="100" stroke={PRINT_ACCENT} strokeOpacity="0.5" strokeWidth="0.3"/>
                  <line x1="0" y1="50" x2="100" y2="50" stroke={PRINT_ACCENT} strokeOpacity="0.5" strokeWidth="0.3"/>
                  <text x="25" y="72" textAnchor="middle" fontSize="3.2" fill={PRINT_TEXT} fontWeight="600">Strong Structure</text>
                  <text x="75" y="72" textAnchor="middle" fontSize="3.2" fill={PRINT_TEXT} fontWeight="600">Withdrawal Risk</text>
                  <text x="25" y="22" textAnchor="middle" fontSize="3.2" fill={PRINT_TEXT} fontWeight="600">Market Fragility</text>
                  <text x="75" y="22" textAnchor="middle" fontSize="3.2" fill={PRINT_TEXT} fontWeight="600">Structural Stress</text>
                  <circle cx={xNorm} cy={yNorm} r="2.8" fill={PRINT_ACCENT} stroke={PRINT_TEXT} strokeWidth="0.6"/>
                  <text x={Math.min(92, xNorm + 5)} y={yNorm} textAnchor={xNorm > 70 ? 'end' : 'start'} dx={xNorm > 70 ? -4 : 4} fontSize="2.8" fill={PRINT_ACCENT} fontWeight="bold">Current Position</text>
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
      </div>

      {/* Possible Capital Outcomes + Durability Curve */}
      <div className="print-section print-page-break-before">
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Simulated Average Outcome
        </h2>
        <p style={{ fontSize: '14pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '1em' }}>{formatCurrency(mcResult.simulatedAverage)}</p>
        <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '1.5em' }}>After inflation ({effectiveInflation}% p.a.): {formatCurrency(mcResult.simulatedAverage / Math.pow(1 + effectiveInflation / 100, years))}</p>

        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Possible Capital Outcomes
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5em', fontSize: '10pt', marginBottom: '1.5em' }}>
          <div>Typical (median): {formatCurrency(mcResult.percentile50)}</div>
          <div>Middle 50% range: {formatCurrency(mcResult.percentile25)} – {formatCurrency(mcResult.percentile75)}</div>
          <div>Conservative (5th %): {formatCurrency(mcResult.percentile5)}</div>
          <div>Upside (95th %): {formatCurrency(mcResult.percentile95)}</div>
        </div>

        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Capital Durability Curve
        </h2>
        <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.5em' }}>Shows how capital may evolve over time under market conditions and withdrawals. Median trajectory with 25th–75th percentile band (and optional 5th–95th band) illustrates how outcomes diverge over the horizon.</p>
        <div className="print-chart-wrap" style={{ minHeight: 200 }}>
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
                  <linearGradient id="printBandGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={PRINT_ACCENT} stopOpacity="0.3" /><stop offset="100%" stopColor={PRINT_ACCENT} stopOpacity="0.05" /></linearGradient>
                  <linearGradient id="printBandOuter" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={PRINT_ACCENT} stopOpacity="0.12" /><stop offset="100%" stopColor={PRINT_ACCENT} stopOpacity="0.02" /></linearGradient>
                </defs>
                <line x1={0} y1={0} x2={0} y2={100} stroke={PRINT_ACCENT} strokeOpacity="0.5" strokeWidth="0.3" />
                <line x1={0} y1={100} x2={plotWidth} y2={100} stroke={PRINT_ACCENT} strokeOpacity="0.5" strokeWidth="0.3" />
                {yTicks.map((val, i) => {
                  const y = 100 - scale(val);
                  return (
                    <g key={`y-${i}`}>
                      <line x1={0} y1={y} x2={-0.8} y2={y} stroke={PRINT_ACCENT} strokeOpacity="0.5" strokeWidth="0.25" />
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
                <polyline fill="none" stroke={PRINT_ACCENT} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" points={bands.map((b, i) => `${i * w * xScale},${100 - scale(b.p50)}`).join(' ')} />
                {bands.map((b, i) => (
                  <circle key={i} cx={i * w * xScale} cy={100 - scale(b.p50)} r="0.8" fill={PRINT_ACCENT} />
                ))}
              </svg>
            );
          })()}
        </div>
        <p style={{ fontSize: '9pt', color: PRINT_TEXT, marginBottom: '1em' }}>Year 0 — Year {years}. Shaded band: 25th–75th percentile; outer band: 5th–95th percentile.</p>
        <div style={{ border: `1px solid ${PRINT_BORDER}`, borderRadius: 4, padding: '0.75em 1em', marginBottom: '1em' }}>
          <h3 style={{ fontSize: '10pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.25em' }}>Capital Survival Probability</h3>
          <p style={{ fontSize: '10pt', color: PRINT_TEXT, margin: 0 }}>
            {Math.round(mcResult.survivalProbability * 100)}% of simulated scenarios maintain positive capital through the {years}-year horizon. The Resilience Score combines this survival probability with structural stability (how often capital stays above 50% of initial) so the score reflects both survival and durability.
          </p>
        </div>
      </div>

      {/* Outcome Probability Distribution */}
      <div className="print-section print-page-break-before">
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Capital Outcome Probability Distribution
        </h2>
        <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.5em', lineHeight: 1.5 }}>
          Histogram of <strong>ending capital</strong> after {years} year{years !== 1 ? 's' : ''} across {mcResult.simulationCount.toLocaleString()} simulated paths. Each bar is one capital range; height shows how many scenarios finished in that range. The <strong style={{ color: PRINT_ACCENT }}>gold</strong> bar marks the bucket that contains the <strong>median (typical)</strong> outcome.
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
              <p style={{ fontSize: '9pt', fontWeight: 700, color: PRINT_TEXT, marginBottom: '0.25em' }}>Y-axis: scenario count per bucket</p>
              <p style={{ fontSize: '8pt', color: PRINT_TEXT, marginBottom: '0.5em', lineHeight: 1.45 }}>
                Vertical scale counts paths ending in each capital band. Compare bar heights to see which ending balances are most common versus rare.
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
                  <div className="print-chart-wrap" style={{ height: 168 }}>
                    <svg viewBox="0 0 100 78" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block' }} aria-label="Capital outcome distribution">
                      <line x1="0" y1={plotBase} x2="100" y2={plotBase} stroke={PRINT_ACCENT} strokeWidth="0.45" strokeOpacity={0.85} />
                      <line x1="0" y1={plotTop} x2="0" y2={plotBase} stroke={PRINT_ACCENT} strokeWidth="0.45" strokeOpacity={0.85} />
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
                            fill={i === medianBin ? PRINT_ACCENT : 'rgba(13, 58, 29, 0.22)'}
                            stroke={i === medianBin ? PRINT_ACCENT : 'rgba(13, 58, 29, 0.15)'}
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
                    <strong>X-axis: ending capital</strong> ({bins} bins from lowest to highest simulated ending balance after the horizon).
                  </p>
                </div>
              </div>
              <div
                style={{
                  marginTop: '0.75em',
                  padding: '0.75em 1em',
                  border: `1px solid ${PRINT_ACCENT}`,
                  borderRadius: 6,
                  backgroundColor: 'rgba(255, 252, 245, 0.95)',
                }}
              >
                <p style={{ fontSize: '9pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.25em' }}>Typical outcome (median)</p>
                <p style={{ fontSize: '9pt', color: PRINT_TEXT, margin: 0, lineHeight: 1.45 }}>
                  {formatCurrency(medianVal)} — the gold bar is the bin containing this median ending capital. Compare it to the rest of the shape: if the tallest bars sit to the left of the gold bar, many scenarios finish below the median; if the mass sits to the right, more paths end with higher capital than the median.
                </p>
              </div>
              <p style={{ fontSize: '9pt', color: PRINT_TEXT, marginTop: '0.75em', lineHeight: 1.5, marginBottom: 0 }}>
                <strong>How to read this:</strong> A single sharp peak means outcomes cluster around one ending level; a wide spread means uncertainty in where capital lands. Compare the left tail (low bars on the left) to your risk tolerance — heavy mass near zero indicates meaningful depletion risk in the simulation. This view complements the percentile table above (5th / 25th / 50th / 75th / 95th).
              </p>
            </>
          );
        })()}
      </div>

      {/* Capital Stress Timeline + Capital Breakpoint Indicator */}
      <div className="print-section print-page-break-before">
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Capital Stress Timeline
        </h2>
        <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.75em' }}>Two metrics by year: probability of full capital depletion (balance ≤ 0) and probability of structural capital stress (capital below 50% of initial). Shows when stress begins to emerge over the horizon.</p>
        <div className="print-chart-wrap" style={{ minHeight: 240 }}>
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
                <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke={PRINT_ACCENT} strokeWidth="1.2" strokeOpacity="0.7" />
                <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke={PRINT_ACCENT} strokeWidth="1.2" strokeOpacity="0.7" />
                <text x={plotLeft - 4} y={plotTop - 6} fontSize="9" fill={PRINT_ACCENT} fontWeight="bold">% of paths</text>
                {yTicks.map((pct, i) => {
                  const y = scaleY(pct);
                  return (
                    <g key={i}>
                      <line x1={plotLeft} y1={y} x2={plotLeft - 4} y2={y} stroke={PRINT_ACCENT} strokeWidth="0.8" strokeOpacity="0.6" />
                      <text x={plotLeft - 8} y={y} fontSize="8" fill={PRINT_TEXT} textAnchor="end" dominantBaseline="middle">{pct}%</text>
                    </g>
                  );
                })}
                {xTickYears.map(y => {
                  const x = n > 1 ? plotLeft + (y / (n - 1)) * plotWidth : plotLeft;
                  return (
                    <g key={y}>
                      <line x1={x} y1={plotBottom} x2={x} y2={plotBottom + 4} stroke={PRINT_ACCENT} strokeWidth="0.8" strokeOpacity="0.6" />
                      <text x={x} y={plotBottom + 14} fontSize="8" fill={PRINT_TEXT} textAnchor="middle">Year {y}</text>
                    </g>
                  );
                })}
                <polyline fill="none" stroke={PRINT_ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={depletionPts} />
                {depletionData.map((d, i) => (
                  <circle key={`d-${i}`} cx={xFor(i)} cy={scaleY(d * 100)} r="2.5" fill={PRINT_ACCENT} stroke={PRINT_TEXT} strokeWidth="0.8" />
                ))}
                <polyline fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,3" points={stressPts} />
                {stressData.slice(0, n).map((s, i) => (
                  <circle key={`s-${i}`} cx={xFor(i)} cy={scaleY(s * 100)} r="2" fill="#D97706" stroke={PRINT_TEXT} strokeWidth="0.6" />
                ))}
                <text x={plotRight - 80} y={plotTop - 2} fontSize="8" fill={PRINT_ACCENT} fontWeight="600">— Depletion</text>
                <text x={plotRight - 80} y={plotTop + 10} fontSize="8" fill="#D97706" fontWeight="600">— Structural stress</text>
              </svg>
            );
          })()}
        </div>
        <p style={{ fontSize: '9pt', color: PRINT_TEXT, marginBottom: '0.5em' }}>Gold line: probability of full capital depletion (balance ≤ 0). Amber dashed line: probability of structural capital stress (capital below 50% of initial). Early stability: low percentages; rising stress: increasing % over time.</p>
        <p style={{ fontSize: '9pt', color: PRINT_TEXT, fontStyle: 'italic', marginBottom: '1em' }}>
          {mcResult.structuralStressRateByYear
            ? 'While full capital depletion may remain unlikely under current assumptions, the probability of structural capital stress can gradually increase later in the investment horizon.'
            : 'Full depletion and structural stress (capital below 50% of initial) are shown when available.'}
        </p>

        <div style={{ border: `1px solid ${PRINT_BORDER}`, borderRadius: 4, padding: '0.75em 1em', marginTop: '0.75em' }}>
          <h3 style={{ fontSize: '10pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.25em' }}>Capital Breakpoint Indicator</h3>
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
      <div className="print-section print-page-break-before">
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Projected Capital vs Starting Capital
        </h2>
        <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '1em' }}>
          Simulated average ending capital vs initial: {investment > 0 ? ((mcResult.simulatedAverage / investment) * 100).toFixed(1) : '—'}%
        </p>

        <h2 className="print-keep-with-next" style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Simulated Capital Journey
        </h2>
        <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.75em' }}>Typical market path (median outcomes). Rows stop when capital reaches zero.</p>
        <div className="print-journey-table" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', fontSize: '10pt', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${PRINT_BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: PRINT_ACCENT }}>Year</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: PRINT_ACCENT }}>Est. Return %</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: PRINT_ACCENT }}>Account Balance</th>
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
          <div className="print-section print-page-break-before">
            <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
              Biggest Impact Improvements
            </h2>
            <ol style={{ fontSize: '10pt', color: PRINT_TEXT, marginLeft: '1.25em', marginBottom: '1em' }}>
              {withDelta.slice(0, 3).map((s, i) => (
                <li key={s.key}>{s.label}</li>
              ))}
            </ol>

            <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
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
                    <p style={{ fontWeight: 700, fontSize: '10pt', color: PRINT_ACCENT }}>{s.label}</p>
                    <p style={{ fontSize: '10pt', color: PRINT_TEXT }}>Lion score: {adjLion} · {adjPub} · Depletion: {depBar.pillLabel}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Capital Stress Radar */}
      <div className="print-section print-page-break-before">
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Capital Stress Radar
        </h2>
        <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.75em' }}>Sensitivity to key risk drivers. Higher scores indicate greater vulnerability.</p>
        <div className="print-chart-wrap" style={{ maxWidth: 280, margin: '0 auto' }}>
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
                {[20, 40, 60, 80].map(r => <circle key={r} cx={cx} cy={cy} r={r * size / 200} fill="none" stroke={PRINT_ACCENT} strokeOpacity="0.3" />)}
                {axes.map((_, i) => {
                  const a0 = -Math.PI / 2 + i * angleStep;
                  const x2 = cx + gridRadius * Math.cos(a0);
                  const y2 = cy + gridRadius * Math.sin(a0);
                  return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke={PRINT_ACCENT} strokeOpacity="0.3" />;
                })}
                <polygon points={poly} fill={PRINT_ACCENT} fillOpacity="0.2" stroke={PRINT_ACCENT} strokeWidth="0.5" />
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
      </div>

      {/* Further Structural Stress Test */}
      <div className="print-section print-page-break-before">
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Further Structural Stress Test
        </h2>
        <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.75em' }}>How the capital structure responds when key assumptions deteriorate.</p>
        {stressScenarioResults && stressScenarioResults.length > 0 ? (
          <div className="print-chart-wrap" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', fontSize: '10pt', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${PRINT_BORDER}` }}>
                  <th style={{ padding: '6px 8px', color: PRINT_ACCENT, textAlign: 'center' }}>Stress Driver</th>
                  <th style={{ padding: '6px 8px', color: PRINT_ACCENT, textAlign: 'center' }}>If Stress Level</th>
                  <th style={{ padding: '6px 8px', color: PRINT_ACCENT, textAlign: 'center' }}>Depletion Pressure</th>
                  <th style={{ padding: '6px 8px', color: PRINT_ACCENT, textAlign: 'center' }}>Ending Capital</th>
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
      </div>

      {/* Key Takeaways + Recommended Adjustments + Lion's Verdict */}
      <div className="print-section print-page-break-before">
        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Key Takeaways
        </h2>
        <ul style={{ fontSize: '10pt', color: PRINT_TEXT, marginLeft: '1.25em', marginBottom: '1.5em', lineHeight: 1.5 }}>
          {keyTakeaways.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>

        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          Recommended Adjustments
        </h2>
        <ul style={{ fontSize: '10pt', color: PRINT_TEXT, marginLeft: '1.25em', marginBottom: '1.5em', lineHeight: 1.5 }}>
          {recommendedAdjustments.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>

        <h2 style={{ fontFamily: CB_FONT_SERIF, fontSize: '14pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em', textTransform: 'uppercase' }}>
          THE LION&apos;S VERDICT
        </h2>
        {verdict && (
          <>
            <p
              style={{
                fontSize: '12pt',
                fontWeight: 700,
                fontStyle: 'italic',
                color: PRINT_TEXT,
                marginBottom: '0.75em',
                textTransform: 'capitalize',
              }}
            >
              &ldquo;{verdict.opening}&rdquo;
            </p>
            <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.5em', lineHeight: 1.5 }}>{verdict.interpretation}</p>
            <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.5em', lineHeight: 1.5 }}>{verdict.outcomeSummary}</p>
            <p style={{ fontSize: '10pt', color: PRINT_TEXT, marginBottom: '0.5em', lineHeight: 1.5 }}>{verdict.riskExplanation}</p>
            <p style={{ fontSize: '10pt', fontWeight: 600, color: PRINT_ACCENT, marginBottom: '0.5em', lineHeight: 1.5 }}>{verdict.advisoryRecommendation}</p>
            {lionVerdictOutput ? (
              <div style={{ marginBottom: '0.75em', paddingTop: '0.5em', borderTop: `1px solid ${PRINT_BORDER}` }}>
                <p style={{ fontSize: '10pt', fontWeight: 700, color: PRINT_ACCENT, marginBottom: '0.5em' }}>
                  Lion score: {lionVerdictOutput.score0to100} / 100 ·{' '}
                  {formatLionPublicStatusLabel(
                    lionPublicStatusFromScore0to100(
                      lionVerdictOutput.score0to100,
                      lionStrongEligibilityFromStressInputs(bandStressInputs),
                    ),
                  )}
                </p>
                <p style={{ fontSize: '9pt', fontWeight: 700, color: PRINT_ACCENT, textTransform: 'uppercase', marginBottom: '0.25em' }}>Strategic options</p>
                <ul style={{ fontSize: '9pt', color: PRINT_TEXT, marginLeft: '1.25em', marginBottom: '0.5em', lineHeight: 1.45 }}>
                  {lionVerdictOutput.strategicOptions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <p style={{ fontSize: '9pt', fontWeight: 700, color: PRINT_ACCENT, textTransform: 'uppercase', marginBottom: '0.25em' }}>Capital unlock</p>
                <ul style={{ fontSize: '9pt', color: PRINT_TEXT, marginLeft: '1.25em', marginBottom: '0.5em', lineHeight: 1.45 }}>
                  {lionVerdictOutput.capitalUnlockGuidance.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <p style={{ fontSize: '9pt', fontWeight: 700, color: PRINT_ACCENT, textTransform: 'uppercase', marginBottom: '0.25em' }}>Scenario actions</p>
                <ul style={{ fontSize: '9pt', color: PRINT_TEXT, marginLeft: '1.25em', marginBottom: '0.5em', lineHeight: 1.45 }}>
                  {lionVerdictOutput.scenarioActions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <p style={{ fontSize: '9pt', fontWeight: 700, color: PRINT_ACCENT, textTransform: 'uppercase', marginBottom: '0.25em' }}>Priority actions</p>
                <ul style={{ fontSize: '9pt', color: PRINT_TEXT, marginLeft: '1.25em', marginBottom: '0.5em', lineHeight: 1.45 }}>
                  {lionVerdictOutput.priorityActions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <p style={{ fontSize: '9pt', fontStyle: 'italic', color: PRINT_ACCENT, lineHeight: 1.45 }}>
                  If you do nothing: {lionVerdictOutput.ifYouDoNothing}
                </p>
              </div>
            ) : null}
            <div style={{ marginTop: '0.5em' }}>
              {microSignals.map((s, i) => (
                <p key={i} style={{ fontSize: '10pt', color: PRINT_TEXT }}>{s.type === 'warn' ? '⚠' : '✓'} {s.text}</p>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Final page: Disclosure only */}
      <div className="print-disclosure-page print-section">
        <p style={{ fontSize: '11pt', color: PRINT_TEXT, textAlign: 'center', marginTop: '2em' }}>
          Please save or print a copy for your records.
        </p>
      </div>
    </div>
  );
}
