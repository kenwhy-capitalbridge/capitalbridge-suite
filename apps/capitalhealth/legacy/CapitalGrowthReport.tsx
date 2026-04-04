import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  pdf,
  Font,
} from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';

// Enforce UTF-8-friendly rendering: prevent mid-word breaks and malformed characters
Font.registerHyphenationCallback((word) => [word]);

Font.register({
  family: "Roboto Serif",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/robotoserif/v17/R71RjywflP6FLr3gZx7K8UyuXDs9zVwDmXCb8lxYgmuii32UGoVldX6UgfjL4-3sMM_kB_qXSEXTJQCFLH5-_bcElvQqp6c.ttf",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/robotoserif/v17/R71RjywflP6FLr3gZx7K8UyuXDs9zVwDmXCb8lxYgmuii32UGoVldX6UgfjL4-3sMM_kB_qXSEXTJQCFLH5-_bcEls0qp6c.ttf",
      fontWeight: 700,
    },
    {
      src: "https://fonts.gstatic.com/s/robotoserif/v17/R71XjywflP6FLr3gZx7K8UyEVQnyR1E7VN-f51xYuGCQepOvB0KLc2v0wKKB0Q4MSZxyqf2CgAchbDJ69BcVZxkDg-JuqON8BQ.ttf",
      fontWeight: 700,
      fontStyle: "italic",
    },
  ],
});
import type { CalculatorInputs, SimulationResult, StatusKind } from './calculator-types';
import { runSimulation } from './calculator-engine';
import { TIER_COLORS, type RiskTierKey } from './src/lib/statusCopy';
import { getRiskTier } from './src/lib/riskTier';
import type { ScenarioAdjustments } from './src/lib/capitalHealthTypes';
import { APP_NAME } from './src/lib/capitalHealthCopy';
import type { LionHealthVariables } from '@cb/advisory-graph/lionsVerdict';
import { advisoryFrameworkPdfIntro } from '@cb/shared/advisoryFramework';
import { formatCurrencyDisplayNoDecimals } from '@cb/shared/formatCurrency';
import { formatReportGeneratedAtLabel, reportPreparedForLine } from '@cb/shared/reportIdentity';
import { createReportAuditMeta, CB_REPORT_LEGAL_NOTICE, type ReportAuditMeta } from '@cb/shared/reportTraceability';
import {
  CB_REPORT_BODY_MUTED,
  CB_REPORT_BRAND_FULL_GREEN_PATH,
  CB_REPORT_FIRM_ADDRESS_LINES,
  CB_REPORT_FOOTER_RESERVE_PT,
  CB_REPORT_FRAME_BORDER_PT,
  CB_REPORT_FRAME_PADDING_PT,
  CB_REPORT_GOLD,
  CB_REPORT_INK_GREEN,
  CB_REPORT_PAGE_MARGIN_MM,
  CB_REPORT_SOFT_PANEL_BG,
  cbReportMmToPt,
} from '@cb/shared/cbReportTemplate';
import {
  formatLionPublicStatusLabel,
  healthTierToLion,
  lionPublicStatusFromScore0to100,
  lionStrongEligibilityFromHealthTier,
} from '@cb/advisory-graph/lionsVerdict';

/** CSS break-* for react-pagination; cast to `Style` so arrays like `[sheetStyle, this]` type-check. */
const PDF_BREAK_INSIDE_AVOID = {
  breakInside: 'avoid' as const,
  pageBreakInside: 'avoid' as const,
} as Style;

/** Extended result when report is generated from the app (useCalculatorResults); uses app status messaging. */
export type ReportResult = SimulationResult & {
  statusCopy?: { short: string; headline?: string; long: string };
  riskMetrics?: { riskTier: number; healthScore?: number; riskTierLabel?: string };
  scenarioAdjustments?: ScenarioAdjustments | null;
  sustainableIncomeMonthly?: number;
  depletionMonth?: number | null;
  runwayPhrase?: string;
};

const ADVISORY_LONG: Record<StatusKind, string> = {
  sustainable:
    'On the numbers you entered, your withdrawals look supportable by portfolio income. Your base is not under obvious strain. You can still trim risk or add a buffer for extra peace of mind — this is about resilience, not chasing returns.',
  plausible:
    'You are close to a workable setup, but there is little spare room. Small changes help: slightly lower withdrawals, a little more capital, a longer time horizon, or more cautious return assumptions. Little adjustments now often matter more than big bets later.',
  unsustainable:
    'On these settings, spending is likely to outpace what the portfolio can replace. That can wear down savings faster than people expect — it is maths, not a judgement. Before chasing higher returns, consider lowering withdrawals, adding capital, or extending your horizon. Sort stability first.',
};

const GOLD = CB_REPORT_GOLD;
const GREEN = CB_REPORT_INK_GREEN;
const DARK = CB_REPORT_INK_GREEN;
const MUTED = CB_REPORT_BODY_MUTED;
const SOFT_PANEL = CB_REPORT_SOFT_PANEL_BG;
const SOFT_BORDER = 'rgba(255, 204, 106, 0.42)';
const STATUS_COLORS: Record<StatusKind, string> = {
  sustainable: '#11B981',
  plausible: '#D97706',
  unsustainable: '#DC2626',
};

function formatNum(n: number, decimals = 0): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Standardised runway format: "X years Y months" or "Perpetual" (no decimals). */
function formatRunwayYearsMonths(depletionMonths: number | null): string {
  if (depletionMonths == null || depletionMonths >= 1200) return 'Perpetual';
  const years = Math.floor(depletionMonths / 12);
  const months = Math.round(depletionMonths % 12);
  if (years === 0 && months === 0) return 'Perpetual';
  if (years === 0) return `${months} months`;
  if (months === 0) return `${years} years`;
  return `${years} years ${months} months`;
}

const CHART_HEIGHT = 72;
/** Tick column width; Y-axis title sits in a separate left gutter so it cannot paint under bars. */
const CHART_Y_AXIS_W = 40;
const CHART_Y_LABEL_GUTTER = 68;
/** A4 content box inside page padding (pt) — full-height gold frame on every page. */
const PAGE_W_PT = 595.28;
const PAGE_H_PT = 841.89;
const BAR_COUNT = 48;

const REPORT_PAGE_OUTER = cbReportMmToPt(CB_REPORT_PAGE_MARGIN_MM);
const CONTENT_PADDING = 12;
const BORDER_RADIUS = 8;
const SECTION_SPACING = 40;
const SUBSECTION_SPACING = 22;
const CHART_SPACING = 28;
const CARD_SPACING = 20;
const LOGO_TITLE_GAP = 12;

