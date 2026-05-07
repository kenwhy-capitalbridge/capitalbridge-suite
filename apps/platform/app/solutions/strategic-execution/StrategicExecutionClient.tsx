"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import useSWR from "swr";

type SignalBand = "STRONG" | "ADEQUATE" | "TIGHT" | "WEAK" | "FAILED";
type LionStatus = "STRONG" | "STABLE" | "FRAGILE" | "AT_RISK" | "NOT_SUSTAINABLE";
type ExecutionGateLevel = "BLOCKED" | "RESTRICTED" | "ALLOWED";
type ModelKey =
  | "income-engineering-model"
  | "capital-health-model"
  | "capital-stress-model"
  | "forever-income-model";

type MetricsSnapshot = {
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

type LionVerdictResponse = {
  lion_status: LionStatus;
  agreement_level: "HIGH" | "MEDIUM" | "LOW";
  signal_summary: {
    coverage: SignalBand;
    buffer: SignalBand;
    resilience: SignalBand;
  };
  reason: string[];
  missing_models: Array<{
    model_key: ModelKey | string;
    criticality: "HIGH" | "MEDIUM";
  }>;
  execution_gate: {
    level: ExecutionGateLevel;
    reason: "MISSING_CRITICAL_MODELS" | "MISSING_NON_CRITICAL_MODELS" | "VALID";
  };
  progress: {
    completed_models: number;
    total_models: number;
  };
  metrics_snapshot?: MetricsSnapshot;
  narrative: {
    headline: string;
    what_is_happening: string;
    what_will_happen: string;
    what_must_be_done: string;
  };
  actions: Array<{
    action_code: string;
    label: string;
    priority: 1 | 2 | 3;
    deep_link?: string;
  }>;
};

class VerdictFetchError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const fetcher = async (url: string): Promise<LionVerdictResponse> => {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new VerdictFetchError(response.status, "session_expired");
    }
    throw new VerdictFetchError(response.status, "verdict_unavailable");
  }
  return response.json() as Promise<LionVerdictResponse>;
};

const transition = { duration: 0.32, ease: "easeInOut" as const };
const motionState = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 12 },
};

const MODULES: Array<{
  key: ModelKey;
  label: string;
  shortLabel: string;
  priority: "HIGH" | "MEDIUM";
  actionTitle: string;
  reason: string;
  cta: string;
  envHref?: string;
  fallbackHref?: string;
}> = [
  {
    key: "income-engineering-model",
    label: "Income Engineering",
    shortLabel: "Income",
    priority: "HIGH",
    actionTitle: "Complete Income Engineering",
    reason: "Establish whether your desired income target can be structurally supported.",
    cta: "Open Income Engineering",
    envHref: moduleDashboardUrl(process.env.NEXT_PUBLIC_INCOME_ENGINEERING_APP_URL),
    fallbackHref: moduleDashboardUrl(undefined, "https://incomeengineering.thecapitalbridge.com"),
  },
  {
    key: "capital-health-model",
    label: "Capital Health",
    shortLabel: "Health",
    priority: "HIGH",
    actionTitle: "Complete Capital Health",
    reason: "Assess whether your capital sources, obligations, and structure can support long-term execution.",
    cta: "Open Capital Health",
    envHref: moduleDashboardUrl(process.env.NEXT_PUBLIC_CAPITAL_HEALTH_APP_URL),
    fallbackHref: moduleDashboardUrl(undefined, "https://capitalhealth.thecapitalbridge.com"),
  },
  {
    key: "capital-stress-model",
    label: "Capital Stress",
    shortLabel: "Stress",
    priority: "MEDIUM",
    actionTitle: "Complete Capital Stress",
    reason: "Test whether the capital structure can withstand volatility, shocks, or unexpected changes.",
    cta: "Open Capital Stress",
    envHref: moduleDashboardUrl(process.env.NEXT_PUBLIC_CAPITAL_STRESS_APP_URL),
    fallbackHref: moduleDashboardUrl(undefined, "https://capitalstress.thecapitalbridge.com"),
  },
  {
    key: "forever-income-model",
    label: "Forever Income",
    shortLabel: "Forever",
    priority: "MEDIUM",
    actionTitle: "Complete Forever Income",
    reason: "Validate whether the income plan can be sustained over time.",
    cta: "Open Forever Income",
    envHref: moduleDashboardUrl(process.env.NEXT_PUBLIC_FOREVER_APP_URL),
    fallbackHref: moduleDashboardUrl(undefined, "https://forever.thecapitalbridge.com"),
  },
];

function moduleDashboardUrl(value: string | undefined, fallback?: string): string | undefined {
  const raw = value?.trim() || fallback;
  if (!raw) return undefined;
  const base = raw.replace(/\/+$/, "");
  return `${base}/dashboard`;
}

