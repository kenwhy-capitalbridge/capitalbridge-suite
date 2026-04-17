// STANDARD: TEMPORARY WAIVER — migrate to PdfLayout pipeline
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
  Svg,
  Line,
  Polyline,
  Circle,
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
import {
  sampleCapitalHealthChartPoints,
  computeCapitalHealthVerdict,
  computeChartFaceVerdict,
  chartStructuralDivergenceLine,
  verdictColor,
  structuralToneFromVerdict,
  confidenceFromVerdict,
  confidenceBarColor,
  modeHeaderSuffix,
  modeCoverLabel,
  coverSubtitleForMode,
  buildExecutiveSummaryBlocks,
  buildChartCaption,
  buildChartAnnotationLines,
  buildVerdictSupportLine,
  lionAlignmentPreamble,
  sanitizePlanCopy,
  type ChartPoint,
} from './capitalHealthPdfAlignment';

export type { ChartPoint } from './capitalHealthPdfAlignment';
import { getRiskTier } from './src/lib/riskTier';
import type { ScenarioAdjustments } from './src/lib/capitalHealthTypes';
import type { LionHealthVariables } from '@cb/advisory-graph/lionsVerdict';
import { formatCurrencyDisplayNoDecimals } from '@cb/shared/formatCurrency';
import { formatReportGeneratedAtLabel } from '@cb/shared/reportIdentity';
import { createReportAuditMeta, type ReportAuditMeta } from '@cb/shared/reportTraceability';
import { CB_REPORT_TRIAL_SNAPSHOT_CAPTION } from '@cb/shared/reportTrialCopy';
import { PDF_TOC_CAPITAL_HEALTH } from '@cb/pdf/shared/pdf-advisory-cover-presets';
import {
  CB_REPORT_BODY_MUTED,
  CB_REPORT_BRAND_WORDMARK_GREEN_PATH,
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
const PDF_FOOTER_PAGE_PT = 8;

const CAPITAL_HEALTH_PDF_FOOTER_LEGAL =
  '© Capital Bridge. All rights reserved. Capital Bridge™ and associated marks are proprietary. Unauthorised use, reproduction, or distribution is prohibited.';

/** Extended result when report is generated from the app (useCalculatorResults); uses app status messaging. */
export type ReportResult = SimulationResult & {
  statusCopy?: { short: string; headline?: string; long: string };
  riskMetrics?: { riskTier: number; healthScore?: number; riskTierLabel?: string };
  scenarioAdjustments?: ScenarioAdjustments | null;
  sustainableIncomeMonthly?: number;
  depletionMonth?: number | null;
  runwayPhrase?: string;
};

const USER_GUIDANCE_LONG: Record<StatusKind, string> = {
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
/** Chart overlays (not verdict line colour). */
const CHART_TARGET_GUIDE = '#b45309';
const CHART_DEPLETION_LINE = '#b91c1c';
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

const CHART_HEIGHT = 146;
/** Tick column width; Y-axis title sits in a separate left gutter so it cannot paint under bars. */
const CHART_Y_AXIS_W = 40;
const CHART_Y_LABEL_GUTTER = 68;
/** A4 content box inside page padding (pt) — full-height gold frame on every page. */
const PAGE_W_PT = 595.28;
const PAGE_H_PT = 841.89;
const BAR_COUNT = 48;

const REPORT_PAGE_OUTER = Math.max(10, cbReportMmToPt(CB_REPORT_PAGE_MARGIN_MM) - 14);
const CONTENT_PADDING = 6;
const SECTION_SPACING = 24;
const SUBSECTION_SPACING = 14;
const CHART_SPACING = 28;
const CARD_SPACING = 20;
const LOGO_TITLE_GAP = 12;
const CAPITAL_HEALTH_COVER_LOGO_PNG_PATH = '/brand/Full_CapitalBridge_Green.png';
const FRAME_INNER_X = Math.max(10, CB_REPORT_FRAME_PADDING_PT - 6);

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
  pdfCoverRoot: { width: '100%', alignItems: 'center', paddingTop: 2, paddingBottom: 6 },
  /** Single dimension + objectFit — fixed width+height squashed wide SVG/PNG lockups. */
  pdfCoverLogo: {
    width: '100%',
    maxWidth: 880,
    height: 148,
    objectFit: 'contain' as const,
    marginBottom: 10,
    alignSelf: 'center' as const,
  },
  pdfCoverH1: {
    fontSize: 12,
    fontWeight: 'bold',
    color: GREEN,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'Roboto Serif',
    marginBottom: 4,
    maxWidth: 440,
    lineHeight: PDF_TITLE_SERIF_LH,
  },
  pdfCoverSubtitle: {
    fontSize: 8.5,
    color: DARK,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 1.35,
    maxWidth: 380,
    paddingHorizontal: 12,
    fontFamily: 'Inter',
  },
  pdfCoverMeta: { fontSize: 9, color: DARK, textAlign: 'center', marginBottom: 2, fontFamily: 'Inter' },
  pdfCoverSpacer: { marginTop: 6, marginBottom: 6 },
  pdfCoverContents: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: GREEN,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'Roboto Serif',
  },
  pdfCoverTocBlock: { width: '100%', maxWidth: 400, marginBottom: 4, alignSelf: 'center' },
  pdfCoverTocTitle: { fontSize: 8, fontWeight: 'bold', color: DARK, marginBottom: 1, fontFamily: 'Inter' },
  pdfCoverTocItem: { fontSize: 7.5, color: DARK, marginLeft: 6, marginBottom: 1, lineHeight: 1.3, fontFamily: 'Inter' },
});

