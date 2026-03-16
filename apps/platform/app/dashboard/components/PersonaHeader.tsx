"use client";

import { useEffect, useState } from "react";
import { createAppBrowserClient } from "@cb/supabase/browser";
import {
  fetchPersona,
  deriveEntitlements,
  type Persona,
  type Entitlements,
  type Plan,
} from "@cb/advisory-graph";

function daysLeft(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  const end = new Date(expiresAt).getTime();
  const now = Date.now();
  if (end <= now) return 0;
  return Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
}

function planDisplay(plan: Plan | null): string {
  if (!plan) return "TRIAL";
  return plan.toUpperCase();
}

function displayName(persona: Persona | null): string {
  if (!persona) return "Guest";
  if (persona.full_name?.trim()) return persona.full_name.trim();
  if (persona.email?.trim()) return persona.email.trim();
  return "Guest";
}

/**
 * Header greeting: Welcome, {name} • Plan: {PLAN} • {N} day(s) left.
 * Non-blocking: fallback to Guest / TRIAL / 0 when persona pending or RPC fails.
 */
export function PersonaHeader() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const supabase = createAppBrowserClient();
    fetchPersona(supabase).then((p) => {
      setPersona(p ?? null);
      setEntitlements(deriveEntitlements(p?.active_plan ?? null));
    });
  }, [mounted]);

  const name = displayName(persona);
  const plan = entitlements?.plan ?? null;
  const planLabel = planDisplay(plan);
  const dLeft = persona ? daysLeft(persona.expires_at) : 0;

  return (
    <p style={{ fontSize: "0.8rem", color: "rgba(246,245,241,0.8)", margin: "0.25rem 0 0" }}>
      Welcome, {name} • Plan: {planLabel} • {dLeft} day(s) left
    </p>
  );
}
