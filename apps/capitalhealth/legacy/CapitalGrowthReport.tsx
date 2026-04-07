// STANDARD: TEMPORARY WAIVER — migrate to PdfLayout pipeline
import React from 'react';
import {
  Document,
  Link,
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

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZg.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZg.ttf",
      fontWeight: 700,
    },
  ],
});
import type { CalculatorInputs, SimulationResult, StatusKind } from './calculator-types';
import { runSimulation } from './calculator-engine';
import { getRiskTier } from './src/lib/riskTier';
import type { ScenarioAdjustments } from './src/lib/capitalHealthTypes';
import { APP_NAME } from './src/lib/capitalHealthCopy';
import type { LionHealthVariables } from '@cb/advisory-graph/lionsVerdict';
import { formatCurrencyDisplayNoDecimals } from '@cb/shared/formatCurrency';
import { formatReportGeneratedAtLabel } from '@cb/shared/reportIdentity';
import { createReportAuditMeta, CB_REPORT_LEGAL_NOTICE, type ReportAuditMeta } from '@cb/shared/reportTraceability';
import { PDF_TOC_CAPITAL_HEALTH } from '@cb/pdf/shared/pdf-advisory-cover-presets';
import {
  CB_REPORT_BODY_MUTED,
  CB_REPORT_BRAND_FULL_GREEN_PATH,
  CB_REPORT_FOOTER_RESERVE_PT,
  CB_REPORT_FRAME_PADDING_PT,
  CB_REPORT_INK_GREEN,
  CB_REPORT_PAGE_MARGIN_MM,
  cbReportMmToPt,
} from '@cb/shared/cbReportTemplate';
import {
  formatLionPublicStatusLabel,
  healthTierToLion,
  lionPublicStatusFromScore0to100,
  lionStrongEligibilityFromHealthTier,
} from '@cb/advisory-graph/lionsVerdict';
import { pricingReturnModelDashboardUrl } from '@cb/shared/urls';
/** CSS break-* for react-pagination; cast to `Style` so arrays like `[sheetStyle, this]` type-check. */
const PDF_BREAK_INSIDE_AVOID = {
  breakInside: 'avoid' as const,
  pageBreakInside: 'avoid' as const,
} as Style;

/** Section blocks: prefer moving to next page over splitting awkwardly (Forever-style flow). */
const PDF_CB_BLOCK = PDF_BREAK_INSIDE_AVOID;

/** Base body size (pt); adjust ±~1 for density without changing layout components. */
const PDF_BODY_PT = 10;
const PDF_BODY_LH = 1.5;
const PDF_TITLE_SERIF_PT = 18;
const PDF_TITLE_SERIF_LH = 1.2;
const PDF_FOOTER_PAGE_PT = 7.5;

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

const GREEN = CB_REPORT_INK_GREEN;
const DARK = CB_REPORT_INK_GREEN;
const MUTED = CB_REPORT_BODY_MUTED;
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
const SECTION_SPACING = 40;
const SUBSECTION_SPACING = 22;
const CHART_SPACING = 28;
const CARD_SPACING = 20;
const LOGO_TITLE_GAP = 12;