function isStagingBrowserHost(): boolean {
  return typeof window !== "undefined" && window.location.hostname === "staging.thecapitalbridge.com";
}

function resolveModuleHref(module: (typeof MODULES)[number]): string | null {
  if (module.envHref) return module.envHref;
  if (isStagingBrowserHost()) return null;
  return module.fallbackHref || null;
}

export function StrategicExecutionClient() {
  const pathwayRef = useRef<HTMLElement | null>(null);
  const { data, error, mutate, isLoading } = useSWR("/api/lion/verdict", fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
  });

  useEffect(() => {
    const refresh = () => {
      void mutate();
    };

    window.addEventListener("capital_updated", refresh);
    return () => window.removeEventListener("capital_updated", refresh);
  }, [mutate]);

  const isSessionError =
    error instanceof VerdictFetchError && (error.status === 401 || error.status === 403);

  return (
    <main style={pageStyle}>
      <div style={pageShellStyle}>
        <HeroSection verdict={data} pathwayRef={pathwayRef} />

        {isLoading ? (
          <ShellCard>Loading your capital execution cockpit...</ShellCard>
        ) : isSessionError ? (
          <SessionExpiredCard />
        ) : error || !data ? (
          <ShellCard>The current Lion verdict could not be loaded. Please refresh or try again shortly.</ShellCard>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key="strategic-execution-loaded" {...motionState} transition={transition} style={contentGridStyle}>
              <ExecutiveSummaryStrip verdict={data} />
              <StrategicInsightCharts verdict={data} metrics={data.metrics_snapshot} />
              <CurrentPositionCard verdict={data} />
              <RequiredActionsCard verdict={data} />
              <ExecutionPathwaysCard verdict={data} refEl={pathwayRef} />
              <DecisionIntegrityCard verdict={data} />
              <FooterNote />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}

function HeroSection({
  verdict,
  pathwayRef,
}: {
  verdict?: LionVerdictResponse;
  pathwayRef: React.MutableRefObject<HTMLElement | null>;
}) {
  const nextAction = verdict ? nextActionForVerdict(verdict, pathwayRef) : null;

  return (
    <section style={heroStyle}>
      <div style={heroGlowStyle} />
      <p style={eyebrowStyle}>Capital allocation command center</p>
      <h1 style={heroTitleStyle}>Strategic Execution</h1>
      <p style={heroSubtitleStyle}>
        Translate your capital position into clear priorities, execution readiness, and next-step pathways.
      </p>
      <p style={heroSupportStyle}>
        This layer turns verified model outputs into structured action — showing what is complete, what is missing, and
        what must happen next to reach a sustainable capital position.
      </p>
      <button
        type="button"
        style={primaryCtaStyle(Boolean(nextAction?.enabled))}
        disabled={!nextAction?.enabled}
        onClick={() => nextAction?.run()}
      >
        {nextAction?.label ?? "Loading execution priorities"}
      </button>
    </section>
  );
}

function formatRm(amount: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: Math.abs(amount) >= 100 && amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function coveragePctLabel(ratio: number): string {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 1000) / 10;
  return `${pct}%`;
}

function ExecutiveSummaryStrip({ verdict }: { verdict: LionVerdictResponse }) {
  const completed = verdict.progress.completed_models;
  const total = verdict.progress.total_models;
  const readiness = readinessLabel(verdict.execution_gate.level);
  const snap = verdict.metrics_snapshot;
  const ie = snap?.income_engineering;
  const netCf = ie?.monthly_net_cashflow ?? null;
  const covRatio = ie?.cashflow_coverage_ratio ?? null;
  const capGap = snap?.capital_gap ?? null;

  const cards = [
    {
      label: "Monthly net cashflow",
      value: netCf !== null ? formatRm(netCf) : "—",
      note:
        netCf !== null
          ? "From your latest completed Income Engineering snapshot."
          : "Complete Income Engineering to surface verified net cashflow.",
    },
    {
      label: "Expense coverage (floor)",
      value: covRatio !== null ? coveragePctLabel(covRatio) : "—",
      note:
        covRatio !== null
          ? "Weaker of median vs worst-month coverage from IE metrics."
          : "Coverage floor appears after a completed Income Engineering run.",
    },
    {
      label: "Capital gap",
      value: capGap !== null ? formatRm(capGap) : "—",
      note:
        capGap !== null
          ? "From the first completed model reporting `capital_gap` in this snapshot."
          : "No capital gap metric recorded in completed outputs yet.",
    },
    {
      label: "Execution Readiness",
      value: readiness,
      note: readinessNote(verdict.execution_gate.level),
    },
    {
      label: "Required Models Completed",
      value: `${completed} of ${total}`,
      note: completionLabel(completed, total),
      progress: total > 0 ? completed / total : 0,
    },
  ];

  return (
    <section style={summaryStripStyle} aria-label="Executive summary">
      {cards.map((card) => (
        <div key={card.label} style={summaryCardStyle}>
          <p style={summaryLabelStyle}>{card.label}</p>
          <strong style={summaryValueStyle}>{card.value}</strong>
          {typeof card.progress === "number" ? (
            <div style={miniTrackStyle}>
              <motion.div
                style={miniFillStyle}
                animate={{ width: `${Math.max(0, Math.min(100, card.progress * 100))}%` }}
                transition={transition}
              />
            </div>
          ) : null}
          <p style={summaryNoteStyle}>{card.note}</p>
        </div>
      ))}
    </section>
  );
}

function StrategicInsightCharts({
  verdict,
  metrics,
}: {
  verdict: LionVerdictResponse;
  metrics: MetricsSnapshot | undefined;
}) {
  return (
    <section style={sectionGridStyle}>
      <ModelMetricSnapshotCard metrics={metrics} />
      <ReadinessTracker verdict={verdict} />
      <SignalSnapshot verdict={verdict} />
    </section>
  );
}

function ModelMetricSnapshotCard({ metrics }: { metrics: MetricsSnapshot | undefined }) {
  const ie = metrics?.income_engineering;
  const fi = metrics?.forever_income;
  const ch = metrics?.capital_health;
  const cs = metrics?.capital_stress;
  const hasIe =
    !!ie && (ie.monthly_net_cashflow !== null || ie.cashflow_coverage_ratio !== null);
  const hasAux =
    (fi && (fi.runway_months !== null || fi.required_capital !== null)) ||
    (ch && (ch.runway_months !== null || ch.withdrawal_sustainability_ratio !== null)) ||
    (cs && (cs.survival_probability_pct !== null || cs.resilience_score_0_100 !== null));

  return (
    <section style={premiumCardStyle}>
      <SectionKicker>Strategic insight</SectionKicker>
      <h2 style={sectionTitleStyle}>Live model metrics</h2>
      {hasIe || hasAux ? (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {hasIe && ie ? (
            <div style={snapshotBlockStyle}>
              <p style={snapshotKickerStyle}>Income Engineering</p>
              {ie.monthly_net_cashflow !== null ? (
                <p style={bodyStyle}>
                  Monthly net cashflow: <strong>{formatRm(ie.monthly_net_cashflow)}</strong>
                </p>
              ) : null}
              {ie.cashflow_coverage_ratio !== null ? (
                <p style={bodyStyle}>
                  Coverage floor: <strong>{coveragePctLabel(ie.cashflow_coverage_ratio)}</strong>
                </p>
              ) : null}
            </div>
          ) : null}
          {fi && (fi.runway_months !== null || fi.required_capital !== null) ? (
            <div style={snapshotBlockStyle}>
              <p style={snapshotKickerStyle}>Forever Income</p>
              {fi.required_capital !== null ? (
                <p style={bodyStyle}>
                  Required capital: <strong>{formatRm(fi.required_capital)}</strong>
                </p>
              ) : null}
              {fi.runway_months !== null ? (
                <p style={bodyStyle}>
                  Runway: <strong>{fi.runway_months} mo</strong>
                </p>
              ) : null}
            </div>
          ) : null}
          {ch && (ch.runway_months !== null || ch.withdrawal_sustainability_ratio !== null) ? (
            <div style={snapshotBlockStyle}>
              <p style={snapshotKickerStyle}>Capital Health</p>
              {ch.withdrawal_sustainability_ratio !== null ? (
                <p style={bodyStyle}>
                  Withdrawal sustainability: <strong>{coveragePctLabel(ch.withdrawal_sustainability_ratio)}</strong>
                </p>
              ) : null}
              {ch.runway_months !== null ? (
                <p style={bodyStyle}>
                  Runway: <strong>{ch.runway_months} mo</strong>
                </p>
              ) : null}
            </div>
          ) : null}
          {cs && (cs.survival_probability_pct !== null || cs.resilience_score_0_100 !== null) ? (
            <div style={snapshotBlockStyle}>
              <p style={snapshotKickerStyle}>Capital Stress</p>
              {cs.survival_probability_pct !== null ? (
                <p style={bodyStyle}>
                  Survival probability: <strong>{Math.round(cs.survival_probability_pct * 10) / 10}%</strong>
                </p>
              ) : null}
              {cs.resilience_score_0_100 !== null ? (
                <p style={bodyStyle}>
                  Resilience score: <strong>{Math.round(cs.resilience_score_0_100 * 10) / 10} / 100</strong>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div style={{ ...pendingChartStyle, marginTop: 16, minHeight: 120, display: "grid", placeItems: "center" }}>
          <p style={{ ...bodyStyle, textAlign: "center", margin: 0 }}>
            Awaiting verified outputs — this panel only shows numbers from your latest completed model snapshots (no
            decorative projections).
          </p>
        </div>
      )}
      <p style={{ ...bodyStyle, marginTop: 14, fontSize: "0.82rem" }}>
        Time-series income charts will render when the platform stores longitudinal projections for your account.
      </p>
    </section>
  );
}

const snapshotBlockStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(255,204,106,0.2)",
  background: "rgba(0,0,0,0.12)",
  padding: "0.75rem 0.9rem",
};

const snapshotKickerStyle: React.CSSProperties = {
  margin: "0 0 0.35rem",
  fontSize: "0.68rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#FFCC6A",
  fontWeight: 900,
};

function ReadinessTracker({ verdict }: { verdict: LionVerdictResponse }) {
  const missing = new Set(verdict.missing_models.map((model) => model.model_key));

  return (
    <section style={premiumCardStyle}>
      <SectionKicker>Execution readiness</SectionKicker>
      <h2 style={sectionTitleStyle}>Model Completion</h2>
      <div style={trackerStyle}>
        {MODULES.map((module, index) => {
          const status = missing.has(module.key) ? "Missing" : "Completed";
          const complete = status === "Completed";
          return (
            <div key={module.key} style={trackerItemStyle}>
              <div style={trackerDotStyle(complete)}>{index + 1}</div>
              <div style={{ minWidth: 0 }}>
                <p style={trackerTitleStyle}>{module.label}</p>
                <p style={trackerMetaStyle}>{complete ? "Verified output available" : `${module.priority} priority · ${status}`}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SignalSnapshot({ verdict }: { verdict: LionVerdictResponse }) {
  const incomplete = isAssessmentIncomplete(verdict);
  const signals = [
    { label: "Coverage", value: incomplete ? "Pending" : signalLabel(verdict.signal_summary.coverage) },
    { label: "Buffer", value: incomplete ? "Pending" : signalLabel(verdict.signal_summary.buffer) },
    { label: "Resilience", value: incomplete ? "Pending" : signalLabel(verdict.signal_summary.resilience) },
  ];

  return (
    <section style={premiumCardStyle}>
      <SectionKicker>Decision quality</SectionKicker>
      <h2 style={sectionTitleStyle}>Coverage / Buffer / Resilience</h2>
      <div style={signalGridStyle}>
        {signals.map((signal) => (
          <div key={signal.label} style={signalCardStyle}>
            <p style={summaryLabelStyle}>{signal.label}</p>
            <strong style={signalValueStyle(signal.value)}>{signal.value}</strong>
          </div>
        ))}
      </div>
      {incomplete ? (
        <p style={bodyStyle}>Signal strength appears once the required models are completed.</p>
      ) : null}
    </section>
  );
}

function CurrentPositionCard({ verdict }: { verdict: LionVerdictResponse }) {
  const position = currentPositionCopy(verdict);
  return (
    <motion.section {...motionState} transition={transition} style={premiumCardStyle}>
      <div style={rowBetweenStyle}>
        <div>
          <SectionKicker>Current position</SectionKicker>
          <h2 style={statusTitleStyle}>{position.title}</h2>
        </div>
        <ExecutionGateBadge level={verdict.execution_gate.level} />
      </div>
      <p style={supportingLineStyle}>{position.supporting}</p>
      <div style={narrativeGridStyle}>
        <NarrativeBlock title="What is happening" body={position.happening} />
        <NarrativeBlock title="What must be done" body={position.mustDo} strong />
      </div>
    </motion.section>
  );
}

function RequiredActionsCard({ verdict }: { verdict: LionVerdictResponse }) {
  const actions = requiredActionsForVerdict(verdict);
  return (
    <section style={premiumCardStyle}>
      <SectionKicker>Required actions</SectionKicker>
      <div style={rowBetweenStyle}>
        <h2 style={sectionTitleStyle}>Operational Priorities</h2>
        <span style={subtlePillStyle}>{actions.length ? `${actions.length} action${actions.length > 1 ? "s" : ""}` : "No required actions"}</span>
      </div>
      <div style={actionGridStyle}>
        {actions.length > 0 ? (
          actions.map((action, index) => (
            <ActionCard key={action.module.key} action={action} priority={index + 1} />
          ))
        ) : (
          <p style={bodyStyle}>No required actions are currently returned by the Lion verdict.</p>
        )}
      </div>
    </section>
  );
}

function ActionCard({
  action,
  priority,
}: {
  action: ReturnType<typeof requiredActionsForVerdict>[number];
  priority: number;
}) {
  const [pending, setPending] = useState(false);
  const href = resolveModuleHref(action.module);
  const canNavigate = Boolean(href);
  const open = () => {
    if (!canNavigate || !href) return;
    setPending(true);
    window.location.assign(href);
  };

  return (
    <button
      type="button"
      style={actionCardStyle(canNavigate)}
      disabled={!canNavigate || pending}
      onClick={open}
    >
      <span style={priorityBadgeStyle}>P{priority}</span>
      <span style={{ display: "grid", gap: 6 }}>
        <strong style={actionTitleStyle}>{action.module.actionTitle}</strong>
        <span style={actionReasonStyle}>{action.module.reason}</span>
        <span style={actionCtaStyle}>
          {pending ? "Opening..." : canNavigate ? action.module.cta : "Staging destination pending"}
        </span>
      </span>
    </button>
  );
}

function ExecutionPathwaysCard({
  verdict,
  refEl,
}: {
  verdict: LionVerdictResponse;
  refEl: React.MutableRefObject<HTMLElement | null>;
}) {
  const pathway =
    verdict.execution_gate.level === "BLOCKED"
      ? {
          title: "Execution Pathway Not Yet Available",
          body: "Execution pathways unlock once the required capital models are completed and the system has sufficient decision inputs.",
        }
      : verdict.execution_gate.level === "RESTRICTED"
        ? {
            title: "Execution Pathway Partially Available",
            body: verdict.narrative.what_will_happen,
          }
        : {
            title: "Execution Pathway Available",
            body: verdict.narrative.what_will_happen,
          };

  return (
    <section ref={(node) => { refEl.current = node; }} style={premiumCardStyle}>
      <SectionKicker>Execution pathway</SectionKicker>
      <h2 style={sectionTitleStyle}>{pathway.title}</h2>
      <p style={bodyStyle}>{pathway.body}</p>
    </section>
  );
}

function DecisionIntegrityCard({ verdict }: { verdict: LionVerdictResponse }) {
  const incomplete = isAssessmentIncomplete(verdict);
  const copy = incomplete
    ? {
        value: "Pending",
        body: "Confidence is calculated once the required model outputs are available.",
      }
    : agreementCopy(verdict.agreement_level);

  return (
    <section style={premiumCardStyle}>
      <SectionKicker>Decision integrity</SectionKicker>
      <h2 style={sectionTitleStyle}>{copy.value}</h2>
      <p style={bodyStyle}>{copy.body}</p>
    </section>
  );
}

function FooterNote() {
  return (
    <footer style={footerStyle}>
      Capital Bridge converts verified model outputs into advisory-grade execution priorities. Complete the missing
      models to unlock deeper pathway guidance.
    </footer>
  );
}

function SessionExpiredCard() {
  const router = useRouter();
  return (
    <section style={premiumCardStyle}>
      <h2 style={sectionTitleStyle}>Your session has expired. Please sign in again to continue.</h2>
      <button type="button" style={primaryCtaStyle(true)} onClick={() => router.push("/login")}>
        Sign in again
      </button>
    </section>
  );
}

function ExecutionGateBadge({ level }: { level: ExecutionGateLevel }) {
  const [open, setOpen] = useState(false);
  const blocked = level === "BLOCKED";

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        style={gateBadgeStyle(level)}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-describedby={blocked ? "blocked-tooltip" : undefined}
      >
        {readinessLabel(level)}
      </button>
      {blocked && open ? (
        <span id="blocked-tooltip" role="tooltip" style={tooltipStyle}>
          Execution is unavailable until required capital models are completed and the system has sufficient verified
          inputs.
        </span>
      ) : null}
    </span>
  );
}

function NarrativeBlock({ title, body, strong = false }: { title: string; body: string; strong?: boolean }) {
  return (
    <div style={narrativeBlockStyle}>
      <p style={cardLabelStyle}>{title}</p>
      <p style={{ ...bodyStyle, fontWeight: strong ? 800 : 500 }}>{body}</p>
    </div>
  );
}

function ShellCard({ children }: { children: React.ReactNode }) {
  return <section style={premiumCardStyle}>{children}</section>;
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return <p style={cardLabelStyle}>{children}</p>;
}

function currentPositionCopy(verdict: LionVerdictResponse) {
  if (isAssessmentIncomplete(verdict)) {
    return {
      title: "Assessment Incomplete",
      supporting: "The system cannot confirm execution readiness until the required capital models are completed.",
      happening: verdict.narrative.what_is_happening,
      mustDo: verdict.narrative.what_must_be_done,
    };
  }

  if (verdict.lion_status === "AT_RISK" || verdict.lion_status === "NOT_SUSTAINABLE" || verdict.lion_status === "FRAGILE") {
    return {
      title: "Capital Structure at Risk",
      supporting: "The current capital structure does not yet support the required income and resilience thresholds.",
      happening: verdict.narrative.what_is_happening,
      mustDo: verdict.narrative.what_must_be_done,
    };
  }

  return {
    title: "Execution Ready",
    supporting: "The capital structure has passed the required checks and execution pathways are available.",
    happening: verdict.narrative.what_is_happening,
    mustDo: verdict.narrative.what_must_be_done,
  };
}

function requiredActionsForVerdict(verdict: LionVerdictResponse) {
  const missing = new Set(verdict.missing_models.map((model) => model.model_key));
  const missingModules = MODULES.filter((module) => missing.has(module.key));
  if (missingModules.length > 0) {
    return missingModules.map((module) => ({ module }));
  }

  return verdict.actions.slice(0, 4).map((action, index) => ({
    module: {
      key: MODULES[index]?.key ?? "income-engineering-model",
      label: action.label,
      shortLabel: action.label,
      priority: "HIGH" as const,
      actionTitle: action.label,
      reason: lionActionReason(action.action_code),
      cta: "Open next step",
      envHref: action.deep_link ?? "/framework",
      fallbackHref: action.deep_link ?? "/framework",
    },
  }));
}

function lionActionReason(code: string): string {
  switch (code) {
    case "increase_income":
      return "Lift recurring or portfolio income to restore structural coverage.";
    case "reduce_obligations":
    case "reduce_obligation":
      return "Reduce fixed commitments so withdrawals stay within sustainable bands.";
    case "increase_liquidity_buffer":
      return "Add liquid reserves so shocks do not force disruptive sales.";
    case "extend_runway":
      return "Extend capital runway until income and obligations realign.";
    case "improve_resilience":
      return "Improve resilience so stress scenarios remain survivable.";
    case "define_income_streams":
      return "Document income streams so coverage can be verified.";
    case "define_obligations":
      return "Document obligations so gaps can be measured.";
    case "establish_capital_base":
      return "Define investable capital so sustainability can be tested.";
    case "define_withdrawal_strategy":
      return "Define withdrawals so sustainability ratios can be calculated.";
    case "complete_required_inputs":
      return "Finish required inputs so models can return verified outputs.";
    default:
      return "Follow this Lion verdict priority to advance execution readiness.";
  }
}

function nextActionForVerdict(
  verdict: LionVerdictResponse,
  pathwayRef: React.MutableRefObject<HTMLElement | null>,
) {
  const firstMissing = requiredActionsForVerdict(verdict)[0];
  if (firstMissing && verdict.execution_gate.level !== "ALLOWED") {
    const href = resolveModuleHref(firstMissing.module);
    const label =
      firstMissing.module.key === "income-engineering-model"
        ? "Start with Income Engineering"
        : `Continue to ${firstMissing.module.label}`;
    return {
      label: href ? label : `${firstMissing.module.label} destination pending`,
      enabled: Boolean(href),
      run: () => {
        if (href) window.location.assign(href);
      },
    };
  }

  return {
    label: "View Execution Pathway",
    enabled: true,
    run: () => pathwayRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
  };
}

function isAssessmentIncomplete(verdict: LionVerdictResponse): boolean {
  return verdict.execution_gate.level === "BLOCKED" || verdict.progress.completed_models < verdict.progress.total_models;
}

function readinessLabel(level: ExecutionGateLevel): string {
  if (level === "BLOCKED") return "Blocked";
  if (level === "RESTRICTED") return "Partial";
  return "Ready";
}

function readinessNote(level: ExecutionGateLevel): string {
  if (level === "BLOCKED") return "Required models are still incomplete";
  if (level === "RESTRICTED") return "Some execution guidance is available";
  return "Execution pathways are available";
}

function completionLabel(completed: number, total: number): string {
  if (completed <= 0) return "Pending model completion";
  if (completed < total) return "Awaiting remaining models";
  return "All required models completed";
}

function signalLabel(value: SignalBand): string {
  const lower = value.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function agreementCopy(level: LionVerdictResponse["agreement_level"]) {
  if (level === "HIGH") {
    return {
      value: "High Agreement",
      body: "The completed models are aligned, giving the system a stronger basis for execution guidance.",
    };
  }
  if (level === "MEDIUM") {
    return {
      value: "Medium Agreement",
      body: "The models show partial alignment. Review the underlying signals before proceeding.",
    };
  }
  return {
    value: "Low Agreement",
    body: "The models are not aligned. Execution should be reviewed before action is taken.",
  };
}

const pageStyle: React.CSSProperties = {
  flex: 1,
  width: "100%",
  color: "#F6F5F1",
  background:
    "radial-gradient(circle at 18% 8%, rgba(255,204,106,0.13), transparent 28%), linear-gradient(180deg, #0D3A1D 0%, #082713 48%, #061a0e 100%)",
};

const pageShellStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1240,
  margin: "0 auto",
  padding: "clamp(1.25rem, 3vw, 3rem) clamp(0.9rem, 2.5vw, 1.75rem) clamp(3rem, 5vw, 4.5rem)",
};

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 22,
};

const heroStyle: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 32,
  border: "1px solid rgba(255,204,106,0.24)",
  background: "linear-gradient(145deg, rgba(246,245,241,0.08), rgba(13,58,29,0.72))",
  boxShadow: "0 28px 90px rgba(0,0,0,0.28)",
  padding: "clamp(2rem, 6vw, 4.5rem)",
  marginBottom: 24,
};

const heroGlowStyle: React.CSSProperties = {
  position: "absolute",
  inset: "auto -18% -42% auto",
  width: 420,
  height: 420,
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(255,204,106,0.18), transparent 68%)",
  pointerEvents: "none",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.72rem",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#FFCC6A",
  fontWeight: 900,
};

const heroTitleStyle: React.CSSProperties = {
  margin: "0.5rem 0 0",
  fontSize: "clamp(2.6rem, 7vw, 5.25rem)",
  lineHeight: 0.96,
  letterSpacing: "-0.045em",
};

const heroSubtitleStyle: React.CSSProperties = {
  maxWidth: 780,
  margin: "1.1rem 0 0",
  fontSize: "clamp(1.1rem, 2vw, 1.45rem)",
  color: "rgba(246,245,241,0.94)",
  lineHeight: 1.45,
};

const heroSupportStyle: React.CSSProperties = {
  maxWidth: 820,
  margin: "0.9rem 0 1.65rem",
  fontSize: "1rem",
  color: "rgba(246,245,241,0.76)",
  lineHeight: 1.7,
};

function primaryCtaStyle(active: boolean): React.CSSProperties {
  return {
    border: "1px solid rgba(255,204,106,0.78)",
    borderRadius: 999,
    background: active ? "#FFCC6A" : "rgba(255,204,106,0.12)",
    color: active ? "#0D3A1D" : "rgba(246,245,241,0.68)",
    padding: "0.88rem 1.2rem",
    fontWeight: 900,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    cursor: active ? "pointer" : "default",
  };
}

const summaryStripStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const summaryCardStyle: React.CSSProperties = {
  border: "1px solid rgba(255,204,106,0.18)",
  borderRadius: 22,
  padding: "1rem",
  background: "rgba(8,39,19,0.74)",
};

const summaryLabelStyle: React.CSSProperties = {
  margin: 0,
  color: "rgba(246,245,241,0.58)",
  fontSize: "0.68rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 900,
};

const summaryValueStyle: React.CSSProperties = {
  display: "block",
  marginTop: 8,
  color: "#F6F5F1",
  fontSize: "clamp(1.15rem, 2vw, 1.55rem)",
};

const summaryNoteStyle: React.CSSProperties = {
  margin: "0.45rem 0 0",
  color: "rgba(246,245,241,0.68)",
  fontSize: "0.86rem",
  lineHeight: 1.45,
};

const miniTrackStyle: React.CSSProperties = {
  height: 7,
  borderRadius: 999,
  background: "rgba(246,245,241,0.13)",
  overflow: "hidden",
  marginTop: 10,
};

const miniFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, #FFCC6A, rgba(255,204,106,0.55))",
};

const sectionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 310px), 1fr))",
  gap: 18,
};

const premiumCardStyle: React.CSSProperties = {
  border: "1px solid rgba(255,204,106,0.18)",
  borderRadius: 28,
  padding: "clamp(1.15rem, 2.5vw, 1.65rem)",
  background: "linear-gradient(180deg, rgba(246,245,241,0.075), rgba(7,31,16,0.72))",
  boxShadow: "0 22px 70px rgba(0,0,0,0.22)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0.35rem 0 0",
  fontSize: "clamp(1.25rem, 2.2vw, 1.7rem)",
  lineHeight: 1.15,
};

const pendingChartStyle: React.CSSProperties = {
  marginTop: 16,
  borderRadius: 18,
  background: "rgba(0,0,0,0.16)",
  border: "1px solid rgba(246,245,241,0.08)",
  padding: 8,
};

const bodyStyle: React.CSSProperties = {
  margin: "0.6rem 0 0",
  color: "rgba(246,245,241,0.78)",
  lineHeight: 1.7,
};

const trackerStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  marginTop: 16,
};

const trackerItemStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "34px minmax(0, 1fr)",
  gap: 12,
  alignItems: "center",
};