const styles = StyleSheet.create({
  warningPanel: {
    borderWidth: 2,
    borderColor: '#CD5B52',
    borderRadius: 8,
    padding: 20,
    backgroundColor: 'rgba(205,91,82,0.08)',
    marginBottom: SECTION_SPACING,
  },
  pageContent: {
    padding: CONTENT_PADDING,
    paddingTop: 0,
  },
  /** Full width inside border; sits slightly below gold line so it doesn't cover it. */
  coverImageWrapper: {
    width: '100%',
    marginTop: 10,
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  coverImage: {
    width: '100%',
    height: 140,
    objectFit: 'contain',
  },
  reportTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: DARK,
    textAlign: 'center',
    marginBottom: 2,
  },
  reportSubtitle: {
    fontSize: 9,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 16,
  },
  section: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    borderRadius: 8,
    padding: 12,
    backgroundColor: SOFT_PANEL,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: GOLD,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  bodyText: {
    color: DARK,
    fontSize: 11,
    marginBottom: 4,
    textAlign: 'left',
  },
  assumptionRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  assumptionLabel: {
    color: MUTED,
    fontSize: 9,
    width: '38%',
    paddingRight: 8,
  },
  assumptionValue: {
    color: DARK,
    fontSize: 11,
    flex: 1,
  },
  card: {
    backgroundColor: SOFT_PANEL,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
  },
  cardLabel: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: DARK,
  },
  chartSection: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: SOFT_BORDER,
    borderRadius: 8,
    padding: 12,
    backgroundColor: SOFT_PANEL,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: GREEN,
    marginBottom: 8,
    textTransform: 'uppercase',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    fontFamily: 'Roboto Serif',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    gap: 1,
  },
  chartBar: {
    flex: 1,
    backgroundColor: GOLD,
    borderRadius: 1,
    minHeight: 2,
  },
  advisoryBox: {
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 6,
    padding: 12,
    backgroundColor: 'transparent',
    marginBottom: 14,
  },
  advisoryText: {
    color: DARK,
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  slogan: {
    color: MUTED,
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  disclaimer: {
    fontSize: 8,
    color: MUTED,
    textAlign: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: `${GOLD}80`,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  col: { flex: 1 },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SECTION_SPACING,
  },
  headerLeft: { width: '36%', marginRight: LOGO_TITLE_GAP, paddingRight: 6 },
  headerRight: { width: '28%', textAlign: 'right', fontSize: 9, color: MUTED, lineHeight: 1.4 },
  titleBlock: { flex: 1, textAlign: 'left', marginBottom: SECTION_SPACING },
  mainTitle: { fontSize: 28, fontWeight: 'bold', color: GREEN, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, textAlign: 'left', fontFamily: 'Roboto Serif' },
  coverTitleBlock: { marginBottom: 12, textAlign: 'left' },
  /** Single-line cover title; smaller font so "CLIENT ADVISORY REPORT" fits on one line. */
  coverMainTitle: { fontSize: 17, fontWeight: 'bold', color: GREEN, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 0, textAlign: 'left', fontFamily: 'Roboto Serif', paddingRight: 12 },
  coverDivider: { borderBottomWidth: 1, borderBottomColor: GOLD, marginTop: 10, marginBottom: 16 },
  coverMetadata: { marginBottom: 18 },
  coverMetadataLine: { fontSize: 10, color: DARK, marginBottom: 4, textAlign: 'left' },
  coverFirmBlock: { fontSize: 9, color: DARK, lineHeight: 1.5, textAlign: 'left' },
  subTitle: { fontSize: 13, fontWeight: 'bold', color: DARK, marginBottom: 2, textAlign: 'left' },
  generatedDate: { fontSize: 9, color: MUTED, marginBottom: 6, textAlign: 'left' },
  titleDescription: { fontSize: 11, color: MUTED, fontStyle: 'italic', textAlign: 'left' },
  verdictDivider: { borderBottomWidth: 1, borderBottomColor: GOLD, marginVertical: 10 },
  /** Keeps entire Lion's Verdict block on one page; pair with PDF_BREAK_INSIDE_AVOID on the View. */
  verdictSectionWrap: { marginBottom: SECTION_SPACING },
  sectionWrap: { marginBottom: SECTION_SPACING },
  sectionTitleLarge: { fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5, color: GREEN, marginBottom: 6, textTransform: 'uppercase', textAlign: 'left', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: GOLD, fontFamily: 'Roboto Serif' },
  /** THE LION'S VERDICT — Roboto Serif (registered above). */
  sectionTitleLionVerdict: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: GREEN,
    marginBottom: 6,
    textTransform: 'uppercase',
    textAlign: 'left',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
    fontFamily: "Roboto Serif",
  },
  verdictDynamicHeadline: {
    fontFamily: "Roboto Serif",
    fontSize: 11,
    fontStyle: "italic",
    fontWeight: "bold",
    color: DARK,
    marginBottom: SUBSECTION_SPACING,
    lineHeight: 1.5,
    textTransform: "capitalize",
  },
  subsectionTitle: { fontSize: 13, fontWeight: 'bold', color: DARK, marginBottom: SUBSECTION_SPACING, textAlign: 'left', fontFamily: 'Roboto Serif' },
  confidenceBarWrap: { marginBottom: 8 },
  confidenceBar: { height: 12, backgroundColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden', flexDirection: 'row' },
  confidenceFill: { height: '100%', borderRadius: 6 },
  confidenceLabel: { fontSize: 8, color: MUTED, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: CARD_SPACING },
  summaryCard: { flex: 1, padding: 10, borderWidth: 1, borderColor: SOFT_BORDER, borderRadius: 8, backgroundColor: SOFT_PANEL },
  summaryCardLabel: { fontSize: 8, color: MUTED, marginBottom: 4, textTransform: 'uppercase' },
  summaryCardValue: { fontSize: 11, fontWeight: 'bold', color: DARK },
  stressTable: { width: '100%', borderWidth: 1, borderColor: SOFT_BORDER, borderRadius: 8 },
  stressTableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingVertical: 6, paddingHorizontal: 8 },
  stressTableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: GREEN, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: '#f5f5f4' },
  stressTableCol1: { width: '40%', fontSize: 9, color: DARK },
  stressTableCol2: { width: '30%', fontSize: 9, color: DARK },
  stressTableCol3: { width: '30%', fontSize: 9, color: DARK, textAlign: 'right' },
  highlightBox: { borderWidth: 2, borderColor: GOLD, borderRadius: 8, padding: 20, backgroundColor: 'rgba(255,204,106,0.12)', marginTop: 12 },
  highlightTitle: { fontSize: 9, fontWeight: 'bold', color: GREEN, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  actionList: { marginLeft: 8, marginBottom: 6 },
  actionItem: { fontSize: 9, color: DARK, marginBottom: 4, lineHeight: 1.4 },
});

