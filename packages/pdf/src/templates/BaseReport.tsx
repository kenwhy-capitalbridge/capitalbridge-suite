import React from "react";
import { CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY as LEGAL_COPY } from "@cb/shared/legalMonocopy";
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
    bullets?: string[];
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
};

const BODY_FONT = 'Arial, Helvetica, "Nimbus Sans L", sans-serif';
const DIVIDER = "1px solid rgba(0,0,0,0.08)";
const PAGE_PADDING = "34px 38px 40px";

function highlightFinancialNumbers(text?: string): React.ReactNode {
  if (!text) return "";

  const pattern = /(RM\s[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s+years?|[\d,]+(?:\.\d+)?%)/g;
  const exactPattern = /^(RM\s[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s+years?|[\d,]+(?:\.\d+)?%)$/;
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

export default function BaseReport({ data }: { data: BaseReportData }) {
  const bullets = data.summary?.bullets?.length
    ? data.summary.bullets
    : [data.summary?.headline, data.summary?.keyPoint].filter(Boolean);

  const actionItems = (data.actions ?? []).filter(Boolean);

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
          margin-top: 24px;
        }

        .cb-report-section-block {
          padding: 0 0 20px;
          border-bottom: ${DIVIDER};
        }

        .cb-report-section-block + .cb-report-section-block {
          margin-top: 24px;
        }

        .cb-section-title {
          font-size: 20px;
          line-height: 1.22;
          font-weight: 600;
          margin-bottom: 12px;
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
          <Section title="At a Glance" kicker="Strategic summary">
            <ul className="cb-report-list">
              {bullets.map((bullet, index) => (
                <li key={`${bullet}-${index}`}>{highlightFinancialNumbers(bullet)}</li>
              ))}
            </ul>
          </Section>

          <Section title="What Is Happening" kicker="Current structure">
            <p className="cb-report-p">{highlightFinancialNumbers(data.diagnosis?.what)}</p>
          </Section>

          <Section title="Why It Is Happening" kicker="Underlying drivers">
            <div className="cb-two-column">
              <p className="cb-report-p">{highlightFinancialNumbers(data.diagnosis?.why)}</p>
              <div className="cb-callout">
                <p className="cb-meta-label">System state</p>
                <p className="cb-report-p">{highlightFinancialNumbers(data.diagnosis?.state)}</p>
                {data.diagnosis?.critical ? (
                  <>
                    <p className="cb-meta-label" style={{ marginTop: "14px" }}>
                      Critical note
                    </p>
                    <p className="cb-report-p">{highlightFinancialNumbers(data.diagnosis.critical)}</p>
                  </>
                ) : null}
              </div>
            </div>
          </Section>

          <footer className="cb-report-footer">
            <div className="cb-footer-legal">{LEGAL_COPY}</div>
            <div className="cb-footer-page" />
          </footer>
        </section>

        <section className="cb-report-page">
          <Section title="Recommended Actions" kicker="Advisory priorities">
            <ul className="cb-report-list">
              {actionItems.map((action, index) => (
                <li key={`${action}-${index}`}>{highlightFinancialNumbers(action)}</li>
              ))}
            </ul>
          </Section>

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

          <Section title="Final Verdict" kicker="Capital Bridge view">
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
      </main>
    </>
  );
}