function trackerDotStyle(complete: boolean): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    border: `1px solid ${complete ? "rgba(255,204,106,0.72)" : "rgba(246,245,241,0.18)"}`,
    color: complete ? "#0D3A1D" : "rgba(246,245,241,0.62)",
    background: complete ? "#FFCC6A" : "rgba(246,245,241,0.06)",
    fontWeight: 900,
  };
}

const trackerTitleStyle: React.CSSProperties = {
  margin: 0,
  fontWeight: 900,
};

const trackerMetaStyle: React.CSSProperties = {
  margin: "0.2rem 0 0",
  color: "rgba(246,245,241,0.62)",
  fontSize: "0.84rem",
};

const signalGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
  marginTop: 16,
};

const signalCardStyle: React.CSSProperties = {
  borderRadius: 18,
  padding: "0.9rem",
  background: "rgba(255,255,255,0.055)",
  border: "1px solid rgba(255,255,255,0.08)",
};

function signalValueStyle(value: string): React.CSSProperties {
  return {
    display: "block",
    marginTop: 6,
    color: value === "Pending" ? "rgba(246,245,241,0.7)" : "#FFCC6A",
    fontSize: "1.05rem",
  };
}

const rowBetweenStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap",
};

const cardLabelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.7rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#FFCC6A",
  fontWeight: 900,
};

