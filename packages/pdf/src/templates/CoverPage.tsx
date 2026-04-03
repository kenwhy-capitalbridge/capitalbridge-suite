import React from "react";
import { CB_REPORT_BRAND_FULL_GREEN_PATH } from "@cb/shared/cbReportTemplate";
import { CB_FONT_SERIF } from "@cb/shared/typography";

type CoverPageData = {
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
};

const BODY_FONT = 'Arial, Helvetica, "Nimbus Sans L", sans-serif';

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
      return "Forever Income Report";
    case "HEALTH":
      return "Capital Health Report";
    case "STRESS":
      return "Capital Stress Report";
    case "IE":
    case "INCOME":
      return "Income Engineering Report";
    default:
      return rawTitle?.trim() || "Capital Bridge Report";
  }
}

function formatCurrencyMetric(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Under review";
  const label = `RM ${Math.abs(value).toLocaleString()}`;
  return value < 0 ? `Gap ${label}` : `Surplus ${label}`;
}

function formatProgressMetric(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Under review";
  return `${value.toFixed(0)}%`;
}

function formatSustainabilityMetric(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Under review";
  return `${value.toFixed(1)} years`;
}

export default function CoverPage({ data }: { data: CoverPageData }) {
  const coverDate = formatCoverDate(data.cover?.date);
  const isTrial = data.access?.isTrial === true;
  const plainEnglishSummary = (data.coverMetrics?.plainEnglishSummary ?? []).filter(Boolean).slice(0, 3);
  const metrics = [
    {
      label: "Capital Progress",
      value: formatProgressMetric(data.coverMetrics?.capitalProgressPct),
    },
    {
      label: "Sustainability",
      value: formatSustainabilityMetric(data.coverMetrics?.sustainabilityYears),
    },
    {
      label: "Monthly Position",
      value: formatCurrencyMetric(data.coverMetrics?.monthlyGapOrSurplus),
    },
  ];

  return (
    <section className={`cb-report-page cb-report-cover${isTrial ? " cb-report-cover--trial" : ""}`}>
      <style>{`
        .cb-report-cover {
          justify-content: space-between;
          gap: 28px;
          background:
            linear-gradient(180deg, rgba(13,58,29,0.05) 0%, rgba(13,58,29,0) 26%),
            linear-gradient(135deg, rgba(13,58,29,0.03) 0%, rgba(13,58,29,0) 48%),
            #fff;
        }

        .cb-report-cover--trial {
          position: relative;
        }

        .cb-report-cover--trial::after {
          content: "TRIAL REPORT";
          position: absolute;
          inset: 48% auto auto 50%;
          transform: translate(-50%, -50%) rotate(-22deg);
          font-family: ${CB_FONT_SERIF};
          font-size: 42px;
          letter-spacing: 0.2em;
          color: rgba(16, 38, 27, 0.08);
          pointer-events: none;
          white-space: nowrap;
        }

        .cb-cover-logo {
          width: 160px;
          height: auto;
          object-fit: contain;
          display: block;
          max-width: 100%;
          margin-bottom: 30px;
        }

        .cb-cover-kicker {
          margin: 0 0 10px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(16, 38, 27, 0.62);
          font-family: ${BODY_FONT};
        }

        .cb-cover-title {
          margin: 0;
          max-width: 520px;
          font-family: ${CB_FONT_SERIF};
          font-size: 32px;
          line-height: 1.12;
          font-weight: 600;
          color: #10261b;
        }

        .cb-cover-subtitle {
          margin: 16px 0 0;
          max-width: 520px;
          font-family: ${BODY_FONT};
          font-size: 12px;
          line-height: 1.65;
          color: #5f6b67;
        }

        .cb-cover-detail-grid,
        .cb-cover-metric-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .cb-cover-detail-grid {
          margin-top: 28px;
        }

        .cb-cover-card {
          padding: 14px 16px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.84);
        }

        .cb-cover-card-label {
          margin: 0 0 6px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(16, 38, 27, 0.52);
          font-family: ${BODY_FONT};
        }

        .cb-cover-card-value {
          margin: 0;
          font-size: 12px;
          line-height: 1.55;
          color: #1d2b25;
          font-family: ${BODY_FONT};
        }

        .cb-cover-summary-band {
          margin-top: 22px;
          padding-top: 22px;
          border-top: 1px solid rgba(0,0,0,0.08);
        }

        .cb-cover-summary-title {
          margin: 0 0 14px;
          font-family: ${CB_FONT_SERIF};
          font-size: 20px;
          line-height: 1.2;
          color: #10261b;
          font-weight: 600;
        }

        .cb-cover-summary-copy {
          margin: 0;
          max-width: 560px;
          font-family: ${BODY_FONT};
          font-size: 12px;
          line-height: 1.7;
          color: #24312c;
        }

        .cb-cover-framework-note {
          margin-top: 16px;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(16, 38, 27, 0.58);
          font-family: ${BODY_FONT};
        }

        .cb-trial-soften {
          opacity: 0.82;
        }

        @media (max-width: 720px) {
          .cb-cover-detail-grid,
          .cb-cover-metric-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className={isTrial ? "cb-trial-soften" : undefined}>
        <img
          src={CB_REPORT_BRAND_FULL_GREEN_PATH}
          alt="Capital Bridge"
          className="cb-cover-logo"
          style={{
            width: "160px",
            height: "auto",
            objectFit: "contain",
          }}
        />

        <p className="cb-cover-kicker">Capital Bridge premium advisory document</p>
        <h1 className="cb-cover-title">{getReportTitle(data.cover?.title)}</h1>
        <p className="cb-cover-subtitle">
          Designed for fast executive reading: key position, sustainability, and next-action clarity in one premium advisory document.
        </p>

        <div className="cb-cover-detail-grid">
          <div className="cb-cover-card">
            <p className="cb-cover-card-label">Prepared for</p>
            <p className="cb-cover-card-value">{data.cover?.client ?? "Client"}</p>
          </div>
          <div className="cb-cover-card">
            <p className="cb-cover-card-label">Report ID</p>
            <p className="cb-cover-card-value">{data.cover?.reportId ?? "Confidential advisory issue"}</p>
          </div>
          <div className="cb-cover-card">
            <p className="cb-cover-card-label">Date</p>
            <p className="cb-cover-card-value">{coverDate || "Prepared on demand"}</p>
          </div>
        </div>

        <div className="cb-cover-summary-band">
          <h2 className="cb-cover-summary-title">TLDR Summary</h2>
          <div className="cb-cover-metric-grid">
            {metrics.map((metric) => (
              <div key={metric.label} className="cb-cover-card">
                <p className="cb-cover-card-label">{metric.label}</p>
                <p className="cb-cover-card-value">{metric.value}</p>
              </div>
            ))}
          </div>
          <p className="cb-cover-summary-copy" style={{ marginTop: "18px" }}>
            {plainEnglishSummary.length > 0
              ? plainEnglishSummary.join(" ")
              : "This report gives you a fast plain-English view of how long the current structure holds, how far you are from sustainability, and what must change next."}
          </p>
          {!isTrial && data.cover?.frameworkNote ? (
            <p className="cb-cover-framework-note">{data.cover.frameworkNote}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
