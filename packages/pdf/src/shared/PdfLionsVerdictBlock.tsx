"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  REPORT_BRAND_GREEN,
  REPORT_FONT_BODY,
  REPORT_FONT_DISPLAY,
  REPORT_TEXT,
  REPORT_TYPE,
} from "@cb/advisory-graph/reports";

export type PdfLionsVerdictMicroSignal = { type: "warn" | "ok"; text: string };

export type PdfLionsVerdictBlockProps = {
  className?: string;
  /** Single line, e.g. `Lion score: 72 / 100 · Stable` */
  scoreAndStatusLine: string;
  /** One-line narrative in quotes (italic). */
  narrativeQuote?: string;
  summary: string;
  whyThisIsHappening: string;
  systemState: string;
  nextActions: string[];
  /** Optional pathway block (Income Engineering / Capital Stress). */
  executionPathway?: { title: string; body: string };
  /** Optional tier chip (Forever Income). Rendered before the score line. */
  tierChip?: ReactNode;
  microSignals?: PdfLionsVerdictMicroSignal[];
  accentColor?: string;
  /** Subsection labels (Summary, Why, …). Defaults to `accentColor`. */
  labelColor?: string;
  /** Score/status line color. Defaults to `accentColor`. */
  scoreLineColor?: string;
  titleColor?: string;
  textColor?: string;
  fontSerif?: string;
  fontBody?: string;
  titleStyle?: CSSProperties;
};

/**
 * Standard “Lion’s Verdict” block for Playwright/HTML advisory PDFs: title, score/status,
 * italic quote, Summary, Why, System state, optional execution pathway, then “What you should do next”.
 * Merge engine “guidance” into `summary` in the parent (see `mergeLionVerdictSummaryBody`).
 */
export function mergeLionVerdictSummaryBody(keyPoint: string, guidance: string): string {
  const k = keyPoint.trim();
  const g = guidance.trim();
  if (!g) return k;
  if (!k) return g;
  return `${k}\n\n${g}`;
}

export function PdfLionsVerdictBlock({
  className,
  scoreAndStatusLine,
  narrativeQuote,
  summary,
  whyThisIsHappening,
  systemState,
  nextActions,
  executionPathway,
  tierChip,
  microSignals,
  /** Default: brand body green (#0D3A1D), not gold accent — matches Forever PDF print spec. */
  accentColor = REPORT_TEXT,
  labelColor,
  scoreLineColor,
  titleColor = REPORT_BRAND_GREEN,
  textColor = REPORT_TEXT,
  fontSerif = REPORT_FONT_DISPLAY,
  fontBody = REPORT_FONT_BODY,
  titleStyle,
}: PdfLionsVerdictBlockProps) {
  const labelTint = labelColor ?? accentColor;
  const scoreTint = scoreLineColor ?? accentColor;

  const labelStyle: CSSProperties = {
    fontSize: REPORT_TYPE.label.fontSize,
    fontWeight: REPORT_TYPE.label.fontWeight,
    color: labelTint,
    textTransform: "uppercase",
    marginBottom: "0.2em",
    letterSpacing: "0.06em",
    fontFamily: fontBody,
  };

  const bodyStyle: CSSProperties = {
    fontSize: REPORT_TYPE.body.fontSize,
    lineHeight: REPORT_TYPE.body.lineHeight,
    color: textColor,
    margin: 0,
    fontFamily: fontBody,
    whiteSpace: "pre-line",
  };

  const blocks: { label: string; text: string }[] = [
    { label: "Summary", text: summary },
    { label: "Why this is happening", text: whyThisIsHappening },
    { label: "System state", text: systemState },
  ];

  return (
    <section
      className={className ?? "cb-lion-verdict-pdf lion-verdict"}
      data-cb-lions-verdict-block
    >
      <h2
        style={{
          fontFamily: fontSerif,
          fontSize: REPORT_TYPE.sectionH2Small.fontSize,
          fontWeight: REPORT_TYPE.sectionH2Small.fontWeight,
          color: titleColor,
          marginBottom: "0.5em",
          textTransform: "uppercase",
          ...titleStyle,
        }}
      >
        THE LION&apos;S VERDICT
      </h2>
      {tierChip ? (
        <div className="mb-2 flex flex-wrap items-center gap-3" style={{ marginBottom: "0.65em" }}>
          {tierChip}
        </div>
      ) : null}
      <p
        style={{
          fontSize: REPORT_TYPE.body.fontSize,
          fontWeight: 700,
          color: scoreTint,
          marginBottom: "0.65em",
          fontFamily: fontBody,
        }}
      >
        {scoreAndStatusLine}
      </p>
      {narrativeQuote ? (
        <p
          style={{
            fontSize: "11pt",
            fontWeight: 700,
            fontStyle: "italic",
            fontFamily: fontSerif,
            color: textColor,
            marginBottom: "0.65em",
            lineHeight: 1.45,
          }}
        >
          &ldquo;{narrativeQuote}&rdquo;
        </p>
      ) : null}
      {blocks.map(({ label, text }) => (
        <div key={label} style={{ marginBottom: "0.55em" }}>
          <p style={labelStyle}>{label}</p>
          <p style={bodyStyle}>{text}</p>
        </div>
      ))}
      {executionPathway ? (
        <div style={{ marginBottom: "0.55em" }}>
          <p style={labelStyle}>{executionPathway.title}</p>
          <p style={bodyStyle}>{executionPathway.body}</p>
        </div>
      ) : null}
      <p style={{ ...labelStyle, marginBottom: "0.35em", marginTop: "0.15em" }}>WHAT YOU SHOULD DO NEXT</p>
      <ul
        className="cb-lion-verdict-next-actions"
        style={{
          fontSize: REPORT_TYPE.body.fontSize,
          color: textColor,
          marginTop: 0,
          marginBottom: "0.55em",
          marginLeft: 0,
          paddingLeft: "1.15em",
          lineHeight: 1.45,
          fontFamily: fontBody,
          listStyleType: "disc",
          listStylePosition: "outside",
        }}
      >
        {nextActions.map((line) => (
          <li key={line} style={{ display: "list-item" }}>
            {line}
          </li>
        ))}
      </ul>
      {microSignals && microSignals.length > 0 ? (
        <div style={{ marginTop: "0.5em" }}>
          {microSignals.map((s, i) => (
            <p key={i} style={{ fontSize: REPORT_TYPE.body.fontSize, color: textColor, fontFamily: fontBody }}>
              {s.type === "warn" ? "⚠ " : "✓ "}
              {s.text}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
