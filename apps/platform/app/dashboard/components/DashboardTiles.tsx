"use client";

import { useEffect, useState } from "react";
import { createAppBrowserClient } from "@cb/supabase/browser";
import {
  fetchPersona,
  deriveEntitlements,
  type Entitlements,
} from "@cb/advisory-graph";

const MODEL_URLS: Record<string, string> = {
  "forever-income":
    typeof process.env.NEXT_PUBLIC_FOREVER_APP_URL === "string"
      ? process.env.NEXT_PUBLIC_FOREVER_APP_URL
      : "https://forever.thecapitalbridge.com",
  "income-engineering":
    typeof process.env.NEXT_PUBLIC_INCOME_ENGINEERING_APP_URL === "string"
      ? process.env.NEXT_PUBLIC_INCOME_ENGINEERING_APP_URL
      : "https://incomeengineering.thecapitalbridge.com",
  "capital-health":
    typeof process.env.NEXT_PUBLIC_CAPITAL_HEALTH_APP_URL === "string"
      ? process.env.NEXT_PUBLIC_CAPITAL_HEALTH_APP_URL
      : "https://capitalhealth.thecapitalbridge.com",
  "capital-stress":
    typeof process.env.NEXT_PUBLIC_CAPITAL_STRESS_APP_URL === "string"
      ? process.env.NEXT_PUBLIC_CAPITAL_STRESS_APP_URL
      : "https://capitalstress.thecapitalbridge.com",
  solutions:
    typeof process.env.NEXT_PUBLIC_SOLUTIONS_APP_URL === "string"
      ? process.env.NEXT_PUBLIC_SOLUTIONS_APP_URL
      : "https://platform.thecapitalbridge.com/solutions",
};

type Tile = {
  id: string;
  label: string;
  href: string;
  enabled: (e: Entitlements) => boolean;
  tooltipDisabled?: string;
};

const TILES: Tile[] = [
  {
    id: "forever-income",
    label: "Forever Income",
    href: `${MODEL_URLS["forever-income"]}/dashboard`,
    enabled: () => true,
  },
  {
    id: "income-engineering",
    label: "Income Engineering",
    href: `${MODEL_URLS["income-engineering"]}/dashboard`,
    enabled: () => true,
  },
  {
    id: "capital-health",
    label: "Evaluate Income Sustainability (Capital Health)",
    href: `${MODEL_URLS["capital-health"]}/dashboard`,
    enabled: () => true,
  },
  {
    id: "capital-stress",
    label: "Stress Test Resilience (Capital Stress)",
    href: `${MODEL_URLS["capital-stress"]}/dashboard`,
    enabled: (e) => e.canUseStressModel,
    tooltipDisabled: "Available on paid plans",
  },
  {
    id: "solutions",
    label: "Solutions & Execution",
    href: MODEL_URLS.solutions,
    enabled: (e) => e.canSeeSolutions,
    tooltipDisabled: "Yearly plan only",
  },
];

export function DashboardTiles() {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);

  useEffect(() => {
    const supabase = createAppBrowserClient();
    fetchPersona(supabase).then((p) => {
      setEntitlements(deriveEntitlements(p?.active_plan ?? null));
    });
  }, []);

  const e = entitlements ?? deriveEntitlements(null);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 16,
      }}
    >
      {TILES.map((tile) => {
        const enabled = tile.enabled(e);
        return (
          <div key={tile.id}>
            {enabled ? (
              <a
                href={tile.href}
                style={{
                  display: "block",
                  padding: "1rem 1.25rem",
                  border: "1px solid rgba(255,204,106,0.35)",
                  borderRadius: 8,
                  backgroundColor: "rgba(255,204,106,0.08)",
                  color: "rgba(246,245,241,0.95)",
                  fontSize: "0.95rem",
                  textDecoration: "none",
                }}
              >
                {tile.label}
              </a>
            ) : (
              <div
                title={tile.tooltipDisabled}
                style={{
                  display: "block",
                  padding: "1rem 1.25rem",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  backgroundColor: "rgba(0,0,0,0.2)",
                  color: "rgba(246,245,241,0.5)",
                  fontSize: "0.95rem",
                  cursor: "not-allowed",
                }}
              >
                {tile.label}
                <span style={{ display: "block", fontSize: "0.75rem", marginTop: 4 }}>
                  {tile.tooltipDisabled}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
