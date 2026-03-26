/**
 * Catalog only — no copy. All four advisory exports use the same section order and layout primitives.
 *
 * Charts: use `ReportChartSlot` with title, axis labels, legend, and 1–2 explanation lines (or rely on its fallback).
 */

/** Four model reports (Forever Income, Income Engineering, Capital Health, Capital Stress). */
export const ADVISORY_REPORT_KINDS = [
  'forever-income',
  'income-engineering',
  'capital-health',
  'capital-stress',
] as const;

export type AdvisoryReportKind = (typeof ADVISORY_REPORT_KINDS)[number];

/**
 * Canonical section slots (identical order for every report).
 * Implementations compose `ReportSection` + `data-cb-report-section={id}` for anchors and PDF TOC.
 */
export const STANDARD_REPORT_SECTION_IDS = [
  'cover',
  'executive_summary',
  'plain_english_rules',
  'scenario_analysis',
  'chart_explanation',
  'capital_unlocking',
  'refinancing',
  'trial_vs_full_notice',
  'disclosures',
] as const;

export type StandardReportSectionId = (typeof STANDARD_REPORT_SECTION_IDS)[number];

export type ReportTier = 'trial' | 'full';
