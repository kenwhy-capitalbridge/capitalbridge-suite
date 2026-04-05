"use client";

import { useEffect, useMemo } from "react";
import { beginReportReadyCycle, completeReportReadyCycle } from "@cb/pdf/report-ready";
import {
  CB_PDF_FOOTER_DOM_REPORT_ID_ATTR,
  CB_PDF_FOOTER_DOM_VERSION_ATTR,
} from "@cb/shared/reportPdfPlaywright";
import { CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY } from "@cb/shared/legalMonocopy";
import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import { ReportHeading, ReportKeyValueGrid, ReportProse, ReportSection } from "@cb/advisory-graph/reports";
import { ReportPrintChrome } from "@cb/ui";

import { ProgressBarTile } from "./ForeverReportCharts";
import { deriveForeverReportModel } from "./foreverReportDerived";
import { ForeverReportModuleSections } from "./ForeverReportModuleSections";

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

  return { inputRows, outcomeRows, cur };
}

const TOC_STRUCTURE: { title: string; items?: readonly string[] }[] = [
  {
    title: "Opening",
    items: ["Trial: sustainability snapshot, or paid: The Lion’s Verdict"],
  },
  {
    title: "Section B — Advisor Read",
    items: [
      "Your retirement system (in one view)",
      "Next 30 days: pick one lever",
      "Inputs that drive the outcome",
      "Capital stack & accessibility",
      "Runway curve (capital over time)",
      "Levers ranked",
      "Where to go next",
    ],
  },
  {
    title: "Section C — Pro Mode (Evidence & Sensitivity)",
    items: [
      "Assumptions & definitions",
      "Liquidity haircut analysis",
      "Sensitivity: return (±1%)",
      "Sensitivity: inflation (±1%)",
      "Methodology & scope",
    ],
  },
  { title: "Appendix & closing (full legal)" },
];

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

  const derived = useMemo(
    () => (calculator ? deriveForeverReportModel(calculator) : null),
    [calculator],
  );

  const snap = calculator ? buildSnapshotRows(calculator) : null;

  const formatMoneyBound = useMemo(() => {
    const cur = snap?.cur ?? (str(calculator?.inputs ?? {}, "currency") || "RM");
    return (n: number) => formatMoney(n, cur);
  }, [snap?.cur, calculator]);

  const progressHint = useMemo(() => {
    if (!derived) return "Progress reflects current assets versus capital required on stated real return.";
    const c = derived.computed;
    const need = Number.isFinite(c.capitalNeeded) ? formatMoneyBound(c.capitalNeeded) : "the required pool";
    return `Target capital (real terms): ${need}. Runway: ${c.runway}.`;
  }, [derived, formatMoneyBound]);

  return (
    <div
      className="cb-report-root cb-forever-doc-report print-report-root min-h-screen text-[#0d3a1d]"
      data-cb-forever-report-document
      {...{
        [CB_PDF_FOOTER_DOM_REPORT_ID_ATTR]: audit.reportId,
        [CB_PDF_FOOTER_DOM_VERSION_ATTR]: audit.versionLabel,
      }}
    >
      <ReportPrintChrome audit={audit} printFooterText={shortFooterLegal} />

      <section className="cb-page cb-forever-doc-cover cb-report-executive-summary--page-break-after print:pb-4">
        <div className="mb-5 flex justify-center md:mb-6">
          <img
            src="/brand/Full_CapitalBridge_Green.svg"
            alt="Capital Bridge"
            className="h-14 w-auto max-w-[260px] object-contain md:h-16 md:max-w-[280px]"
          />
        </div>
        <ReportHeading level={2} variant="sectionSmall">
          Forever Income — strategic wealth report
        </ReportHeading>
        <ReportProse lead className="text-[#0d3a1d]">
          Prepared for: <strong className="text-[#0d3a1d]">{preparedForName}</strong>
        </ReportProse>
        <ReportProse className="text-[#0d3a1d]">
          Generated: <strong className="text-[#0d3a1d]">{audit.generatedAtLabel}</strong>
        </ReportProse>
        <div className="mt-4 max-w-[44em] border-t border-[rgba(13,58,29,0.15)] pt-3">
          <p className="mb-1.5 text-[8pt] font-bold uppercase tracking-wide text-[#0d3a1d]">Contents</p>
          <div className="space-y-2 text-[8pt] leading-snug text-[rgba(13,58,29,0.88)]">
            {TOC_STRUCTURE.map((block) => (
              <div key={block.title}>
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
        <ReportProse className="cb-report-option-b-full-ip mt-4 text-[9pt] leading-relaxed text-[#2b2b2b] md:mt-5">
          {CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY}
        </ReportProse>
      </section>

      <section className="cb-page cb-break-before-page">
      {!derived && calculator ? (
        <ReportSection className="cb-module cb-forever-doc-parse-error">
          <ReportProse>Calculator data could not be parsed for charts. Inputs may be incomplete for this export.</ReportProse>
          {snap ? (
            <>
              <ReportHeading level={3} variant="sectionSmall" keepWithNext className="cb-avoid-orphan-heading">
                Raw snapshot
              </ReportHeading>
              <ReportKeyValueGrid rows={snap.inputRows} className="cb-forever-kv-grid" />
              <ReportKeyValueGrid rows={snap.outcomeRows} className="cb-forever-kv-grid" />
            </>
          ) : null}
        </ReportSection>
      ) : null}

      {!calculator ? (
        <ReportSection className="cb-module cb-forever-doc-parse-error">
          <ReportProse>No calculator snapshot was stored for this export.</ReportProse>
        </ReportSection>
      ) : null}

      {derived && isTrial ? (
        <ReportSection className="cb-module cb-forever-doc-page-1">
          <div className="cb-print-stage-label cb-forever-doc-stage-label">Sustainability snapshot</div>
          <ReportProse lead className="text-[#0d3a1d]">
            Model inputs and headline outcomes at export. Following pages chart the same snapshot.
          </ReportProse>
          <ProgressBarTile
            label="Progress to target (assets vs capital required)"
            percent={derived.computed.progressPercent}
            formatHint={progressHint}
          />
          <ReportHeading level={3} variant="sectionSmall" keepWithNext className="cb-avoid-orphan-heading">
            Model inputs
          </ReportHeading>
          <ReportKeyValueGrid rows={snap!.inputRows} className="cb-forever-kv-grid" />
          <ReportHeading level={3} variant="sectionSmall" keepWithNext className="cb-avoid-orphan-heading">
            Key outcomes
          </ReportHeading>
          <ReportKeyValueGrid rows={snap!.outcomeRows} className="cb-forever-kv-grid" />
        </ReportSection>
      ) : null}

      {derived && !isTrial && lion ? (
        <ReportSection className="cb-module cb-forever-doc-page-1">
          <div className="cb-print-stage-label cb-forever-doc-stage-label">The Lion&apos;s Verdict</div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className={tierChipClass(lion.verdictTier)}>{tierDisplay(lion.verdictTier)}</span>
          </div>
          <ReportProse className="text-[#0d3a1d]">
            <strong className="text-[#0d3a1d]">{lion.headlineText}</strong>
          </ReportProse>
          <ReportProse className="text-[rgba(43,43,43,0.95)]">{lion.guidanceText}</ReportProse>
          <ProgressBarTile
            label="Progress to target (assets vs capital required)"
            percent={derived.computed.progressPercent}
            formatHint={progressHint}
          />
        </ReportSection>
      ) : null}

      {derived && !isTrial && !lion ? (
        <ReportSection className="cb-module cb-forever-doc-page-1">
          <div className="cb-print-stage-label cb-forever-doc-stage-label">Model snapshot</div>
          <ReportProse className="text-[#0d3a1d]">
            Lion narrative was not stored for this export. Headline numbers below match the charts in this PDF; full input tables
            are in Section C (Assumptions &amp; definitions).
          </ReportProse>
          <ProgressBarTile
            label="Progress to target (assets vs capital required)"
            percent={derived.computed.progressPercent}
            formatHint={progressHint}
          />
        </ReportSection>
      ) : null}
      </section>

      {derived ? <ForeverReportModuleSections derived={derived} formatMoney={formatMoneyBound} /> : null}

      <section className="cb-page cb-break-before-page" aria-label="Appendix and closing">
        <div className="cb-module cb-forever-doc-closing">
          <div className="cb-print-stage-label cb-forever-doc-stage-label">Appendix &amp; closing</div>
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-forever-doc-module-heading cb-avoid-orphan-heading"
          >
            Disclosures &amp; how to use this report
          </ReportHeading>
          <ReportProse className="text-[#0d3a1d]">
            This report is generated by the Capital Bridge Forever Income model for discussion with your adviser. It is not
            personal advice.
          </ReportProse>
          <ReportProse className="cb-report-option-b-full-ip mt-4 text-[9pt] leading-relaxed text-[#2b2b2b]">
            {CAPITAL_BRIDGE_SITE_LEGAL_MONOCOPY}
          </ReportProse>
        </div>
      </section>
    </div>
  );
}
