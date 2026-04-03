import React from "react";
import { CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY as LEGAL_COPY } from "@cb/shared/legalMonocopy";
import { formatCurrencyDisplayNoDecimals } from "@cb/shared/formatCurrency";
import { CB_FONT_SERIF } from "@cb/shared/typography";
import CoverPage from "./CoverPage";

export type BaseReportData = {
  cover?: {
    title?: string;
    client?: string;
    date?: string;
    reportId?: string;
    frameworkNote?: string;
  };
  coverMetrics?: {
    capitalProgressPct?: number;
    sustainabilityYears?: number;
    monthlyGapOrSurplus?: number;
    plainEnglishSummary?: string[];
  };
  access?: {
    isTrial?: boolean;
    isPaid?: boolean;
  };
  summary?: {
    headline?: string;
    keyPoint?: string;
    statusLabel?: string;
    progressPct?: number;
    monthlySpend?: number;
    monthlyIncome?: number;
    monthlyGapOrSurplus?: number;
    sustainabilityYears?: number;
    meaning?: string;
    blocks?: Array<{
      title?: string;
      body?: string;
    }>;
  };
  diagnosis?: {
    what?: string;
    why?: string;
    state?: string;
    critical?: string;
  };
  actions?: string[];
  nextStep?: {
    headline?: string;
    body?: string;
    closing?: string;
  };
  lion?: {
    headline?: string;
    guidance?: string;
  };
  journey?: {
    completedStepLabel?: string;
    nextStepLabel?: string;
    nextStepSummary?: string;
    steps?: Array<{
      title?: string;
      whatItDoes?: string;
      whyItMatters?: string;
      isCurrent?: boolean;
      isNext?: boolean;
    }>;
  };
  analysis?: {
    inputSummary?: string[];
    assumptions?: string[];
    outputMetrics?: string[];
    capitalBreakdown?: string[];
    sustainabilityAnalysis?: string[];
    chartInsights?: Array<{
      title?: string;
      metric?: string;
      xAxisLabel?: string;
      yAxisLabel?: string;
      whatThisShows?: string;
      whyThisMatters?: string;
      interpretationNote?: string;
    }>;
  };
  trust?: {
    beginner?: string;
    sceptic?: string;
    experienced?: string;
  };
};

const BODY_FONT = 'Arial, Helvetica, "Nimbus Sans L", sans-serif';
const DIVIDER = "1px solid rgba(0,0,0,0.08)";
const PAGE_PADDING = "36px 40px 44px";

function highlightFinancialNumbers(text?: string): React.ReactNode {
  if (!text) return "";

  const pattern = /(RM[\d,]+|[\d,]+(?:\.\d+)?\s+years?|[\d,]+(?:\.\d+)?%)/g;
  const exactPattern = /^(RM[\d,]+|[\d,]+(?:\.\d+)?\s+years?|[\d,]+(?:\.\d+)?%)$/;
  const parts = text.split(pattern);

  return parts.map((part, index) =>
    exactPattern.test(part) ? (
      <span key={`${part}-${index}`} className="cb-number">
        {part}
      </span>
    ) : (
      <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    ),
  );
}

function Section({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="cb-report-section cb-report-section-block">
      {kicker ? <p className="cb-section-kicker">{kicker}</p> : null}
      <h2 className="cb-section-title">{title}</h2>
      <div className="cb-section-body">{children}</div>
    </section>
  );
}

function formatCurrency(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Under review";
  return formatCurrencyDisplayNoDecimals(Math.abs(value), "RM");
}