export interface ChartPoint {
  month: number;
  nominal: number;
}

function ReportPage({
  pageNumber,
  totalPages,
  audit,
  children,
}: {
  pageNumber: number;
  totalPages: number;
  audit: ReportAuditMeta;
  children: React.ReactNode;
}) {
  const frameW = PAGE_W_PT - 2 * REPORT_PAGE_OUTER;
  const frameH = PAGE_H_PT - 2 * REPORT_PAGE_OUTER;
  return (
    <Page
      size="A4"
      style={{
        backgroundColor: '#ffffff',
        padding: REPORT_PAGE_OUTER,
        fontFamily: 'Helvetica',
        fontSize: 11,
      }}
    >
      <View
        style={{
          width: frameW,
          minHeight: frameH,
          borderWidth: CB_REPORT_FRAME_BORDER_PT,
          borderColor: CB_REPORT_GOLD,
          borderRadius: 10,
          paddingTop: 20,
          paddingLeft: CB_REPORT_FRAME_PADDING_PT,
          paddingRight: CB_REPORT_FRAME_PADDING_PT,
          paddingBottom: CB_REPORT_FOOTER_RESERVE_PT + 42,
          position: 'relative',
          flexDirection: 'column',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: CB_REPORT_FRAME_PADDING_PT,
            right: CB_REPORT_FRAME_PADDING_PT,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontFamily: 'Roboto Serif',
              fontWeight: 'bold',
              color: GREEN,
              paddingRight: 8,
              maxWidth: '52%',
              lineHeight: 1.25,
            }}
          >
            {audit.modelDisplayName}
          </Text>
          <View style={{ alignItems: 'flex-end', maxWidth: '48%' }}>
            <Text style={{ fontSize: 7, color: '#4b5563', textAlign: 'right', lineHeight: 1.35 }}>Report ID: {audit.reportId}</Text>
            <Text style={{ fontSize: 7, color: '#4b5563', textAlign: 'right', lineHeight: 1.35 }}>{audit.generatedAtLabel}</Text>
            <Text style={{ fontSize: 7, color: '#4b5563', textAlign: 'right', lineHeight: 1.35 }}>Version: {audit.versionLabel}</Text>
          </View>
        </View>
        <View style={{ flexGrow: 1, flexShrink: 0, marginTop: 14, minHeight: 0 }}>{children}</View>
        <View
          style={{
            position: 'absolute',
            bottom: 8,
            left: CB_REPORT_FRAME_PADDING_PT,
            right: CB_REPORT_FRAME_PADDING_PT,
          }}
        >
          <Text style={{ fontSize: 4.8, color: '#6b7280', textAlign: 'justify', lineHeight: 1.12, marginBottom: 5 }}>
            {CB_REPORT_LEGAL_NOTICE}
          </Text>
          <Text style={{ fontSize: 8, color: '#5f6b67', textAlign: 'center' }}>
            Page {pageNumber} of {totalPages}
          </Text>
        </View>
      </View>
    </Page>
  );
}

interface ReportProps {
  inputs: CalculatorInputs;
  result: ReportResult;
  baseUrl?: string;
  /** Raster brand marks (e.g. PNG data URLs) when `baseUrl` is unavailable (Node sample PDF). */
  brandFullLockupPngDataUrl?: string | null;
  brandLionPngDataUrl?: string | null;
  brandWordmarkPngDataUrl?: string | null;
  chartData?: ChartPoint[];
  /** Client age for Capital Survival Age (optional). */
  currentAge?: number;
  /** Trial / locked users: omit the Lion's Verdict block from the PDF. */
  includeLionsVerdict?: boolean;
  /** Shown on the cover (first + last from profile when available). */
  reportClientDisplayName?: string;
  reportAudit: ReportAuditMeta;
}

function durationPhrase(result: SimulationResult): string {
  if (result.formulaSustainable === true) return 'Forever Income Achieved';
  if (result.formulaDepletionMonthsWhole != null) {
    const mo = result.formulaDepletionMonthsWhole;
    const yr = Math.floor(mo / 12);
    const rem = mo % 12;
    return rem > 0 ? `${yr} yr / ${rem} mo` : `${yr} yr`;
  }
  return 'Forever Income Achieved';
}

function coveragePct(inputs: CalculatorInputs, result: SimulationResult): number {
  if (inputs.mode === 'withdrawal' && inputs.targetMonthlyIncome > 0 && result.monthlyReturnOnCapital != null) {
    return (result.monthlyReturnOnCapital / inputs.targetMonthlyIncome) * 100;
  }
  return result.coveragePct;
}

function netValue(inputs: CalculatorInputs, result: SimulationResult): number {
  if (inputs.mode === 'withdrawal') return result.passiveIncomeMonthly - inputs.targetMonthlyIncome;
  return result.nominalCapitalAtHorizon - inputs.targetFutureCapital;
}

type StressRow = { scenario: string; returnPct: number; runwayText: string };
function computeStressScenarios(inputs: CalculatorInputs): StressRow[] {
  const baseReturn = inputs.expectedAnnualReturnPct;
  const bearReturn = Math.max(baseReturn - 4, 0);
  const bullReturn = baseReturn + 2;
  const baseInputs = { ...inputs };
  const scenarios = [
    { label: 'Conservative Market', returnPct: bearReturn, inputs: { ...baseInputs, expectedAnnualReturnPct: bearReturn } },
    { label: 'Base Case', returnPct: baseReturn, inputs: { ...baseInputs, expectedAnnualReturnPct: baseReturn } },
    { label: 'Aggressive Market', returnPct: bullReturn, inputs: { ...baseInputs, expectedAnnualReturnPct: bullReturn } },
  ];
  return scenarios.map((s) => {
    const sim = runSimulation(s.inputs);
    const runwayText = formatRunwayYearsMonths(inputs.mode === 'withdrawal' ? (sim.depletionMonth ?? null) : null);
    return { scenario: s.label, returnPct: s.returnPct, runwayText };
  });
}