const statusTitleStyle: React.CSSProperties = {
  margin: "0.35rem 0 0",
  fontSize: "clamp(1.85rem, 4vw, 3rem)",
  lineHeight: 1,
};

const supportingLineStyle: React.CSSProperties = {
  ...bodyStyle,
  maxWidth: 850,
  color: "rgba(246,245,241,0.88)",
  fontSize: "1.05rem",
};

const narrativeGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
  marginTop: 18,
};

const narrativeBlockStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.09)",
  background: "rgba(0,0,0,0.14)",
  padding: "1rem",
};

function gateBadgeStyle(level: ExecutionGateLevel): React.CSSProperties {
  const blocked = level === "BLOCKED";
  return {
    border: `1px solid ${blocked ? "rgba(255,204,106,0.7)" : "rgba(255,204,106,0.35)"}`,
    borderRadius: 999,
    background: blocked ? "rgba(255,204,106,0.18)" : "rgba(255,204,106,0.1)",
    color: "#FFCC6A",
    padding: "0.55rem 0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: 900,
    cursor: "help",
  };
}

const tooltipStyle: React.CSSProperties = {
  position: "absolute",
  right: 0,
  top: "calc(100% + 10px)",
  zIndex: 5,
  width: 280,
  borderRadius: 16,
  border: "1px solid rgba(255,204,106,0.32)",
  background: "#082713",
  color: "#F6F5F1",
  padding: "0.85rem",
  boxShadow: "0 18px 60px rgba(0,0,0,0.36)",
  lineHeight: 1.5,
  fontSize: "0.86rem",
};

const subtlePillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "0.38rem 0.65rem",
  border: "1px solid rgba(255,204,106,0.22)",
  color: "#FFCC6A",
  fontSize: "0.76rem",
  fontWeight: 900,
};

const actionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 255px), 1fr))",
  gap: 14,
  marginTop: 16,
};

function actionCardStyle(clickable: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    gap: 12,
    textAlign: "left",
    borderRadius: 22,
    border: "1px solid rgba(255,204,106,0.18)",
    background: "rgba(255,255,255,0.055)",
    color: "#F6F5F1",
    padding: "1rem",
    cursor: clickable ? "pointer" : "default",
    opacity: clickable ? 1 : 0.58,
  };
}

const priorityBadgeStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  background: "#FFCC6A",
  color: "#0D3A1D",
  fontWeight: 900,
};

const actionTitleStyle: React.CSSProperties = {
  fontSize: "1rem",
};

const actionReasonStyle: React.CSSProperties = {
  color: "rgba(246,245,241,0.72)",
  lineHeight: 1.5,
  fontSize: "0.9rem",
};

const actionCtaStyle: React.CSSProperties = {
  color: "#FFCC6A",
  fontWeight: 900,
  fontSize: "0.86rem",
};

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  color: "rgba(246,245,241,0.58)",
  fontSize: "0.9rem",
  lineHeight: 1.6,
  padding: "0.5rem 1rem",
};
