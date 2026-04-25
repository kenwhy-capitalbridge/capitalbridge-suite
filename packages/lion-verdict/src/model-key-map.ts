import type { ModelKey } from "./arbitration";

const EXTERNAL_MODEL_KEY_MAP: Record<string, ModelKey> = {
  forever_income: "forever_income",
  "forever-income": "forever_income",
  "forever-income-model": "forever_income",
  foreverincomemodel: "forever_income",

  income_engineering: "income_engineering",
  "income-engineering": "income_engineering",
  "income-engineering-model": "income_engineering",
  incomeengineeringmodel: "income_engineering",

  capital_health: "capital_health",
  "capital-health": "capital_health",
  "capital-health-model": "capital_health",
  capitalhealthmodel: "capital_health",

  capital_stress: "capital_stress",
  "capital-stress": "capital_stress",
  "capital-stress-model": "capital_stress",
  capitalstressmodel: "capital_stress",
};

export function mapExternalModelKey(input: string): ModelKey {
  const normalized = input.trim().toLowerCase();
  const mapped = EXTERNAL_MODEL_KEY_MAP[normalized];

  if (!mapped) {
    throw new Error(`Unknown Lion model_key: ${input}`);
  }

  return mapped;
}
