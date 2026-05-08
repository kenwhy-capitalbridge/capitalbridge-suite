import type { FlowStep } from "./ModuleFlowNav";
import type { ExecutionGateLevel, LionVerdictResponse, ModelKey } from "./lionVerdictTypes";

export class VerdictFetchError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const fetchLionVerdict = async (url: string): Promise<LionVerdictResponse> => {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new VerdictFetchError(response.status, "session_expired");
    }
    throw new VerdictFetchError(response.status, "verdict_unavailable");
  }
  return response.json() as Promise<LionVerdictResponse>;
};

export const ALL_REQUIRED_MODEL_KEYS: ModelKey[] = [
  "income-engineering-model",
  "capital-health-model",
  "capital-stress-model",
  "forever-income-model",
];

export function isStagingCapitalBridgeBrowserHost(): boolean {
  return typeof window !== "undefined" && window.location.hostname === "staging.thecapitalbridge.com";
}

export function moduleHref(
  envValue: string | undefined,
  productionFallback: string,
  stagingFallback?: string,
): string | null {
  const resolved = envValue?.trim();
  if (resolved) return resolved;
  if (isStagingCapitalBridgeBrowserHost()) return stagingFallback ?? null;
  return productionFallback;
}

export function completionStateLabel(level: ExecutionGateLevel, completed: number, total: number): string {
  if (level === "BLOCKED") return "Blocked";
  if (completed >= total && total > 0) return "Complete";
  if (level === "RESTRICTED") return "Partial";
  return "Pending";
}

export function buildAdvisoryFlowSteps(activeStepKey: ModelKey | "strategic"): FlowStep[] {
  return [
    {
      label: "Forever Income",
      key: "forever-income-model",
      href: moduleHref(
        process.env.NEXT_PUBLIC_FOREVER_APP_URL,
        "https://forever.thecapitalbridge.com/dashboard",
        "https://staging-foreverincome.thecapitalbridge.com/dashboard",
      ),
      active: activeStepKey === "forever-income-model",
    },
    {
      label: "Income Engineering",
      key: "income-engineering-model",
      href: moduleHref(
        process.env.NEXT_PUBLIC_INCOME_ENGINEERING_APP_URL,
        "https://incomeengineering.thecapitalbridge.com/dashboard",
        "https://staging-incomeengineering.thecapitalbridge.com/dashboard",
      ),
      active: activeStepKey === "income-engineering-model",
    },
    {
      label: "Capital Health",
      key: "capital-health-model",
      href: moduleHref(
        process.env.NEXT_PUBLIC_CAPITAL_HEALTH_APP_URL,
        "https://capitalhealth.thecapitalbridge.com/dashboard",
        "https://staging-capitalhealth.thecapitalbridge.com/dashboard",
      ),
      active: activeStepKey === "capital-health-model",
    },
    {
      label: "Capital Stress",
      key: "capital-stress-model",
      href: moduleHref(
        process.env.NEXT_PUBLIC_CAPITAL_STRESS_APP_URL,
        "https://capitalstress.thecapitalbridge.com/dashboard",
        "https://staging-capitalstress.thecapitalbridge.com/dashboard",
      ),
      active: activeStepKey === "capital-stress-model",
    },
    {
      label: "Strategic Execution",
      key: "strategic",
      href: "/solutions/strategic-execution",
      active: activeStepKey === "strategic",
    },
  ];
}
