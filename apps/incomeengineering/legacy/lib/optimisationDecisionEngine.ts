/**
 * Conservative heuristics for the on-screen “Optimisation recommendations” panel.
 * Uses the same monthly snapshot as `runSimulation` / `SummaryKPIs` (no new simulation layer).
 *
 * Net monthly position (display convention):
 *   (expenses + loan repayments) − (recurring income + modelled investment income)
 *   > 0 ⇒ deficit, < 0 ⇒ surplus (sign matches outflows minus inflows).
 */

import type { LoanRow } from "../types/calculator";
import type { SummaryKPIs } from "../types/calculator";
import type { SustainabilityStatus } from "../types/calculator";

export type TriState = "yes" | "no" | "partially";

export type DeficitQuality = "GOOD_DEFICIT" | "BAD_DEFICIT" | "WATCHLIST_DEFICIT";
export type SurplusQuality = "PRODUCTIVE_SURPLUS" | "IDLE_SURPLUS";

export type OptimisationQuality =
  | { kind: "deficit"; label: DeficitQuality }
  | { kind: "surplus"; label: SurplusQuality }
  | { kind: "neutral"; label: "BALANCED" };

export type OptimisationDecisionView = {
  positionRaw: number;
  isDeficit: boolean;
  magnitude: number;
  formulaParts: {
    expenses: number;
    loanRepayments: number;
    recurringIncome: number;
    investmentIncome: number;
  };
  funding: {
    capitalCover: TriState;
    investmentIncomeCover: TriState;
    shortestLoanYears: number | null;
    longestLoanYears: number | null;
    totalUnlocked: number;
  };
  capitalOutcome: {
    totalUnlocked: number;
    /** Model does not project post-amortisation balances; when null, UI shows cautious copy. */
    remainingAfterLoans: number | null;
    incomeGrowthHint: "likely_supportive" | "uncertain" | "unlikely_supportive";
  };
  quality: OptimisationQuality;
  interpretationLead: string;
  interpretationTail: string;
  nextSteps: string[];
};

function triFromScore(score: number): TriState {
  if (score >= 0.85) return "yes";
  if (score <= 0.35) return "no";
  return "partially";
}

function loanTenureBounds(loans: LoanRow[]): { minY: number | null; maxY: number | null } {
  if (!loans.length) return { minY: null, maxY: null };
  const years = loans.map((l) => l.tenureYears).filter((y) => Number.isFinite(y) && y > 0);
  if (!years.length) return { minY: null, maxY: null };
  return { minY: Math.min(...years), maxY: Math.max(...years) };
}

function classifyDeficit(args: {
  status: SustainabilityStatus;
  runwayMonths: number;
  pressureMonths: number;
  totalUnlocked: number;
  unlockingSurplus: number;
  coverage: number;
}): DeficitQuality {
  const { status, runwayMonths, pressureMonths, totalUnlocked, unlockingSurplus, coverage } = args;

  const badSignals: boolean[] = [];
  if (status === "red") badSignals.push(true);
  if (Number.isFinite(runwayMonths) && Number.isFinite(pressureMonths) && pressureMonths > 0) {
    if (runwayMonths < pressureMonths * 0.8) badSignals.push(true);
  } else if (Number.isFinite(runwayMonths) && runwayMonths < 18) {
    badSignals.push(true);
  }
  if (coverage < 0.75) badSignals.push(true);
  if (badSignals.some(Boolean)) return "BAD_DEFICIT";

  const goodSignals =
    (totalUnlocked > 0 || unlockingSurplus > 0) &&
    (status === "amber" || status === "green") &&
    Number.isFinite(runwayMonths) &&
    Number.isFinite(pressureMonths) &&
    pressureMonths > 0 &&
    runwayMonths >= pressureMonths * 1.02 &&
    coverage >= 0.88;

  if (goodSignals) return "GOOD_DEFICIT";
  return "WATCHLIST_DEFICIT";
}

function classifySurplus(args: {
  totalUnlocked: number;
  unlockingSurplus: number;
  investmentIncome: number;
  recurringIncome: number;
  coverage: number;
}): SurplusQuality {
  const { totalUnlocked, unlockingSurplus, investmentIncome, recurringIncome, coverage } = args;
  const invShare = recurringIncome + investmentIncome > 0 ? investmentIncome / (recurringIncome + investmentIncome) : 0;
  const deploying = totalUnlocked > 0 || unlockingSurplus > 0 || invShare >= 0.12 || coverage >= 1.12;
  return deploying ? "PRODUCTIVE_SURPLUS" : "IDLE_SURPLUS";
}

