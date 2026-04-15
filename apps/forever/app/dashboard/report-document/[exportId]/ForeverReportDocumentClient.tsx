"use client";

import { useEffect, useMemo } from "react";
import {
  PdfAdvisoryCoverPage,
  PdfAdvisorySectionLead,
  PdfLayout,
  PdfLionsVerdictBlock,
  PdfSection,
  PDF_TOC_FOREVER_INCOME,
} from "@cb/pdf/shared";
import { beginReportReadyCycle, completeReportReadyCycle } from "@cb/pdf/report-ready";
import { pricingReturnModelDashboardUrl } from "@cb/shared/urls";
import type { ReportAuditMeta } from "@cb/shared/reportTraceability";
import {
  ReportHeading,
  ReportKeyValueGrid,
  ReportProse,
  ReportSection,
  ReportTrialSnapshotCaption,
} from "@cb/advisory-graph/reports";
import { formatLionPublicStatusLabel, type LionPublicVerdictStatus } from "@cb/advisory-graph/lionsVerdict";

import { ProgressBarTile } from "./ForeverReportCharts";
import { deriveForeverReportModel } from "./foreverReportDerived";

type ForeverDerivedNonNull = NonNullable<ReturnType<typeof deriveForeverReportModel>>;
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

/** Mid-band score for PDF score line when only Forever tier is stored on export. */
const FOREVER_TIER_MID_SCORE: Record<LionPublicVerdictStatus, number> = {
  NOT_SUSTAINABLE: 19,
  AT_RISK: 47,
  FRAGILE: 66,
  STABLE: 83,
  STRONG: 95,
};

function foreverTierToPublicStatus(tier: string): LionPublicVerdictStatus {
  const u = tier.toUpperCase().replace(/\s+/g, "_");
  if (
    u === "STRONG" ||
    u === "STABLE" ||
    u === "FRAGILE" ||
    u === "AT_RISK" ||
    u === "NOT_SUSTAINABLE"
  ) {
    return u;
  }
  return "FRAGILE";
}

function foreverDisplayScore0to100(tier: string): number {
  return FOREVER_TIER_MID_SCORE[foreverTierToPublicStatus(tier)] ?? 66;
}

function foreverWhyThisIsHappening(derived: ForeverDerivedNonNull, fmt: (n: number) => string): string {
  const { monthlyGap, monthlyNeed, monthlySupported, computed } = derived;
  if (computed.isSustainable && monthlyGap <= 0) {
    return "On these inputs, stated real return and your capital stack support the normalised monthly dependency.";
  }
  if (monthlyGap > 0) {
    return `Supported cash-flow from the portfolio is about ${fmt(monthlySupported)} per month versus a normalised need of ${fmt(monthlyNeed)} — the shortfall is structural on this snapshot.`;
  }
  return "Outcomes hinge on real return, inflation, and balance-sheet mix — small shifts in any lever move the picture.";
}

function foreverSystemStateLine(derived: ForeverDerivedNonNull): string {
  const c = derived.computed;
  const sus = c.isSustainable ? "Yes" : "No";
  return `Progress to target: ${c.progressPercent.toFixed(1)}%. Runway: ${c.runway}. Sustainable on stated assumptions: ${sus}.`;
}