function ReportPage({
  pageNumber,
  totalPages,
  audit,
  modeHeaderLine,
  children,
  footerLogoSrc,
}: {
  pageNumber: number;
  totalPages: number;
  audit: ReportAuditMeta;
  /** Left header: e.g. CAPITAL HEALTH — COMPOUNDING GROWTH */
  modeHeaderLine: string;
  children: React.ReactNode;
  footerLogoSrc?: string | null;
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
          paddingTop: 26,
          paddingLeft: FRAME_INNER_X,
          paddingRight: FRAME_INNER_X,
          paddingBottom: CB_REPORT_FOOTER_RESERVE_PT + 42,
          position: 'relative',
          flexDirection: 'column',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: FRAME_INNER_X,
            right: FRAME_INNER_X,
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
            {modeHeaderLine}
          </Text>
          <View style={{ alignItems: 'flex-end', maxWidth: '48%' }}>
            <Text style={{ fontSize: 8, color: '#4b5563', textAlign: 'right', lineHeight: 1.35, fontFamily: 'Inter' }}>{audit.clientDisplayName}</Text>
            <Text style={{ fontSize: 8, color: '#4b5563', textAlign: 'right', lineHeight: 1.35, fontFamily: 'Inter' }}>{audit.generatedAtLabel}</Text>
          </View>
        </View>
        <View style={{ flexGrow: 1, flexShrink: 0, marginTop: 22, minHeight: 0 }}>{children}</View>
        <View
          style={{
            position: 'absolute',
            bottom: 8,
            left: FRAME_INNER_X,
            right: FRAME_INNER_X,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View style={{ width: 98, alignItems: 'flex-start' }}>
            {footerLogoSrc ? (
              <Image src={footerLogoSrc} style={{ width: 92, height: 16, objectFit: 'contain' }} />
            ) : (
              <Text style={{ fontSize: PDF_FOOTER_PAGE_PT, color: '#5f6b67', fontFamily: 'Inter' }}>Capital Bridge</Text>
            )}
          </View>
          <Text
            style={{
              flex: 1,
              fontSize: PDF_FOOTER_PAGE_PT,
              color: '#6b7280',
              textAlign: 'center',
              lineHeight: 1.35,
              fontFamily: 'Inter',
              paddingHorizontal: 8,
            }}
          >
            {CAPITAL_HEALTH_PDF_FOOTER_LEGAL}
          </Text>
          <Text style={{ width: 80, fontSize: PDF_FOOTER_PAGE_PT, color: '#5f6b67', textAlign: 'right', fontFamily: 'Inter', flexShrink: 0 }}>
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
  /** Same-origin absolute URL for cover lockup when data URL embedding is unavailable. */
  brandFullLockupSrc?: string | null;
  brandLionPngDataUrl?: string | null;
  brandWordmarkPngDataUrl?: string | null;
  /** Same-origin absolute URL for footer wordmark when data URL embedding is unavailable. */
  brandWordmarkSrc?: string | null;
  chartData?: ChartPoint[];
  /** Client age for Capital Survival Age (optional). */
  currentAge?: number;
  /** Trial / locked users: omit the Lion's Verdict block from the PDF. */
  includeLionsVerdict?: boolean;
  /** Shown on the cover (first + last from profile when available). */
  reportClientDisplayName?: string;
  reportAudit: ReportAuditMeta;
}

function coveragePct(inputs: CalculatorInputs, result: SimulationResult): number {
  if (inputs.mode === 'withdrawal' && inputs.targetMonthlyIncome > 0 && result.monthlyReturnOnCapital != null) {
    return (result.monthlyReturnOnCapital / inputs.targetMonthlyIncome) * 100;
  }
  return result.coveragePct;
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
  horizonYears,
  formatY,
  yAxisLabel,
  verdictLabel,
  verdictColorHex,
  annotationLines,
  caption,
  confidenceLevel,
  confidenceTint,
  optionalSupportLine,
  mode,
  targetFutureCapital,
  depletionMonth,
  formatCurrency,
}: {
  chartData: ChartPoint[];
  horizonYears: number;
  formatY: (n: number) => string;
  yAxisLabel: string;
  verdictLabel: string;
  verdictColorHex: string;
  annotationLines: string[];
  caption: string;
  confidenceLevel: string;
  confidenceTint: string;
  optionalSupportLine: string | null;
  mode: 'growth' | 'withdrawal';
  targetFutureCapital: number;
  depletionMonth: number | null;
  formatCurrency: (n: number) => string;
}) {
  if (!chartData.length) return null;

  const W = 440;
  const H = 152;
  const left = 12;
  const right = 12;
  const top = 14;
  const bottom = 28;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const hm = Math.max(1, Math.round(horizonYears * 12));

  const maxVal = Math.max(
    ...chartData.map((d) => d.nominal),
    mode === 'growth' ? targetFutureCapital : 0,
    1,
  );
  const minVal = Math.min(...chartData.map((d) => d.nominal), 0, mode === 'growth' ? targetFutureCapital : 0);
  const range = maxVal - minVal || 1;
  const yHi = maxVal;
  const yLo = minVal;
  const yMid = minVal + range / 2;

  const xForMonth = (m: number) =>
    left + (hm <= 1 ? 0 : (m / (hm - 1)) * plotW);
  const yForVal = (v: number) => top + ((maxVal - v) / range) * plotH;

  const points = chartData.map((d, i) => {
    const x = xForMonth(d.month);
    const y = yForVal(d.nominal);
    return { ...d, x, y, i };
  });

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${linePoints} ${points[points.length - 1]!.x},${top + plotH} ${points[0]!.x},${top + plotH}`;
  const yAxisStackedLabel = yAxisLabel.split(' ').join('\n');
  const hyLabel = horizonYears % 1 === 0 ? String(Math.round(horizonYears)) : horizonYears.toFixed(1);
  const first = chartData[0]!;
  const last = chartData[chartData.length - 1]!;
  const targetY = mode === 'growth' ? yForVal(targetFutureCapital) : null;
  const showTargetLine =
    mode === 'growth' && targetY != null && targetY >= top - 2 && targetY <= top + plotH + 2;
  const depletionInHorizon =
    mode === 'withdrawal' && depletionMonth != null && depletionMonth <= hm;
  const depletionX = depletionInHorizon ? xForMonth(Math.max(0, depletionMonth - 1)) : null;

  return (
    <View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: 'bold',
          color: GREEN,
          marginBottom: 8,
          textTransform: 'none',
          fontFamily: 'Roboto Serif',
        }}
      >
        Capital projection over selected horizon ({hyLabel} years)
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ width: 58, marginTop: 10 }}>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: DARK, marginBottom: 28, fontFamily: 'Inter' }}>{formatY(yHi)}</Text>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: DARK, marginBottom: 28, fontFamily: 'Inter' }}>{formatY(yMid)}</Text>
          <Text style={{ fontSize: 8, fontWeight: 'bold', color: DARK, fontFamily: 'Inter' }}>{formatY(yLo)}</Text>
          <Text style={{ fontSize: 8, color: DARK, marginTop: 10, fontFamily: 'Inter', lineHeight: 1.1 }}>{yAxisStackedLabel}</Text>
        </View>

        <View style={{ flex: 1, position: 'relative' }}>
          <Svg width="100%" viewBox={`0 0 ${W} ${H}`}>
            <Line x1={left} y1={top} x2={left} y2={top + plotH} stroke="#74807a" strokeWidth={0.8} />
            <Line x1={left} y1={top + plotH} x2={left + plotW} y2={top + plotH} stroke="#74807a" strokeWidth={0.8} />
            <Line x1={left} y1={top} x2={left + plotW} y2={top} stroke="#d6dcd8" strokeWidth={0.6} />
            <Line x1={left} y1={top + plotH / 2} x2={left + plotW} y2={top + plotH / 2} stroke="#d6dcd8" strokeWidth={0.6} />

            <Polyline points={areaPoints} fill={verdictColorHex} fillOpacity={0.12} stroke="none" strokeWidth={0} />
            <Polyline points={linePoints} stroke={verdictColorHex} strokeWidth={2.2} fill="none" />

            {showTargetLine ? (
              <Line
                x1={left}
                y1={targetY!}
                x2={left + plotW}
                y2={targetY!}
                stroke={CHART_TARGET_GUIDE}
                strokeDasharray="4 3"
                strokeWidth={0.9}
              />
            ) : null}
            {depletionX != null ? (
              <Line x1={depletionX} y1={top} x2={depletionX} y2={top + plotH} stroke={CHART_DEPLETION_LINE} strokeWidth={1} />
            ) : null}

            <Circle cx={points[0]!.x} cy={points[0]!.y} r={3} fill={verdictColorHex} />
            <Circle cx={points[points.length - 1]!.x} cy={points[points.length - 1]!.y} r={3.6} fill={verdictColorHex} />
          </Svg>

          <View
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              backgroundColor: verdictColorHex,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#ffffff', fontFamily: 'Inter' }}>{verdictLabel}</Text>
            {optionalSupportLine ? (
              <Text style={{ fontSize: 6.5, color: '#ffffff', fontFamily: 'Inter', marginTop: 2, maxWidth: 120 }}>
                {optionalSupportLine}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              position: 'absolute',
              left: left + 4,
              bottom: 10,
              maxWidth: 200,
              backgroundColor: 'rgba(255,255,255,0.92)',
              padding: 5,
              borderWidth: 0.5,
              borderColor: '#e5e7eb',
            }}
          >
            {annotationLines.map((ln, idx) => (
              <Text key={idx} style={{ fontSize: 7, color: DARK, fontFamily: 'Inter', lineHeight: 1.35, marginBottom: idx === annotationLines.length - 1 ? 0 : 2 }}>
                {ln}
              </Text>
            ))}
          </View>

          <Text style={{ fontSize: 8, fontWeight: 'bold', color: DARK, marginTop: 4, textAlign: 'center', fontFamily: 'Inter' }}>
            Years (0 — {hyLabel})
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Text style={{ fontSize: 7.5, color: MUTED, fontFamily: 'Inter' }}>Start: {formatCurrency(first.nominal)}</Text>
        <Text style={{ fontSize: 7.5, color: MUTED, fontFamily: 'Inter' }}>
          End (year {hyLabel}): {formatCurrency(last.nominal)}
        </Text>
        {mode === 'growth' ? (
          <Text style={{ fontSize: 7.5, color: MUTED, fontFamily: 'Inter' }}>Target: {formatCurrency(targetFutureCapital)}</Text>
        ) : null}
        {depletionInHorizon ? (
          <Text style={{ fontSize: 7.5, color: CHART_DEPLETION_LINE, fontFamily: 'Inter' }}>Capital depleted within horizon</Text>
        ) : null}
      </View>

      <View style={{ marginTop: 8 }}>
        <View style={{ height: 3, backgroundColor: '#e8ebe9', marginBottom: 4 }}>
          <View style={{ height: '100%', width: '100%', backgroundColor: confidenceTint, opacity: 0.85 }} />
        </View>
        <Text style={{ fontSize: 8, color: MUTED, fontFamily: 'Inter' }}>Confidence: {confidenceLevel}</Text>
      </View>

      <Text style={{ fontSize: PDF_BODY_PT, color: DARK, fontFamily: 'Inter', lineHeight: PDF_BODY_LH, marginTop: 8 }}>{caption}</Text>
    </View>
  );
}


export function CapitalGrowthReport({
  inputs,
  result,
  baseUrl,
  brandFullLockupPngDataUrl,
  brandFullLockupSrc,
  brandLionPngDataUrl,
  brandWordmarkPngDataUrl,
  brandWordmarkSrc,
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
  const stressRows = computeStressScenarios(inputs);
  const runwayWithoutInflationMonths = runSimulation({ ...inputs, inflationEnabled: false }).depletionMonth ?? null;
  const runwayWithInflationMonths = runSimulation({ ...inputs, inflationEnabled: true }).depletionMonth ?? null;
  const runwayInflationImpactMonths =
    runwayWithoutInflationMonths != null && runwayWithInflationMonths != null
      ? Math.max(0, runwayWithoutInflationMonths - runwayWithInflationMonths)
      : null;
  const adj = result.scenarioAdjustments;
  const recommendedIncome = adj?.reduceIncome?.targetMonthly ?? 0;
  const requiredCapital = adj?.addCapital?.requiredStart ?? 0;
  const requiredReturn = adj?.increaseReturn?.requiredAnnualPct ?? 0;
  const increaseReturnFeasible = adj?.increaseReturn?.feasible ?? false;

  const chartFull: ChartPoint[] =
    chartData.length > 0
      ? chartData.map((d) => ({ month: d.month, nominal: d.nominal }))
      : result.monthlySnapshots.map((s) => ({ month: s.monthIndex, nominal: s.totalCapital }));
  const verdict = computeCapitalHealthVerdict(inputs, result, chartFull);
  const chartFaceVerdict = computeChartFaceVerdict(verdict, inputs, result, chartFull);
  const verdictHue = verdictColor(verdict);
  const chartFaceHue = verdictColor(chartFaceVerdict);
  const structuralTone = structuralToneFromVerdict(verdict);
  const confidenceLevel = confidenceFromVerdict(verdict);
  const confidenceTint = confidenceBarColor(confidenceLevel);
  const chartPoints = sampleCapitalHealthChartPoints(chartFull);
  const headerModeLine = `CAPITAL HEALTH — ${modeHeaderSuffix(inputs)}`;
  const execBlocks = buildExecutiveSummaryBlocks(inputs, result, verdict, formatCurrency, formatNum);
  const chartCaption = buildChartCaption(inputs, result, chartFaceVerdict, formatCurrency, formatNum);
  const chartAnnotationLines = buildChartAnnotationLines(inputs, result, chartFaceVerdict, formatCurrency, formatNum);
  const verdictSupportLine = buildVerdictSupportLine(inputs, result, chartFaceVerdict, formatCurrency);
  const chartDivergenceLine = chartStructuralDivergenceLine(verdict, chartFaceVerdict, inputs);
  const lionPreamble = lionAlignmentPreamble(verdict, structuralTone);

  const verdictNarrative = result.statusCopy?.long ?? USER_GUIDANCE_LONG[result.status];
  const verdictHeadline = result.statusCopy?.headline;
  const riskTierLabel = result.riskMetrics?.riskTierLabel ?? (result.statusCopy?.short ?? '');
  const structuralDiagnosis = inputs.mode === 'withdrawal'
    ? (incomeGap > 0 ? `Withdrawals of ${formatCurrency(inputs.targetMonthlyIncome)}/month exceed sustainable portfolio returns of ${formatCurrency(sustainableMonthly)}/month, creating a structural income gap of ${formatCurrency(incomeGap)}.` : `The withdrawal structure is supported by sustainable returns under current assumptions.`)
    : `Progress to target capital: ${formatNum(healthScore, 1)}% of goal.`;
  const primaryRiskDriver =
    inputs.mode === 'withdrawal'
      ? verdict === 'AT RISK'
        ? 'Capital depletion is projected within the selected horizon under these withdrawals and return assumptions.'
        : verdict === 'UNDER PRESSURE'
          ? 'A persistent income gap is applying pressure to capital over the horizon.'
          : verdict === 'STABLE'
            ? 'Withdrawals exceed sustainable returns only slightly; margins are thin but runway remains within horizon assumptions.'
            : 'Withdrawals are within sustainable portfolio returns on these assumptions.'
      : verdict === 'AT RISK'
        ? 'Capital trajectory is declining or far from target on these growth assumptions.'
        : verdict === 'BELOW TARGET'
          ? 'Projected capital remains below your target at the selected horizon.'
          : verdict === 'ON TRACK'
            ? 'Projected capital is near your target at the horizon.'
            : 'Projected capital is above your target at the horizon.';
  const lionsVerdictNarrativeQuote = verdictHeadline ?? verdictNarrative;
  const lionsVerdictSummary = `${structuralDiagnosis} (Classification: ${verdict}.)`;
  const lionsVerdictWhy = primaryRiskDriver;
  const depletionSystemLine =
    inputs.mode === 'withdrawal'
      ? depletionMo != null && depletionMo < 1200
        ? `Income path projected to deplete capital in ${runwayYearsText}.`
        : 'Income path is sustainable under current assumptions within the model window.'
      : `Projected capital at horizon: ${formatCurrency(result.nominalCapitalAtHorizon)} vs target ${formatCurrency(inputs.targetFutureCapital)}.`;
  const lionsVerdictSystemState = `${lionPreamble} Structural band: ${riskTierLabel}. ${depletionSystemLine}`;
  const lionsVerdictNextActions = [
    inputs.mode === 'withdrawal' && incomeGap > 0 && adj?.reduceIncome?.feasible && recommendedIncome > 0
      ? `Review withdrawal levels in your plan — the model highlights approximately ${formatCurrency(recommendedIncome)}/month as one path toward sustainability under current assumptions.`
      : inputs.mode === 'withdrawal' && incomeGap > 0
        ? 'Review withdrawal levels in your plan — aligning draw with sustainable portfolio income can extend runway on these assumptions.'
        : 'Maintain withdrawal discipline and reassess after material assumption or life changes.',
    adj?.addCapital?.feasible && requiredCapital > 0
      ? `Strengthen the capital base progressively — an estimated ${formatCurrency(requiredCapital)} would materially extend runway, typically built over time via income surplus or capital optimisation (relook at Income Engineering Model).`
      : 'Strengthen the capital base over time where needed — Income Engineering can help structure pathways to unlock or build capital progressively.',
    increaseReturnFeasible && requiredReturn > 0
      ? `Review return assumptions — while higher returns improve outcomes, the diagnostic implied rate to close the gap purely via return is approximately ${formatNum(requiredReturn, 1)}%; focus on realistic ranges (e.g. 6–10%) and combine with structural adjustments rather than relying on return alone.`
      : 'Review return assumptions — while higher returns improve outcomes, focus on realistic ranges and combine with structural adjustments rather than relying on return alone.',
  ].map(sanitizePlanCopy);

  const balancedIncomePct = adj?.balancedAdjustment?.incomeReductionPct ?? 0;
  const balancedCapPct = adj?.balancedAdjustment?.capitalIncreasePct ?? 0;
  const balancedFeasible = adj?.balancedAdjustment?.feasible ?? false;

  /** Must equal the number of <ReportPage> components. */
  const TOTAL_PAGES = includeLionsVerdict ? 12 : 11; /* cover, summary, inputs, results, chart, meaning, sensitivity, optimiser, stress, [lion], next, disclosure */
  /** Trial PDFs: avoid “Lion” framing where the full Verdict section is omitted. */
  const structuralScoreLabel = includeLionsVerdict ? 'Lion score' : 'Structural score';

  const footerLogoSrc =
    brandWordmarkPngDataUrl
      ? brandWordmarkPngDataUrl
      : brandWordmarkSrc
        ? brandWordmarkSrc
        : baseUrl
          ? `${baseUrl}/brand/CapitalBridgeLogo_Green.png`
          : brandFullLockupPngDataUrl ?? null;

  const coverLogo =
    brandFullLockupPngDataUrl ? (
      <Image src={brandFullLockupPngDataUrl} style={styles.pdfCoverLogo} />
    ) : brandFullLockupSrc ? (
      <Image src={brandFullLockupSrc} style={styles.pdfCoverLogo} />
    ) : brandLionPngDataUrl && brandWordmarkPngDataUrl ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Image src={brandLionPngDataUrl} style={{ height: 44, width: 44, marginRight: 6, objectFit: 'contain' }} />
        <Image src={brandWordmarkPngDataUrl} style={{ width: 148, height: 40, objectFit: 'contain' }} />
      </View>
    ) : baseUrl ? (
      <Image src={`${baseUrl}${CAPITAL_HEALTH_COVER_LOGO_PNG_PATH}`} style={styles.pdfCoverLogo} />
    ) : (
      <Text style={{ fontSize: 11, fontWeight: 'bold', color: GREEN, marginBottom: 16 }}>Capital Bridge</Text>
    );

  return (
    <Document
      title={`Capital Bridge report — ${reportAudit.reportId}`}
      subject={`Report ID: ${reportAudit.reportId}; Version: ${reportAudit.versionLabel}`}
    >
      {/* Page 1: Standard advisory cover + contents (Forever-aligned) */}
      <ReportPage pageNumber={1} totalPages={TOTAL_PAGES} audit={reportAudit} modeHeaderLine={headerModeLine} footerLogoSrc={footerLogoSrc}>
        <View style={[styles.pdfCoverRoot, PDF_BREAK_INSIDE_AVOID]}>
          {coverLogo}
          <Text style={styles.pdfCoverH1}>CAPITAL HEALTH — STRATEGIC WEALTH REPORT</Text>
          <Text
            style={{
              fontSize: 10,
              fontWeight: 'bold',
              color: DARK,
              textAlign: 'center',
              marginBottom: 6,
              fontFamily: 'Inter',
            }}
          >
            {modeCoverLabel(inputs)}
          </Text>
          <Text style={styles.pdfCoverSubtitle}>{coverSubtitleForMode(inputs)}</Text>
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

      {/* Page 2: Executive summary */}
      <ReportPage pageNumber={2} totalPages={TOTAL_PAGES} audit={reportAudit} modeHeaderLine={headerModeLine} footerLogoSrc={footerLogoSrc}>
        {!includeLionsVerdict ? (
          <View style={{ marginBottom: 10, paddingHorizontal: 2 }}>
            <Text
              style={{
                fontSize: 9.5,
                color: 'rgba(13, 58, 29, 0.75)',
                lineHeight: 1.45,
                fontFamily: 'Inter',
              }}
            >
              {CB_REPORT_TRIAL_SNAPSHOT_CAPTION}
            </Text>
          </View>
        ) : null}
        <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
          <Text style={styles.sectionTitleLarge}>EXECUTIVE SUMMARY</Text>
          <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 6 }]}>
            Classification: {verdict} · {structuralScoreLabel}: {riskTierLabel}
          </Text>
          <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Outcome</Text>
          <Text style={[styles.bodyText, { marginBottom: 10 }]}>{execBlocks.outcome}</Text>
          <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Why</Text>
          <Text style={[styles.bodyText, { marginBottom: 10 }]}>{execBlocks.why}</Text>
          <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Meaning</Text>
          <Text style={styles.bodyText}>
            {execBlocks.meaning}
            {chartDivergenceLine ? ` ${chartDivergenceLine}` : ''}
          </Text>
        </View>
      </ReportPage>

      {/* Page 3: Your selected inputs */}
      <ReportPage pageNumber={3} totalPages={TOTAL_PAGES} audit={reportAudit} modeHeaderLine={headerModeLine} footerLogoSrc={footerLogoSrc}>
        <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
          <Text style={styles.sectionTitleLarge}>YOUR SELECTED INPUTS</Text>
          <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Mode</Text><Text style={styles.assumptionValue}>{inputs.mode === 'withdrawal' ? 'Monthly Withdrawal' : 'Compounding Growth'}</Text></View>
          <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Horizon</Text><Text style={styles.assumptionValue}>{horizonYearsFormatted} years</Text></View>
          <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Starting capital</Text><Text style={styles.assumptionValue}>{formatCurrency(inputs.startingCapital)}</Text></View>
          <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Monthly top-up</Text><Text style={styles.assumptionValue}>{formatCurrency(inputs.monthlyTopUp)}</Text></View>
          <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Expected annual return</Text><Text style={styles.assumptionValue}>{formatNum(inputs.expectedAnnualReturnPct, 1)}%</Text></View>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>Inflation</Text>
            <Text style={styles.assumptionValue}>
              {inputs.inflationEnabled ? `ON · ${formatNum(inputs.inflationPct, 1)}%` : 'OFF'}
            </Text>
          </View>
          <View style={styles.assumptionRow}>
            <Text style={styles.assumptionLabel}>Age</Text>
            <Text style={styles.assumptionValue}>{currentAge != null ? String(currentAge) : '—'}</Text>
          </View>
          <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Cash buffer</Text><Text style={styles.assumptionValue}>{formatNum(inputs.cashBufferPct, 0)}%</Text></View>
          <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Cash return</Text><Text style={styles.assumptionValue}>{formatNum(inputs.cashAPY, 1)}%</Text></View>
          {inputs.mode === 'growth' ? (
            <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Target future capital</Text><Text style={styles.assumptionValue}>{formatCurrency(inputs.targetFutureCapital)}</Text></View>
          ) : (
            <>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Desired monthly income</Text><Text style={styles.assumptionValue}>{formatCurrency(inputs.targetMonthlyIncome)}</Text></View>
              <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Withdrawal rule</Text><Text style={styles.assumptionValue}>{inputs.withdrawalRule === 'fixed' ? 'Fixed amount' : `${formatNum(inputs.withdrawalPctOfCapital, 1)}% of capital`}</Text></View>
            </>
          )}
        </View>
      </ReportPage>

      {/* Page 4: Results */}
      <ReportPage pageNumber={4} totalPages={TOTAL_PAGES} audit={reportAudit} modeHeaderLine={headerModeLine} footerLogoSrc={footerLogoSrc}>
        <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
          <Text style={styles.sectionTitleLarge}>RESULTS</Text>
          <View style={[styles.section, { marginBottom: SUBSECTION_SPACING }]}>
            <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Classification</Text><Text style={[styles.assumptionValue, { fontWeight: 'bold' }]}>{verdict}</Text></View>
            <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Structural band</Text><Text style={styles.assumptionValue}>{riskTierLabel}</Text></View>
            <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>{structuralScoreLabel} (0–100)</Text><Text style={styles.assumptionValue}>{lionScorePdf} · {lionStatusPdf}</Text></View>
            {inputs.mode === 'growth' ? (
              <>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Projected capital at horizon</Text><Text style={styles.assumptionValue}>{formatCurrency(result.nominalCapitalAtHorizon)}</Text></View>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Target future capital</Text><Text style={styles.assumptionValue}>{formatCurrency(inputs.targetFutureCapital)}</Text></View>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Total contributions (model)</Text><Text style={styles.assumptionValue}>{formatCurrency(result.totalContributions)}</Text></View>
              </>
            ) : (
              <>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Desired monthly income</Text><Text style={styles.assumptionValue}>{formatCurrency(inputs.targetMonthlyIncome)}</Text></View>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Sustainable monthly return</Text><Text style={styles.assumptionValue}>{formatCurrency(sustainableMonthly)}</Text></View>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Income gap</Text><Text style={styles.assumptionValue}>{formatCurrency(incomeGap)}</Text></View>
                <View style={styles.assumptionRow}><Text style={styles.assumptionLabel}>Runway / depletion</Text><Text style={styles.assumptionValue}>{runwayYearsText}</Text></View>
                <View style={styles.assumptionRow}>
                  <Text style={styles.assumptionLabel}>Chart read</Text>
                  <Text style={[styles.assumptionValue, { fontWeight: 'bold' }]}>{chartFaceVerdict}</Text>
                </View>
                {chartDivergenceLine ? (
                  <Text style={[styles.bodyText, { fontSize: 8, color: MUTED, marginTop: 2 }]}>{chartDivergenceLine}</Text>
                ) : null}
              </>
            )}
          </View>
          <Text style={[styles.bodyText, { marginBottom: 8 }]}>Confidence (aligned to classification): {confidenceLevel}</Text>
          <View style={styles.confidenceBarWrap}>
            <View style={styles.confidenceBar}>
              <View style={[styles.confidenceFill, { width: `${Math.min(100, Math.max(0, lionScorePdf))}%`, backgroundColor: verdictHue }]} />
            </View>
            <Text style={styles.confidenceLabel}>Scale: {structuralScoreLabel} 0–100 (same engine as the headline narrative)</Text>
          </View>
        </View>
      </ReportPage>

      {/* Page 5: Chart */}
      <ReportPage pageNumber={5} totalPages={TOTAL_PAGES} audit={reportAudit} modeHeaderLine={headerModeLine} footerLogoSrc={footerLogoSrc}>
        {chartPoints.length > 0 ? (
          <View style={[styles.chartSection, { marginBottom: CHART_SPACING }, PDF_CB_BLOCK]}>
            <CapitalProjectionChart
              chartData={chartPoints}
              horizonYears={inputs.timeHorizonYears}
              formatY={(n) => formatCurrencyDisplayNoDecimals(Math.round(n), symbol)}
              yAxisLabel="Capital balance"
              verdictLabel={chartFaceVerdict}
              verdictColorHex={chartFaceHue}
              annotationLines={chartAnnotationLines}
              caption={chartCaption}
              confidenceLevel={confidenceLevel}
              confidenceTint={confidenceTint}
              optionalSupportLine={verdictSupportLine}
              mode={inputs.mode}
              targetFutureCapital={inputs.targetFutureCapital}
              depletionMonth={depletionMo}
              formatCurrency={formatCurrency}
            />
          </View>
        ) : (
          <Text style={styles.bodyText}>No chart series available for this export.</Text>
        )}
      </ReportPage>

      {/* Page 6: What this means */}
      <ReportPage pageNumber={6} totalPages={TOTAL_PAGES} audit={reportAudit} modeHeaderLine={headerModeLine} footerLogoSrc={footerLogoSrc}>
        <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
          <Text style={styles.sectionTitleLarge}>WHAT THIS MEANS</Text>
          <Text style={[styles.bodyText, { marginBottom: 10 }]}>{chartCaption}</Text>
          <Text style={[styles.bodyText, { marginBottom: 8 }]}>{execBlocks.meaning}</Text>
          {chartDivergenceLine ? (
            <Text style={[styles.bodyText, { fontSize: 9, color: MUTED, marginBottom: 6 }]}>{chartDivergenceLine}</Text>
          ) : null}
          <Text style={[styles.bodyText, { fontSize: 9, color: MUTED }]}>
            {verdict === chartFaceVerdict
              ? `Classification and chart read both ${verdict}; confidence ${confidenceLevel} — same inputs as the executive summary.`
              : `Structural classification ${verdict}; chart read ${chartFaceVerdict}; confidence ${confidenceLevel} — same inputs as the executive summary.`}
          </Text>
        </View>
      </ReportPage>

      {/* Page 7: Sensitivity */}
      <ReportPage pageNumber={7} totalPages={TOTAL_PAGES} audit={reportAudit} modeHeaderLine={headerModeLine} footerLogoSrc={footerLogoSrc}>
        <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
          <Text style={styles.sectionTitleLarge}>SENSITIVITY</Text>
          {inputs.mode === 'withdrawal' ? (
            <>
              <Text style={[styles.bodyText, { marginBottom: 4 }]}>Inflation adjustment: {inputs.inflationEnabled ? 'ON' : 'OFF'}.</Text>
              <Text style={[styles.bodyText, { marginBottom: 4 }]}>Runway without inflation: {formatRunwayYearsMonths(runwayWithoutInflationMonths)}.</Text>
              <Text style={[styles.bodyText, { marginBottom: 4 }]}>Runway with inflation: {formatRunwayYearsMonths(runwayWithInflationMonths)}.</Text>
              <Text style={[styles.bodyText, { marginBottom: 6 }]}>
                {runwayInflationImpactMonths != null && runwayInflationImpactMonths > 0
                  ? `Impact of inflation on runway: shorter by ${formatRunwayYearsMonths(runwayInflationImpactMonths)}.`
                  : 'Impact of inflation on runway: no material change in this scenario.'}
              </Text>
              <Text style={[styles.bodyText, { fontSize: 9, color: MUTED }]}>
                Inflation increases pressure on withdrawals over time, which can shorten how long capital lasts.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.bodyText, { marginBottom: 6 }]}>
                With inflation adjustment ON, the model uses expected annual return minus inflation as the real return path over your horizon.
              </Text>
              <Text style={[styles.bodyText, { marginBottom: 6 }]}>
                Inflation OFF applies your stated return without that reduction — compare both states in the live model when stress-testing compounding outcomes.
              </Text>
              <Text style={[styles.bodyText, { fontSize: 9, color: MUTED }]}>
                Small changes to return or horizon move projected capital meaningfully; treat {formatNum(inputs.expectedAnnualReturnPct, 1)}% as an assumption to revisit, not a promise.
              </Text>
            </>
          )}
        </View>
      </ReportPage>

      {/* Page 8: Ways to improve / optimiser */}
      <ReportPage pageNumber={8} totalPages={TOTAL_PAGES} audit={reportAudit} modeHeaderLine={headerModeLine} footerLogoSrc={footerLogoSrc}>
        <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
          <Text style={styles.sectionTitleLarge}>WAYS TO IMPROVE YOUR OUTCOME</Text>
          {inputs.mode === 'growth' ? (
            <Text style={[styles.bodyText, { marginBottom: 10 }]}>
              Add capital over time or extend the horizon to raise projected capital toward your target. Returns above ~10% are usually unrealistic to rely on — prefer structural moves first.
            </Text>
          ) : (
            <Text style={[styles.bodyText, { marginBottom: 10 }]}>
              Reduce withdrawals or add capital to extend runway. Returns above ~10% are usually unrealistic to rely on — prefer structural moves first.
            </Text>
          )}
          <View style={styles.section}>
            {inputs.mode === 'withdrawal' ? (
              <>
                <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Withdrawal adjustment</Text>
                <Text style={[styles.bodyText, { marginBottom: 10 }]}>
                  {adj?.reduceIncome?.feasible && recommendedIncome > 0
                    ? `Aligning draw with sustainable portfolio income may extend runway. The model illustrates approximately ${formatCurrency(recommendedIncome)} per month — confirm in your plan; it is not a fixed instruction.`
                    : 'No single illustrative withdrawal level was isolated under this solve — review the structure holistically in your plan.'}
                </Text>
              </>
            ) : null}
            <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Capital adjustment</Text>
            <Text style={[styles.bodyText, { marginBottom: 6 }]}>
              {adj?.addCapital?.feasible && requiredCapital > 0
                ? `Additional capital of approximately ${formatCurrency(requiredCapital)} may improve outcomes under current assumptions.`
                : 'Additional capital may improve outcomes where there is a structural gap under these assumptions.'}
            </Text>
            <Text style={[styles.bodyText, { marginBottom: 6 }]}>
              This is typically built progressively through income surplus, asset optimisation, or structured capital deployment. Income Engineering can help structure pathways to build capital over time.
            </Text>
            <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Return adjustment</Text>
            <Text style={[styles.bodyText, { marginBottom: 6 }]}>
              {increaseReturnFeasible && requiredReturn > 0
                ? `The model indicates that significantly higher returns (e.g. ~${formatNum(requiredReturn, 1)}%) would be required to fully close the gap.`
                : 'The model did not isolate a single implied return adjustment under this solve — review assumptions holistically in your plan.'}
            </Text>
            <Text style={[styles.bodyText, { marginBottom: 10 }]}>
              In practice, implied returns far above ~10% are unlikely to be sustainable. Review portfolio strategy within realistic ranges (e.g. 6–10%) while combining capital and income adjustments.
            </Text>
            <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Balanced pathway</Text>
            <Text style={[styles.bodyText, { marginBottom: 10 }]}>
              {balancedFeasible && (balancedIncomePct > 0 || balancedCapPct > 0)
                ? `One illustrative combined adjustment is income −${formatNum(balancedIncomePct, 0)}% and capital +${formatNum(balancedCapPct, 0)}% (from the live model) — use for discussion, not as a mandate.`
                : 'Combined income and capital adjustments can be explored in the live model; avoid treating any single pathway as a standalone mandate.'}
            </Text>
            <Text style={[styles.bodyText, { fontSize: 9, color: MUTED, marginTop: 4 }]}>
              Illustrations show structural trade-offs for discussion — not prescriptive instructions.
            </Text>
          </View>
        </View>
      </ReportPage>

      {/* Page 9: Stress test */}
      <ReportPage pageNumber={9} totalPages={TOTAL_PAGES} audit={reportAudit} modeHeaderLine={headerModeLine} footerLogoSrc={footerLogoSrc}>
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
            <Text style={[styles.bodyText, { fontSize: 9, color: MUTED, marginTop: 8 }]}>Stress test framing: Bear, Base, and Bull are scenario lenses, not promises. They show how survival time can change under different return environments and are quick structure tests, not forecasts.</Text>
          </View>

          {inputs.mode === 'withdrawal' && incomeGap > 0 && depletionMo != null ? (
            <View style={[styles.warningPanel, PDF_CB_BLOCK]}>
              <Text style={[styles.sectionTitleLarge, { marginBottom: 10 }]}>CAPITAL PROTECTION WARNING</Text>
              <Text style={styles.bodyText}>Withdrawal levels exceed sustainable portfolio returns on these assumptions.</Text>
              <Text style={styles.bodyText}>Without structural adjustments, capital depletion is projected within {runwayYearsText}.</Text>
              <Text style={styles.bodyText}>
                Review withdrawal levels, capital base, or return assumptions to reduce long-term erosion risk.
              </Text>
            </View>
          ) : null}
      </ReportPage>

      {includeLionsVerdict ? (
        <ReportPage pageNumber={10} totalPages={TOTAL_PAGES} audit={reportAudit} modeHeaderLine={headerModeLine} footerLogoSrc={footerLogoSrc}>
          <View style={[styles.verdictSectionWrap, PDF_CB_BLOCK]}>
            <Text style={styles.sectionTitleLionVerdict}>THE LION&apos;S VERDICT</Text>
            <View style={styles.verdictSpacer} />
            <Text style={[styles.bodyText, { fontSize: 9, color: MUTED, marginBottom: 6 }]}>{lionPreamble}</Text>
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
            <Text style={styles.lionsVerdictLabel}>What you can do next</Text>
            {lionsVerdictNextActions.map((line, i) => (
              <Text key={i} style={styles.lionsVerdictBullet}>
                • {line}
              </Text>
            ))}
          </View>
        </ReportPage>
      ) : null}

      {/* What you can do next */}
      <ReportPage pageNumber={includeLionsVerdict ? 11 : 10} totalPages={TOTAL_PAGES} audit={reportAudit} modeHeaderLine={headerModeLine} footerLogoSrc={footerLogoSrc}>
        <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
          <Text style={styles.sectionTitleLarge}>WHAT YOU CAN DO NEXT</Text>
          <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>Recommended next steps</Text>
          <Text style={styles.actionItem}>
            {inputs.mode === 'withdrawal'
              ? `1. Review withdrawals — aligning draw with sustainable portfolio income can extend runway on these assumptions${
                  adj?.reduceIncome?.feasible && recommendedIncome > 0
                    ? ` (one illustrative level is around ${formatCurrency(recommendedIncome)} per month).`
                    : '.'
                }`
              : '1. Review contributions and horizon — extending time or adding capital moves you toward target capital without leaning on unrealistic returns.'}
          </Text>
          <Text style={styles.actionItem}>
            2. Strengthen capital over time —{' '}
            {adj?.addCapital?.feasible && requiredCapital > 0
              ? `An estimated ${formatCurrency(requiredCapital)} would materially extend runway under these assumptions; typically built progressively (Income Engineering pathways).`
              : 'Additional capital may improve outcomes when built progressively or through income and asset optimisation (Income Engineering pathways).'}
          </Text>
          <Text style={styles.actionItem}>
            3. Review return assumptions —{' '}
            {increaseReturnFeasible && requiredReturn > 0
              ? `The diagnostic implied rate to close the gap purely via return is approximately ${formatNum(requiredReturn, 1)}%; treat cautiously, stay within realistic ranges (e.g. 6–10%), and combine with structural adjustments.`
              : 'Keep expected returns realistic; avoid relying on outsized return assumptions to close structural gaps.'}
          </Text>
          <Text style={styles.actionItem}>4. Periodic review — Reassess assumptions annually or when circumstances change.</Text>
          <Text style={styles.actionItem}>
            5. Next step: run Capital Stress to test this structure under different situational assumptions, multiple future paths, and probability-based confidence ranges (volatility and dispersion).
          </Text>

          {inputs.mode === 'withdrawal' && recommendedIncome > 0 ? (
            <View style={[styles.highlightBox, PDF_CB_BLOCK]}>
              <Text style={styles.highlightTitle}>FOCUS AREA</Text>
              <Text style={[styles.subsectionTitle, { marginBottom: 2 }]}>Withdrawal alignment (illustrative)</Text>
              <Text style={styles.bodyText}>
                The model highlights approximately {formatCurrency(recommendedIncome)} per month as one path toward sustainability — confirm suitability in your broader plan.
              </Text>
              <Text style={[styles.subsectionTitle, { marginTop: 8, marginBottom: 2 }]}>Why it matters</Text>
              <Text style={styles.bodyText}>Lower draw reduces depletion pressure and can materially extend runway under the same return assumptions.</Text>
            </View>
          ) : null}
        </View>
      </ReportPage>

      {/* Disclosure */}
      <ReportPage pageNumber={includeLionsVerdict ? 12 : 11} totalPages={TOTAL_PAGES} audit={reportAudit} modeHeaderLine={headerModeLine} footerLogoSrc={footerLogoSrc}>
        <View style={[styles.sectionWrap, PDF_CB_BLOCK]}>
          <Text style={styles.sectionTitleLarge}>DISCLOSURE</Text>
          <Text style={[styles.bodyText, { marginBottom: 8 }]}>
            Capital Bridge is a modelling and diagnostic tool. Outputs depend on the inputs on page 3 and are not forecasts of future markets or personal outcomes.
          </Text>
          <Text style={[styles.bodyText, { fontWeight: 'bold', marginBottom: 4 }]}>How to use this export</Text>
          <Text style={styles.actionItem}>• Use the classification, chart, and Lion narrative as one aligned story under your stated assumptions.</Text>
          <Text style={styles.actionItem}>• Refresh the live model when withdrawals, returns, or horizon change materially.</Text>
          <Text style={styles.actionItem}>• Evaluate any next steps alongside your broader plan and professional guidance where applicable.</Text>
        </View>

        <View style={[styles.disclaimer, { marginTop: SECTION_SPACING }]}>
          <Text style={{ textAlign: 'left', fontSize: 9, color: MUTED, fontFamily: 'Inter', lineHeight: PDF_BODY_LH }}>
            This report is for information purposes only. All illustrations are based on your assumptions and are not a guarantee of future outcomes. The footer on each page contains the legal notice.
          </Text>
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
    brandFullLockupSrc?: string | null;
    brandLionPngDataUrl?: string | null;
    brandWordmarkPngDataUrl?: string | null;
    brandWordmarkSrc?: string | null;
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
  const brandFullLockupSrc = options?.brandFullLockupSrc;
  const brandLionPngDataUrl = options?.brandLionPngDataUrl;
  const brandWordmarkPngDataUrl = options?.brandWordmarkPngDataUrl;
  const brandWordmarkSrc = options?.brandWordmarkSrc;
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
      brandFullLockupSrc={brandFullLockupSrc}
      brandLionPngDataUrl={brandLionPngDataUrl}
      brandWordmarkPngDataUrl={brandWordmarkPngDataUrl}
      brandWordmarkSrc={brandWordmarkSrc}
      chartData={chartData}
      currentAge={currentAge}
      includeLionsVerdict={includeLionsVerdict}
      reportClientDisplayName={reportClientDisplayName}
      reportAudit={reportAudit}
    />
  );
  return pdf(doc).toBlob();
}
