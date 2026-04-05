"use client";

import { useEffect } from "react";
import { beginReportReadyCycle, completeReportReadyCycle } from "@cb/pdf/report-ready";
import {
  CB_PDF_FOOTER_DOM_REPORT_ID_ATTR,
  CB_PDF_FOOTER_DOM_VERSION_ATTR,
} from "@cb/shared/reportPdfPlaywright";
import { CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY } from "@cb/shared/legalMonocopy";
import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import { ReportHeading, ReportKeyValueGrid, ReportProse, ReportSection } from "@cb/advisory-graph/reports";
import { ReportPrintChrome } from "@cb/ui";

type LionChosen = {
  verdictTier: string;
  headlineText: string;
  guidanceText: string;
};

type Props = {
  audit: ReportAuditMeta;
  shortFooterLegal: string;
  preparedForName: string;
  isTrial: boolean;
  lion: LionChosen | null;
  calculator: { inputs: Record<string, unknown>; results: Record<string, unknown> } | null;
};

function currencyCodeForDisplay(code: string): string {
  const c = code.trim().toUpperCase();
  if (c === "RM") return "MYR";
  return c.length === 3 ? c : "USD";
}

function formatMoney(amount: number, currencyCode: string): string {
  const iso = currencyCodeForDisplay(currencyCode);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: iso,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
}

