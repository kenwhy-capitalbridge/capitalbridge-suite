import React, { useMemo } from "react";
import type { LoanRow } from "../types/calculator";
import type { SustainabilityStatus } from "../types/calculator";
import type { SummaryKPIs } from "../types/calculator";
import { formatCurrency } from "../utils/format";
import type { CurrencyCode } from "../config/currency";
import {
  buildOptimisationDecisionView,
  type OptimisationQuality,
  type TriState,
} from "../lib/optimisationDecisionEngine";

interface WhatThisMeansBoxProps {
  status: SustainabilityStatus;
  /** Reserved for future trend callouts; same inputs as Lion / PDF. */
  medianCoverage: number;
  worstMonthCoverage: number;
  invalidReason?: string;
  currency: CurrencyCode;
  summary: SummaryKPIs;
  totalCapital: number;
  loans: LoanRow[];
}

function statusPillStyles(status: SustainabilityStatus): string {
  if (status === "green") return "bg-[#11B981] text-white border-[#11B981]";
  if (status === "amber") return "bg-[#FFAB40] text-[#0D3A1D] border-[#FFAB40]";
  if (status === "red") return "bg-[#DD524C] text-white border-[#DD524C]";
  return "bg-[#6B7280] text-white border-[#6B7280]";
}

function statusPillLabel(status: SustainabilityStatus): string {
  if (status === "green") return "SUSTAINABLE";
  if (status === "amber") return "PLAUSIBLE";
  if (status === "red") return "UNSUSTAINABLE";
  return "INVALID";
}

function triLabel(t: TriState): string {
  if (t === "yes") return "Yes";
  if (t === "no") return "No";
  return "Partially";
}

function qualityHeading(q: OptimisationQuality): string {
  if (q.kind === "deficit") {
    if (q.label === "GOOD_DEFICIT") return "GOOD DEFICIT";
    if (q.label === "BAD_DEFICIT") return "BAD DEFICIT";
    return "WATCHLIST DEFICIT";
  }
  if (q.kind === "surplus") {
    return q.label === "PRODUCTIVE_SURPLUS" ? "PRODUCTIVE SURPLUS" : "IDLE SURPLUS";
  }
  return "BALANCED POSITION";
}

function qualityExplanation(q: OptimisationQuality): string {
  if (q.kind === "deficit") {
    if (q.label === "GOOD_DEFICIT") {
      return "This structure creates a short-term monthly deficit, but the deficit is being used to build stronger long-term capital or income. The pressure appears intentional and may be acceptable if it remains supportable throughout the loan period.";
    }
    if (q.label === "BAD_DEFICIT") {
      return "This structure creates a monthly deficit that may weaken the plan. The short-term pressure is not clearly supported by sufficient capital, income, or long-term benefit.";
    }
    return "This structure creates a deficit that may be manageable, but the margin is thin. The long-term payoff may justify it, but the pressure should be monitored carefully.";
  }
  if (q.kind === "surplus") {
    if (q.label === "PRODUCTIVE_SURPLUS") {
      return "This structure generates a monthly surplus and appears to be using capital constructively to strengthen long-term income or capital growth.";
    }
    return "This structure generates a monthly surplus, but some capital may be underutilised if it is not being directed toward stronger long-term income or growth.";
  }
  return "Inflows and outflows are very close on these inputs. Small assumption changes could move the picture.";
}

type InvalidSection = {
  summary: string;
  subheading: string;
  suggestions: string[];
  tagline: string;
};

function getInvalidSection(invalidReason?: string): InvalidSection {
  const summary = invalidReason
    ? `The numbers don't fit the limits (${invalidReason}). Lower your spending or total investments to stay within the allowed range.`
    : "Your totals are over the allowed limits. Try lowering monthly spending or total investments.";
  return {
    summary,
    subheading: "What you could do",
    suggestions: [
      "Lower monthly spending to the max allowed for your currency.",
      "Lower total investments to the max allowed.",
      "Double-check that no single value is above the limits shown.",
      "Come back to the calculator every month to check your STATUS.",
    ],
    tagline: "",
  };
}

