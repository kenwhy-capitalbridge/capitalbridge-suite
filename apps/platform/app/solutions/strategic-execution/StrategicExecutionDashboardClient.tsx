"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { Activity, ClipboardList, ListChecks, ShieldCheck, Target } from "lucide-react";
import useSWR from "swr";
import {
  AdvisoryDashboardShell,
  AdvisoryModuleFlowNavClient,
  CompletionReadinessPanel,
  DashboardFooter,
  DecisionIntegrityPanel,
  MetricCard,
  PathwayPanel,
  PrimaryIncomeChartPanel,
  RequiredActionsPanel,
  SignalCardsPanel,
  StrategicCurrentPositionPanel,
  ALL_REQUIRED_MODEL_KEYS,
  CB,
  VerdictFetchError,
  buildAdvisoryFlowSteps,
  fetchLionVerdict,
  fontSans,
  type ExecutionGateLevel,
  type LionVerdictResponse,
} from "@/components/advisory-dashboard";
import gridStyles from "@/components/advisory-dashboard/dashboardGrid.module.css";

function readinessLabel(level: ExecutionGateLevel): "Blocked" | "Partial" | "Ready" {
  if (level === "BLOCKED") return "Blocked";
  if (level === "RESTRICTED") return "Partial";
  return "Ready";
}