function CapitalProjectionChart({
  chartData,
  formatY,
  yAxisLabel,
  xAxisLabel,
  lastPointCaption,
  insight,
}: {
  chartData: ChartPoint[];
  formatY: (n: number) => string;
  yAxisLabel: string;
  xAxisLabel: string;
  lastPointCaption: string;
  insight: string;
}) {
  if (!chartData.length) return null;
  const maxVal = Math.max(...chartData.map((d) => d.nominal), 1);
  const minVal = Math.min(...chartData.map((d) => d.nominal), 0);
  const range = maxVal - minVal || 1;
  const yHi = maxVal;
  const yLo = minVal;
  const yMid = minVal + range / 2;

  const labelColW = CHART_Y_LABEL_GUTTER + CHART_Y_AXIS_W;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ width: labelColW, marginRight: 2 }}>
          <Text
            style={{
              fontSize: 7,
              color: DARK,
              marginBottom: 4,
              width: labelColW - 2,
              textAlign: 'left',
            }}
          >
            {yAxisLabel}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <View style={{ width: CHART_Y_AXIS_W, height: CHART_HEIGHT, justifyContent: 'space-between', paddingRight: 4 }}>
              <Text style={{ fontSize: 7, color: DARK, textAlign: 'right' }} wrap={false}>
                {formatY(yHi)}
              </Text>
              <Text style={{ fontSize: 7, color: DARK, textAlign: 'right' }} wrap={false}>
                {formatY(yMid)}
              </Text>
              <Text style={{ fontSize: 7, color: DARK, textAlign: 'right' }} wrap={false}>
                {formatY(yLo)}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ flex: 1, flexDirection: 'column', minWidth: 0 }}>
          <View style={[styles.chartContainer, { height: CHART_HEIGHT, flex: 0 }]}>
            {chartData.map((d, i) => {
              const heightPct = (d.nominal - minVal) / range;
              const height = Math.max(2, Math.round(CHART_HEIGHT * heightPct));
              return (
                <View
                  key={i}
                  style={[
                    styles.chartBar,
                    {
                      height,
                    },
                  ]}
                />
              );
            })}
          </View>
          <Text style={{ fontSize: 8, color: DARK, textAlign: 'center', marginTop: 6 }}>{xAxisLabel}</Text>
        </View>
      </View>
      <View
        style={{
          marginTop: 8,
          padding: 8,
          borderWidth: 1,
          borderColor: GOLD,
          borderRadius: 6,
          backgroundColor: 'rgba(255, 252, 245, 0.95)',
        }}
      >
        <Text style={{ fontSize: 8, fontWeight: 'bold', color: GREEN, marginBottom: 2 }}>Latest value (end of series)</Text>
        <Text style={{ fontSize: 9, color: DARK }}>{lastPointCaption}</Text>
      </View>
      <Text style={{ fontSize: 9, color: DARK, marginTop: 8, lineHeight: 1.45 }}>{insight}</Text>
    </View>
  );
}