export default function BaseReport({ data }: { data: BaseReportData }) {
  const summaryBlocks = data.summary?.blocks?.length
    ? data.summary.blocks
    : [
        { title: "Your Position", body: data.summary?.headline },
        { title: "Your Gap", body: data.summary?.keyPoint },
      ].filter((block) => block.body);

  const actionItems = (data.actions ?? []).filter(Boolean);
  const journeySteps = data.journey?.steps ?? [];
  const analysis = data.analysis;

  return (
    <>
      <style>{`
        :root {
          --cb-report-ink: #10261b;
          --cb-report-muted: #5f6b67;
          --cb-report-divider: rgba(0,0,0,0.08);
          --cb-report-paper: #ffffff;
          --cb-report-soft: #f5f6f4;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: #eef1ec;
          color: var(--cb-report-ink);
        }

        .cb-report-shell,
        .cb-report-container {
          max-width: 720px;
          margin: 0 auto;
          background: var(--cb-report-paper);
          color: var(--cb-report-ink);
          font-family: ${BODY_FONT};
          font-size: 12px;
          line-height: 1.6;
        }

        .cb-report-page {
          min-height: calc(297mm - 24mm);
          padding: ${PAGE_PADDING};
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          background:
            linear-gradient(180deg, rgba(13,58,29,0.04) 0%, rgba(13,58,29,0) 18%),
            linear-gradient(135deg, rgba(13,58,29,0.025) 0%, rgba(13,58,29,0) 34%);
        }

        .cb-report-page + .cb-report-page {
          border-top: ${DIVIDER};
        }

        .cb-section-kicker {
          margin: 0 0 10px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(16, 38, 27, 0.62);
        }

        .cb-section-title,
        .cb-verdict-title {
          margin: 0;
          font-family: ${CB_FONT_SERIF};
          color: var(--cb-report-ink);
        }

        .cb-meta-label {
          margin: 0 0 6px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(16, 38, 27, 0.52);
        }

        .cb-report-section {
          margin-top: 28px;
        }

        .cb-report-section-block {
          padding: 0 0 24px;
          border-bottom: ${DIVIDER};
        }

        .cb-report-section-block + .cb-report-section-block {
          margin-top: 28px;
        }

        .cb-section-title {
          font-size: 20px;
          line-height: 1.22;
          font-weight: 600;
          margin-bottom: 14px;
        }

        .cb-section-body > :first-child {
          margin-top: 0;
        }

        .cb-section-body > :last-child {
          margin-bottom: 0;
        }

        .cb-report-p,
        .cb-verdict-copy {
          margin: 0;
          color: #24312c;
          font-size: 12px;
          line-height: 1.65;
        }

        .cb-report-list {
          margin: 0;
          padding-left: 18px;
        }

        .cb-report-list li {
          margin-bottom: 8px;
          color: #24312c;
        }

        .cb-report-list li:last-child {
          margin-bottom: 0;
        }

        .cb-trust-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .cb-trust-card {
          padding: 16px 18px;
          border: ${DIVIDER};
          background: rgba(255,255,255,0.82);
        }

        .cb-summary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .cb-glance-top {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 16px;
        }

        .cb-summary-card {
          padding: 18px 20px;
          border: ${DIVIDER};
          background: rgba(255,255,255,0.82);
        }

        .cb-summary-title {
          margin: 0 0 8px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(16, 38, 27, 0.52);
        }

        .cb-status-panel {
          padding: 18px 20px;
          border: ${DIVIDER};
          background: linear-gradient(180deg, rgba(13,58,29,0.05) 0%, rgba(255,255,255,0.98) 100%);
        }

        .cb-status-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          background: rgba(13,58,29,0.1);
          color: #0d3a1d;
        }

        .cb-progress-track {
          width: 100%;
          height: 10px;
          margin-top: 14px;
          border-radius: 999px;
          background: rgba(13,58,29,0.08);
          overflow: hidden;
        }

        .cb-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #0d3a1d 0%, #3d7b54 100%);
        }

        .cb-progress-label {
          margin: 10px 0 0;
          font-size: 12px;
          line-height: 1.55;
          color: #24312c;
        }

        .cb-report-chart,
        .cb-report-chart-wrap,
        .cb-report-chart-wrap svg,
        .cb-report-chart-wrap canvas,
        .cb-report-chart-wrap img {
          max-width: 100%;
          width: 100%;
          overflow: hidden;
          box-sizing: border-box;
        }

        .cb-report-chart-wrap {
          padding: 18px 20px;
          border: ${DIVIDER};
          background: linear-gradient(180deg, rgba(13,58,29,0.035) 0%, rgba(255,255,255,0.96) 100%);
        }

        .cb-chart-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .cb-chart-title {
          margin: 0;
          font-family: ${CB_FONT_SERIF};
          font-size: 18px;
          line-height: 1.2;
          font-weight: 600;
          color: var(--cb-report-ink);
        }

        .cb-chart-metric {
          margin: 0;
          font-size: 12px;
          line-height: 1.5;
          color: #24312c;
          text-align: right;
        }

        .cb-chart-axis-labels {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 12px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(16, 38, 27, 0.56);
        }

        .cb-analysis-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .cb-analysis-card {
          padding: 18px 20px;
          border: ${DIVIDER};
          background: rgba(255,255,255,0.82);
        }

        .cb-analysis-card ul {
          margin: 0;
          padding-left: 18px;
        }

        .cb-analysis-card li {
          margin-bottom: 8px;
          color: #24312c;
        }

        .cb-analysis-card li:last-child {
          margin-bottom: 0;
        }

        .cb-chart-notes {
          margin-top: 14px;
        }

        .cb-chart-notes p {
          margin: 0;
          font-size: 12px;
          line-height: 1.6;
          color: #24312c;
        }

        .cb-chart-notes p + p {
          margin-top: 8px;
        }

        .cb-number {
          font-weight: 700;
          color: #0d3a1d;
        }

        .cb-callout {
          padding: 16px 18px;
          border: ${DIVIDER};
          background: var(--cb-report-soft);
        }

        .cb-two-column {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 22px;
        }

        .cb-verdict-panel {
          padding: 22px 22px 24px;
          border: ${DIVIDER};
          background:
            linear-gradient(180deg, rgba(13,58,29,0.06) 0%, rgba(13,58,29,0.015) 100%);
        }

        .cb-divider-page {
          justify-content: center;
          background:
            linear-gradient(180deg, rgba(13,58,29,0.07) 0%, rgba(13,58,29,0.015) 100%),
            #f7f8f6;
        }

        .cb-divider-card {
          max-width: 520px;
          padding: 28px 30px;
          border: ${DIVIDER};
          background: rgba(255,255,255,0.92);
        }

        .cb-divider-title {
          margin: 0 0 14px;
          font-family: ${CB_FONT_SERIF};
          font-size: 30px;
          line-height: 1.12;
          font-weight: 600;
          color: var(--cb-report-ink);
        }

        .cb-divider-copy {
          margin: 0;
          font-size: 13px;
          line-height: 1.7;
          color: #24312c;
        }

        .cb-journey-banner {
          padding: 18px 20px;
          border: ${DIVIDER};
          background: linear-gradient(180deg, rgba(13,58,29,0.045) 0%, rgba(255,255,255,0.98) 100%);
        }

        .cb-journey-banner-copy {
          margin: 0;
          font-size: 12px;
          line-height: 1.65;
          color: #24312c;
        }

        .cb-journey-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .cb-journey-step {
          padding: 16px 18px;
          border: ${DIVIDER};
          background: rgba(255,255,255,0.82);
        }

        .cb-journey-step--next {
          background: rgba(13,58,29,0.06);
        }

        .cb-journey-step--current {
          border-color: rgba(13,58,29,0.14);
        }

        .cb-journey-step-title {
          margin: 0 0 8px;
          font-family: ${CB_FONT_SERIF};
          font-size: 18px;
          line-height: 1.2;
          font-weight: 600;
          color: var(--cb-report-ink);
        }

        .cb-journey-step p {
          margin: 0;
          font-size: 12px;
          line-height: 1.6;
          color: #24312c;
        }

        .cb-journey-step p + p {
          margin-top: 6px;
        }

        .cb-verdict-title {
          font-size: 28px;
          line-height: 1.15;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .cb-report-footer {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-top: auto;
          padding-top: 12px;
          border-top: ${DIVIDER};
          color: rgba(16, 38, 27, 0.62);
          font-size: 10px;
          line-height: 1.45;
        }

        .cb-footer-legal {
          flex: 1;
          max-width: 78%;
        }

        .cb-footer-page::before {
          content: "Page " counter(page) " of " counter(pages);
        }

        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          html, body {
            background: #fff;
          }

          .cb-report-shell {
            max-width: none;
            margin: 0;
          }

          .cb-report-page {
            min-height: auto;
            break-after: page;
            page-break-after: always;
          }

          .cb-report-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }

        @media (max-width: 720px) {
          .cb-report-page {
            padding: 28px 24px 76px;
            min-height: auto;
          }

          .cb-report-cover-meta,
          .cb-cover-summary-grid,
          .cb-two-column {
            grid-template-columns: 1fr;
          }

          .cb-summary-grid {
            grid-template-columns: 1fr;
          }

          .cb-trust-grid,
          .cb-glance-top,
          .cb-two-column,
          .cb-analysis-grid {
            grid-template-columns: 1fr;
          }

          .cb-report-footer {
            left: 24px;
            right: 24px;
          }

          .cb-footer-legal {
            max-width: none;
          }
        }
      `}</style>

      <main className="cb-report-shell">
        <CoverPage data={data} />

        <section className="cb-report-page">
          <Section title="At a Glance" kicker="Quick interpretation">
            <div className="cb-glance-top">
              <div className="cb-summary-grid">
                {summaryBlocks.map((block, index) => (
                  <div key={`${block.title}-${index}`} className="cb-summary-card">
                    <p className="cb-summary-title">{block.title}</p>
                    <p className="cb-report-p">{highlightFinancialNumbers(block.body)}</p>
                  </div>
                ))}
              </div>
              <div className="cb-status-panel">
                <p className="cb-summary-title">Current Status</p>
                <div className="cb-status-badge">{data.summary?.statusLabel ?? "Under Review"}</div>
                <div className="cb-progress-track" aria-hidden>
                  <div
                    className="cb-progress-fill"
                    style={{ width: `${Math.max(0, Math.min(100, data.summary?.progressPct ?? 0))}%` }}
                  />
                </div>
                <p className="cb-progress-label">
                  Progress toward target: {typeof data.summary?.progressPct === "number"
                    ? `${data.summary.progressPct.toFixed(0)}%`
                    : "Under review"}
                </p>
                <p className="cb-progress-label">
                  Monthly position: {typeof data.summary?.monthlyGapOrSurplus === "number"
                    ? data.summary.monthlyGapOrSurplus < 0
                      ? `Short ${formatCurrency(data.summary.monthlyGapOrSurplus)}`
                      : `Surplus ${formatCurrency(data.summary.monthlyGapOrSurplus)}`
                    : "Under review"}
                </p>
              </div>
            </div>
            <div className="cb-callout" style={{ marginTop: "16px" }}>
              <p className="cb-summary-title">What To Do Next</p>
              <ul className="cb-report-list">
                {actionItems.slice(0, 3).map((action, index) => (
                  <li key={`${action}-${index}`}>{highlightFinancialNumbers(action)}</li>
                ))}
              </ul>
            </div>
          </Section>

          <Section title="Executive Summary" kicker="Strategic summary">
            <div className="cb-callout">
              <p className="cb-report-p">{highlightFinancialNumbers(data.summary?.meaning ?? data.summary?.keyPoint)}</p>
            </div>
          </Section>

          <Section title="Trust Notes" kicker="How to read this report">
            <div className="cb-trust-grid">
              <div className="cb-trust-card">
                <p className="cb-summary-title">For beginners</p>
                <p className="cb-report-p">{data.trust?.beginner}</p>
              </div>
              <div className="cb-trust-card">
                <p className="cb-summary-title">For sceptics</p>
                <p className="cb-report-p">{data.trust?.sceptic}</p>
              </div>
              <div className="cb-trust-card">
                <p className="cb-summary-title">For experienced users</p>
                <p className="cb-report-p">{data.trust?.experienced}</p>
              </div>
            </div>
          </Section>

          <footer className="cb-report-footer">
            <div className="cb-footer-legal">{LEGAL_COPY}</div>
            <div className="cb-footer-page" />
          </footer>
        </section>

        <section className="cb-report-page cb-divider-page">
          <div className="cb-divider-card">
            <p className="cb-section-kicker">Detailed analysis</p>
            <h2 className="cb-divider-title">For deeper analysis</h2>
            <p className="cb-divider-copy">
              The following section provides a more detailed breakdown for those who want to explore
              the structure further.
            </p>
          </div>

          <footer className="cb-report-footer">
            <div className="cb-footer-legal">{LEGAL_COPY}</div>
            <div className="cb-footer-page" />
          </footer>
        </section>

        <section className="cb-report-page">
          <Section title="Detailed Analysis" kicker="Evidence layer">
            <div className="cb-callout">
              <p className="cb-report-p">
                This section moves from interpretation into the supporting evidence behind the
                report, including structure, drivers, inputs, outputs, and advisory reasoning.
              </p>
            </div>
          </Section>

          <Section title="Input Summary" kicker="Structured review">
            <div className="cb-analysis-card">
              <ul>
                {(analysis?.inputSummary ?? [data.diagnosis?.what]).filter(Boolean).map((item, index) => (
                  <li key={`input-${index}`}>{highlightFinancialNumbers(item)}</li>
                ))}
              </ul>
            </div>
          </Section>

          <Section title="Assumptions" kicker="Planning frame">
            <div className="cb-analysis-card">
              <ul>
                {(analysis?.assumptions ?? [data.diagnosis?.why]).filter(Boolean).map((item, index) => (
                  <li key={`assumption-${index}`}>{highlightFinancialNumbers(item)}</li>
                ))}
              </ul>
            </div>
          </Section>

          <footer className="cb-report-footer">
            <div className="cb-footer-legal">{LEGAL_COPY}</div>
            <div className="cb-footer-page" />
          </footer>
        </section>

        <section className="cb-report-page">
          <Section title="Key Outcomes" kicker="Observed outcomes">
            <div className="cb-analysis-grid">
              <div className="cb-analysis-card">
                <p className="cb-meta-label">Output metrics</p>
                <ul>
                  {(analysis?.outputMetrics ?? [data.diagnosis?.state]).filter(Boolean).map((item, index) => (
                    <li key={`output-${index}`}>{highlightFinancialNumbers(item)}</li>
                  ))}
                </ul>
              </div>
              <div className="cb-analysis-card">
                <p className="cb-meta-label">Interpretation notes</p>
                <p className="cb-report-p">
                  {highlightFinancialNumbers(
                    "These outcomes summarize where the structure currently stands and which metrics deserve the closest attention.",
                  )}
                </p>
              </div>
            </div>
          </Section>

          <Section title="Capital Breakdown" kicker="Capital view">
            <div className="cb-analysis-card">
              <ul>
                {(analysis?.capitalBreakdown ?? [data.diagnosis?.critical]).filter(Boolean).map((item, index) => (
                  <li key={`capital-${index}`}>{highlightFinancialNumbers(item)}</li>
                ))}
              </ul>
            </div>
          </Section>

          <Section title="Sustainability Analysis" kicker="Durability view">
            <div className="cb-analysis-grid">
              <div className="cb-analysis-card">
                <ul>
                  {(analysis?.sustainabilityAnalysis ?? [data.summary?.meaning]).filter(Boolean).map((item, index) => (
                    <li key={`sustainability-${index}`}>{highlightFinancialNumbers(item)}</li>
                  ))}
                </ul>
              </div>
              <div className="cb-analysis-card">
                <p className="cb-meta-label">Interpretation notes</p>
                <p className="cb-report-p">
                  {highlightFinancialNumbers(
                    "This section explains how the structure behaves across time and pressure, while keeping the proprietary engine and internal logic private.",
                  )}
                </p>
              </div>
            </div>
          </Section>

          <footer className="cb-report-footer">
            <div className="cb-footer-legal">{LEGAL_COPY}</div>
            <div className="cb-footer-page" />
          </footer>
        </section>

        <section className="cb-report-page">
          <Section title="Charts + Inputs + Outputs" kicker="Supporting evidence">
            <div className="cb-analysis-grid">
              {(analysis?.chartInsights ?? []).map((chart, index) => (
                <div key={`chart-${index}`} className="cb-report-chart-wrap">
                  <div className="cb-chart-header">
                    <h3 className="cb-chart-title">{chart.title}</h3>
                    <p className="cb-chart-metric">{highlightFinancialNumbers(chart.metric)}</p>
                  </div>
                  <div className="cb-chart-axis-labels">
                    <span>{chart.xAxisLabel}</span>
                    <span>{chart.yAxisLabel}</span>
                  </div>
                  <div className="cb-chart-notes">
                    <p>{highlightFinancialNumbers(chart.whatThisShows)}</p>
                    <p>{highlightFinancialNumbers(chart.whyThisMatters)}</p>
                    <p>{highlightFinancialNumbers(chart.interpretationNote)}</p>
                  </div>
                </div>
              ))}
              {!(analysis?.chartInsights?.length) ? (
                <div className="cb-report-chart-wrap">
                <div className="cb-chart-header">
                  <h3 className="cb-chart-title">Structure view</h3>
                  <p className="cb-chart-metric">{highlightFinancialNumbers(data.diagnosis?.state)}</p>
                </div>
                <div className="cb-chart-axis-labels">
                    <span>X Axis: Years</span>
                    <span>Y Axis: RM</span>
                </div>
                  <div className="cb-chart-notes">
                    <p>{highlightFinancialNumbers("What this shows: the current direction of the structure across time.")}</p>
                    <p>{highlightFinancialNumbers("Why this matters: it helps a professional reader judge whether the position is strengthening or weakening.")}</p>
                    <p>{highlightFinancialNumbers("Interpretation note: the chart communicates behaviour and implications, not formulas or internal model logic.")}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </Section>

          <Section title="Interpretation" kicker="Advisory reading">
            <div className="cb-analysis-grid">
              <div className="cb-analysis-card">
                <p className="cb-meta-label">What the behaviour suggests</p>
                <p className="cb-report-p">{highlightFinancialNumbers(data.summary?.meaning ?? data.diagnosis?.why)}</p>
              </div>
              <div className="cb-analysis-card">
                <p className="cb-meta-label">Why it matters now</p>
                <p className="cb-report-p">
                  {highlightFinancialNumbers(
                    "Interpretation focuses on how the structure behaves under current conditions and what that means for decision quality going forward.",
                  )}
                </p>
              </div>
            </div>
          </Section>

          <footer className="cb-report-footer">
            <div className="cb-footer-legal">{LEGAL_COPY}</div>
            <div className="cb-footer-page" />
          </footer>
        </section>

        <section className="cb-report-page">
          <Section title="Action Plan" kicker="Advisory priorities">
            <ul className="cb-report-list">
              {actionItems.map((action, index) => (
                <li key={`${action}-${index}`}>{highlightFinancialNumbers(action)}</li>
              ))}
            </ul>
          </Section>

          <Section title="Lion's Verdict" kicker="Capital Bridge view">
            <div className="cb-verdict-panel">
              <h2 className="cb-verdict-title">{highlightFinancialNumbers(data.lion?.headline)}</h2>
              <p className="cb-verdict-copy">{highlightFinancialNumbers(data.lion?.guidance)}</p>
            </div>
          </Section>

          <footer className="cb-report-footer">
            <div className="cb-footer-legal">{LEGAL_COPY}</div>
            <div className="cb-footer-page" />
          </footer>
        </section>

        <section className="cb-report-page">
          <Section title={data.nextStep?.headline ?? "What Happens Next"} kicker="Execution pathway">
            <div className="cb-callout">
              <p className="cb-report-p">{highlightFinancialNumbers(data.nextStep?.body)}</p>
              {data.nextStep?.closing ? (
                <p className="cb-report-p" style={{ marginTop: "12px" }}>
                  {highlightFinancialNumbers(data.nextStep.closing)}
                </p>
              ) : null}
            </div>
          </Section>

          <Section title="Next Step Journey" kicker="Advisory journey">
            <div className="cb-journey-banner">
              <p className="cb-journey-banner-copy">
                <strong>{data.journey?.completedStepLabel}</strong>{" "}
                {data.journey?.nextStepLabel ? <strong>{data.journey.nextStepLabel}.</strong> : null}{" "}
                {data.journey?.nextStepSummary}
              </p>
            </div>
            <div className="cb-journey-grid">
              {journeySteps.map((step, index) => (
                <div
                  key={`${step.title}-${index}`}
                  className={[
                    "cb-journey-step",
                    step.isCurrent ? "cb-journey-step--current" : "",
                    step.isNext ? "cb-journey-step--next" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <h3 className="cb-journey-step-title">
                    {step.title}
                    {step.isNext ? " — next" : step.isCurrent ? " — completed" : ""}
                  </h3>
                  <p>{step.whatItDoes}</p>
                  <p>{step.whyItMatters}</p>
                </div>
              ))}
            </div>
          </Section>

          <footer className="cb-report-footer">
            <div className="cb-footer-legal">{LEGAL_COPY}</div>
            <div className="cb-footer-page" />
          </footer>
        </section>
      </main>
    </>
  );
}
