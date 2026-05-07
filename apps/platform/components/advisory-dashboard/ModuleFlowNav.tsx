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
        const done = isStrategic ? allModulesComplete : Boolean(step.href) && !missingModel;
        const statusLabel = isStrategic
          ? completionState
          : !step.href
            ? "Staging destination pending"
            : missingModel
              ? "Missing"
              : "Completed";
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
            <div style={rowStyle}>
              <span style={indexStyle}>{index + 1}</span>
              {done && (isStrategic || step.href) ? (
                <CheckCircle2 size={14} color={CB.success} style={{ flexShrink: 0 }} aria-hidden />
              ) : (
                <span style={pillStyle}>{statusLabel}</span>
              )}
            </div>
            <strong style={nameStyle}>{step.label}</strong>
            <small style={metaStyle}>{statusLabel}</small>
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
  border: CB.cardBorder,
  borderRadius: CB.radiusMd,
  background: CB.cardBg,
  boxShadow: CB.shadowCard,
  padding: "12px 10px",
  display: "grid",
  gap: 6,
  minHeight: 72,
};

const cardActive: CSSProperties = {
  borderColor: CB.gold,
  boxShadow: `0 0 0 1px rgba(255,204,106,0.35), ${CB.shadowCard}`,
};

const cardDisabled: CSSProperties = {
  opacity: 0.72,
  cursor: "not-allowed",
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 6,
};

const indexStyle: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  border: `1px solid rgba(255,204,106,0.45)`,
  color: CB.gold,
  display: "grid",
  placeItems: "center",
  fontSize: 11,
  fontWeight: 800,
};

const pillStyle: CSSProperties = {
  borderRadius: 999,
  border: `1px solid rgba(255,204,106,0.4)`,
  color: CB.gold,
  padding: "2px 7px",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const nameStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.02em",
};

const metaStyle: CSSProperties = {
  fontSize: 10,
  color: "rgba(246,245,241,0.7)",
};