const FOREVER_LION_NEXT_ACTIONS = [
  "Review structure and levers in Section B (waterfall, stack, sensitivity).",
  "Stress assumptions in Section C before changing portfolio or spending.",
  "Re-export after material life, tax, or market shifts and discuss with your adviser.",
] as const;

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

  const incomeEngineeringDashboardUrl =
    pricingReturnModelDashboardUrl("incomeengineering") ?? "https://incomeengineering.thecapitalbridge.com/dashboard";

  return (
    <PdfLayout
      audit={audit}
      shortFooterLegal={shortFooterLegal}
      modelSurfaceClass="cb-forever-doc-report"
      documentRootId="print-report"
      printHeaderVisibility={{ showModelName: true, showReportId: false, showVersion: false }}
    >
      <PdfSection className="cb-advisory-doc-cover cb-page-break-after">
        <PdfAdvisoryCoverPage
          title="FOREVER INCOME — STRATEGIC WEALTH REPORT"
          subtitle="Structural sustainability snapshot under your stated assumptions — income need, capital stack, and levers."
          preparedForName={preparedForName}
          generatedAtLabel={audit.generatedAtLabel}
          toc={PDF_TOC_FOREVER_INCOME}
        />
      </PdfSection>

      {/* Sibling `cb-page` sections (not nested) so print fragmentation and `break-before: page` behave predictably. */}
      <PdfSection className="cb-advisory-doc-opening">
        <PdfAdvisorySectionLead
          stageLabel="Section A — Opening"
          title="Opening"
          whatThisShows="Your position on this report: a trial sustainability snapshot, or the full Lion’s Verdict and progress view — the same scenario the charts in Section B are built from."
          whyThisMatters="Sets context before structure and sensitivity, so story and numbers stay on one agreed set of assumptions."
        />
        {!derived && calculator ? (
          <ReportSection className="cb-module cb-advisory-doc-parse-error">
            <ReportProse>Some inputs could not be read for charting. The snapshot below may be incomplete — your adviser can help reconcile this with the live model.</ReportProse>
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
          <ReportSection className="cb-module cb-advisory-doc-parse-error">
            <ReportProse>No scenario snapshot was included with this report.</ReportProse>
          </ReportSection>
        ) : null}

        {derived && isTrial ? (
          <ReportSection className="cb-module cb-advisory-doc-page-1">
            <div className="cb-print-stage-label cb-advisory-doc-stage-label">Sustainability snapshot</div>
            <ReportTrialSnapshotCaption isTrial={isTrial} />
            <ReportProse lead className="text-[#0d3a1d]">
              Model inputs and headline outcomes for this snapshot. The following pages chart the same scenario.
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
          <ReportSection className="cb-module cb-advisory-doc-page-1">
            <div className="cb-print-stage-label cb-advisory-doc-stage-label">The Lion&apos;s Verdict</div>
            <PdfLionsVerdictBlock
              className="cb-lion-verdict-pdf lion-verdict"
              tierChip={<span className={tierChipClass(lion.verdictTier)}>{tierDisplay(lion.verdictTier)}</span>}
              scoreAndStatusLine={`Lion score: ${foreverDisplayScore0to100(lion.verdictTier)} / 100 · ${formatLionPublicStatusLabel(foreverTierToPublicStatus(lion.verdictTier))}`}
              narrativeQuote={lion.headlineText}
              summary={lion.guidanceText}
              whyThisIsHappening={foreverWhyThisIsHappening(derived, formatMoneyBound)}
              systemState={foreverSystemStateLine(derived)}
              nextActions={[...FOREVER_LION_NEXT_ACTIONS]}
            />
            <ProgressBarTile
              label="Progress to target (assets vs capital required)"
              percent={derived.computed.progressPercent}
              formatHint={progressHint}
            />
          </ReportSection>
        ) : null}

        {derived && !isTrial && !lion ? (
          <ReportSection className="cb-module cb-advisory-doc-page-1">
            <div className="cb-print-stage-label cb-advisory-doc-stage-label">Model snapshot</div>
            <ReportProse className="text-[#0d3a1d]">
              Lion narrative was not included on this report. Headline numbers still match the charts below; full input tables are in DEEPER ANALYSIS
              (Assumptions &amp; definitions).
            </ReportProse>
            <ProgressBarTile
              label="Progress to target (assets vs capital required)"
              percent={derived.computed.progressPercent}
              formatHint={progressHint}
            />
          </ReportSection>
        ) : null}
      </PdfSection>

      {derived ? <ForeverReportModuleSections derived={derived} formatMoney={formatMoneyBound} /> : null}

      <PdfSection
        className="cb-appendix cb-page-break cb-advisory-appendix-tail"
        aria-label="Appendix and closing"
      >
        <PdfAdvisorySectionLead
          stageLabel="Appendix & closing"
          title="Disclosures and next steps"
          whatThisShows="How to use this report, regulatory context, and a sensible next step in the Capital Bridge journey."
          whyThisMatters="Closes with a clear handoff: what this document is for, and where to go next with your adviser."
        />
        <div className="cb-module cb-advisory-doc-closing">
          <ReportHeading
            level={3}
            variant="sectionSmall"
            keepWithNext
            className="cb-advisory-doc-appendix-disclosures-h cb-advisory-doc-module-heading cb-avoid-orphan-heading"
          >
            Disclosures &amp; how to use this report
          </ReportHeading>
          <ReportProse className="cb-advisory-doc-appendix-lead text-[#0d3a1d]">
            This document comes from the Capital Bridge Forever Income model and is meant for discussion with your adviser. It is not personal advice. The footer on each page carries the full legal notice.
          </ReportProse>
          <ReportHeading level={3} variant="sectionSmall" keepWithNext className="cb-avoid-orphan-heading mt-5">
            How to use this report
          </ReportHeading>
          <ul className="my-0 mb-1 list-disc space-y-2 pl-5 text-[10pt] leading-relaxed text-[#0d3a1d] print:leading-relaxed">
            <li>Review it in a client meeting alongside your live model inputs.</li>
            <li>Treat illustrations as scenario-based, not guaranteed outcomes.</li>
            <li>Re-export after material changes to income, capital stack, or return assumptions.</li>
          </ul>
          <div className="cb-advisory-doc-model-cta cb-advisory-doc-appendix-cta cb-keep-together mt-6 pt-2">
            <h3
              className="cb-advisory-doc-cta-title cb-avoid-orphan-heading m-0 text-[11pt] font-bold leading-normal text-[#0d3a1d] print:leading-normal"
              style={{ fontFamily: '"Roboto Serif", Georgia, serif' }}
            >
              Recommended Next Step — Income Engineering
            </h3>
            <p
              className="cb-advisory-doc-cta-body mt-3 text-[10pt] leading-relaxed text-[#0d3a1d] print:leading-relaxed"
              style={{ marginBottom: "0.75em" }}
            >
              Your Forever Income snapshot highlights the structural gap between lifestyle need and what capital sustainably supports
              under stated assumptions. Income Engineering helps you build a repeatable income engine so lifestyle is funded by inflows —
              not depletion.
            </p>
            <ul className="cb-advisory-doc-cta-bullets my-0 mb-4 list-disc space-y-2 pl-5 text-[10pt] leading-relaxed text-[#0d3a1d] print:leading-relaxed">
              <li>Confirm your minimum viable lifestyle (the spend you can live with if needed)</li>
              <li>List reliable income offsets you can sustain (salary/family/rental/business)</li>
              <li>Choose one lever you will commit to in the next 30 days</li>
            </ul>
            <p className="cb-advisory-doc-cta-nextline m-0 text-[10pt] font-semibold leading-normal text-[#0d3a1d] print:leading-normal">
              Next:{"\u00a0"}
              <a href={incomeEngineeringDashboardUrl} className="text-[#0d3a1d] underline underline-offset-2">
                Run Income Engineering
              </a>
              {"\u00a0"}to continue your advisory journey.
            </p>
          </div>
        </div>
      </PdfSection>
    </PdfLayout>
  );
}
