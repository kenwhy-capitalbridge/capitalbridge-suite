"use client";

import { useEffect, useMemo, useRef } from "react";
import { LionCopyPanel } from "./LionCopyPanel";
import { SystemInsightLimited } from "./SystemInsightLimited";
import { canAccessLion, type LionAccessUser } from "./access";
import {
  getLionVerdict,
  mapPersona,
  type GetLionVerdictOutput,
  type GlobalHistory,
  type HistoryEntry,
  type LionVerdictMemory,
} from "./getLionVerdict";
import type { Tier } from "./copy";
import type { PricingReturnModelSlug } from "@cb/shared/urls";

export type LionVerdictActiveProps = {
  user: LionAccessUser | null | undefined;
  userId: string;
  reportType: string;
  tier: Tier;
  confidenceScore: number;
  surplusRatio: number;
  score?: number;
  capital?: number;
  target?: number;
  withdrawal?: number;
  horizon?: string | number;
  gap?: number;
  progress?: number;
  horizonLabel?: string;
  riskTolerance: number;
  globalHistory?: GlobalHistory;
  className?: string;
  onCopyComputed?: (copy: GetLionVerdictOutput | null) => void;
  pricingReturnModel?: PricingReturnModelSlug;
  currency?: string;
  monthlyIncome?: number;
  monthlyExpense?: number;
  totalCapital?: number;
  targetCapital?: number;
  coverageRatio?: number;
  sustainabilityYears?: number;
  depletionPressure?: string | number;
  modelType?: "FOREVER" | "HEALTH" | "STRESS" | "IE";
};

export function LionVerdictActive({
  user,
  userId,
  reportType,
  tier,
  confidenceScore,
  surplusRatio,
  score,
  riskTolerance,
  globalHistory,
  className,
  onCopyComputed,
  pricingReturnModel,
  currency,
  monthlyIncome,
  monthlyExpense,
  totalCapital,
  targetCapital,
  coverageRatio,
  sustainabilityYears,
  depletionPressure,
  modelType,
}: LionVerdictActiveProps) {
  const hasAccess = canAccessLion(user);
  const historyRef = useRef<{ headline: HistoryEntry[]; guidance: HistoryEntry[] }>({
    headline: [],
    guidance: [],
  });
  const memoryRef = useRef<LionVerdictMemory>({
    usedHeadlines: [],
    usedGuidance: [],
  });
  const prevIndexRef = useRef<{ headline?: number; guidance?: number }>({});

  const hasEmittedRef = useRef(false);

  useEffect(() => {
    historyRef.current = { headline: [], guidance: [] };
    memoryRef.current = { usedHeadlines: [], usedGuidance: [] };
    prevIndexRef.current = {};
    hasEmittedRef.current = false;
  }, [reportType, tier]);

  useEffect(() => {
    hasEmittedRef.current = false;
  }, [userId, tier]);

  const persona = useMemo(() => mapPersona({ riskTolerance, surplusRatio }), [riskTolerance, surplusRatio]);

  const copy = useMemo(() => {
    if (!hasAccess) return null;
    const result = getLionVerdict({
      userId,
      reportType,
      tier,
      persona,
      confidenceScore,
      headlineHistory: historyRef.current.headline,
      guidanceHistory: historyRef.current.guidance,
      globalHistory,
      previousHeadlineIndex: prevIndexRef.current.headline,
      previousGuidanceIndex: prevIndexRef.current.guidance,
      memory: memoryRef.current,
      currency,
      monthlyIncome,
      monthlyExpense,
      totalCapital,
      targetCapital,
      coverageRatio,
      sustainabilityYears,
      lionScore: score,
      depletionPressure,
      modelType,
    });
    historyRef.current = result.history;
    memoryRef.current = result.memory;
    prevIndexRef.current = {
      headline: result.headlineIndex,
      guidance: result.guidanceIndex,
    };
    return result;
  }, [
    hasAccess,
    userId,
    reportType,
    tier,
    persona,
    confidenceScore,
    globalHistory,
    currency,
    monthlyIncome,
    monthlyExpense,
    totalCapital,
    targetCapital,
    coverageRatio,
    sustainabilityYears,
    depletionPressure,
    modelType,
    score,
  ]);

  useEffect(() => {
    if (!onCopyComputed || !copy || !hasAccess) return;
    if (hasEmittedRef.current) return;
    onCopyComputed(copy);
    hasEmittedRef.current = true;
  }, [copy, hasAccess, onCopyComputed]);

  useEffect(() => {
    if (!onCopyComputed) return;
    onCopyComputed(hasAccess ? copy : null);
  }, [copy, hasAccess, onCopyComputed]);

  /** Trial / campaign passes: same shell position as Lion’s Verdict, pricing CTA to full access. */
  if (!hasAccess && pricingReturnModel) {
    return <SystemInsightLimited className={className} pricingReturnModel={pricingReturnModel} />;
  }

  if (!copy) return null;

  if (!hasAccess) return null;

  return (
    <LionCopyPanel copy={copy} canSeeVerdict className={className} tier={tier} score={score} />
  );
}
