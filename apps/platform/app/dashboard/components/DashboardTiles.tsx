"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@cb/advisory-graph/supabaseClient";
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

/** Trial-tier SPAs (Vite); open at site root — no `/dashboard`, no Supabase model hub. */
const TRIAL_MODEL_URLS: Record<string, string> = {
  "forever-income":
    typeof process.env.NEXT_PUBLIC_TRIAL_FOREVER_APP_URL === "string"
      ? process.env.NEXT_PUBLIC_TRIAL_FOREVER_APP_URL
      : "https://trialforeverincome.thecapitalbridge.com",
  "income-engineering":
    typeof process.env.NEXT_PUBLIC_TRIAL_INCOME_ENGINEERING_APP_URL === "string"
      ? process.env.NEXT_PUBLIC_TRIAL_INCOME_ENGINEERING_APP_URL
      : "https://trial-incomeengineeringmodel.thecapitalbridge.com",
  "capital-health":
    typeof process.env.NEXT_PUBLIC_TRIAL_CAPITAL_HEALTH_APP_URL === "string"
      ? process.env.NEXT_PUBLIC_TRIAL_CAPITAL_HEALTH_APP_URL
      : "https://trialcapitalhealth.thecapitalbridge.com",
};

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

/** Paid models use Next `/dashboard`; trial Vite apps use `/`. */
function modelTileHref(tileId: string, plan: Entitlements["plan"]): string {
  if (plan === "trial") {
    const base = TRIAL_MODEL_URLS[tileId] ?? MODEL_URLS[tileId];
    return `${trimTrailingSlash(base)}/`;
  }
  const base = MODEL_URLS[tileId];
  return `${trimTrailingSlash(base)}/dashboard`;
}

type Tile = {
  id: string;
  label: string;
  href: string;
  enabled: (e: Entitlements) => boolean;
  tooltipDisabled?: string;
};

const TILES: Omit<Tile, "href">[] = [
  {
    id: "forever-income",
    label: "Forever Income",
    enabled: () => true,
  },
  {
    id: "income-engineering",
    label: "Income Engineering",
    enabled: () => true,
  },
  {
    id: "capital-health",
    label: "Evaluate Income Sustainability (Capital Health)",
    enabled: () => true,
  },
  {
    id: "capital-stress",
    label: "Stress Test Resilience (Capital Stress)",
    enabled: (e) => e.canUseStressModel,
    tooltipDisabled: "Available on paid plans",
  },
  {
    id: "solutions",
    label: "Solutions & Execution",
    enabled: (e) => e.canSeeSolutions,
    tooltipDisabled: "Yearly plan only",
  },
];

export function DashboardTiles() {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
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
        const href =
          tile.id === "solutions"
            ? MODEL_URLS.solutions
            : modelTileHref(tile.id, e.plan);
        return (
          <div key={tile.id}>
            {enabled ? (
              <a
                href={href}
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
