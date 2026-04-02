import React from "react";
import { CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY as LEGAL_COPY } from "@cb/shared/legalMonocopy";

type BaseReportData = {
  cover?: {
    title?: string;
    client?: string;
    date?: string;
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

export default function BaseReport({ data }: { data: BaseReportData }) {
  const bullets = data.summary?.bullets?.length
    ? data.summary.bullets
    : [data.summary?.headline, data.summary?.keyPoint].filter(Boolean);

  return (
    <main
      className="cb-report cb-report-container"
      style={{
        maxWidth: "816px",
        margin: "0 auto",
        background: "#fff",
        color: "#111827",
        fontFamily: "Georgia, 'Times New Roman', serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        className="cb-watermark"
        aria-hidden
        style={{
          position: "absolute",
          inset: "40% auto auto 50%",
          transform: "translate(-50%, -50%) rotate(-18deg)",
          fontSize: "72px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "#0D3A1D",
          opacity: 0.03,
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        CAPITAL BRIDGE™
      </div>
      <section
        className="cb-report-section"
        style={{ marginBottom: "32px", paddingBottom: "20px" }}
      >
        <img
          src="/brand/Full_CapitalBridge_Green.svg"
          alt="Capital Bridge"
          style={{ height: 40, width: "auto", marginBottom: "16px", objectFit: "contain" }}
        />
        <h1 style={{ margin: "0 0 8px", color: "#0D3A1D", fontSize: "28px", fontWeight: 700 }}>
          {data.cover?.title ?? "Report"}
        </h1>
        <p style={{ margin: "0 0 4px", color: "#374151", fontSize: "15px" }}>{data.cover?.client ?? "Client"}</p>
        <p style={{ margin: 0, color: "#6B7280", fontSize: "13px" }}>{data.cover?.date ?? ""}</p>
      </section>

      <section className="cb-report-section" style={{ marginBottom: "24px" }}>
        <h2
          style={{
            margin: "0 0 10px",
            color: "#0D3A1D",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          At a glance
        </h2>
        <ul style={{ margin: 0, paddingLeft: "20px", color: "#1F2937", fontSize: "14px", lineHeight: 1.6 }}>
          {bullets.map((bullet, index) => (
            <li key={`${bullet}-${index}`} style={{ marginBottom: "6px" }}>
              {bullet}
            </li>
          ))}
        </ul>
      </section>

      <section className="cb-report-section" style={{ marginBottom: "24px" }}>
        <h2
          style={{
            margin: "0 0 10px",
            color: "#0D3A1D",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          What is happening
        </h2>
        <p style={{ margin: 0, color: "#1F2937", fontSize: "14px", lineHeight: 1.6 }}>{data.diagnosis?.what ?? ""}</p>
      </section>

      <section className="cb-report-section" style={{ marginBottom: "24px" }}>
        <h2
          style={{
            margin: "0 0 10px",
            color: "#0D3A1D",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Why it is happening
        </h2>
        <p style={{ margin: "0 0 10px", color: "#1F2937", fontSize: "14px", lineHeight: 1.6 }}>
          {data.diagnosis?.why ?? ""}
        </p>
        {data.diagnosis?.critical ? (
          <p style={{ margin: 0, color: "#374151", fontSize: "14px", lineHeight: 1.6 }}>
            {data.diagnosis.critical}
          </p>
        ) : null}
      </section>

      <section className="cb-report-section" style={{ marginBottom: "24px" }}>
        <h2
          style={{
            margin: "0 0 10px",
            color: "#0D3A1D",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          What you should do
        </h2>
        <ul style={{ margin: 0, paddingLeft: "20px", color: "#1F2937", fontSize: "14px", lineHeight: 1.6 }}>
          {(data.actions ?? []).map((action, index) => (
            <li key={`${action}-${index}`} style={{ marginBottom: "6px" }}>
              {action}
            </li>
          ))}
        </ul>
      </section>

      <section className="cb-report-section" style={{ marginBottom: "24px" }}>
        <h2
          style={{
            margin: "0 0 10px",
            color: "#0D3A1D",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {data.nextStep?.headline ?? "What happens next"}
        </h2>
        <p style={{ margin: "0 0 10px", color: "#1F2937", fontSize: "14px", lineHeight: 1.6 }}>
          {data.nextStep?.body ?? ""}
        </p>
        <p style={{ margin: 0, color: "#374151", fontSize: "14px", lineHeight: 1.6 }}>
          {data.nextStep?.closing ?? ""}
        </p>
      </section>

      <section className="cb-report-section" style={{ marginBottom: 0 }}>
        <h2
          style={{
            margin: "0 0 10px",
            color: "#0D3A1D",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Final verdict
        </h2>
        <h1 style={{ margin: "0 0 10px", color: "#0D3A1D", fontSize: "24px", fontWeight: 700 }}>
          {data.lion?.headline ?? ""}
        </h1>
        <p style={{ margin: 0, color: "#1F2937", fontSize: "14px", lineHeight: 1.6 }}>{data.lion?.guidance ?? ""}</p>
      </section>

      <footer
        className="cb-report-footer cb-report-section"
        style={{
          paddingTop: "16px",
          color: "#6B7280",
          fontSize: "11px",
          lineHeight: 1.6,
        }}
      >
        {LEGAL_COPY}
      </footer>
    </main>
  );
}
