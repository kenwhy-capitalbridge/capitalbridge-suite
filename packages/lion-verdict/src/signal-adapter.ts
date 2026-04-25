import type { ModelKey, ModelSignalBand, ModelSignals } from "./arbitration";

export type NormalizedMetrics = {
  cashflow_coverage_ratio?: string | number | null;
  income_gap_monthly?: string | number | null;
  runway_months?: string | number | null;
  capital_gap?: string | number | null;
  resilience_score_0_100?: string | number | null;
  survival_probability_pct?: string | number | null;
  withdrawal_sustainability_ratio?: string | number | null;
  required_capital?: string | number | null;
};

const NEUTRAL_SIGNAL: ModelSignalBand = "ADEQUATE";

function parseMetric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;

  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function worstBand(bands: ModelSignalBand[]): ModelSignalBand {
  const order: ModelSignalBand[] = [
    "FAILED",
    "WEAK",
    "TIGHT",
    "ADEQUATE",
    "STRONG",
  ];

  return bands.reduce((worst, current) =>
    order.indexOf(current) < order.indexOf(worst) ? current : worst
  );
}

function bandCoverageRatio(value: number | null): ModelSignalBand {
  if (value === null) return "FAILED";
  if (value <= 0) return "FAILED";
  if (value < 0.8) return "WEAK";
  if (value < 1) return "TIGHT";
  if (value < 1.25) return "ADEQUATE";
  return "STRONG";
}

function bandIncomeGap(value: number | null): ModelSignalBand {
  if (value === null) return "FAILED";
  if (value < 0) return "WEAK";
  if (value === 0) return "TIGHT";
  return "ADEQUATE";
}

function bandRunwayMonths(value: number | null): ModelSignalBand {
  if (value === null) return "FAILED";
  if (value <= 0) return "FAILED";
  if (value < 3) return "WEAK";
  if (value < 6) return "TIGHT";
  if (value < 12) return "ADEQUATE";
  return "STRONG";
}

function bandCapitalGap(value: number | null): ModelSignalBand {
  if (value === null) return NEUTRAL_SIGNAL;
  if (value <= 0) return "ADEQUATE";
  return "WEAK";
}

function bandScore(value: number | null): ModelSignalBand {
  if (value === null) return "FAILED";
  if (value < 20) return "FAILED";
  if (value < 40) return "WEAK";
  if (value < 60) return "TIGHT";
  if (value < 80) return "ADEQUATE";
  return "STRONG";
}

function bandProbability(value: number | null): ModelSignalBand {
  if (value === null) return "FAILED";
  if (value < 40) return "FAILED";
  if (value < 60) return "WEAK";
  if (value < 75) return "TIGHT";
  if (value < 90) return "ADEQUATE";
  return "STRONG";
}

function bandWithdrawalRatio(value: number | null): ModelSignalBand {
  return bandCoverageRatio(value);
}

export function deriveSignalsFromMetrics(
  model_key: ModelKey,
  metrics: NormalizedMetrics | null | undefined
): ModelSignals {
  const cashflowCoverageRatio = parseMetric(metrics?.cashflow_coverage_ratio);
  const incomeGapMonthly = parseMetric(metrics?.income_gap_monthly);
  const runwayMonths = parseMetric(metrics?.runway_months);
  const capitalGap = parseMetric(metrics?.capital_gap);
  const resilienceScore = parseMetric(metrics?.resilience_score_0_100);
  const survivalProbability = parseMetric(metrics?.survival_probability_pct);
  const withdrawalRatio = parseMetric(metrics?.withdrawal_sustainability_ratio);

  switch (model_key) {
    case "income_engineering": {
      const coverage = worstBand([
        bandCoverageRatio(cashflowCoverageRatio),
        bandIncomeGap(incomeGapMonthly),
      ]);

      return {
        coverage,
        buffer: coverage === "FAILED" || coverage === "WEAK" ? coverage : NEUTRAL_SIGNAL,
        resilience: NEUTRAL_SIGNAL,
      };
    }

    case "capital_health":
      return {
        coverage: bandWithdrawalRatio(withdrawalRatio),
        buffer: bandRunwayMonths(runwayMonths),
        resilience: worstBand([
          bandWithdrawalRatio(withdrawalRatio),
          bandRunwayMonths(runwayMonths),
        ]),
      };

    case "capital_stress": {
      const resilience = worstBand([
        bandScore(resilienceScore),
        bandProbability(survivalProbability),
      ]);

      return {
        coverage: NEUTRAL_SIGNAL,
        buffer: survivalProbability === null ? NEUTRAL_SIGNAL : bandProbability(survivalProbability),
        resilience,
      };
    }

    case "forever_income":
      return {
        coverage: bandCapitalGap(capitalGap),
        buffer: bandRunwayMonths(runwayMonths),
        resilience: bandRunwayMonths(runwayMonths),
      };
  }
}
