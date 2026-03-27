"use client";

import { useEffect, useMemo, useRef } from "react";
import { LionCopyPanel } from "./LionCopyPanel";
import { canAccessLion, type LionAccessUser } from "./access";
import {
  getLionVerdict,
  mapPersona,
  type GetLionVerdictOutput,
  type GlobalHistory,
  type HistoryEntry,
  type Tier,
} from "./getLionVerdict";

export type LionVerdictActiveProps = {
  user: LionAccessUser | null | undefined;
  userId: string;
  reportType: string;
  tier: Tier;
  confidenceScore: number;
  surplusRatio: number;
  riskTolerance: number;
  globalHistory?: GlobalHistory;
  className?: string;
  onCopyComputed?: (copy: GetLionVerdictOutput | null) => void;
};

export function LionVerdictActive({
  user,
  userId,
  reportType,
  tier,
  confidenceScore,
  surplusRatio,
  riskTolerance,
  globalHistory,
  className,
  onCopyComputed,
}: LionVerdictActiveProps) {
  const hasAccess = canAccessLion(user);
  const historyRef = useRef<{ headline: HistoryEntry[]; guidance: HistoryEntry[] }>({
    headline: [],
    guidance: [],
  });
  const prevIndexRef = useRef<{ headline?: number; guidance?: number }>({});

  const hasEmittedRef = useRef(false);

  useEffect(() => {
    if (!hasAccess) {
      historyRef.current = { headline: [], guidance: [] };
      prevIndexRef.current = {};
    }
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess) return;
    historyRef.current = { headline: [], guidance: [] };
    prevIndexRef.current = {};
    hasEmittedRef.current = false;
  }, [reportType, tier, hasAccess]);

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
    });
    historyRef.current = result.history;
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

  if (!hasAccess || !copy) return null;

  return <LionCopyPanel copy={copy} canSeeVerdict className={className} tierLabel={tier} />;
}
