"use client";

import { useEffect, useMemo, useRef } from "react";
import { LionCopyPanel } from "./LionCopyPanel";
import { LionVerdictLocked } from "./LionVerdictLocked";
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
};

export function LionVerdictActive({
  user,
  userId,
  reportType,
  tier,
  confidenceScore,
  surplusRatio,
  score,
  horizon,
  gap,
  target,
  horizonLabel,
  progress,
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
    return (
      <LionVerdictLocked tierLabel={tier} score={score} headline={copy.headline} />
    );
  }

  const formatRmValue = (value?: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? value.toLocaleString('en-US', { maximumFractionDigits: 0 })
      : '0';
  const formattedGap = formatRmValue(gap);
  const formattedTarget = formatRmValue(target);
  const progressValue =
    typeof progress === 'number' && Number.isFinite(progress) ? progress.toFixed(1) : '0';
  const horizonNumeric =
    typeof horizon === 'number' && Number.isFinite(horizon) ? horizon.toFixed(1) : null;
  const horizonDescriptor = horizonNumeric ?? horizonLabel ?? (typeof horizon === 'string' ? horizon : '0');
  const horizonWithYears = `${horizonDescriptor} years`;
  const realityLine = 'Your current income strategy is not sustainable under present conditions.';
  const capitalRealityLine =
    'At this level, your plan will lead to capital depletion unless adjustments are made.';
  const horizonLine = `Your capital is likely to last approximately ${horizonDescriptor} years at your current withdrawal.`;
  const gapLine = `To sustain this income indefinitely, you require approximately RM ${formattedTarget}, leaving a shortfall of RM ${formattedGap}.`;
  const progressLine = `You have currently achieved ${progressValue}% of the capital required for long-term sustainability.`;
  const capitalDecisionLine = 'Immediate adjustment is required to restore sustainability.';
  const doNothingLine = `If no changes are made, your capital will be depleted in approximately ${horizonDescriptor} years.`;

  const fullVerdict = {
    closingLine: copy.guidanceBullets.join(" "),
    reality: realityLine,
    horizon: horizonLine,
    gap: gapLine,
    progress: progressLine,
    capitalReality: capitalRealityLine,
    strategicOptions: [
      'Reduce withdrawals',
      'Increase capital',
      'Improve returns',
    ],
    capitalDecision: capitalDecisionLine,
    scenarioGuidance: `Under weaker market conditions, depletion is likely to occur even earlier.`,
    actionPlan: [
      'Adjust withdrawals immediately',
      'Reassess capital allocation',
      'Increase savings or contributions',
    ],
    doNothingOutcome: doNothingLine,
  };

  return (
    <LionCopyPanel
      copy={copy}
      canSeeVerdict
      className={className}
      tierLabel={tier}
      score={score}
      fullVerdict={fullVerdict}
    />
  );
}