export function buildOptimisationDecisionView(input: {
  summary: SummaryKPIs;
  totalCapital: number;
  loans: LoanRow[];
}): OptimisationDecisionView {
  const { summary, totalCapital, loans } = input;
  const expenses = summary.monthlyExpenses;
  const loanRepayments = summary.monthlyLoanRepayments;
  const recurringIncome = summary.monthlyIncome;
  const investmentIncome = summary.estimatedMonthlyInvestmentIncome;
  const outflows = expenses + loanRepayments;
  const inflows = recurringIncome + investmentIncome;
  const positionRaw = outflows - inflows;
  const isDeficit = positionRaw > 0;
  const magnitude = Math.abs(positionRaw);

  const coverage = outflows > 0 ? inflows / outflows : 1;
  const deficitMonthly = Math.max(0, positionRaw);
  const runwayMonths = deficitMonthly > 0 && totalCapital > 0 ? totalCapital / deficitMonthly : Number.POSITIVE_INFINITY;
  const { minY, maxY } = loanTenureBounds(loans);
  const pressureMonths = maxY != null ? maxY * 12 : loans.length ? 60 : 36;

  const invCoverScore = outflows > 0 ? Math.min(1, investmentIncome / outflows) : 0;
  const capitalCoverScore =
    deficitMonthly <= 0
      ? 1
      : Number.isFinite(runwayMonths) && pressureMonths > 0
        ? Math.min(1, runwayMonths / (pressureMonths * 1.05))
        : Math.min(1, runwayMonths / 48);

  const totalUnlocked = summary.totalUnlockedLiquidity ?? 0;
  const unlockingSurplus = summary.totalUnlockingCapitalSurplus ?? 0;

  const funding = {
    capitalCover: deficitMonthly <= 0 ? "yes" : triFromScore(capitalCoverScore),
    investmentIncomeCover: deficitMonthly <= 0 ? (investmentIncome > 0 ? "yes" : "partially") : triFromScore(invCoverScore),
    shortestLoanYears: minY,
    longestLoanYears: maxY,
    totalUnlocked,
  };

  const incomeGrowthHint: OptimisationDecisionView["capitalOutcome"]["incomeGrowthHint"] =
    unlockingSurplus > 0 || (totalUnlocked > 0 && investmentIncome > 0)
      ? "likely_supportive"
      : totalUnlocked > 0
        ? "uncertain"
        : "unlikely_supportive";

  let quality: OptimisationQuality;
  if (Math.abs(positionRaw) < 1e-6) {
    quality = { kind: "neutral", label: "BALANCED" };
  } else if (isDeficit) {
    const label = classifyDeficit({
      status: summary.sustainabilityStatus,
      runwayMonths,
      pressureMonths,
      totalUnlocked,
      unlockingSurplus,
      coverage,
    });
    quality = { kind: "deficit", label };
  } else {
    const label = classifySurplus({
      totalUnlocked,
      unlockingSurplus,
      investmentIncome,
      recurringIncome,
      coverage,
    });
    quality = { kind: "surplus", label };
  }

  const staticCaveats =
    "A surplus does not always mean the structure is strong. A deficit does not always mean the structure is weak.";

  let interpretationTail = "";
  let nextSteps: string[] = [];

  if (quality.kind === "deficit") {
    if (quality.label === "GOOD_DEFICIT") {
      interpretationTail =
        "This deficit appears to be strategic. It creates short-term pressure, but may strengthen long-term capital and future income.";
      nextSteps = [
        "Confirm the deficit is fully supportable during the pressure period.",
        "Monitor the structure until the relevant loan period ends.",
        "Keep capital deployed toward long-term income generation.",
      ];
    } else if (quality.label === "BAD_DEFICIT") {
      interpretationTail =
        "This deficit appears to be weakening the plan. The pressure is not clearly justified by long-term benefit.";
      nextSteps = [
        "Reduce loan size where possible.",
        "Extend tenure where appropriate to ease monthly pressure.",
        "Reduce expenses if possible.",
        "Rebalance capital deployment toward clearer long-term payoff.",
        "Rework the structure to reduce unintended drawdown.",
      ];
    } else {
      interpretationTail =
        "This deficit may be manageable, but the margin is thin. It should be treated carefully and reviewed against available capital support.";
      nextSteps = [
        "Test smaller loan amounts.",
        "Test longer tenures.",
        "Build a stronger liquidity buffer.",
        "Review whether the payoff justifies the strain.",
      ];
    }
  } else if (quality.kind === "surplus") {
    if (quality.label === "PRODUCTIVE_SURPLUS") {
      interpretationTail = "This surplus is supportive and appears to strengthen the long-term structure.";
      nextSteps = [
        "Preserve discipline as conditions change.",
        "Consider directing surplus into long-term income-producing capital.",
      ];
    } else {
      interpretationTail =
        "This surplus is comfortable, but part of it may be underused if it is not building future income or capital strength.";
      nextSteps = [
        "Review whether surplus can be redeployed more effectively.",
        "Explore ways to improve long-term capital efficiency.",
      ];
    }
  } else {
    interpretationTail = "Inflows and outflows are closely matched on these inputs. Small changes could tilt the picture either way.";
    nextSteps = [
      "Re-check assumptions if income, expenses, or loans change.",
      "Keep monitoring coverage monthly.",
    ];
  }

  return {
    positionRaw,
    isDeficit,
    magnitude,
    formulaParts: {
      expenses,
      loanRepayments,
      recurringIncome,
      investmentIncome,
    },
    funding,
    capitalOutcome: {
      totalUnlocked,
      remainingAfterLoans: null,
      incomeGrowthHint,
    },
    quality,
    interpretationLead: staticCaveats,
    interpretationTail,
    nextSteps,
  };
}
