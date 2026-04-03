"use client";

import { useCallback, useEffect, useState } from "react";
import { ChromeSpinnerGlyph } from "@cb/ui";
import { createSupabaseBrowserClient } from "@cb/advisory-graph/supabaseClient";
import {
  fetchPersona,
  deriveEntitlements,
  strategicExecutionTierLabel,
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
};

/** In-app priority access flow (auth required by /solutions). */
const STRATEGIC_EXECUTION_HREF = "/solutions";

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

type ModelTile = {
  kind: "model";
  id: string;
  label: string;
  enabled: (e: Entitlements) => boolean;
  tooltipDisabled?: string;
};

type StrategicTile = {
  kind: "strategic";
  id: "strategic-execution";
  title: string;
  description: string;
  ctaLabel: string;
  enabled: (e: Entitlements) => boolean;
};

type Tile = ModelTile | StrategicTile;

const TILES: Tile[] = [
  {
    kind: "model",
    id: "forever-income",
    label: "Forever Income",
    enabled: () => true,
  },
  {
    kind: "model",
    id: "income-engineering",
    label: "Income Engineering",
    enabled: () => true,
  },
  {
    kind: "model",
    id: "capital-health",
    label: "Evaluate Income Sustainability (Capital Health)",
    enabled: () => true,
  },
  {
    kind: "model",
    id: "capital-stress",
    label: "Stress Test Resilience (Capital Stress)",
    enabled: (e) => e.canUseStressModel,
    tooltipDisabled: "Available on paid plans",
  },
  {
    kind: "strategic",
    id: "strategic-execution",
    title: "Strategic Execution",
    description:
      "Move beyond analysis into structured execution with Capital Bridge™",
    ctaLabel: "Request Access",
    enabled: () => true,
  },
];

export function DashboardTiles() {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const navigateTo = useCallback((href: string) => {
    if (pendingHref) return;
    setPendingHref(href);
    window.location.assign(href);
  }, [pendingHref]);

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
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
        gap: 16,
        alignItems: "stretch",
      }}
    >
      {TILES.map((tile) => {
        const enabled = tile.enabled(e);
        const tilesLocked = pendingHref !== null;

        if (tile.kind === "strategic") {
          const href = STRATEGIC_EXECUTION_HREF;
          const tileBusy = pendingHref === href;
          const tierLine = strategicExecutionTierLabel(e.plan);
          return (
            <div key={tile.id} style={{ display: "flex", minWidth: 0, minHeight: "100%" }}>
              {enabled ? (
                <div
                  style={{
                    width: "100%",
                    minHeight: "100%",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    padding: "1rem 1.25rem",
                    border: "1px solid rgba(255,204,106,0.38)",
                    borderRadius: 8,
                    backgroundColor: "rgba(255,204,106,0.09)",
                    backgroundImage:
                      "linear-gradient(165deg, rgba(255,204,106,0.06) 0%, transparent 55%)",
                    boxShadow: "0 0 0 1px rgba(255,204,106,0.05)",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 0.45rem",
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(255,204,106,0.78)",
                      lineHeight: 1.35,
                    }}
                  >
                    {tierLine}
                  </p>
                  <h3
                    style={{
                      margin: "0 0 0.45rem",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "rgba(255,204,106,0.95)",
                    }}
                  >
                    {tile.title}
                  </h3>
                  <p
                    style={{
                      margin: "0 0 0.85rem",
                      fontSize: "0.88rem",
                      lineHeight: 1.45,
                      color: "rgba(246,245,241,0.82)",
                      fontStyle: "italic",
                    }}
                  >
                    {tile.description}
                  </p>
                  <button
                    type="button"
                    disabled={tilesLocked}
                    aria-busy={tileBusy}
                    onClick={() => navigateTo(href)}
                    style={{
                      display: tileBusy ? "flex" : "block",
                      alignItems: tileBusy ? "center" : undefined,
                      justifyContent: tileBusy ? "center" : undefined,
                      width: "100%",
                      marginTop: "auto",
                      textAlign: tileBusy ? "center" : "center",
                      padding: "0.65rem 0.85rem",
                      border: "2px solid transparent",
                      borderRadius: 8,
                      background: "var(--gold, #ffcc6a)",
                      color: "var(--green, #0d3a1d)",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      cursor: tilesLocked ? "wait" : "pointer",
                      fontFamily: "inherit",
                      opacity: tilesLocked && !tileBusy ? 0.55 : 1,
                    }}
                  >
                    {tileBusy ? (
                      <span className="cb-pending-btn-inner">
                        <ChromeSpinnerGlyph sizePx={18} />
                        <span className="cb-visually-hidden">Loading</span>
                      </span>
                    ) : (
                      tile.ctaLabel
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          );
        }

        const href = modelTileHref(tile.id, e.plan);
        const tileBusy = pendingHref === href;

        return (
          <div key={tile.id}>
            {enabled ? (
              <button
                type="button"
                disabled={tilesLocked}
                aria-busy={tileBusy}
                onClick={() => navigateTo(href)}
                style={{
                  display: tileBusy ? "flex" : "block",
                  alignItems: tileBusy ? "center" : undefined,
                  justifyContent: tileBusy ? "center" : undefined,
                  width: "100%",
                  textAlign: tileBusy ? "center" : "left",
                  padding: "1rem 1.25rem",
                  border: "1px solid rgba(255,204,106,0.35)",
                  borderRadius: 8,
                  backgroundColor: "rgba(255,204,106,0.08)",
                  color: "rgba(246,245,241,0.95)",
                  fontSize: "0.95rem",
                  textDecoration: "none",
                  cursor: tilesLocked ? "wait" : "pointer",
                  fontFamily: "inherit",
                  opacity: tilesLocked && !tileBusy ? 0.55 : 1,
                }}
              >
                {tileBusy ? (
                  <span className="cb-pending-btn-inner">
                    <ChromeSpinnerGlyph sizePx={18} />
                    <span className="cb-visually-hidden">Loading</span>
                  </span>
                ) : (
                  tile.label
                )}
              </button>
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
