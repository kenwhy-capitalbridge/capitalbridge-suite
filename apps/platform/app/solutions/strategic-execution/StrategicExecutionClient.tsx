"use client";

import type React from "react";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import useSWR from "swr";

type SignalBand = "STRONG" | "ADEQUATE" | "TIGHT" | "WEAK" | "FAILED";
type LionStatus = "STRONG" | "STABLE" | "FRAGILE" | "AT_RISK" | "NOT_SUSTAINABLE";
type ExecutionGateLevel = "BLOCKED" | "RESTRICTED" | "ALLOWED";

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
    model_key: string;
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

const fetcher = async (url: string): Promise<LionVerdictResponse> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load Lion verdict");
  }
  return response.json() as Promise<LionVerdictResponse>;
};

const transition = { duration: 0.32, ease: "easeInOut" as const };
const motionState = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export function StrategicExecutionClient() {
  const { data, error, mutate, isLoading } = useSWR("/api/lion/verdict", fetcher, {
    revalidateOnFocus: true,
  });

  useEffect(() => {
    const refresh = () => {
      void mutate();
    };

    window.addEventListener("capital_updated", refresh);
    return () => window.removeEventListener("capital_updated", refresh);
  }, [mutate]);

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <ExecutionHeader />

        {isLoading ? (
          <ShellCard>Loading your current capital position...</ShellCard>
        ) : error || !data ? (
          <ShellCard>We could not load the current Lion verdict. Refresh the page and try again.</ShellCard>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            <ProgressIndicator verdict={data} />
            <CurrentPositionCard verdict={data} />
            <MissingModelBanner verdict={data} />
            <RequiredActionsCard verdict={data} />
            <ExecutionPathwaysCard verdict={data} />
            <ConfidenceIndicator verdict={data} />
          </div>
        )}
      </div>
    </main>
  );
}

function ExecutionHeader() {
  return (
    <section style={{ marginBottom: 20 }}>
      <p style={eyebrowStyle}>Strategic execution</p>
      <h1 style={titleStyle}>Based on your current capital structure, the system determines:</h1>
      <p style={subtitleStyle}>
        This layer turns the canonical Lion verdict into clear next steps. It does not change the verdict or compute
        decisions in the browser.
      </p>
    </section>
  );
}

function ProgressIndicator({ verdict }: { verdict: LionVerdictResponse }) {
  const completed = verdict.progress.completed_models;
  const total = verdict.progress.total_models;
  const width = total > 0 ? Math.max(0, Math.min(100, (completed / total) * 100)) : 0;
  const label =
    completed <= 0
      ? "Getting started"
      : completed <= 2
        ? "Building your structure"
        : completed < total
          ? "Almost ready"
          : "Fully evaluated";

  return (
    <section style={cardStyle}>
      <div style={rowBetweenStyle}>
        <div>
          <p style={cardLabelStyle}>Progress</p>
          <h2 style={cardTitleStyle}>{completed} of {total} modules completed</h2>
        </div>
        <span style={pillStyle}>{label}</span>
      </div>
      <div style={progressTrackStyle}>
        <motion.div
          style={progressFillStyle}
          animate={{ width: `${width}%` }}
          transition={transition}
        />
      </div>
    </section>
  );
}

function CurrentPositionCard({ verdict }: { verdict: LionVerdictResponse }) {
  return (
    <motion.section
      key={`${verdict.lion_status}:${verdict.execution_gate.level}`}
      {...motionState}
      transition={transition}
      style={cardStyle}
    >
      <p style={cardLabelStyle}>Current position</p>
      <div style={rowBetweenStyle}>
        <h2 style={statusTitleStyle}>{formatStatus(verdict.lion_status)}</h2>
        <span style={statusPillStyle(verdict.lion_status)}>{verdict.execution_gate.level}</span>
      </div>
      <h3 style={{ margin: "1rem 0 0", fontSize: "1.2rem" }}>{verdict.narrative.headline}</h3>
      <NarrativeBlock title="What is happening" body={verdict.narrative.what_is_happening} />
      <NarrativeBlock title="What will happen" body={verdict.narrative.what_will_happen} />
      <NarrativeBlock title="What must be done" body={verdict.narrative.what_must_be_done} strong />
    </motion.section>
  );
}

