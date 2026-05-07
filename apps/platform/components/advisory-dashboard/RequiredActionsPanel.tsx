"use client";

import type { CSSProperties } from "react";
import { ClipboardList } from "lucide-react";
import { DashboardPanel } from "./DashboardPanel";
import { CB, fontSans } from "./cbDashboardTokens";
import type { ModelKey } from "./lionVerdictTypes";

export type ModuleLink = { label: string; key: ModelKey | "strategic"; href: string | null; active?: boolean };

type Props = {
  incomplete: boolean;
  moduleLinks: ModuleLink[];
};

const IE = "income-engineering-model";
const CH = "capital-health-model";
const CS = "capital-stress-model";
const FI = "forever-income-model";

function hrefFor(links: ModuleLink[], key: ModelKey): string | null {
  return links.find((l) => l.key === key)?.href ?? null;
}

export function RequiredActionsPanel({ incomplete, moduleLinks }: Props) {
  const rows = incomplete
    ? [
        {
          p: "P1",
          title: "Complete Income Engineering",
          reason: "Establish whether your desired income target can be structurally supported.",
          href: hrefFor(moduleLinks, IE),
          cta: "Open Model",
        },
        {
          p: "P2",
          title: "Complete Capital Health",
          reason: "Assess whether your capital sources, obligations, and structure can support long-term execution.",
          href: hrefFor(moduleLinks, CH),
          cta: "Open Model",
        },
        {
          p: "P3",
          title: "Complete Capital Stress",
          reason: "Test whether the capital structure can withstand volatility, shocks, or unexpected changes.",
          href: hrefFor(moduleLinks, CS),
          cta: "Open Model",
        },
        {
          p: "P4",
          title: "Complete Forever Income",
          reason: "Validate whether the income plan can be sustained over time.",
          href: hrefFor(moduleLinks, FI),
          cta: "Open Model",
        },
      ]
    : [
        {
          p: "P1",
          title: "Activate Strategic Execution",
          reason: "Confirm readiness and launch your execution plan.",
          href: "/solutions/strategic-execution",
          cta: "Launch",
        },
        {
          p: "P2",
          title: "Review Recommended Pathway",
          reason: "Review the recommended pathway and key assumptions.",
          href: "/solutions/strategic-execution#pathway",
          cta: "Review",
        },
        {
          p: "P3",
          title: "Validate Allocation Plan",
          reason: "Validate allocations, liquidity, and implementation steps.",
          href: "/solutions/strategic-execution#pathway",
          cta: "Review",
        },
        {
          p: "P4",
          title: "Begin Monitoring & Reconciliation",
          reason: "Start ongoing monitoring and performance reconciliation.",
          href: "/solutions/strategic-execution#pathway",
          cta: "Open",
        },
      ];

  return (
    <DashboardPanel title="Required Actions">
      <div style={{ display: "grid", gap: 7, fontFamily: fontSans }}>
        {rows.map((row) => {
          const disabled = !row.href;
          const label = disabled ? "Staging destination pending" : row.cta.toUpperCase();
          return (
            <div key={row.p} style={rowStyle}>
              <span style={badge}>{row.p}</span>
              <div style={ico}>
                <ClipboardList size={13} color={CB.gold} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={t}>{row.title}</p>
                <p style={r}>{row.reason}</p>
              </div>
              <a
                href={row.href ?? undefined}
                style={{ ...btn, ...(disabled ? btnOff : {}) }}
                onClick={(e) => {
                  if (disabled) e.preventDefault();
                }}
              >
                {label}
              </a>
            </div>
          );
        })}
      </div>
    </DashboardPanel>
  );
}

const rowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "34px 26px minmax(0, 1fr) auto",
  gap: 8,
  alignItems: "center",
  padding: "8px 10px",
  borderRadius: 12,
  border: `1px solid rgba(255,204,106,0.32)`,
  background: "rgba(4,22,14,0.55)",
};

const badge: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  border: `1px solid rgba(255,204,106,0.5)`,
  color: CB.gold,
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
  fontSize: 11,
};

const ico: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 7,
  border: `1px solid rgba(255,204,106,0.35)`,
  display: "grid",
  placeItems: "center",
  background: "rgba(0,0,0,0.2)",
};

const t: CSSProperties = { margin: 0, fontWeight: 700, fontSize: 13, color: CB.white, lineHeight: 1.25 };
const r: CSSProperties = {
  margin: "3px 0 0",
  fontSize: 11,
  lineHeight: 1.28,
  color: "rgba(246,245,241,0.76)",
};

const btn: CSSProperties = {
  color: CB.gold,
  textDecoration: "none",
  border: `1px solid rgba(255,204,106,0.65)`,
  borderRadius: 8,
  padding: "6px 11px",
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.08em",
  whiteSpace: "nowrap",
  background: "rgba(0,0,0,0.15)",
};

const btnOff: CSSProperties = {
  opacity: 0.55,
  cursor: "not-allowed",
};