export function CapitalGrowthReport({
  inputs,
  result,
  baseUrl,
  brandFullLockupPngDataUrl,
  brandLionPngDataUrl,
  brandWordmarkPngDataUrl,
  chartData = [],
  currentAge,
  includeLionsVerdict = true,
  reportClientDisplayName = 'Client',
  reportAudit,
}: ReportProps) {
  const symbol = inputs.currency.symbol;
  const formatCurrency = (val: number) => formatCurrencyDisplayNoDecimals(val, symbol);
  const generatedAtStr = formatReportGeneratedAtLabel();
  const preparedForStr = reportPreparedForLine(reportClientDisplayName);
  const horizonYears = inputs.timeHorizonYears;
  const horizonYearsFormatted = horizonYears % 1 === 0 ? String(Math.round(horizonYears)) : horizonYears.toFixed(1);
  const sustainableMonthly = (result as ReportResult & { sustainableIncomeMonthly?: number }).sustainableIncomeMonthly
    ?? result.monthlyReturnOnCapital ?? result.passiveIncomeMonthly ?? 0;
  const incomeGap = inputs.mode === 'withdrawal' ? Math.max(0, inputs.targetMonthlyIncome - sustainableMonthly) : 0;
  const depletionMo = result.depletionMonth ?? null;
  const runwayYearsText = formatRunwayYearsMonths(depletionMo);
  const survivalAge = currentAge != null && depletionMo != null && depletionMo < 1200
    ? Math.floor(currentAge + depletionMo / 12) : null;
  const healthScore = result.riskMetrics?.healthScore ?? coveragePct(inputs, result);
  const tier = result.riskMetrics?.riskTier ?? getRiskTier(healthScore).tier;
  const riskTierClamped = Math.min(5, Math.max(1, tier)) as 1 | 2 | 3 | 4 | 5;
  const lionScorePdf = healthTierToLion(riskTierClamped).score0to100;
  const healthVarsForStrong: LionHealthVariables = {
    horizon: horizonYearsFormatted,
    runway: depletionMo == null ? 'Perpetual income' : runwayYearsText,
    expectedReturn: `${formatNum(inputs.expectedAnnualReturnPct, 1)}%`,
  };
  const lionStatusPdf = formatLionPublicStatusLabel(
    lionPublicStatusFromScore0to100(
      lionScorePdf,
      lionStrongEligibilityFromHealthTier(riskTierClamped, inputs.mode, healthVarsForStrong),
    ),
  );
  const statusColor = tier >= 1 && tier <= 5 ? TIER_COLORS[tier as RiskTierKey] : STATUS_COLORS[result.status];
  const confidenceColor = tier >= 4 ? '#CD5B52' : tier === 3 ? '#F3AF56' : '#55B685';
  const stressRows = computeStressScenarios(inputs);
  const adj = result.scenarioAdjustments;
  const recommendedIncome = adj?.reduceIncome?.targetMonthly ?? 0;
  const requiredCapital = adj?.addCapital?.requiredStart ?? 0;
  const requiredReturn = adj?.increaseReturn?.requiredAnnualPct ?? 0;
  const step = chartData.length <= BAR_COUNT ? 1 : Math.max(1, Math.floor(chartData.length / BAR_COUNT));
  const chartPoints = chartData.filter((_, i) => i % step === 0).slice(0, BAR_COUNT);
  const reviewDate = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toLocaleDateString(undefined, { dateStyle: 'long' }); })();

  const healthFrameworkIntro = advisoryFrameworkPdfIntro('capital_structure_health');

  const executiveSummary =
    inputs.mode === 'withdrawal'
      ? `Based on the assumptions provided, the current withdrawal structure ${incomeGap > 0 ? 'places meaningful pressure on the portfolio.' : 'is within sustainable limits.'} A withdrawal of ${formatCurrency(inputs.targetMonthlyIncome)} per month with expected returns of ${formatNum(inputs.expectedAnnualReturnPct, 1)}% produces a projected capital runway of ${depletionMo == null ? 'perpetual income' : runwayYearsText}. ${incomeGap > 0 ? 'The model identifies a structural income gap where withdrawals exceed sustainable portfolio returns, resulting in progressive capital depletion. Adjustments to income, capital base, or portfolio returns would materially improve the resilience of the structure.' : 'The structure is supported by sustainable returns under current assumptions.'}`
      : `Based on the assumptions provided, a target of ${formatCurrency(inputs.targetFutureCapital)} at ${formatNum(inputs.expectedAnnualReturnPct, 1)}% over ${horizonYearsFormatted} years projects to ${formatCurrency(result.nominalCapitalAtHorizon)}.`;

  const verdictNarrative = result.statusCopy?.long ?? ADVISORY_LONG[result.status];
  const verdictHeadline = result.statusCopy?.headline;
  const riskTierLabel = result.riskMetrics?.riskTierLabel ?? (result.statusCopy?.short ?? '');
  const structuralDiagnosis = inputs.mode === 'withdrawal'
    ? (incomeGap > 0 ? `Withdrawals of ${formatCurrency(inputs.targetMonthlyIncome)}/month exceed sustainable portfolio returns of ${formatCurrency(sustainableMonthly)}/month, creating a structural income gap of ${formatCurrency(incomeGap)}.` : `The withdrawal structure is supported by sustainable returns under current assumptions.`)
    : `Progress to target capital: ${formatNum(healthScore, 1)}% of goal.`;
  const primaryRiskDriver = tier >= 4 ? 'Withdrawals exceed sustainable portfolio returns; capital depletion is projected.' : tier === 3 ? 'Moderate pressure on capital; adjustments recommended to improve resilience.' : 'Structure is within sustainable limits under current assumptions.';
  const stabilisationPathway = verdictNarrative;

  /** Must equal the number of <Page> components in this document. Update when adding or removing pages. */
  const TOTAL_PAGES = 8;
  return (
    <Document>
      {/* Page 1: Executive Summary */}
      <ReportPage pageNumber={1} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.headerRow, PDF_BREAK_INSIDE_AVOID]}>
            <View style={styles.headerLeft}>
              {brandFullLockupPngDataUrl ? (
                <Image
                  src={brandFullLockupPngDataUrl}
                  style={{ width: 220, height: 44, objectFit: 'contain' }}
                />
              ) : brandLionPngDataUrl && brandWordmarkPngDataUrl ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image
                    src={brandLionPngDataUrl}
                    style={{ height: 44, width: 44, marginRight: 6, objectFit: 'contain' }}
                  />
                  <Image
                    src={brandWordmarkPngDataUrl}
                    style={{ width: 148, height: 40, objectFit: 'contain' }}
                  />
                </View>
              ) : baseUrl ? (
                <Image
                  src={`${baseUrl}${CB_REPORT_BRAND_FULL_GREEN_PATH}`}
                  style={{ width: 220, height: 44, objectFit: 'contain' }}
                />
              ) : (
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: GREEN }}>Capital Bridge</Text>
              )}
            </View>
            <View style={[styles.titleBlock, { flex: 1, paddingRight: 8 }]}>
              <View style={styles.coverTitleBlock}>
                <Text style={styles.coverMainTitle}>{'CLIENT\u00A0ADVISORY\u00A0REPORT'}</Text>
              </View>
              <View style={styles.coverDivider} />
              <View style={styles.coverMetadata}>
                <Text style={[styles.coverMetadataLine, { fontWeight: 'bold', fontSize: 11 }]}>Capital Health Model Analysis</Text>
                <Text style={styles.coverMetadataLine}>{preparedForStr}</Text>
                <Text style={styles.coverMetadataLine}>Report generated: {generatedAtStr}</Text>
                <Text style={styles.coverMetadataLine}>Prepared by Capital Bridge — Capital Health Model</Text>
              </View>
              <View style={styles.coverFirmBlock}>
                {CB_REPORT_FIRM_ADDRESS_LINES.map((line) => (
                  <Text key={line}>{line}</Text>
                ))}
              </View>
            </View>
          </View>

          <View
            style={[
              styles.sectionWrap,
              PDF_BREAK_INSIDE_AVOID,
              {
                marginBottom: 12,
                padding: 10,
                borderLeftWidth: 3,
                borderLeftColor: GOLD,
                backgroundColor: 'rgba(255, 252, 245, 0.95)',
              },
            ]}
          >
            <Text style={{ fontSize: 8, color: MUTED, marginBottom: 4, textTransform: 'uppercase' }}>
              {healthFrameworkIntro.eyebrow}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: DARK, marginBottom: 4 }}>
              {healthFrameworkIntro.title}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: DARK, marginBottom: 6 }}>
              {healthFrameworkIntro.youAreHere}
            </Text>
            <Text style={{ fontSize: 9, color: MUTED, lineHeight: 1.45 }}>{healthFrameworkIntro.body}</Text>
          </View>

          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>EXECUTIVE SUMMARY</Text>
            <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 6 }]}>Overall Structural Status: {riskTierLabel}</Text>
            <Text style={[styles.bodyText, { lineHeight: 1.5 }]}>{executiveSummary}</Text>
          </View>
      </ReportPage>

      {/* Page 2: Capital Structure Diagnosis, Structural Confidence, Capital Health Summary */}
      <ReportPage pageNumber={2} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>CAPITAL STRUCTURE DIAGNOSIS</Text>
            <View style={[styles.section, { marginBottom: SUBSECTION_SPACING }]}>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Capital Structure Status</Text><Text style={[styles.assumptionValue, { fontWeight: 'bold' }]}>{riskTierLabel}</Text></View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Lion score (0–100)</Text><Text style={styles.assumptionValue}>{lionScorePdf} · {lionStatusPdf}</Text></View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Income Gap</Text><Text style={styles.assumptionValue}>{formatCurrency(incomeGap)}</Text></View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Capital Runway</Text><Text style={styles.assumptionValue}>{runwayYearsText}</Text></View>
            </View>
            <Text style={[styles.bodyText, { fontSize: 9, color: MUTED }]}>This diagnostic assessment evaluates whether the withdrawal structure is sustainable under the portfolio's expected return assumptions.</Text>
          </View>

          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>STRUCTURAL CONFIDENCE</Text>
            <Text style={[styles.bodyText, { marginBottom: 6 }]}>Lion score: {lionScorePdf} / 100 · {lionStatusPdf}</Text>
            <View style={styles.confidenceBarWrap}>
              <View style={styles.confidenceBar}>
                <View style={[styles.confidenceFill, { width: `${Math.min(100, Math.max(0, lionScorePdf))}%`, backgroundColor: confidenceColor }]} />
              </View>
              <Text style={styles.confidenceLabel}>STRONG · STABLE · FRAGILE · AT RISK · NOT SUSTAINABLE</Text>
            </View>
            <Text style={[styles.bodyText, { fontSize: 9, color: MUTED, marginTop: 4 }]}>
              Lion score is mapped from the model risk tier
              {includeLionsVerdict ? "; same scale as Lion's Verdict in the app." : '.'}
            </Text>
          </View>

          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>CAPITAL HEALTH SUMMARY</Text>
            <View style={[styles.summaryRow, PDF_BREAK_INSIDE_AVOID]}>
              <View style={[styles.summaryCard]}>
                <Text style={styles.summaryCardLabel}>Capital Runway</Text>
                <Text style={styles.summaryCardValue}>{runwayYearsText}</Text>
              </View>
              <View style={[styles.summaryCard]}>
                <Text style={styles.summaryCardLabel}>Capital Survival Age</Text>
                <Text style={styles.summaryCardValue} wrap={false}>{survivalAge != null ? `Capital Survival Age ${survivalAge}` : depletionMo == null || depletionMo / 12 >= 100 ? 'Beyond Lifetime Horizon' : '\u2014'}</Text>
              </View>
              <View style={[styles.summaryCard]}>
                <Text style={styles.summaryCardLabel}>Income Sustainability</Text>
                <Text style={[styles.summaryCardValue, { fontSize: 10 }]}>Sustainable Monthly Return {formatCurrency(sustainableMonthly)}</Text>
                <Text style={[styles.bodyText, { fontSize: 9, marginTop: 2 }]}>Income Gap {formatCurrency(incomeGap)}</Text>
              </View>
            </View>
          </View>
      </ReportPage>

      {/* Page 3: Structure Overview, Capital Projection Chart */}
      <ReportPage pageNumber={3} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>STRUCTURE OVERVIEW</Text>
            <Text style={styles.bodyText}>Desired Monthly Income {formatCurrency(inputs.targetMonthlyIncome)}</Text>
            <Text style={styles.bodyText}>Sustainable Monthly Return {formatCurrency(sustainableMonthly)}</Text>
            <Text style={styles.bodyText}>Income Gap {formatCurrency(incomeGap)}</Text>
            <Text style={styles.bodyText}>Projected Capital Depletion {runwayYearsText}</Text>
            <Text style={[styles.bodyText, { fontSize: 9, color: MUTED, marginTop: 6 }]}>Income Gap represents withdrawals exceeding sustainable portfolio returns. Persistent gaps accelerate capital depletion and weaken long-term capital resilience.</Text>
          </View>

          {chartPoints.length > 0 ? (
            <View style={[styles.chartSection, { marginBottom: CHART_SPACING }, PDF_BREAK_INSIDE_AVOID]}>
              <Text style={styles.chartTitle}>CAPITAL PROJECTION OVER TIME</Text>
              <CapitalProjectionChart
                chartData={chartPoints}
                formatY={(n) => formatCurrencyDisplayNoDecimals(Math.round(n), symbol)}
                yAxisLabel={`Y-axis: portfolio capital (${inputs.currency.code})`}
                xAxisLabel="X-axis: time (month index along the projection; bars are sampled across the horizon)"
                lastPointCaption={(() => {
                  const last = chartPoints[chartPoints.length - 1];
                  return `Month ${last.month}: ${formatCurrency(last.nominal)} — compare to starting capital and sustainable return assumptions.`;
                })()}
                insight="Each bar shows modelled portfolio capital at that month. Use this strip to see whether balances trend flat, rise, or fall toward depletion. The right-hand side reflects outcomes late in the horizon under your withdrawal and return settings."
              />
            </View>
          ) : null}
      </ReportPage>

      {/* Page 4: Model Assumptions */}
      <ReportPage pageNumber={4} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>MODEL ASSUMPTIONS</Text>
            <View style={styles.row}>
              <View style={styles.col}>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Model Mode</Text><Text style={styles.assumptionValue}>{inputs.mode === 'withdrawal' ? 'Monthly Withdrawal' : 'Compounding Growth'}</Text></View>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Currency</Text><Text style={styles.assumptionValue}>{inputs.currency.code} ({symbol})</Text></View>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Desired Monthly Income</Text><Text style={styles.assumptionValue}>{formatCurrency(inputs.targetMonthlyIncome)}</Text></View>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Starting Capital</Text><Text style={styles.assumptionValue}>{formatCurrency(inputs.startingCapital)}</Text></View>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Monthly Top-Up</Text><Text style={styles.assumptionValue}>{formatCurrency(inputs.monthlyTopUp)}</Text></View>
              </View>
              <View style={styles.col}>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Expected Annual Return</Text><Text style={styles.assumptionValue}>{formatNum(inputs.expectedAnnualReturnPct, 1)}%</Text></View>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Inflation Adjustment</Text><Text style={styles.assumptionValue}>{inputs.inflationEnabled ? `${formatNum(inputs.inflationPct, 1)}%` : 'Off'}</Text></View>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Cash Buffer</Text><Text style={styles.assumptionValue}>{formatNum(inputs.cashBufferPct, 0)}%</Text></View>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Cash Return</Text><Text style={styles.assumptionValue}>{formatNum(inputs.cashAPY, 1)}%</Text></View>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Withdrawal Rule</Text><Text style={styles.assumptionValue}>{inputs.withdrawalRule === 'fixed' ? 'Fixed amount' : `${formatNum(inputs.withdrawalPctOfCapital, 1)}% of capital`}</Text></View>
              </View>
            </View>
            <Text style={[styles.bodyText, { fontSize: 9, color: MUTED, marginTop: 8 }]}>Portfolio Structure: {100 - inputs.cashBufferPct}% invested at {formatNum(inputs.expectedAnnualReturnPct, 1)}% · {inputs.cashBufferPct}% liquidity buffer earning {formatNum(inputs.cashAPY, 1)}%</Text>
          </View>
      </ReportPage>

      {/* Page 5: Key Outcomes, Outcome Optimiser */}
      <ReportPage pageNumber={5} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>KEY OUTCOMES</Text>
            <View style={[styles.row, { marginBottom: 4 }]}>
              <View style={[styles.card, styles.col]}>
                <Text style={styles.cardLabel}>How Long Money Lasts</Text>
                <Text style={styles.cardValue}>{inputs.mode === 'withdrawal' ? (result.runwayPhrase ?? runwayYearsText) : formatCurrency(result.nominalCapitalAtHorizon)}</Text>
              </View>
              <View style={[styles.card, styles.col]}>
                <Text style={styles.cardLabel}>Total Withdrawals</Text>
                <Text style={styles.cardValue}>{formatCurrency(result.totalWithdrawalsPaid)}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.card, styles.col]}>
                <Text style={styles.cardLabel}>Total Contributions</Text>
                <Text style={styles.cardValue}>{formatCurrency(result.totalContributions)}</Text>
              </View>
              <View style={[styles.card, styles.col]}>
                <Text style={styles.cardLabel}>Capital At Horizon</Text>
                <Text style={styles.cardValue}>{formatCurrency(result.nominalCapitalAtHorizon)}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>OUTCOME OPTIMISER</Text>
            <View style={styles.section}>
              <Text style={[styles.bodyText, { marginBottom: 10 }]}>Reduce Income: Suggested: {formatCurrency(recommendedIncome)}</Text>
              <Text style={[styles.bodyText, { marginBottom: 10 }]}>Add Capital: Suggested: {formatCurrency(requiredCapital)}</Text>
              <Text style={[styles.bodyText, { marginBottom: 10 }]}>Increase Return: Required: {formatNum(requiredReturn, 1)}%</Text>
              <Text style={[styles.bodyText, { marginBottom: 10 }]}>Balanced Adjustment: Income -30% and Capital +30%</Text>
              <Text style={[styles.bodyText, { fontSize: 9, color: MUTED, marginTop: 4 }]}>These adjustments illustrate potential paths to improve sustainability while maintaining income flexibility.</Text>
            </View>
          </View>
      </ReportPage>

      {/* Page 6: Stress Test, Capital Protection Warning, optional Lion's Verdict */}
      <ReportPage pageNumber={6} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>CAPITAL STRESS TEST</Text>
            <View style={[styles.stressTable, PDF_BREAK_INSIDE_AVOID]}>
              <View style={styles.stressTableHeader}>
                <Text style={[styles.stressTableCol1, { fontWeight: 'bold' }]}>Scenario</Text>
                <Text style={[styles.stressTableCol2, { fontWeight: 'bold' }]}>Annual Return</Text>
                <Text style={[styles.stressTableCol3, { fontWeight: 'bold' }]}>Capital Survival Age</Text>
              </View>
              {stressRows.map((row, i) => (
                <View key={i} style={[styles.stressTableRow, PDF_BREAK_INSIDE_AVOID]}>
                  <Text style={styles.stressTableCol1}>{row.scenario}</Text>
                  <Text style={styles.stressTableCol2}>{formatNum(row.returnPct, 1)}%</Text>
                  <Text style={styles.stressTableCol3}>{row.runwayText}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.bodyText, { fontSize: 9, color: MUTED, marginTop: 8 }]}>Stress Test Assumption: These scenarios evaluate long-term capital resilience under reinvestment dynamics and different market return environments. They are not directly comparable to the fixed withdrawal projection in the base model above.</Text>
          </View>

          {incomeGap > 0 && depletionMo != null ? (
            <View style={[styles.warningPanel, PDF_BREAK_INSIDE_AVOID]}>
              <Text style={[styles.sectionTitleLarge, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 8 }]}>CAPITAL PROTECTION WARNING</Text>
              <Text style={styles.bodyText}>Current withdrawal levels exceed sustainable portfolio returns.</Text>
              <Text style={styles.bodyText}>Without structural adjustments, capital depletion is projected within {runwayYearsText}.</Text>
              <Text style={styles.bodyText}>Investors should review withdrawal levels, capital base, or portfolio return assumptions to prevent long-term erosion of capital.</Text>
            </View>
          ) : null}

          {includeLionsVerdict ? (
            <View style={[styles.verdictSectionWrap, PDF_BREAK_INSIDE_AVOID]}>
              <Text style={[styles.subsectionTitle, { marginBottom: 4 }]}>STRUCTURAL STATUS: {riskTierLabel}</Text>
              <View style={styles.verdictDivider} />
              <Text style={styles.sectionTitleLionVerdict}>THE LION&apos;S VERDICT</Text>
              <View style={styles.verdictDivider} />
              <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 6, fontSize: 12 }]}>
                Lion score: {lionScorePdf} / 100 · {lionStatusPdf}
              </Text>
              <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 8 }]} wrap={false}>
                {depletionMo != null && depletionMo < 1200
                  ? `Income structure projected to deplete capital in ${runwayYearsText}.`
                  : 'Income structure is sustainable under current assumptions.'}
              </Text>
              <Text style={styles.subsectionTitle}>Verdict</Text>
              <Text style={styles.verdictDynamicHeadline}>{verdictHeadline ?? verdictNarrative}</Text>
              <Text style={styles.subsectionTitle}>Structural Diagnosis</Text>
              <Text style={[styles.bodyText, { marginBottom: SUBSECTION_SPACING }]}>{structuralDiagnosis}</Text>
              <Text style={styles.subsectionTitle}>Primary Risk Driver</Text>
              <Text style={[styles.bodyText, { marginBottom: SUBSECTION_SPACING }]}>{primaryRiskDriver}</Text>
              <Text style={styles.subsectionTitle}>Stabilisation Pathway</Text>
              <Text style={styles.bodyText}>{stabilisationPathway}</Text>
            </View>
          ) : null}
      </ReportPage>

      {/* Page 7: Advisory Action Plan, Primary Structural Adjustment, Model Assumption Transparency, Advisor Notes */}
      <ReportPage pageNumber={7} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>ADVISORY ACTION PLAN</Text>
            <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Recommended Next Steps</Text>
            <Text style={styles.actionItem}>1. Review withdrawal strategy — Reducing withdrawals to {formatCurrency(recommendedIncome)} may improve sustainability.</Text>
            <Text style={styles.actionItem}>2. Strengthen capital base — Additional capital of approximately {formatCurrency(requiredCapital)} may extend capital runway.</Text>
            <Text style={styles.actionItem}>3. Optimise investment strategy — Improving portfolio return toward {formatNum(requiredReturn, 1)}% could stabilise the structure.</Text>
            <Text style={styles.actionItem}>4. Conduct periodic review — Reassess assumptions annually or when circumstances change.</Text>

            {inputs.mode === 'withdrawal' && recommendedIncome > 0 ? (
              <View style={[styles.highlightBox, PDF_BREAK_INSIDE_AVOID]}>
                <Text style={styles.highlightTitle}>PRIMARY STRUCTURAL ADJUSTMENT</Text>
                <Text style={[styles.subsectionTitle, { marginBottom: 2 }]}>Recommended Adjustment</Text>
                <Text style={styles.bodyText}>Reduce Monthly Withdrawal to {formatCurrency(recommendedIncome)}</Text>
                <Text style={[styles.subsectionTitle, { marginTop: 8, marginBottom: 2 }]}>Expected Impact</Text>
                <Text style={styles.bodyText}>Capital runway improves materially when withdrawals are reduced.</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>MODEL ASSUMPTION TRANSPARENCY</Text>
            <View style={[styles.section, { marginBottom: 8 }]}>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Expected Portfolio Return</Text><Text style={styles.assumptionValue}>{formatNum(inputs.expectedAnnualReturnPct, 1)}%</Text></View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Monthly Withdrawal</Text><Text style={styles.assumptionValue}>{formatCurrency(inputs.targetMonthlyIncome)}</Text></View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Starting Capital</Text><Text style={styles.assumptionValue}>{formatCurrency(inputs.startingCapital)}</Text></View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Cash Buffer Allocation</Text><Text style={styles.assumptionValue}>{formatNum(inputs.cashBufferPct, 0)}%</Text></View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Investment Horizon</Text><Text style={styles.assumptionValue}>{horizonYearsFormatted} years</Text></View>
            </View>
            <Text style={[styles.bodyText, { fontSize: 9, color: MUTED }]}>Model outputs depend heavily on the assumptions provided.</Text>
          </View>

          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>ADVISOR INTERPRETATION NOTES</Text>
            <Text style={styles.bodyText}>Recommendations should be evaluated within the client's broader financial plan:</Text>
            <Text style={styles.actionItem}>• Reducing withdrawals to align with sustainable portfolio returns</Text>
            <Text style={styles.actionItem}>• Increasing capital allocation to extend runway</Text>
            <Text style={styles.actionItem}>• Improving portfolio returns through strategy or risk tolerance review</Text>
            <Text style={styles.actionItem}>• Extending the investment horizon where appropriate</Text>
          </View>
      </ReportPage>

      {/* Page 8: System Overview, Client Meeting Summary, Footer */}
      <ReportPage pageNumber={8} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>CAPITAL BRIDGE SYSTEM OVERVIEW</Text>
            <Text style={styles.bodyText}>Capital Bridge functions as a financial modelling and diagnostic platform designed to evaluate capital sustainability and income resilience.</Text>
            <Text style={[styles.bodyText, { marginTop: 4 }]}>The system integrates capital projections, withdrawal modelling, and structural diagnostics to support advisory decision-making.</Text>
          </View>

          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>CLIENT MEETING SUMMARY</Text>
            <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 6 }]}>Key Discussion Points</Text>
            <View style={[styles.section, { marginBottom: 8 }]}>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Client Objective</Text><Text style={styles.assumptionValue}>{formatCurrency(inputs.targetMonthlyIncome)}</Text></View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Capital Sustainability Outcome</Text><Text style={styles.assumptionValue}>{runwayYearsText}</Text></View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Primary Structural Risk</Text><Text style={styles.assumptionValue}>{formatCurrency(incomeGap)}</Text></View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Recommended Adjustment</Text><Text style={styles.assumptionValue}>{formatCurrency(recommendedIncome)}</Text></View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Next Review Date</Text><Text style={styles.assumptionValue}>{reviewDate}</Text></View>
            </View>
            <Text style={[styles.bodyText, { fontSize: 9, color: MUTED }]}>This summary provides a concise recap of the advisory discussion and recommended next steps.</Text>
          </View>

          <View style={[styles.disclaimer, { marginTop: SECTION_SPACING }]}>
            <Text style={{ textAlign: 'left', fontSize: 9, color: MUTED }}>This report is a structural projection tool for advisory discussions. Results depend entirely on the assumptions provided and do not guarantee future performance.</Text>
          </View>
      </ReportPage>
    </Document>
  );
}

