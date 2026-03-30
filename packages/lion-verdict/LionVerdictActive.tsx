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
    });
    historyRef.current = result.history;
    memoryRef.current = result.memory;
    prevIndexRef.current = {
      headline: result.headlineIndex,
      guidance: result.guidanceIndex,
    };
    return result;
  }, [
    userId,
    reportType,
    tier,
    persona,
    confidenceScore,
    globalHistory,
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

  if (!copy) return null;

  if (!hasAccess) {
    return <SystemInsightLimited pricingReturnModel={pricingReturnModel} />;
  }

  return (
    <LionCopyPanel copy={copy} canSeeVerdict className={className} tier={tier} score={score} />
  );
}