const styles = StyleSheet.create({
  warningPanel: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: SECTION_SPACING,
  },
  pageContent: {
    padding: CONTENT_PADDING,
    paddingTop: 0,
  },
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
    fontFamily: 'Inter',
  },
  reportSubtitle: {
    fontSize: 9,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Inter',
    lineHeight: PDF_BODY_LH,
  },
  section: {
    marginBottom: 16,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: GREEN,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontFamily: 'Roboto Serif',
  },
  bodyText: {
    color: DARK,
    fontSize: PDF_BODY_PT,
    marginBottom: 4,
    textAlign: 'left',
    fontFamily: 'Inter',
    lineHeight: PDF_BODY_LH,
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
    fontFamily: 'Inter',
    lineHeight: PDF_BODY_LH,
  },
  assumptionValue: {
    color: DARK,
    fontSize: PDF_BODY_PT,
    flex: 1,
    fontFamily: 'Inter',
    lineHeight: PDF_BODY_LH,
  },
  card: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  cardValue: {
    fontSize: PDF_BODY_PT,
    fontWeight: 'bold',
    color: DARK,
    fontFamily: 'Inter',
    lineHeight: PDF_BODY_LH,
  },
  chartSection: {
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  chartTitle: {
    fontSize: PDF_TITLE_SERIF_PT,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: GREEN,
    marginBottom: 12,
    textTransform: 'uppercase',
    fontFamily: 'Roboto Serif',
    lineHeight: PDF_TITLE_SERIF_LH,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    gap: 1,
  },
  chartBar: {
    flex: 1,
    backgroundColor: 'rgba(13, 58, 29, 0.5)',
    minHeight: 2,
  },
  advisoryBox: {
    padding: 12,
    marginBottom: 14,
  },
  advisoryText: {
    color: DARK,
    fontSize: PDF_BODY_PT,
    lineHeight: PDF_BODY_LH,
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  slogan: {
    color: MUTED,
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'center',
    textTransform: 'uppercase',
    fontFamily: 'Inter',
  },
  disclaimer: {
    fontSize: 8,
    color: MUTED,
    textAlign: 'left',
    marginTop: 12,
    paddingTop: 8,
    fontFamily: 'Inter',
    lineHeight: PDF_BODY_LH,
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
  coverMainTitle: { fontSize: 17, fontWeight: 'bold', color: GREEN, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 0, textAlign: 'left', fontFamily: 'Roboto Serif', paddingRight: 12 },
  coverDivider: { marginTop: 14, marginBottom: 18 },
  coverMetadata: { marginBottom: 18 },
  coverMetadataLine: { fontSize: 10, color: DARK, marginBottom: 4, textAlign: 'left', fontFamily: 'Inter' },
  coverFirmBlock: { fontSize: 9, color: DARK, lineHeight: PDF_BODY_LH, textAlign: 'left', fontFamily: 'Inter' },
  subTitle: { fontSize: 13, fontWeight: 'bold', color: DARK, marginBottom: 2, textAlign: 'left', fontFamily: 'Roboto Serif' },
  generatedDate: { fontSize: 9, color: MUTED, marginBottom: 6, textAlign: 'left', fontFamily: 'Inter' },
  titleDescription: { fontSize: PDF_BODY_PT, color: MUTED, fontStyle: 'italic', textAlign: 'left', fontFamily: 'Inter', lineHeight: PDF_BODY_LH },
  verdictSpacer: { marginVertical: 12 },
  verdictSectionWrap: { marginBottom: SECTION_SPACING },
  sectionWrap: { marginBottom: SECTION_SPACING },
  sectionTitleLarge: {
    fontSize: PDF_TITLE_SERIF_PT,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: GREEN,
    marginBottom: 10,
    textTransform: 'uppercase',
    textAlign: 'left',
    fontFamily: 'Roboto Serif',
    lineHeight: PDF_TITLE_SERIF_LH,
  },
  sectionTitleLionVerdict: {
    fontSize: PDF_TITLE_SERIF_PT,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: GREEN,
    marginBottom: 10,
    textTransform: 'uppercase',
    textAlign: 'left',
    fontFamily: 'Roboto Serif',
    lineHeight: PDF_TITLE_SERIF_LH,
  },
  verdictDynamicHeadline: {
    fontFamily: 'Roboto Serif',
    fontSize: PDF_BODY_PT,
    fontStyle: 'italic',
    fontWeight: 'bold',
    color: DARK,
    marginBottom: SUBSECTION_SPACING,
    lineHeight: PDF_BODY_LH,
    textTransform: 'capitalize',
  },
  lionsVerdictLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
    fontFamily: 'Roboto Serif',
  },
  lionsVerdictBody: {
    fontSize: PDF_BODY_PT,
    color: DARK,
    lineHeight: PDF_BODY_LH,
    marginBottom: SUBSECTION_SPACING,
    fontFamily: 'Inter',
  },
  lionsVerdictBullet: {
    fontSize: PDF_BODY_PT,
    color: DARK,
    lineHeight: PDF_BODY_LH,
    marginBottom: 6,
    marginLeft: 6,
    fontFamily: 'Inter',
  },
  subsectionTitle: { fontSize: 12, fontWeight: 'bold', color: DARK, marginBottom: 8, textAlign: 'left', fontFamily: 'Roboto Serif' },
  confidenceBarWrap: { marginBottom: 8 },
  confidenceBar: { height: 12, backgroundColor: '#e8ebe9', overflow: 'hidden', flexDirection: 'row' },
  confidenceFill: { height: '100%' },
  confidenceLabel: { fontSize: 8, color: MUTED, marginTop: 4, fontFamily: 'Inter' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: CARD_SPACING },
  summaryCard: { flex: 1, paddingVertical: 8, paddingHorizontal: 4 },
  summaryCardLabel: { fontSize: 8, color: MUTED, marginBottom: 4, textTransform: 'uppercase', fontFamily: 'Inter' },
  summaryCardValue: { fontSize: PDF_BODY_PT, fontWeight: 'bold', color: DARK, fontFamily: 'Inter', lineHeight: PDF_BODY_LH },
  stressTable: { width: '100%', marginBottom: 8 },
  stressTableRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 0 },
  stressTableHeader: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 0, marginBottom: 4 },
  stressTableCol1: { width: '40%', fontSize: 9, color: DARK, fontFamily: 'Inter', lineHeight: PDF_BODY_LH },
  stressTableCol2: { width: '30%', fontSize: 9, color: DARK, fontFamily: 'Inter', lineHeight: PDF_BODY_LH },
  stressTableCol3: { width: '30%', fontSize: 9, color: DARK, textAlign: 'right', fontFamily: 'Inter', lineHeight: PDF_BODY_LH },
  highlightBox: { paddingVertical: 16, paddingHorizontal: 0, marginTop: 16 },
  highlightTitle: { fontSize: 9, fontWeight: 'bold', color: GREEN, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Roboto Serif' },
  actionList: { marginLeft: 8, marginBottom: 6 },
  actionItem: { fontSize: 9, color: DARK, marginBottom: 6, lineHeight: PDF_BODY_LH, fontFamily: 'Inter' },
  pdfCoverRoot: { width: '100%', alignItems: 'center', paddingTop: 4, paddingBottom: 12 },
  pdfCoverLogo: { width: 360, height: 80, objectFit: 'contain', marginBottom: 20 },
  pdfCoverH1: {
    fontSize: 12,
    fontWeight: 'bold',
    color: GREEN,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'Roboto Serif',
    marginBottom: 8,
    maxWidth: 440,
    lineHeight: PDF_TITLE_SERIF_LH,
  },
  pdfCoverSubtitle: {
    fontSize: 9,
    color: DARK,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: PDF_BODY_LH,
    maxWidth: 380,
    paddingHorizontal: 12,
    fontFamily: 'Inter',
  },
  pdfCoverMeta: { fontSize: 10, color: DARK, textAlign: 'center', marginBottom: 4, fontFamily: 'Inter' },
  pdfCoverSpacer: { marginTop: 14, marginBottom: 14 },
  pdfCoverContents: {
    fontSize: 8,
    fontWeight: 'bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'Roboto Serif',
  },
  pdfCoverTocBlock: { width: '100%', maxWidth: 400, marginBottom: 10, alignSelf: 'center' },
  pdfCoverTocTitle: { fontSize: 9, fontWeight: 'bold', color: DARK, marginBottom: 4, fontFamily: 'Inter' },
  pdfCoverTocItem: { fontSize: 8, color: DARK, marginLeft: 10, marginBottom: 3, lineHeight: PDF_BODY_LH, fontFamily: 'Inter' },
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
        fontFamily: 'Inter',
        fontSize: PDF_BODY_PT,
      }}
    >
      <View
        style={{
          width: frameW,
          minHeight: frameH,
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
            <Text style={{ fontSize: 8, color: '#4b5563', textAlign: 'right', lineHeight: 1.35, fontFamily: 'Inter' }}>Report ID: {audit.reportId}</Text>
            <Text style={{ fontSize: 8, color: '#4b5563', textAlign: 'right', lineHeight: 1.35, fontFamily: 'Inter' }}>{audit.generatedAtLabel}</Text>
            <Text style={{ fontSize: 8, color: '#4b5563', textAlign: 'right', lineHeight: 1.35, fontFamily: 'Inter' }}>Version: {audit.versionLabel}</Text>
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
          <Text style={{ fontSize: PDF_FOOTER_PAGE_PT, color: '#6b7280', textAlign: 'justify', lineHeight: 1.2, marginBottom: 5, fontFamily: 'Inter' }}>
            {CB_REPORT_LEGAL_NOTICE}
          </Text>
          <Text style={{ fontSize: PDF_FOOTER_PAGE_PT, color: '#5f6b67', textAlign: 'center', fontFamily: 'Inter' }}>
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
  insightLabel,
  insight,
}: {
  chartData: ChartPoint[];
  formatY: (n: number) => string;
  yAxisLabel: string;
  xAxisLabel: string;
  lastPointCaption: string;
  insightLabel?: string;
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
              fontSize: 8,
              color: DARK,
              marginBottom: 4,
              width: labelColW - 2,
              textAlign: 'left',
              fontFamily: 'Inter',
              lineHeight: PDF_BODY_LH,
            }}
          >
            {yAxisLabel}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <View style={{ width: CHART_Y_AXIS_W, height: CHART_HEIGHT, justifyContent: 'space-between', paddingRight: 4 }}>
              <Text style={{ fontSize: 8, color: DARK, textAlign: 'right', fontFamily: 'Inter' }} wrap={false}>
                {formatY(yHi)}
              </Text>
              <Text style={{ fontSize: 8, color: DARK, textAlign: 'right', fontFamily: 'Inter' }} wrap={false}>
                {formatY(yMid)}
              </Text>
              <Text style={{ fontSize: 8, color: DARK, textAlign: 'right', fontFamily: 'Inter' }} wrap={false}>
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
          <Text style={{ fontSize: 8, color: DARK, textAlign: 'center', marginTop: 6, fontFamily: 'Inter' }}>{xAxisLabel}</Text>
        </View>
      </View>
      <View style={{ marginTop: 12, paddingVertical: 6 }}>
        <Text style={{ fontSize: 8, fontWeight: 'bold', color: GREEN, marginBottom: 4, fontFamily: 'Roboto Serif' }}>Latest value (end of series)</Text>
        <Text style={{ fontSize: PDF_BODY_PT, color: DARK, fontFamily: 'Inter', lineHeight: PDF_BODY_LH }}>{lastPointCaption}</Text>
      </View>
      {insightLabel ? (
        <Text style={{ fontSize: PDF_BODY_PT, fontWeight: 'bold', color: DARK, marginTop: 10, marginBottom: 4, fontFamily: 'Inter' }}>{insightLabel}</Text>
      ) : null}
      <Text style={{ fontSize: PDF_BODY_PT, color: DARK, marginTop: insightLabel ? 0 : 10, lineHeight: PDF_BODY_LH, fontFamily: 'Inter' }}>{insight}</Text>
    </View>
  );
}

