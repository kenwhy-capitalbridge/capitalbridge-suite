"use client";

import { ReportHeading, ReportKeyValueGrid, ReportProse, ReportSection } from "@cb/advisory-graph/reports";
import type { ForeverPrintSnapshotV1 } from "./foreverPrintSnapshot";

function currencyCodeForDisplay(code: string): string {
  const c = code.trim().toUpperCase();
  if (c === "RM") return "MYR";
  return c.length === 3 ? c : "USD";
}

function formatMoney(amount: number, currencyCode: string): string {
  const iso = currencyCodeForDisplay(currencyCode);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: iso, maximumFractionDigits: 0 }).format(
      amount,
    );
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

type Props = {
  snapshot: ForeverPrintSnapshotV1 | null;
};

/**
 * STEP 8 — visible model snapshot on the print route (inputs, outcomes, Lion copy when present).
 */
export function ForeverPrintModelSnapshot({ snapshot }: Props) {
  if (!snapshot) {
    return (
      <ReportSection>
        <ReportHeading level={3} variant="sectionSmall">
          Model snapshot
        </ReportHeading>
        <ReportProse>
          No dashboard snapshot in this tab. Use <strong>Open print layout (PDF v6)</strong> on the Forever Income
          dashboard so inputs and results appear here and are stored on the export row.
        </ReportProse>
      </ReportSection>
    );
  }

  const { inputs, results } = snapshot;
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
    { key: "Cash", value: (() => {
      const n = num(inputs, "cash");
      return n !== null ? formatMoney(n, cur) : "—";
    })() },
    { key: "Investments", value: (() => {
      const n = num(inputs, "investments");
      return n !== null ? formatMoney(n, cur) : "—";
    })() },
    { key: "Real estate (equity / value)", value: (() => {
      const n = num(inputs, "realEstate");
      return n !== null ? formatMoney(n, cur) : "—";
    })() },
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

  const lion = results.lionCopy;

  return (
    <>
      <ReportSection>
        <ReportHeading level={3} variant="sectionSmall">
          Model inputs
        </ReportHeading>
        <ReportKeyValueGrid rows={inputRows} />
      </ReportSection>

      <ReportSection pageBreakBefore>
        <ReportHeading level={3} variant="sectionSmall">
          Key outcomes
        </ReportHeading>
        <ReportKeyValueGrid rows={outcomeRows} />
      </ReportSection>

      {lion ? (
        <ReportSection pageBreakBefore>
          <ReportHeading level={3} variant="sectionSmall">
            Lion Verdict (snapshot)
          </ReportHeading>
          <ReportProse>
            <strong>{lion.headline}</strong>
          </ReportProse>
          <ReportProse>{lion.guidance}</ReportProse>
          <ReportProse>
            Tier: {lion.tier} · Persona: {lion.persona} · Confidence band: {lion.confidenceBand}
          </ReportProse>
        </ReportSection>
      ) : (
        <ReportSection pageBreakBefore>
          <ReportHeading level={3} variant="sectionSmall">
            Lion Verdict
          </ReportHeading>
          <ReportProse>
            Not included on this export (trial tier or Lion unavailable). Indices are not stored for anti-repeat on
            this session.
          </ReportProse>
        </ReportSection>
      )}
    </>
  );
}
