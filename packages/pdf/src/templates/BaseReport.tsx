import React from "react";
import { CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY as LEGAL_COPY } from "@cb/shared/legalMonocopy";
import { CB_REPORT_BRAND_FULL_GREEN_PATH } from "@cb/shared/cbReportTemplate";
import { CB_FONT_SERIF } from "@cb/shared/typography";

type BaseReportData = {
  cover?: {
    title?: string;
    client?: string;
    date?: string;
    reportId?: string;
    frameworkNote?: string;
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
const PAGE_PADDING = "34px 38px 86px";

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

function formatCoverDate(value?: string): string {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("en-MY", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getReportTitle(rawTitle?: string): string {
  switch ((rawTitle ?? "").toUpperCase()) {
    case "FOREVER":
      return "Forever Income Advisory Report";
    case "HEALTH":
      return "Capital Health Advisory Report";
    case "STRESS":
      return "Capital Stress Advisory Report";
    case "IE":
    case "INCOME":
      return "Income Engineering Advisory Report";
    default:
      return rawTitle?.trim() || "Capital Bridge Advisory Report";
  }
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
    <section className="cb-report-section-block">
      {kicker ? <p className="cb-section-kicker">{kicker}</p> : null}
      <h2 className="cb-section-title">{title}</h2>
      <div className="cb-section-body">{children}</div>
    </section>
  );
}

export default function BaseReport({ data }: { data: BaseReportData }) {
  const reportTitle = getReportTitle(data.cover?.title);
  const coverDate = formatCoverDate(data.cover?.date);
  const bullets = data.summary?.bullets?.length
    ? data.summary.bullets
    : [data.summary?.headline, data.summary?.keyPoint].filter(Boolean);

  const actionItems = (data.actions ?? []).filter(Boolean);
  const summaryCards = [
    { label: "Client", value: data.cover?.client ?? "Client" },
    { label: "Prepared on", value: coverDate || "Confidential advisory output" },
    { label: "Framework", value: data.cover?.frameworkNote ?? "Capital Bridge premium advisory review" },
  ];

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

        .cb-report-shell {
          max-width: 816px;
          margin: 0 auto;
          background: var(--cb-report-paper);
          color: var(--cb-report-ink);
          font-family: ${BODY_FONT};
          font-size: 12px;
          line-height: 1.6;
        }

        .cb-report-page {
          position: relative;
          min-height: calc(297mm - 24mm);
          padding: ${PAGE_PADDING};
          box-sizing: border-box;
          background:
            linear-gradient(180deg, rgba(13,58,29,0.04) 0%, rgba(13,58,29,0) 18%),
            linear-gradient(135deg, rgba(13,58,29,0.025) 0%, rgba(13,58,29,0) 34%);
        }

        .cb-report-page + .cb-report-page {
          border-top: ${DIVIDER};
        }

        .cb-report-cover {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 28px;
        }

        .cb-report-cover-hero {
          padding-top: 8px;
        }

        .cb-report-cover-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .cb-report-meta-card {
          padding: 14px 16px;
          border: ${DIVIDER};
          background: rgba(255,255,255,0.82);
        }

        .cb-report-logo {
          width: 240px;
          height: 48px;
          display: block;
          margin-bottom: 28px;
        }

        .cb-report-logo image {
          width: 100%;
          height: 100%;
        }

        .cb-report-eyebrow,
        .cb-section-kicker {
          margin: 0 0 10px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(16, 38, 27, 0.62);
        }

        .cb-report-h1,
        .cb-section-title,
        .cb-verdict-title {
          margin: 0;
          font-family: ${CB_FONT_SERIF};
          color: var(--cb-report-ink);
        }

        .cb-report-h1 {
          font-size: 31px;
          line-height: 1.15;
          font-weight: 600;
          max-width: 560px;
        }

        .cb-report-dek {
          margin: 16px 0 0;
          max-width: 560px;
          font-size: 12px;
          color: var(--cb-report-muted);
        }

        .cb-cover-summary {
          padding-top: 18px;
          border-top: ${DIVIDER};
        }

        .cb-cover-summary-grid {
          display: grid;
          grid-template-columns: 1.25fr 0.75fr;
          gap: 24px;
          align-items: start;
        }

        .cb-cover-summary-copy {
          margin: 0;
          font-size: 12px;
          color: #1d2b25;
        }

        .cb-cover-status {
          padding: 18px;
          border: ${DIVIDER};
          background: var(--cb-report-soft);
        }

        .cb-meta-label {
          margin: 0 0 6px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(16, 38, 27, 0.52);
        }

        .cb-meta-value {
          margin: 0;
          font-size: 12px;
          color: #1d2b25;
        }

        .cb-report-section-block {
          padding: 0 0 20px;
          border-bottom: ${DIVIDER};
        }

        .cb-report-section-block + .cb-report-section-block {
          margin-top: 22px;
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
          position: absolute;
          left: 38px;
          right: 38px;
          bottom: 28px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
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
        <section className="cb-report-page cb-report-cover">
          <div className="cb-report-cover-hero">
            <svg
              className="cb-report-logo"
              viewBox="0 0 360 72"
              role="img"
              aria-label="Capital Bridge"
            >
              <image
                href={CB_REPORT_BRAND_FULL_GREEN_PATH}
                width="360"
                height="72"
                preserveAspectRatio="xMidYMid meet"
              />
            </svg>

            <p className="cb-report-eyebrow">Capital Bridge premium advisory document</p>
            <h1 className="cb-report-h1">{reportTitle}</h1>
            <p className="cb-report-dek">
              Structured from the Capital Bridge advisory framework and presented in the same premium
              report language across all four models.
            </p>
          </div>

          <div className="cb-report-cover-meta">
            {summaryCards.map((item) => (
              <div key={item.label} className="cb-report-meta-card">
                <p className="cb-meta-label">{item.label}</p>
                <p className="cb-meta-value">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="cb-cover-summary">
            <div className="cb-cover-summary-grid">
              <div>
                <p className="cb-meta-label">Executive summary</p>
                <p className="cb-cover-summary-copy">
                  {highlightFinancialNumbers(
                    data.summary?.headline ??
                      data.summary?.keyPoint ??
                      "This report translates the model output into a concise advisory readout focused on structure, risk, and next actions.",
                  )}
                </p>
              </div>
              <div className="cb-cover-status">
                <p className="cb-meta-label">Cover references</p>
                <p className="cb-meta-value">
                  {data.cover?.reportId ? <>Report ID: {data.cover.reportId}</> : "Confidential advisory issue"}
                </p>
                <p className="cb-meta-value" style={{ marginTop: "8px" }}>
                  {data.diagnosis?.state
                    ? highlightFinancialNumbers(data.diagnosis.state)
                    : "Prepared for premium advisory review."}
                </p>
              </div>
            </div>
          </div>

          <footer className="cb-report-footer">
            <div className="cb-footer-legal">{LEGAL_COPY}</div>
            <div className="cb-footer-page" />
          </footer>
        </section>

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
