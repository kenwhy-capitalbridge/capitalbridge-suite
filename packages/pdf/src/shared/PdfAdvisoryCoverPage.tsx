"use client";

import type { ReactNode } from "react";
import { REPORT_FONT_BODY, REPORT_FONT_DISPLAY } from "@cb/advisory-graph/reports";

export type PdfTocBlock = {
  title: string;
  items?: readonly string[];
};

export type PdfAdvisoryCoverPageProps = {
  /** Optional single line above the logo (e.g. short © notice on cover only). */
  coverTopLegal?: string;
  /** Default: full green wordmark served from app `/public/brand`. */
  logoSrc?: string;
  logoAlt?: string;
  /** ALL CAPS line, e.g. `FOREVER INCOME — STRATEGIC WEALTH REPORT` */
  title: string;
  /** Model-specific line under the title (sentence case is fine). */
  subtitle?: ReactNode;
  preparedForName: string;
  generatedAtLabel: string;
  toc: readonly PdfTocBlock[];
  className?: string;
};

/**
 * Standard Capital Bridge advisory PDF cover: logo, title, subtitle, prepared/generated, divider, Contents (A/B/C/Appendix).
 * Parent should wrap in `PdfSection` with `cb-advisory-doc-cover cb-page-break-after` inside `.cb-advisory-pdf-doc`.
 */
export function PdfAdvisoryCoverPage({
  coverTopLegal,
  logoSrc = "/brand/Full_CapitalBridge_Green.svg",
  logoAlt = "Capital Bridge",
  title,
  subtitle,
  preparedForName,
  generatedAtLabel,
  toc,
  className = "",
}: PdfAdvisoryCoverPageProps) {
  return (
    <div className={["cb-advisory-doc-cover-main", className].filter(Boolean).join(" ")}>
      {coverTopLegal ? (
        <p
          className="m-0 mb-3 w-full text-center text-[7.5pt] leading-snug text-[rgba(13,58,29,0.72)] print:mb-2.5 print:text-[7.5pt]"
          style={{ fontFamily: REPORT_FONT_BODY }}
        >
          {coverTopLegal}
        </p>
      ) : null}
      <div className="mb-5 flex justify-center print:mb-5 md:mb-6">
        <img
          src={logoSrc}
          alt={logoAlt}
          className="cb-advisory-doc-cover-logo mx-auto block h-[176px] w-auto max-w-[min(100%,880px)] min-w-0 object-contain object-center"
        />
      </div>
      <h1
        className="cb-advisory-doc-cover-title m-0 mb-4 block w-full text-center text-[12.5pt] font-bold leading-tight tracking-[0.06em] text-[#0d3a1d] print:mb-3 print:text-[12pt]"
        style={{ fontFamily: REPORT_FONT_DISPLAY }}
      >
        {title}
      </h1>
      {subtitle ? (
        <p
          className="cb-advisory-doc-cover-subtitle m-0 mb-3 block w-full max-w-[44em] text-center text-[10.5pt] leading-relaxed text-[#0d3a1d] print:mb-3 print:text-[10pt]"
          style={{ fontFamily: REPORT_FONT_BODY }}
        >
          {subtitle}
        </p>
      ) : null}
      <p
        className="cb-advisory-doc-cover-prepared m-0 block w-full text-[11pt] leading-relaxed text-[#0d3a1d] print:leading-relaxed"
        style={{ fontFamily: REPORT_FONT_BODY, marginBottom: "0.75em" }}
      >
        Prepared for: <strong className="font-semibold text-[#0d3a1d]">{preparedForName}</strong>
      </p>
      <p
        className="cb-advisory-doc-cover-generated m-0 block w-full max-w-[44em] text-[11pt] leading-relaxed text-[#0d3a1d] print:leading-relaxed"
        style={{ fontFamily: REPORT_FONT_BODY, marginBottom: "1.25em" }}
      >
        Generated: <strong className="font-semibold text-[#0d3a1d]">{generatedAtLabel}</strong>
      </p>
      <div className="cb-advisory-doc-cover-contents mt-1 block w-full max-w-[44em] border-t border-[rgba(13,58,29,0.15)] pt-4 print:mt-2 print:pt-5">
        <h2
          className="m-0 mb-2 block w-full text-[8pt] font-bold uppercase leading-normal tracking-wide text-[#0d3a1d] print:mb-2.5"
          style={{ fontFamily: REPORT_FONT_BODY }}
        >
          Contents
        </h2>
        <div className="space-y-1.5 text-[7.5pt] leading-[1.45] text-[rgba(13,58,29,0.88)] print:text-[7.5pt] print:leading-[1.45]">
          {toc.map((block) => (
            <div key={block.title} className="block w-full">
              <p className="mb-0.5 font-semibold text-[#0d3a1d]">{block.title}</p>
              {block.items && block.items.length > 0 ? (
                <ul className="mb-0 list-disc space-y-0.5 pl-4">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
