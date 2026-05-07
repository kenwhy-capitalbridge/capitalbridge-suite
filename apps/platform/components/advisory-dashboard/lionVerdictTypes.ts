export type SignalBand = "STRONG" | "ADEQUATE" | "TIGHT" | "WEAK" | "FAILED";
export type ExecutionGateLevel = "BLOCKED" | "RESTRICTED" | "ALLOWED";

export type ModelKey =
  | "income-engineering-model"
  | "capital-health-model"
  | "capital-stress-model"
  | "forever-income-model";

export type VerdictAction = {
  action_code: string;
  label: string;
  priority: number;
  deep_link?: string;
};

export type MetricsSnapshot = {
  income_engineering: {
    monthly_net_cashflow: number | null;
    cashflow_coverage_ratio: number | null;
  } | null;
  forever_income: {
    runway_months: number | null;
    required_capital: number | null;
  } | null;
  capital_health: {
    runway_months: number | null;
    withdrawal_sustainability_ratio: number | null;
  } | null;
  capital_stress: {
    survival_probability_pct: number | null;
    resilience_score_0_100: number | null;
  } | null;
  capital_gap: number | null;
};

export type LionVerdictResponse = {
  lion_status?: string;
  agreement_level: "HIGH" | "MEDIUM" | "LOW";
  signal_summary: {
    coverage: SignalBand;
    buffer: SignalBand;
    resilience: SignalBand;
  };
  missing_models: Array<{ model_key: ModelKey | string; criticality: "HIGH" | "MEDIUM" }>;
  execution_gate: { level: ExecutionGateLevel };
  progress: { completed_models: number; total_models: number };
  metrics_snapshot?: MetricsSnapshot;
  narrative: {
    headline: string;
    what_is_happening: string;
    what_will_happen: string;
    what_must_be_done: string;
  };
  actions: VerdictAction[];
};