export async function generateReportBlob(
  inputs: CalculatorInputs,
  result: ReportResult,
  options?: {
    baseUrl?: string;
    brandFullLockupPngDataUrl?: string | null;
    brandLionPngDataUrl?: string | null;
    brandWordmarkPngDataUrl?: string | null;
    chartData?: ChartPoint[];
    currentAge?: number;
    includeLionsVerdict?: boolean;
    reportClientDisplayName?: string;
    /** When omitted (e.g. sample scripts), a fresh audit row is created and versioned. */
    reportAudit?: ReportAuditMeta;
  }
): Promise<Blob> {
  const baseUrl = options?.baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : undefined);
  const brandFullLockupPngDataUrl = options?.brandFullLockupPngDataUrl;
  const brandLionPngDataUrl = options?.brandLionPngDataUrl;
  const brandWordmarkPngDataUrl = options?.brandWordmarkPngDataUrl;
  const chartData = options?.chartData ?? [];
  const currentAge = options?.currentAge;
  const includeLionsVerdict = options?.includeLionsVerdict ?? true;
  const reportClientDisplayName = options?.reportClientDisplayName;
  const reportAudit =
    options?.reportAudit ??
    createReportAuditMeta({
      modelCode: 'HEALTH',
      userDisplayName: reportClientDisplayName ?? 'Client',
    });
  const doc = (
    <CapitalGrowthReport
      inputs={inputs}
      result={result}
      baseUrl={baseUrl}
      brandFullLockupPngDataUrl={brandFullLockupPngDataUrl}
      brandLionPngDataUrl={brandLionPngDataUrl}
      brandWordmarkPngDataUrl={brandWordmarkPngDataUrl}
      chartData={chartData}
      currentAge={currentAge}
      includeLionsVerdict={includeLionsVerdict}
      reportClientDisplayName={reportClientDisplayName}
      reportAudit={reportAudit}
    />
  );
  return pdf(doc).toBlob();
}
