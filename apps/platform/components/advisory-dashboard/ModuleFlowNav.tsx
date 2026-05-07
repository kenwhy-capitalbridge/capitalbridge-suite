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
                <CheckCircle2 size={13} color={CB.success} style={{ flexShrink: 0 }} aria-hidden />
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
  border: CB.panelBorder,
  borderRadius: CB.radiusMd,
  background: CB.panelSurface,
  boxShadow: CB.shadowCard,
  padding: "8px 8px 7px",
  display: "grid",
  gap: 3,
  minHeight: 56,
  maxHeight: 72,
};

const cardActive: CSSProperties = {
  border: "1px solid rgba(255,204,106,0.72)",
  boxShadow: `0 0 0 1px rgba(255,204,106,0.45), 0 6px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,204,106,0.12)`,
};

const cardDisabled: CSSProperties = {
  opacity: 0.72,
  cursor: "not-allowed",
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 4,
};

const indexStyle: CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: "50%",
  border: `1px solid rgba(255,204,106,0.48)`,
  color: CB.gold,
  display: "grid",
  placeItems: "center",
  fontSize: 10,
  fontWeight: 800,
};

const pillStyle: CSSProperties = {
  borderRadius: 999,
  border: `1px solid rgba(255,204,106,0.38)`,
  color: CB.gold,
  padding: "1px 5px",
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const nameStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.02em",
  lineHeight: 1.2,
};

const metaStyle: CSSProperties = {
  fontSize: 9,
  color: "rgba(246,245,241,0.65)",
  lineHeight: 1.15,
};
