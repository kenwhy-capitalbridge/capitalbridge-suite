import React from "react";

type BaseReportData = {
  cover?: {
    title?: string;
    client?: string;
    date?: string;
  };
  summary?: {
    headline?: string;
    keyPoint?: string;
  };
  diagnosis?: {
    what?: string;
    why?: string;
    state?: string;
  };
  actions?: string[];
  lion?: {
    headline?: string;
    guidance?: string;
  };
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "24px" }}>
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
        {title}
      </h2>
      <div style={{ color: "#1f2937", fontSize: "14px", lineHeight: 1.6 }}>{children}</div>
    </section>
  );
}

export default function BaseReport({ data }: { data: BaseReportData }) {
  return (
    <main
      style={{
        maxWidth: "816px",
        margin: "0 auto",
        padding: "40px 32px 56px",
        background: "#fff",
        color: "#111827",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <header style={{ marginBottom: "32px", paddingBottom: "20px", borderBottom: "2px solid #FFCC6A" }}>
        <p style={{ margin: 0, color: "#8B6914", fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Capital Bridge Advisory Framework
        </p>
        <h1 style={{ margin: "8px 0 6px", color: "#0D3A1D", fontSize: "28px", fontWeight: 700 }}>
          {data.cover?.title ?? "Report"}
        </h1>
        <p style={{ margin: 0, color: "#4b5563", fontSize: "14px" }}>
          Prepared for {data.cover?.client ?? "Client"}
        </p>
        <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: "13px" }}>{data.cover?.date ?? ""}</p>
      </header>

      <Section title="Summary">
        <p style={{ margin: "0 0 10px", fontWeight: 700 }}>{data.summary?.headline ?? ""}</p>
        <p style={{ margin: 0 }}>{data.summary?.keyPoint ?? ""}</p>
      </Section>

      <Section title="Diagnosis">
        <p style={{ margin: "0 0 10px" }}>{data.diagnosis?.what ?? ""}</p>
        <p style={{ margin: "0 0 10px" }}>{data.diagnosis?.why ?? ""}</p>
        <p style={{ margin: 0, color: "#374151", fontWeight: 600 }}>{data.diagnosis?.state ?? ""}</p>
      </Section>

      <Section title="What you should do next">
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
          {(data.actions ?? []).map((action) => (
            <li key={action} style={{ marginBottom: "6px" }}>
              {action}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Lion guidance">
        <p style={{ margin: "0 0 10px", fontWeight: 700 }}>{data.lion?.headline ?? ""}</p>
        <p style={{ margin: 0 }}>{data.lion?.guidance ?? ""}</p>
      </Section>
    </main>
  );
}