function MissingModelBanner({ verdict }: { verdict: LionVerdictResponse }) {
  if (verdict.execution_gate.level === "ALLOWED") {
    return null;
  }

  const blocked = verdict.execution_gate.level === "BLOCKED";
  return (
    <motion.section {...motionState} transition={transition} style={bannerStyle(blocked)}>
      <p style={{ ...cardLabelStyle, color: blocked ? "#5a1d16" : "#5a3a09" }}>
        {blocked ? "Execution blocked" : "Execution restricted"}
      </p>
      <h2 style={{ margin: "0.35rem 0", fontSize: "1.15rem" }}>
        {blocked
          ? "Critical modules are still missing."
          : "Some supporting modules are still missing."}
      </h2>
      <p style={{ margin: 0, lineHeight: 1.55 }}>
        {blocked
          ? "Complete the required modules before execution pathways can open."
          : "The system can show stabilization steps, but full execution waits for the remaining modules."}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        {verdict.missing_models.map((model) => (
          <span key={model.model_key} style={lightPillStyle}>
            {model.model_key.replace(/-/g, " ")} · {model.criticality}
          </span>
        ))}
      </div>
    </motion.section>
  );
}

function RequiredActionsCard({ verdict }: { verdict: LionVerdictResponse }) {
  const router = useRouter();
  const executionBlocked = verdict.execution_gate.level === "BLOCKED";

  return (
    <section style={cardStyle}>
      <p style={cardLabelStyle}>Required actions</p>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {verdict.actions.length === 0 ? (
          <p style={bodyStyle}>No required actions are currently returned by the Lion verdict.</p>
        ) : (
          verdict.actions.map((action) => {
            const canNavigate = !executionBlocked && Boolean(action.deep_link);

            return (
              <button
                key={action.action_code}
                type="button"
                disabled={!canNavigate}
                onClick={() => {
                  if (canNavigate && action.deep_link) router.push(action.deep_link);
                }}
                style={actionButtonStyle(canNavigate)}
              >
                <span style={priorityStyle}>P{action.priority}</span>
                <span>{action.label}</span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

function ExecutionPathwaysCard({ verdict }: { verdict: LionVerdictResponse }) {
  const pathway =
    verdict.execution_gate.level === "BLOCKED"
      ? {
          key: "blocked",
          title: "Blocked execution",
          body: "Execution is paused until critical modules are complete. The next step is to finish the missing inputs.",
        }
      : verdict.execution_gate.level === "RESTRICTED"
        ? {
            key: "restricted",
            title: "Stabilization execution",
            body: "You can focus on stabilizing the weakest signals while the remaining modules are completed.",
          }
        : pathwayForStatus(verdict.lion_status);

  return (
    <section style={cardStyle}>
      <p style={cardLabelStyle}>Execution pathway</p>
      <AnimatePresence mode="wait">
        <motion.div
          key={pathway.key}
          {...motionState}
          transition={transition}
          style={{ marginTop: 10 }}
        >
          <h2 style={cardTitleStyle}>{pathway.title}</h2>
          <p style={bodyStyle}>{pathway.body}</p>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function ConfidenceIndicator({ verdict }: { verdict: LionVerdictResponse }) {
  const low = verdict.agreement_level === "LOW";
  return (
    <section style={cardStyle}>
      <p style={cardLabelStyle}>Confidence</p>
      <h2 style={cardTitleStyle}>{verdict.agreement_level} agreement</h2>
      <p style={bodyStyle}>
        {low
          ? "Models disagree in places, so treat this verdict with caution and complete the missing checks before acting."
          : verdict.agreement_level === "MEDIUM"
            ? "Most signals point in the same direction, with some variation across scenarios."
            : "The models are aligned, so the system can speak with higher certainty."}
      </p>
    </section>
  );
}

function NarrativeBlock({ title, body, strong = false }: { title: string; body: string; strong?: boolean }) {
  return (
    <div style={{ marginTop: 14 }}>
      <p style={cardLabelStyle}>{title}</p>
      <p style={{ ...bodyStyle, fontWeight: strong ? 800 : 500 }}>{body}</p>
    </div>
  );
}

function ShellCard({ children }: { children: React.ReactNode }) {
  return <section style={cardStyle}>{children}</section>;
}

function pathwayForStatus(status: LionStatus) {
  switch (status) {
    case "STRONG":
      return {
        key: "strong",
        title: "Protect and optimize",
        body: "The structure is strong. Execution should preserve strength while improving efficiency.",
      };
    case "STABLE":
      return {
        key: "stable",
        title: "Strengthen from stability",
        body: "The structure can support careful improvement, but avoid moves that reduce buffer.",
      };
    case "FRAGILE":
      return {
        key: "fragile",
        title: "Stabilize first",
        body: "Execution should widen margin before adding complexity or commitments.",
      };
    case "AT_RISK":
      return {
        key: "at-risk",
        title: "Correct risk first",
        body: "Execution should focus on income, obligations, and resilience before expansion.",
      };
    case "NOT_SUSTAINABLE":
      return {
        key: "not-sustainable",
        title: "Reset required",
        body: "Execution should not proceed until the structure is corrected.",
      };
  }
}

function formatStatus(status: LionStatus): string {
  return status.replace(/_/g, " ");
}

const pageStyle: React.CSSProperties = {
  flex: 1,
  width: "100%",
  padding: "clamp(1rem, 2.5vw, 2.25rem) clamp(0.75rem, 2vw, 1.25rem) clamp(2rem, 4vw, 3rem)",
  boxSizing: "border-box",
  color: "#F6F5F1",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.75rem",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(246,245,241,0.72)",
  fontWeight: 800,
};

const titleStyle: React.CSSProperties = {
  margin: "0.4rem 0 0",
  fontSize: "clamp(2rem, 4vw, 3rem)",
  lineHeight: 1.04,
};

const subtitleStyle: React.CSSProperties = {
  maxWidth: 760,
  margin: "0.85rem 0 0",
  color: "rgba(246,245,241,0.84)",
  lineHeight: 1.65,
};

const cardStyle: React.CSSProperties = {
  padding: "1.25rem",
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(246,245,241,0.06)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.16)",
};

const rowBetweenStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap",
};

const cardLabelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.72rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(246,245,241,0.66)",
  fontWeight: 800,
};

const cardTitleStyle: React.CSSProperties = {
  margin: "0.25rem 0 0",
  fontSize: "1.25rem",
};

const statusTitleStyle: React.CSSProperties = {
  margin: "0.25rem 0 0",
  fontSize: "clamp(1.5rem, 3vw, 2.4rem)",
  letterSpacing: "0.04em",
};

const bodyStyle: React.CSSProperties = {
  margin: "0.45rem 0 0",
  color: "rgba(246,245,241,0.86)",
  lineHeight: 1.65,
};

const progressTrackStyle: React.CSSProperties = {
  height: 10,
  marginTop: 16,
  borderRadius: 999,
  overflow: "hidden",
  background: "rgba(255,255,255,0.16)",
};

const progressFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, #F3AF56, #FFCC6A)",
};

const pillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "0.45rem 0.75rem",
  background: "rgba(255,204,106,0.12)",
  border: "1px solid rgba(255,204,106,0.25)",
  color: "#FFCC6A",
  fontWeight: 800,
  fontSize: "0.82rem",
};

const lightPillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "0.4rem 0.65rem",
  background: "rgba(255,255,255,0.4)",
  color: "#0D3A1D",
  fontWeight: 800,
  fontSize: "0.78rem",
};

const priorityStyle: React.CSSProperties = {
  borderRadius: 999,
  minWidth: 34,
  padding: "0.25rem 0.4rem",
  background: "rgba(255,204,106,0.16)",
  color: "#FFCC6A",
  fontSize: "0.76rem",
  fontWeight: 900,
};

function statusPillStyle(status: LionStatus): React.CSSProperties {
  const dangerous = status === "AT_RISK" || status === "NOT_SUSTAINABLE";
  return {
    ...pillStyle,
    color: dangerous ? "#FFD7D2" : "#FFCC6A",
    borderColor: dangerous ? "rgba(255,215,210,0.28)" : "rgba(255,204,106,0.25)",
  };
}

function bannerStyle(blocked: boolean): React.CSSProperties {
  return {
    padding: "1rem 1.15rem",
    borderRadius: 18,
    color: blocked ? "#5a1d16" : "#5a3a09",
    background: blocked ? "#FFD7D2" : "#FFE2A8",
    border: `1px solid ${blocked ? "rgba(90,29,22,0.18)" : "rgba(90,58,9,0.18)"}`,
  };
}

function actionButtonStyle(clickable: boolean): React.CSSProperties {
  return {
    width: "100%",
    display: "flex",
    gap: 12,
    alignItems: "center",
    textAlign: "left",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.07)",
    color: "#F6F5F1",
    padding: "0.85rem 0.95rem",
    cursor: clickable ? "pointer" : "default",
    fontWeight: 800,
    opacity: clickable ? 1 : 0.64,
  };
}
