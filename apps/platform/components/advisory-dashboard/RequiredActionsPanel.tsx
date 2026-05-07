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
      <div style={{ display: "grid", gap: 10, fontFamily: fontSans }}>
        {rows.map((row) => {
          const disabled = !row.href;
          const label = disabled ? "Staging destination pending" : row.cta.toUpperCase();
          return (
            <div key={row.p} style={rowStyle}>
              <span style={badge}>{row.p}</span>
              <div style={ico}>
                <ClipboardList size={14} color={CB.gold} />
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
  gridTemplateColumns: "44px 32px minmax(0,1fr) auto",
  gap: 12,
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: CB.radiusMd,
  border: `1px solid rgba(255,204,106,0.28)`,
  background: "rgba(4,22,14,0.4)",
};

const badge: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  border: `1px solid rgba(255,204,106,0.55)`,
  color: CB.gold,
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
  fontSize: 12,
};

const ico: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: `1px solid rgba(255,204,106,0.35)`,
  display: "grid",
  placeItems: "center",
  background: "rgba(0,0,0,0.15)",
};

const t: CSSProperties = { margin: 0, fontWeight: 700, fontSize: 14, color: CB.white };
const r: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 12,
  lineHeight: 1.4,
  color: "rgba(246,245,241,0.78)",
};

const btn: CSSProperties = {
  color: CB.gold,
  textDecoration: "none",
  border: `1px solid ${CB.gold}`,
  borderRadius: 10,
  padding: "8px 14px",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.06em",
  whiteSpace: "nowrap",
};

const btnOff: CSSProperties = {
  opacity: 0.55,
  cursor: "not-allowed",
};