function num(inputs: Record<string, unknown>, key: string): number | null {
  const v = inputs[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(inputs: Record<string, unknown>, key: string): string {
  const v = inputs[key];
  return typeof v === "string" ? v : "";
}

function tierChipClass(tier: string): string {
  const map: Record<string, string> = {
    STRONG: "cb-forever-tier-chip cb-forever-tier-chip--strong",
    STABLE: "cb-forever-tier-chip cb-forever-tier-chip--stable",
    FRAGILE: "cb-forever-tier-chip cb-forever-tier-chip--fragile",
    AT_RISK: "cb-forever-tier-chip cb-forever-tier-chip--at-risk",
    NOT_SUSTAINABLE: "cb-forever-tier-chip cb-forever-tier-chip--not-sustainable",
  };
  return map[tier] ?? "cb-forever-tier-chip";
}

function tierDisplay(tier: string): string {
  return tier.replace(/_/g, " ");
}

function buildSnapshotRows(calculator: NonNullable<Props["calculator"]>) {
  const { inputs, results } = calculator;
  const cur = str(inputs, "currency") || "RM";
  const et = str(inputs, "expenseType");

  const inputRows = [
    { key: "Currency", value: cur },
    { key: "Expense basis", value: et === "ANNUAL" ? "Annual" : "Monthly" },
    {
      key: et === "ANNUAL" ? "Annual expense" : "Monthly expense",
      value: (() => {
        const n = num(inputs, "expense");
        return n !== null ? formatMoney(n, cur) : "—";
      })(),
    },
    {
      key: et === "ANNUAL" ? "Annual family contribution" : "Monthly family contribution",
      value: (() => {
        const n = num(inputs, "familyContribution");
        return n !== null ? formatMoney(n, cur) : "—";
      })(),
    },
    { key: "Expected return (nominal % p.a.)", value: num(inputs, "expectedReturn") ?? "—" },
    { key: "Inflation (% p.a.)", value: num(inputs, "inflationRate") ?? "—" },
    {
      key: "Cash",
      value: (() => {
        const n = num(inputs, "cash");
        return n !== null ? formatMoney(n, cur) : "—";
      })(),
    },
    {
      key: "Investments",
      value: (() => {
        const n = num(inputs, "investments");
        return n !== null ? formatMoney(n, cur) : "—";
      })(),
    },
    {
      key: "Real estate (equity / value)",
      value: (() => {
        const n = num(inputs, "realEstate");
        return n !== null ? formatMoney(n, cur) : "—";
      })(),
    },
    { key: "Property financing rate (% p.a.)", value: num(inputs, "propertyLoanCost") ?? "—" },
    { key: "Property horizon (years)", value: num(inputs, "propertyTimeHorizon") ?? "—" },
  ];

  const progress = typeof results.progressPercent === "number" ? results.progressPercent : null;
  const capitalNeeded = typeof results.capitalNeeded === "number" ? results.capitalNeeded : null;
  const currentAssets = typeof results.currentAssets === "number" ? results.currentAssets : null;
  const gap = typeof results.gap === "number" ? results.gap : null;
  const monthlyExpense = typeof results.monthlyExpense === "number" ? results.monthlyExpense : null;

  const outcomeRows = [
    { key: "Progress to target", value: progress !== null ? `${progress.toFixed(1)}%` : "—" },
    {
      key: "Capital required (real terms)",
      value: capitalNeeded !== null ? formatMoney(capitalNeeded, cur) : "—",
    },
    { key: "Current investable assets", value: currentAssets !== null ? formatMoney(currentAssets, cur) : "—" },
    { key: "Gap / surplus", value: gap !== null ? formatMoney(gap, cur) : "—" },
    {
      key: "Monthly dependency (normalised)",
      value: monthlyExpense !== null ? formatMoney(monthlyExpense, cur) : "—",
    },
    {
      key: "Sustainable on stated assumptions",
      value: results.isSustainable === true ? "Yes" : results.isSustainable === false ? "No" : "—",
    },
    {
      key: "Runway / horizon",
      value: typeof results.runway === "string" && results.runway.length > 0 ? results.runway : "—",
    },
  ];

  return { inputRows, outcomeRows };
}

export function ForeverReportDocumentClient({
  audit,
  shortFooterLegal,
  preparedForName,
  isTrial,
  lion,
  calculator,
}: Props) {
  useEffect(() => {
    const token = beginReportReadyCycle();
    void completeReportReadyCycle(token);
  }, []);

  const snap = calculator ? buildSnapshotRows(calculator) : null;

  return (
    <div
      className="cb-report-root print-report-root min-h-screen bg-white px-6 py-8 text-[#0d3a1d] md:px-10"
      data-cb-forever-report-document
      {...{
        [CB_PDF_FOOTER_DOM_REPORT_ID_ATTR]: audit.reportId,
        [CB_PDF_FOOTER_DOM_VERSION_ATTR]: audit.versionLabel,
      }}
    >
      <ReportPrintChrome audit={audit} printFooterText={shortFooterLegal} />

      <section className="cb-forever-doc-cover cb-report-executive-summary--page-break-after print:pb-8">
        <div className="mb-10 flex justify-center">
          <img
            src="/brand/Full_CapitalBridge_Green.svg"
            alt="Capital Bridge"
            className="h-16 w-auto max-w-[280px] object-contain"
          />
        </div>
        <ReportHeading level={2} variant="sectionSmall">
          Forever Income — strategic wealth report
        </ReportHeading>
        <ReportProse lead>
          Prepared for: <strong>{preparedForName}</strong>
        </ReportProse>
        <ReportProse>
          Generated: <strong>{audit.generatedAtLabel}</strong>
        </ReportProse>
        <ReportProse className="cb-report-option-b-full-ip mt-8 text-[9pt] leading-relaxed text-[#4b5563]">
          {CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY}
        </ReportProse>
      </section>

      {!isTrial && lion ? (
        <ReportSection pageBreakBefore className="cb-forever-doc-page-1">
          <div className="cb-print-stage-label">The Lion&apos;s Verdict</div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className={tierChipClass(lion.verdictTier)}>{tierDisplay(lion.verdictTier)}</span>
          </div>
          <ReportProse>
            <strong>{lion.headlineText}</strong>
          </ReportProse>
          <ReportProse>{lion.guidanceText}</ReportProse>
        </ReportSection>
      ) : null}

      {isTrial && snap ? (
        <ReportSection pageBreakBefore>
          <div className="cb-print-stage-label">Sustainability snapshot</div>
          <ReportProse lead>Model inputs and outcomes at export time.</ReportProse>
          <ReportHeading level={3} variant="sectionSmall">
            Model inputs
          </ReportHeading>
          <ReportKeyValueGrid rows={snap.inputRows} />
          <ReportHeading level={3} variant="sectionSmall">
            Key outcomes
          </ReportHeading>
          <ReportKeyValueGrid rows={snap.outcomeRows} />
        </ReportSection>
      ) : null}

      {!isTrial && snap ? (
        <>
          <ReportSection pageBreakBefore>
            <ReportHeading level={3} variant="sectionSmall">
              Model inputs
            </ReportHeading>
            <ReportKeyValueGrid rows={snap.inputRows} />
          </ReportSection>
          <ReportSection pageBreakBefore>
            <ReportHeading level={3} variant="sectionSmall">
              Key outcomes
            </ReportHeading>
            <ReportKeyValueGrid rows={snap.outcomeRows} />
          </ReportSection>
        </>
      ) : null}

      {!snap ? (
        <ReportSection pageBreakBefore>
          <ReportProse>No calculator snapshot was stored for this export.</ReportProse>
        </ReportSection>
      ) : null}

      {Array.from({ length: 12 }, (_, i) => i + 2).map((n) => (
        <ReportSection key={n} pageBreakBefore>
          <ReportHeading level={3} variant="sectionSmall">
            Section {n} (body)
          </ReportHeading>
          <ReportProse>
            Placeholder for Forever Income v6 narrative, charts, and disclosures. Full layout is scheduled in a later
            delivery.
          </ReportProse>
        </ReportSection>
      ))}

      <ReportSection pageBreakBefore className="cb-forever-doc-closing cb-forever-doc-page-14">
        <ReportHeading level={3} variant="sectionSmall">
          Page 14 — Closing
        </ReportHeading>
        <ReportProse>
          This report is generated by the Capital Bridge Forever Income model for discussion with your adviser. It is
          not personal advice.
        </ReportProse>
        <ReportProse className="cb-report-option-b-full-ip mt-6 text-[9pt] leading-relaxed text-[#4b5563]">
          {CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY}
        </ReportProse>
      </ReportSection>
    </div>
  );
}
