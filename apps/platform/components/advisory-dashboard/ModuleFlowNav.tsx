"use client";

import type { CSSProperties } from "react";
import { CheckCircle2 } from "lucide-react";
import { CB, fontSans } from "./cbDashboardTokens";
import type { ModelKey } from "./lionVerdictTypes";
import gridStyles from "./dashboardGrid.module.css";

export type FlowStep = {
  label: string;
  key: ModelKey | "strategic";
  href: string | null;
  active?: boolean;
};

type Props = {
  steps: FlowStep[];
  missing: Set<string>;
  completionState: string;
  /** True when all required models are present and execution gate is open. */
  allModulesComplete: boolean;
  className?: string;
};

export function ModuleFlowNav({ steps, missing, completionState, allModulesComplete, className }: Props) {
  return (
    <nav
      aria-label="Advisory module flow"
      className={[gridStyles.flowNav, className].filter(Boolean).join(" ")}
      style={navStyle}
    >
      {steps.map((step, index) => {
        const isStrategic = step.key === "strategic";
        const missingModel = !isStrategic && missing.has(step.key);
        const done = isStrategic ? allModulesComplete : !missingModel;
        const statusLabel = isStrategic
          ? completionState
          : missingModel
            ? "Missing"
            : "Completed";
        const destinationPending = !isStrategic && !step.href;
        return (
          <a
            key={step.label}
            href={step.href ?? undefined}
            style={{
              ...cardStyle,
              ...(step.active ? cardActive : {}),
              ...(!step.href ? cardDisabled : {}),
            }}
            aria-disabled={!step.href}
            onClick={(e) => {
              if (!step.href) e.preventDefault();
            }}
          >
            <span style={indexStyle}>{index + 1}</span>
            <strong style={nameStyle}>{step.label}</strong>
            {done && (isStrategic || step.href) ? (
              <span style={pillDoneStyle}>
                <CheckCircle2 size={12} color={CB.success} style={{ flexShrink: 0 }} aria-hidden />
                Complete
              </span>
            ) : done ? (
              <span style={pillDoneStyle}>Complete</span>
            ) : (
              <span style={pillStyle}>{statusLabel}</span>
            )}
            {destinationPending ? <span style={subtleMetaStyle}>Destination pending</span> : null}
          </a>
        );
      })}
    </nav>
  );
}

const navStyle: CSSProperties = {
  fontFamily: fontSans,
};

const cardStyle: CSSProperties = {
  textDecoration: "none",
  color: CB.white,
  border: "1px solid rgba(255,204,106,0.24)",
  borderRadius: 999,
  background: "rgba(7,31,16,0.5)",
  boxShadow: "inset 0 1px 0 rgba(255,204,106,0.08)",
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  minHeight: 46,
  flex: "1 1 210px",
};

const cardActive: CSSProperties = {
  border: "1px solid rgba(255,204,106,0.72)",
  boxShadow: `0 0 0 1px rgba(255,204,106,0.34), 0 8px 20px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,204,106,0.12)`,
};

const cardDisabled: CSSProperties = {
  opacity: 0.72,
  cursor: "not-allowed",
};

const indexStyle: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  border: `1px solid rgba(255,204,106,0.48)`,
  color: CB.gold,
  display: "grid",
  placeItems: "center",
  fontSize: 11,
  fontWeight: 800,
  flexShrink: 0,
};

const pillStyle: CSSProperties = {
  borderRadius: 999,
  border: `1px solid rgba(255,204,106,0.38)`,
  color: CB.gold,
  padding: "2px 8px",
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginLeft: "auto",
  flexShrink: 0,
};

const nameStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.02em",
  lineHeight: 1.15,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const pillDoneStyle: CSSProperties = {
  ...pillStyle,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  color: CB.success,
  border: "1px solid rgba(110,231,160,0.55)",
};

const subtleMetaStyle: CSSProperties = {
  marginLeft: 6,
  fontSize: 9,
  color: "rgba(246,245,241,0.58)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};