export const WhatThisMeansBox: React.FC<WhatThisMeansBoxProps> = ({
  status,
  medianCoverage,
  worstMonthCoverage,
  invalidReason,
  currency,
  summary,
  totalCapital,
  loans,
}) => {
  const c = (n: number) => formatCurrency(n, currency);
  const decision = useMemo(
    () => buildOptimisationDecisionView({ summary, totalCapital, loans }),
    [summary, totalCapital, loans],
  );

  const { formulaParts, positionRaw, isDeficit, magnitude, funding, capitalOutcome, quality } = decision;
  const f = formulaParts;
  const formulaLine = `(${c(f.expenses)} + ${c(f.loanRepayments)}) - (${c(f.recurringIncome)} + ${c(f.investmentIncome)}) = ${c(magnitude)} ${isDeficit ? "deficit" : "surplus"}`;

  const tenureLine =
    funding.shortestLoanYears != null && funding.longestLoanYears != null
      ? funding.shortestLoanYears === funding.longestLoanYears
        ? `${funding.shortestLoanYears} yr`
        : `${funding.shortestLoanYears} yr · ${funding.longestLoanYears} yr`
      : "Not modelled (no loans from enabled unlocking capital)";

  const capitalOutcomeBody =
    capitalOutcome.remainingAfterLoans != null
      ? `After loan periods, the model still points to roughly ${c(capitalOutcome.remainingAfterLoans)} in additional capital where that figure is available.`
      : "This model shows your portfolio and unlocked liquidity today. It does not project balances after every loan has fully repaid, so long-term capital persistence is described in cautious terms only.";

  const incomeGrowthLine =
    capitalOutcome.incomeGrowthHint === "likely_supportive"
      ? "On these inputs, unlocked capital and investment income appear to support stronger long-term, income-generating capital."
      : capitalOutcome.incomeGrowthHint === "uncertain"
        ? "Unlocked capital is present, but the long-term income effect depends on how it stays invested and how loans evolve."
        : "With little or no unlocking capital on these inputs, the structure is less clearly adding long-term income-generating capital from that lever.";

  if (status === "invalid") {
    const inv = getInvalidSection(invalidReason);
    return (
      <div className="rounded-xl border border-[#FFCC6A]/25 bg-[#0D3A1D]/60 p-4 sm:p-6" aria-labelledby="what-means-label">
        <h2 id="what-means-label" className="font-serif-section mb-2 text-sm font-bold uppercase">
          Optimisation recommendations
        </h2>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] sm:text-xs font-bold uppercase tracking-wider shrink-0 ${statusPillStyles(status)}`}
          aria-label={`Status: ${statusPillLabel(status)}`}
        >
          {statusPillLabel(status)}
        </span>
        <p className="mt-3 text-sm leading-relaxed text-[#F6F5F1]">{inv.summary}</p>
        <h3 className="mt-3 font-serif-section mb-2 text-sm font-bold uppercase">{inv.subheading}</h3>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#F6F5F1]">
          {inv.suggestions.map((s, i) => (
            <li key={i} className="pl-1">
              {s}
            </li>
          ))}
        </ol>
        {inv.tagline ? (
          <p className="mt-4 text-sm italic font-light text-[#FFCC6A]">&ldquo;{inv.tagline}&rdquo;</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#FFCC6A]/25 bg-[#0D3A1D]/60 p-4 sm:p-6" aria-labelledby="what-means-label">
      <h2 id="what-means-label" className="font-serif-section mb-2 text-sm font-bold uppercase">
        Optimisation recommendations
      </h2>
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] sm:text-xs font-bold uppercase tracking-wider shrink-0 ${statusPillStyles(status)}`}
        aria-label={`Status: ${statusPillLabel(status)}`}
      >
        {statusPillLabel(status)}
      </span>

      <h3 className="mt-4 font-serif-section text-xs font-bold uppercase tracking-wide text-[#FFCC6A]">
        Net monthly position
      </h3>
      <p className="mt-1 text-sm font-semibold text-[#F6F5F1]">
        Net monthly position: {c(magnitude)} {isDeficit ? "deficit" : "surplus"}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[#B8B5AE]">
        Positive means outflows exceed inflows (deficit). Negative means inflows exceed outflows (surplus).
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#F6F5F1]">{formulaLine}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#B8B5AE]">
        Modelled coverage: {(medianCoverage * 100).toFixed(1)}% (typical month) · {(worstMonthCoverage * 100).toFixed(1)}%
        (weakest month).
      </p>

      <h3 className="mt-5 font-serif-section text-xs font-bold uppercase tracking-wide text-[#FFCC6A]">
        How this position is being funded
      </h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#F6F5F1]">
        <li>Covered by existing capital: {triLabel(funding.capitalCover)}</li>
        <li>Covered by investment income: {triLabel(funding.investmentIncomeCover)}</li>
        <li>Pressure period (loan tenure range): {tenureLine}</li>
        <li>Total capital unlocked: {c(funding.totalUnlocked)}</li>
      </ul>

      <h3 className="mt-5 font-serif-section text-xs font-bold uppercase tracking-wide text-[#FFCC6A]">
        Capital outcome if maintained
      </h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#F6F5F1]">
        <li>Total capital unlocked: {c(capitalOutcome.totalUnlocked)}</li>
        <li>{capitalOutcomeBody}</li>
        <li>{incomeGrowthLine}</li>
      </ul>

      <h3 className="mt-5 font-serif-section text-xs font-bold uppercase tracking-wide text-[#FFCC6A]">
        Classification
      </h3>
      <p className="mt-2 inline-flex items-center rounded border border-[#FFCC6A]/40 bg-[#163d28] px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#FFCC6A]">
        {qualityHeading(quality)}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#F6F5F1]">{qualityExplanation(quality)}</p>

      <h3 className="mt-5 font-serif-section text-xs font-bold uppercase tracking-wide text-[#FFCC6A]">
        Interpretation
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#F6F5F1]">{decision.interpretationLead}</p>
      <p className="mt-2 text-sm leading-relaxed text-[#F6F5F1]">{decision.interpretationTail}</p>

      <h3 className="mt-5 font-serif-section mb-2 text-sm font-bold uppercase">Next steps</h3>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#F6F5F1]">
        {decision.nextSteps.map((s, i) => (
          <li key={i} className="pl-1">
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
};