/** Section A/B/C opener — matches Html PDF `PdfAdvisorySectionLead` rhythm. */
function CapitalHealthAdvisorySectionLead({
  stage,
  title,
  whatThisShows,
  whyThisMatters,
}: {
  stage: string;
  title: string;
  whatThisShows: string;
  whyThisMatters: string;
}) {
  return (
    <View style={[{ marginBottom: 14, width: '100%' }, PDF_CB_BLOCK]}>
      <Text style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: MUTED, marginBottom: 6, fontFamily: 'Inter' }}>{stage}</Text>
      <Text style={{ fontSize: 16, fontWeight: 'bold', color: GREEN, fontFamily: 'Roboto Serif', marginBottom: 10, lineHeight: PDF_TITLE_SERIF_LH }}>{title}</Text>
      <Text style={{ fontSize: 9, fontWeight: 'bold', color: DARK, marginBottom: 4, fontFamily: 'Inter' }}>What this shows</Text>
      <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 8, fontFamily: 'Inter' }}>{whatThisShows}</Text>
      <Text style={{ fontSize: 9, fontWeight: 'bold', color: DARK, marginBottom: 4, fontFamily: 'Inter' }}>Why this matters</Text>
      <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 4, fontFamily: 'Inter' }}>{whyThisMatters}</Text>
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
  const confidenceColor = tier >= 4 ? '#B45309' : tier === 3 ? '#D97706' : '#55B685';
  const stressRows = computeStressScenarios(inputs);
  const adj = result.scenarioAdjustments;
  const recommendedIncome = adj?.reduceIncome?.targetMonthly ?? 0;
  const requiredCapital = adj?.addCapital?.requiredStart ?? 0;
  const requiredReturn = adj?.increaseReturn?.requiredAnnualPct ?? 0;
  const increaseReturnFeasible = adj?.increaseReturn?.feasible ?? false;
  const step = chartData.length <= BAR_COUNT ? 1 : Math.max(1, Math.floor(chartData.length / BAR_COUNT));
  const chartPoints = chartData.filter((_, i) => i % step === 0).slice(0, BAR_COUNT);
  const reviewDate = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toLocaleDateString(undefined, { dateStyle: 'long' }); })();

  const capitalStressDashboardUrl =
    pricingReturnModelDashboardUrl('capitalstress') ?? 'https://capitalstress.thecapitalbridge.com/dashboard';
  const incomeEngineeringDashboardUrl =
    pricingReturnModelDashboardUrl('incomeengineering') ?? 'https://incomeengineering.thecapitalbridge.com/dashboard';

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
  const lionsVerdictNarrativeQuote = verdictHeadline ?? verdictNarrative;
  const lionsVerdictSummary = structuralDiagnosis;
  const lionsVerdictWhy = primaryRiskDriver;
  const depletionSystemLine =
    depletionMo != null && depletionMo < 1200
      ? `Income structure projected to deplete capital in ${runwayYearsText}.`
      : "Income structure is sustainable under current assumptions.";
  const lionsVerdictSystemState = `Structural band: ${riskTierLabel}. ${depletionSystemLine}`;
  const lionsVerdictNextActions = [
    inputs.mode === 'withdrawal' && incomeGap > 0 && adj?.reduceIncome?.feasible && recommendedIncome > 0
      ? `Review withdrawal levels with your adviser — the model highlights approximately ${formatCurrency(recommendedIncome)}/month as one path toward sustainability under current assumptions.`
      : inputs.mode === 'withdrawal' && incomeGap > 0
        ? 'Review withdrawal levels with your adviser — aligning draw with sustainable portfolio income can extend runway on these assumptions.'
        : 'Maintain withdrawal discipline and reassess after material assumption or life changes.',
    adj?.addCapital?.feasible && requiredCapital > 0
      ? `Strengthen the capital base progressively — an estimated ${formatCurrency(requiredCapital)} would materially extend runway, typically built over time via income surplus or capital optimisation (relook at Income Engineering Model).`
      : 'Strengthen the capital base over time where needed — Income Engineering can help structure pathways to unlock or build capital progressively.',
    increaseReturnFeasible && requiredReturn > 0
      ? `Review return assumptions — while higher returns improve outcomes, the diagnostic implied rate to close the gap purely via return is approximately ${formatNum(requiredReturn, 1)}%; focus on realistic ranges (e.g. 6–10%) and combine with structural adjustments rather than relying on return alone.`
      : 'Review return assumptions — while higher returns improve outcomes, focus on realistic ranges and combine with structural adjustments rather than relying on return alone.',
  ];

  const balancedIncomePct = adj?.balancedAdjustment?.incomeReductionPct ?? 0;
  const balancedCapPct = adj?.balancedAdjustment?.capitalIncreasePct ?? 0;
  const balancedFeasible = adj?.balancedAdjustment?.feasible ?? false;

  /** Must equal the number of <ReportPage> components. */
  const TOTAL_PAGES = includeLionsVerdict ? 13 : 12;

  const coverLogo =
    brandFullLockupPngDataUrl ? (
      <Image src={brandFullLockupPngDataUrl} style={styles.pdfCoverLogo} />
    ) : brandLionPngDataUrl && brandWordmarkPngDataUrl ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Image src={brandLionPngDataUrl} style={{ height: 44, width: 44, marginRight: 6, objectFit: 'contain' }} />
        <Image src={brandWordmarkPngDataUrl} style={{ width: 148, height: 40, objectFit: 'contain' }} />
      </View>
    ) : baseUrl ? (
      <Image src={`${baseUrl}${CB_REPORT_BRAND_FULL_GREEN_PATH}`} style={styles.pdfCoverLogo} />
    ) : (
      <Text style={{ fontSize: 11, fontWeight: 'bold', color: GREEN, marginBottom: 16 }}>Capital Bridge</Text>
    );

  return (
    <Document>
      {/* Page 1: Standard advisory cover + contents (Forever-aligned) */}
      <ReportPage pageNumber={1} totalPages={TOTAL_PAGES} audit={reportAudit}>
        <View style={[styles.pdfCoverRoot, PDF_BREAK_INSIDE_AVOID]}>
          {coverLogo}
          <Text style={styles.pdfCoverH1}>CAPITAL HEALTH — STRATEGIC WEALTH REPORT</Text>
          <Text style={styles.pdfCoverSubtitle}>
            Withdrawal sustainability and capital trajectory under your stated assumptions.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 4 }}>
            <Text style={styles.pdfCoverMeta}>Prepared for: </Text>
            <Text style={[styles.pdfCoverMeta, { fontWeight: 'bold' }]}>{reportClientDisplayName}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 4 }}>
            <Text style={styles.pdfCoverMeta}>Generated: </Text>
            <Text style={[styles.pdfCoverMeta, { fontWeight: 'bold' }]}>{generatedAtStr}</Text>
          </View>
          <View style={styles.pdfCoverSpacer} />
          <Text style={styles.pdfCoverContents}>Contents</Text>
          {PDF_TOC_CAPITAL_HEALTH.map((block) => (
            <View key={block.title} style={styles.pdfCoverTocBlock}>
              <Text style={styles.pdfCoverTocTitle}>{block.title}</Text>
              {block.items?.map((item) => (
                <Text key={item} style={styles.pdfCoverTocItem}>
                  • {item}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ReportPage>

      {/* Page 2: Section A — journey only (executive summary starts on next page) */}
      <ReportPage pageNumber={2} totalPages={TOTAL_PAGES} audit={reportAudit}>
        <CapitalHealthAdvisorySectionLead
          stage="Section A — Opening"
          title="Opening"
          whatThisShows="Step 2 in the Capital Bridge journey — structural durability after Income Engineering — then your executive summary on the following page."
          whyThisMatters="Sets context before diagnosis and charts so the PDF reads as one advisory thread, consistent with Forever, Income Engineering, and Capital Stress-Test."
        />
        <View style={[styles.sectionWrap, PDF_CB_BLOCK, { marginBottom: 12, paddingVertical: 4 }]}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: DARK, marginBottom: 6, letterSpacing: 0.4, fontFamily: 'Roboto Serif' }}>
            CAPITAL BRIDGE ADVISORY JOURNEY
          </Text>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: DARK, marginBottom: 8, fontFamily: 'Inter' }}>How to read this report</Text>
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: DARK, marginBottom: 6, fontFamily: 'Inter' }}>
            Step 2 — Is your structure strong enough?
          </Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 6, fontFamily: 'Inter' }}>
            This report follows Income Engineering (Step 1B), where income and capital flow are structured.
          </Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 4, fontFamily: 'Inter' }}>At this stage, the question becomes:</Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 3, fontFamily: 'Inter' }}>• Is the structure sustainable over time?</Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 3, fontFamily: 'Inter' }}>• Do withdrawals exceed what the portfolio can support?</Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 10, fontFamily: 'Inter' }}>• How long can capital last under current assumptions?</Text>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: GREEN, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: 'Roboto Serif' }}>
            What this model does
          </Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 4, fontFamily: 'Inter' }}>
            The Capital Health Model evaluates the interaction between:
          </Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 2, fontFamily: 'Inter' }}>• withdrawals</Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 2, fontFamily: 'Inter' }}>• capital base</Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 6, fontFamily: 'Inter' }}>• expected returns</Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 10, fontFamily: 'Inter' }}>over time. It focuses on structural durability, not short-term outcomes.</Text>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: GREEN, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: 'Roboto Serif' }}>
            Why this matters
          </Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 6, fontFamily: 'Inter' }}>
            Even strong income structures can fail if withdrawals exceed sustainable returns.
          </Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 4, fontFamily: 'Inter' }}>This model allows:</Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 3, fontFamily: 'Inter' }}>
            • the sustainability of withdrawals to be assessed
          </Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 3, fontFamily: 'Inter' }}>
            • capital depletion risk to be identified early
          </Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 10, fontFamily: 'Inter' }}>
            • structural gaps to be addressed before they compound
          </Text>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: GREEN, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: 'Roboto Serif' }}>
            What happens next
          </Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, marginBottom: 4, fontFamily: 'Inter' }}>From here:</Text>
          <Text style={{ fontSize: 9, color: MUTED, lineHeight: PDF_BODY_LH, fontFamily: 'Inter' }}>
            • Capital Stress → tests how this structure behaves under changing market conditions
          </Text>
        </View>
      </ReportPage>

      {/* Page 3: Executive summary (own page) */}
      <ReportPage pageNumber={3} totalPages={TOTAL_PAGES} audit={reportAudit}>
        <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
          <Text style={styles.sectionTitleLarge}>EXECUTIVE SUMMARY</Text>
          <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 8 }]}>Overall Structural Status: {riskTierLabel}</Text>
          <Text style={styles.bodyText}>{executiveSummary}</Text>
        </View>
      </ReportPage>

      {/* Page 4: Capital Structure Diagnosis, Structural Confidence, Capital Health Summary */}
      <ReportPage pageNumber={4} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <CapitalHealthAdvisorySectionLead
            stage="Section B — Advisor Read"
            title="Advisor Read"
            whatThisShows="Diagnosis, confidence strip, and summary cards built from the same withdrawal and return assumptions you entered."
            whyThisMatters="This is the shared fact base for the meeting — clear numbers before optional Lion narrative and scenario pages."
          />
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

      {/* Page 5: Structure Overview, Capital Projection Chart */}
      <ReportPage pageNumber={5} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.sectionWrap, PDF_BREAK_INSIDE_AVOID]}>
            <Text style={styles.sectionTitleLarge}>STRUCTURE OVERVIEW</Text>
            <Text style={styles.bodyText}>Desired Monthly Income {formatCurrency(inputs.targetMonthlyIncome)}</Text>
            <Text style={styles.bodyText}>Sustainable Monthly Return {formatCurrency(sustainableMonthly)}</Text>
            <Text style={styles.bodyText}>Income Gap {formatCurrency(incomeGap)}</Text>
            <Text style={styles.bodyText}>Projected Capital Depletion {runwayYearsText}</Text>
            <Text style={[styles.bodyText, { fontSize: 9, color: MUTED, marginTop: 6 }]}>Income Gap represents withdrawals exceeding sustainable portfolio returns. Persistent gaps accelerate capital depletion and weaken long-term capital resilience.</Text>
          </View>

          {chartPoints.length > 0 ? (
            <View style={[styles.chartSection, { marginBottom: CHART_SPACING }, PDF_CB_BLOCK]}>
              <Text style={styles.chartTitle}>CAPITAL PROJECTION OVER TIME</Text>
              <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>What this shows</Text>
              <Text style={[styles.bodyText, { fontSize: 9, color: MUTED, marginBottom: 6, lineHeight: 1.45 }]}>
                Modelled portfolio capital through time under your withdrawal and return assumptions — the same story as Section B, in one strip.
              </Text>
              <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Why this matters</Text>
              <Text style={[styles.bodyText, { fontSize: 9, color: MUTED, marginBottom: 8, lineHeight: 1.45 }]}>
                A flat or rising strip supports the sustainability narrative; a clear downward trend signals depletion pressure worth discussing with your adviser.
              </Text>
              <CapitalProjectionChart
                chartData={chartPoints}
                formatY={(n) => formatCurrencyDisplayNoDecimals(Math.round(n), symbol)}
                yAxisLabel={`Portfolio capital (${inputs.currency.code})`}
                xAxisLabel="Time along the projection (sampled months)"
                lastPointCaption={(() => {
                  const last = chartPoints[chartPoints.length - 1];
                  return `Month ${last.month}: ${formatCurrency(last.nominal)} — compare to starting capital and sustainable return assumptions.`;
                })()}
                insightLabel="Interpretation"
                insight="Each bar is modelled portfolio capital at that month. Read left to right for the trend: flat or rising suggests more room; a steady decline signals depletion pressure to discuss with your adviser. The right-hand side reflects the late horizon under your withdrawal and return settings."
              />
            </View>
          ) : null}
      </ReportPage>

      {/* Page 6: Model Assumptions */}
      <ReportPage pageNumber={6} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <CapitalHealthAdvisorySectionLead
            stage="Section C — Deeper analysis"
            title="Deeper analysis"
            whatThisShows="Explicit assumptions, structure detail, optimiser logic, and stress context behind the Section B headline."
            whyThisMatters="Lets you stress-test the story: which inputs would change the conclusion, and what the model did with your settings."
          />
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

      {/* Page 7: Key Outcomes, Outcome Optimiser */}
      <ReportPage pageNumber={7} totalPages={TOTAL_PAGES} audit={reportAudit}>
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

          <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
            <Text style={styles.sectionTitleLarge}>OUTCOME OPTIMISER</Text>
            <View style={styles.section}>
              <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Withdrawal adjustment</Text>
              <Text style={[styles.bodyText, { marginBottom: 10 }]}>
                {adj?.reduceIncome?.feasible && recommendedIncome > 0
                  ? `Aligning draw with sustainable portfolio income may extend runway. For context, the model illustrates approximately ${formatCurrency(recommendedIncome)} per month — confirm with your adviser; it is not a fixed instruction.`
                  : 'No single illustrative withdrawal level was isolated under this solve — review the structure holistically with your adviser.'}
              </Text>
              <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Capital adjustment</Text>
              <Text style={[styles.bodyText, { marginBottom: 6 }]}>
                {adj?.addCapital?.feasible && requiredCapital > 0
                  ? `Additional capital of approximately ${formatCurrency(requiredCapital)} may improve sustainability under current assumptions.`
                  : 'Additional capital may improve sustainability where there is a structural gap under these assumptions.'}
              </Text>
              <Text style={[styles.bodyText, { marginBottom: 6 }]}>
                This is typically built progressively through income surplus, asset optimisation, or structured capital deployment. Refer to Income Engineering for pathways to unlock or build capital over time.
              </Text>
              <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Return adjustment</Text>
              <Text style={[styles.bodyText, { marginBottom: 6 }]}>
                {increaseReturnFeasible && requiredReturn > 0
                  ? `The model indicates that significantly higher returns (e.g. ~${formatNum(requiredReturn, 1)}%) would be required to fully close the gap.`
                  : 'The model did not isolate a single implied return adjustment under this solve — review assumptions holistically with your adviser.'}
              </Text>
              <Text style={[styles.bodyText, { marginBottom: 10 }]}>
                In practice, very high implied returns are unlikely to be sustainable. Portfolio strategy may be reviewed to optimise within realistic ranges (e.g. 6–10%), while combining capital and income adjustments.
              </Text>
              <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Balanced pathway</Text>
              <Text style={[styles.bodyText, { marginBottom: 10 }]}>
                {balancedFeasible && (balancedIncomePct > 0 || balancedCapPct > 0)
                  ? `One illustrative combined adjustment is income −${formatNum(balancedIncomePct, 0)}% and capital +${formatNum(balancedCapPct, 0)}% (from the live model) — use for discussion, not as a mandate.`
                  : 'Combined income and capital adjustments can be explored in the live model with your adviser; avoid treating any single pathway as a standalone mandate.'}
              </Text>
              <Text style={[styles.bodyText, { fontSize: 9, color: MUTED, marginTop: 4 }]}>
                These rows illustrate structural trade-offs for discussion — not prescriptive advice.
              </Text>
            </View>
          </View>
      </ReportPage>

      {/* Page 8: Stress test + warning only */}
      <ReportPage pageNumber={8} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
            <Text style={styles.sectionTitleLarge}>CAPITAL STRESS TEST</Text>
            <View style={[styles.stressTable, PDF_CB_BLOCK]}>
              <View style={styles.stressTableHeader}>
                <Text style={[styles.stressTableCol1, { fontWeight: 'bold' }]}>Scenario</Text>
                <Text style={[styles.stressTableCol2, { fontWeight: 'bold' }]}>Annual Return</Text>
                <Text style={[styles.stressTableCol3, { fontWeight: 'bold' }]}>Capital Survival Age</Text>
              </View>
              {stressRows.map((row, i) => (
                <View key={i} style={[styles.stressTableRow, PDF_CB_BLOCK]}>
                  <Text style={styles.stressTableCol1}>{row.scenario}</Text>
                  <Text style={styles.stressTableCol2}>{formatNum(row.returnPct, 1)}%</Text>
                  <Text style={styles.stressTableCol3}>{row.runwayText}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.bodyText, { fontSize: 9, color: MUTED, marginTop: 8 }]}>Stress Test Assumption: These scenarios evaluate long-term capital resilience under reinvestment dynamics and different market return environments. They are not directly comparable to the fixed withdrawal projection in the base model above.</Text>
          </View>

          {incomeGap > 0 && depletionMo != null ? (
            <View style={[styles.warningPanel, PDF_CB_BLOCK]}>
              <Text style={[styles.sectionTitleLarge, { marginBottom: 10 }]}>CAPITAL PROTECTION WARNING</Text>
              <Text style={styles.bodyText}>Current withdrawal levels exceed sustainable portfolio returns.</Text>
              <Text style={styles.bodyText}>Without structural adjustments, capital depletion is projected within {runwayYearsText}.</Text>
              <Text style={styles.bodyText}>Investors should review withdrawal levels, capital base, or portfolio return assumptions to prevent long-term erosion of capital.</Text>
            </View>
          ) : null}
      </ReportPage>

      {includeLionsVerdict ? (
        <ReportPage pageNumber={9} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.verdictSectionWrap, PDF_CB_BLOCK]}>
            <Text style={styles.sectionTitleLionVerdict}>THE LION&apos;S VERDICT</Text>
            <View style={styles.verdictSpacer} />
            <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 6, fontSize: PDF_BODY_PT }]}>
              Lion score: {lionScorePdf} / 100 · {lionStatusPdf}
            </Text>
            <Text style={styles.verdictDynamicHeadline}>&ldquo;{lionsVerdictNarrativeQuote}&rdquo;</Text>
            <Text style={styles.lionsVerdictLabel}>Summary</Text>
            <Text style={styles.lionsVerdictBody}>{lionsVerdictSummary}</Text>
            <Text style={styles.lionsVerdictLabel}>Why this is happening</Text>
            <Text style={styles.lionsVerdictBody}>{lionsVerdictWhy}</Text>
            <Text style={styles.lionsVerdictLabel}>System state</Text>
            <Text style={styles.lionsVerdictBody}>{lionsVerdictSystemState}</Text>
            <Text style={styles.lionsVerdictLabel}>What you should do next</Text>
            {lionsVerdictNextActions.map((line, i) => (
              <Text key={i} style={styles.lionsVerdictBullet}>
                • {line}
              </Text>
            ))}
          </View>
        </ReportPage>
      ) : null}

      {/* Advisory action plan + notes (own page) */}
      <ReportPage pageNumber={includeLionsVerdict ? 10 : 9} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
            <Text style={styles.sectionTitleLarge}>ADVISORY ACTION PLAN</Text>
            <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Recommended Next Steps</Text>
            <Text style={styles.actionItem}>
              1. Review withdrawal strategy — Aligning draw with sustainable portfolio income can extend runway on these assumptions
              {adj?.reduceIncome?.feasible && recommendedIncome > 0
                ? ` (one illustrative level the model highlights is around ${formatCurrency(recommendedIncome)} per month).`
                : '.'}
            </Text>
            <Text style={styles.actionItem}>
              2. Strengthen capital base over time —{' '}
              {adj?.addCapital?.feasible && requiredCapital > 0
                ? `An estimated ${formatCurrency(requiredCapital)} would materially extend runway under these assumptions; typically built progressively (see Income Engineering for pathways).`
                : 'Additional capital may improve sustainability when built progressively or through income and asset optimisation (see Income Engineering for pathways).'}
            </Text>
            <Text style={styles.actionItem}>
              3. Review return assumptions —{' '}
              {increaseReturnFeasible && requiredReturn > 0
                ? `The diagnostic implied rate to close the gap purely via return is approximately ${formatNum(requiredReturn, 1)}%; treat cautiously, stay within realistic ranges (e.g. 6–10%), and combine with structural adjustments.`
                : 'Ensure expected returns remain realistic and aligned with portfolio strategy; avoid relying on outsized return assumptions to close structural gaps.'}
            </Text>
            <Text style={styles.actionItem}>4. Conduct periodic review — Reassess assumptions annually or when circumstances change.</Text>

            {inputs.mode === 'withdrawal' && recommendedIncome > 0 ? (
              <View style={[styles.highlightBox, PDF_CB_BLOCK]}>
                <Text style={styles.highlightTitle}>PRIMARY DISCUSSION POINT</Text>
                <Text style={[styles.subsectionTitle, { marginBottom: 2 }]}>Withdrawal alignment (illustrative)</Text>
                <Text style={styles.bodyText}>
                  The model highlights approximately {formatCurrency(recommendedIncome)} per month as one path toward sustainability — confirm suitability with your adviser and your broader plan.
                </Text>
                <Text style={[styles.subsectionTitle, { marginTop: 8, marginBottom: 2 }]}>Why it matters</Text>
                <Text style={styles.bodyText}>Lower draw reduces depletion pressure and can materially extend runway under the same return assumptions.</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
            <Text style={styles.sectionTitleLarge}>ADVISOR INTERPRETATION NOTES</Text>
            <Text style={styles.bodyText}>Recommendations should be evaluated within the client&apos;s broader financial plan:</Text>
            <Text style={styles.actionItem}>• Exploring withdrawal alignment with sustainable portfolio returns</Text>
            <Text style={styles.actionItem}>• Building or redeploying capital over time to extend runway (Income Engineering)</Text>
            <Text style={styles.actionItem}>• Reviewing portfolio strategy and return assumptions within realistic ranges</Text>
            <Text style={styles.actionItem}>• Extending the investment horizon where appropriate</Text>
          </View>
      </ReportPage>

      {/* Model assumption transparency — own page */}
      <ReportPage pageNumber={includeLionsVerdict ? 11 : 10} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
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
      </ReportPage>

      {/* System overview, client summary, disclosures */}
      <ReportPage pageNumber={includeLionsVerdict ? 12 : 11} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
            <Text style={styles.sectionTitleLarge}>CAPITAL BRIDGE SYSTEM OVERVIEW</Text>
            <Text style={styles.bodyText}>Capital Bridge functions as a financial modelling and diagnostic platform designed to evaluate capital sustainability and income resilience.</Text>
            <Text style={[styles.bodyText, { marginTop: 4 }]}>The system integrates capital projections, withdrawal modelling, and structural diagnostics to support advisory decision-making.</Text>
          </View>

          <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
            <Text style={styles.sectionTitleLarge}>CLIENT MEETING SUMMARY</Text>
            <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 6 }]}>Key Discussion Points</Text>
            <View style={[styles.section, { marginBottom: 8 }]}>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Client Objective</Text><Text style={styles.assumptionValue}>{formatCurrency(inputs.targetMonthlyIncome)}</Text></View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Capital Sustainability Outcome</Text><Text style={styles.assumptionValue}>{runwayYearsText}</Text></View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Primary Structural Risk</Text><Text style={styles.assumptionValue}>{formatCurrency(incomeGap)}</Text></View>
              <View style={styles.assumptionRow}>
                <Text style={styles.assumptionLabel}>Illustrative pathway</Text>
                <Text style={styles.assumptionValue}>
                  {adj?.reduceIncome?.feasible && recommendedIncome > 0
                    ? `Withdrawal ~${formatCurrency(recommendedIncome)}/mo`
                    : 'Review diagnostics with your adviser.'}
                  {adj?.addCapital?.feasible && requiredCapital > 0
                    ? `; capital discussion ~${formatCurrency(requiredCapital)}`
                    : ''}
                  {`. Income Engineering for build pathways.`}
                </Text>
              </View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Next Review Date</Text><Text style={styles.assumptionValue}>{reviewDate}</Text></View>
            </View>
            <Text style={[styles.bodyText, { fontSize: 9, color: MUTED }]}>This summary provides a concise recap of the advisory discussion and recommended next steps.</Text>
          </View>

          <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
            <Text style={styles.sectionTitleLarge}>DISCLOSURES & HOW TO USE THIS REPORT</Text>
            <Text style={styles.bodyText}>
              This document is for advisory discussion only and is not personal advice. The full legal notice appears in the page footer.
            </Text>
            <Text style={[styles.bodyText, { marginTop: 6, fontWeight: 'bold' }]}>How to use this report</Text>
            <Text style={styles.actionItem}>• Review structural diagnostics and charts with your adviser in a client meeting.</Text>
            <Text style={styles.actionItem}>• Refresh the live model when withdrawals, returns, or horizon change materially.</Text>
          </View>
      </ReportPage>

      {/* Recommended next step — Capital Stress (own page) */}
      <ReportPage pageNumber={includeLionsVerdict ? 13 : 12} totalPages={TOTAL_PAGES} audit={reportAudit}>
          <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
            <Text style={styles.sectionTitleLarge}>RECOMMENDED NEXT STEP — CAPITAL STRESS</Text>
            <Text style={styles.bodyText}>
              Capital Stress tests capital across many simulated paths with withdrawals held constant — a useful check once the structural assumptions in this report are agreed.
            </Text>
            <Text style={[styles.bodyText, { marginTop: 6 }]}>Continue in Capital Stress (same Capital Bridge account):</Text>
            <Link src={capitalStressDashboardUrl} style={{ fontSize: PDF_BODY_PT, color: GREEN, textDecoration: 'underline', marginTop: 4, fontFamily: 'Inter' }}>
              {capitalStressDashboardUrl}
            </Link>
            <Text style={[styles.bodyText, { marginTop: 10 }]}>Income Engineering (pathways for income and capital structure):</Text>
            <Link src={incomeEngineeringDashboardUrl} style={{ fontSize: PDF_BODY_PT, color: GREEN, textDecoration: 'underline', marginTop: 4, fontFamily: 'Inter' }}>
              {incomeEngineeringDashboardUrl}
            </Link>
            <Text style={[styles.bodyText, { marginTop: 8, fontWeight: 'bold', color: GREEN }]}>
              Next: Run Capital Stress to continue your advisory journey.
            </Text>
          </View>

          <View style={[styles.disclaimer, { marginTop: SECTION_SPACING }]}>
            <Text style={{ textAlign: 'left', fontSize: 9, color: MUTED, fontFamily: 'Inter', lineHeight: PDF_BODY_LH }}>This report is a structural projection tool for advisory discussions. Results depend entirely on the assumptions provided and do not guarantee future performance.</Text>
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