function formatRm(amount: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: Math.abs(amount) >= 100 && amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function StrategicExecutionDashboardClient() {
  const { data, error, isLoading } = useSWR<LionVerdictResponse>("/api/lion/verdict", fetchLionVerdict, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
  });

  const isSessionError = error instanceof VerdictFetchError && (error.status === 401 || error.status === 403);

  const moduleLinks = useMemo(() => buildAdvisoryFlowSteps("strategic"), []);

  const missing = useMemo(() => {
    if (!data) return new Set<string>(ALL_REQUIRED_MODEL_KEYS);
    return new Set(data.missing_models.map((m) => String(m.model_key)));
  }, [data]);

  const executionLevel: ExecutionGateLevel = data?.execution_gate.level ?? "BLOCKED";
  const total = data?.progress.total_models ?? 4;
  const completed = data
    ? typeof data.progress?.completed_models === "number"
      ? data.progress.completed_models
      : Math.max(0, total - data.missing_models.length)
    : 0;
  const allModulesComplete = Boolean(
    data && data.execution_gate.level === "ALLOWED" && data.missing_models.length === 0,
  );
  const dashboardReady = allModulesComplete;
  const snap = data?.metrics_snapshot;
  const sustainableMonthly = snap?.income_engineering?.monthly_net_cashflow ?? null;
  const capitalGapRaw = snap?.capital_gap ?? null;

  /** No time-series projection in verdict API yet — never fabricate chart paths. */
  const hasProjectionData = false;

  const desiredIncomeCanonical: number | null = null;

  const gapDisplay = (() => {
    if (desiredIncomeCanonical !== null && sustainableMonthly !== null) {
      const gap = desiredIncomeCanonical - sustainableMonthly;
      return gap <= 0 ? formatRm(0) : formatRm(gap);
    }
    if (capitalGapRaw !== null) {
      return capitalGapRaw <= 0 ? formatRm(0) : formatRm(capitalGapRaw);
    }
    return "Pending";
  })();

  const gapHelper = (() => {
    if (desiredIncomeCanonical !== null && sustainableMonthly !== null) {
      return "Derived from verified desired income and sustainable income";
    }
    if (capitalGapRaw !== null) {
      return "From latest completed model outputs";
    }
    return "Available after assessment";
  })();

  const gapVerified =
    (desiredIncomeCanonical !== null && sustainableMonthly !== null) || capitalGapRaw !== null;

  const desiredIncomeValue = desiredIncomeCanonical !== null ? `${formatRm(desiredIncomeCanonical)} /mo` : "Not set";
  const desiredIncomeHelper = desiredIncomeCanonical !== null
    ? "Target confirmed"
    : dashboardReady
      ? "No desired income target recorded yet"
      : "Awaiting verified inputs";

  const sustainableIncomeHelper = sustainableMonthly !== null
    ? "Supported & sustainable"
    : dashboardReady
      ? "Verified completion, but no IE income metric was returned"
      : "Pending model completion";

  const capitalGapHelper = gapVerified
    ? gapHelper
    : dashboardReady
      ? "Verified completion, but no capital gap metric was returned"
      : "Available after assessment";

  return (
    <>
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          backgroundColor: CB.green,
          color: CB.white,
          position: "relative",
        }}
      >
        <AdvisoryDashboardShell
          eyebrow="CAPITAL ALLOCATION COMMAND CENTER"
          title="Strategic Execution"
          subtitle="Translate your capital position into clear priorities, execution readiness, and next-step pathways."
          statusComplete={dashboardReady}
          statusLineIncomplete="Complete the required models to unlock execution pathways and decision clarity."
          statusLineComplete="Your system is execution ready. All required models are completed and verified."
        >
          <div className={gridStyles.dashboardBody}>
            <AdvisoryModuleFlowNavClient activeStepKey="strategic" />

            {isLoading ? (
              <p style={{ ...loadingText, fontFamily: fontSans }}>Loading your strategic execution dashboard…</p>
            ) : null}

            {isSessionError ? (
              <section style={notice}>
                <h2 style={noticeTitle}>Session expired</h2>
                <p style={noticeBody}>Your session has expired. Please sign in again to continue.</p>
                <a href="/login" style={noticeCta}>
                  Sign in again
                </a>
              </section>
            ) : null}

            {!isLoading && !isSessionError && (error || !data) ? (
              <section style={notice}>
                <h2 style={noticeTitle}>Unable to verify completion</h2>
                <p style={noticeBody}>
                  We could not verify your module completion state right now. Please refresh or try again shortly.
                </p>
              </section>
            ) : null}

            {data ? (
              <>
                <section className={gridStyles.kpiRow}>
                  <MetricCard
                    icon={<Target size={18} />}
                    label="Desired Income"
                    value={desiredIncomeValue}
                    helper={desiredIncomeHelper}
                    verified={desiredIncomeCanonical !== null}
                  />
                  <MetricCard
                    icon={<Activity size={18} />}
                    label="Current Sustainable Income"
                    value={sustainableMonthly !== null ? `${formatRm(sustainableMonthly)} /mo` : "Pending"}
                    helper={sustainableIncomeHelper}
                    verified={sustainableMonthly !== null}
                  />
                  <MetricCard
                    icon={<ClipboardList size={18} />}
                    label="Capital Gap"
                    value={gapDisplay}
                    helper={capitalGapHelper}
                    verified={gapVerified}
                  />
                  <MetricCard
                    icon={<ShieldCheck size={18} />}
                    label="Execution Readiness"
                    value={readinessLabel(executionLevel)}
                    helper={
                      executionLevel === "BLOCKED"
                        ? "Complete required models to advance readiness"
                        : executionLevel === "RESTRICTED"
                          ? "Partial inputs — finish remaining models"
                          : "Execution ready"
                    }
                    verified={executionLevel === "ALLOWED"}
                  />
                  <MetricCard
                    icon={<ListChecks size={18} />}
                    label="Required Models Completed"
                    value={`${completed} of ${total}`}
                    helper={dashboardReady ? "All models completed" : "Complete all four capital models"}
                    verified={dashboardReady}
                  />
                </section>

                <div className={gridStyles.mainGrid}>
                  <div className={gridStyles.col}>
                    <PrimaryIncomeChartPanel hasProjectionData={hasProjectionData} />
                    <StrategicCurrentPositionPanel executionGate={executionLevel} missingCount={data.missing_models.length} />
                    <RequiredActionsPanel incomplete={!dashboardReady} moduleLinks={moduleLinks} />
                  </div>
                  <div className={gridStyles.col}>
                    <CompletionReadinessPanel missing={missing} />
                    <SignalCardsPanel
                      incomplete={!dashboardReady}
                      coverage={data.signal_summary.coverage}
                      buffer={data.signal_summary.buffer}
                      resilience={data.signal_summary.resilience}
                    />
                    <PathwayPanel
                      incomplete={!dashboardReady}
                      bodyWhenReady="Proceed to review your recommended pathway and validate next implementation steps."
                    />
                    <DecisionIntegrityPanel incomplete={!dashboardReady} agreement={data.agreement_level} />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </AdvisoryDashboardShell>
      </main>
      <DashboardFooter />
    </>
  );
}

const loadingText: CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "rgba(246,245,241,0.85)",
};

const notice: CSSProperties = {
  border: CB.cardBorder,
  borderRadius: CB.radiusLg,
  background: CB.cardBg,
  padding: "20px 22px",
  fontFamily: fontSans,
};

const noticeTitle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 18,
  fontWeight: 700,
  color: CB.gold,
};

const noticeBody: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
  color: CB.white,
};

const noticeCta: CSSProperties = {
  display: "inline-block",
  marginTop: 14,
  color: CB.gold,
  textDecoration: "none",
  border: `1px solid ${CB.gold}`,
  borderRadius: 10,
  padding: "8px 14px",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.06em",
};
