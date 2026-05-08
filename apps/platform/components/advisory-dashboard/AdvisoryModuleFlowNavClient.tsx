"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { ModuleFlowNav } from "./ModuleFlowNav";
import {
  ALL_REQUIRED_MODEL_KEYS,
  VerdictFetchError,
  buildAdvisoryFlowSteps,
  completionStateLabel,
  fetchLionVerdict,
} from "./lionVerdictClient";
import type { ExecutionGateLevel, LionVerdictResponse, ModelKey } from "./lionVerdictTypes";

type ActiveKey = ModelKey | "strategic";

type Props = {
  activeStepKey: ActiveKey;
  className?: string;
};

export function AdvisoryModuleFlowNavClient({ activeStepKey, className }: Props) {
  const { data, error, isLoading } = useSWR<LionVerdictResponse>("/api/lion/verdict", fetchLionVerdict, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
  });

  const steps = useMemo(() => buildAdvisoryFlowSteps(activeStepKey), [activeStepKey]);

  const missing = useMemo(() => {
    if (!data) return new Set<string>(ALL_REQUIRED_MODEL_KEYS);
    return new Set(data.missing_models.map((m) => String(m.model_key)));
  }, [data]);

  const executionLevel: ExecutionGateLevel = data?.execution_gate.level ?? "BLOCKED";
  const completed = data?.progress.completed_models ?? 0;
  const total = data?.progress.total_models ?? 4;
  const allModulesComplete = Boolean(
    data && data.execution_gate.level === "ALLOWED" && data.missing_models.length === 0,
  );

  const sessionBlocked = error instanceof VerdictFetchError && (error.status === 401 || error.status === 403);

  if (sessionBlocked) {
    return null;
  }

  return (
    <ModuleFlowNav
      className={className}
      steps={steps}
      missing={missing}
      completionState={
        isLoading ? "Syncing…" : data ? completionStateLabel(executionLevel, completed, total) : "Unable to verify"
      }
      allModulesComplete={allModulesComplete}
    />
  );
}
