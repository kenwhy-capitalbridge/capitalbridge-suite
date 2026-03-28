"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** 0 = calm capital position, 1 = high structural stress (primary watermark driver). */
export type LionWatermarkDynamics = {
  capitalRiskNorm: number;
  /** Lion score 0–100 (secondary, subtle modifiers only). */
  lionScore: number;
};

const DEFAULT_DYNAMICS: LionWatermarkDynamics = {
  capitalRiskNorm: 0.35,
  lionScore: 50,
};

type Ctx = {
  dynamics: LionWatermarkDynamics;
  setDynamics: (patch: Partial<LionWatermarkDynamics>) => void;
};

const LionWatermarkDynamicsContext = createContext<Ctx | null>(null);

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_DYNAMICS.capitalRiskNorm;
  return Math.min(1, Math.max(0, n));
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_DYNAMICS.lionScore;
  return Math.min(100, Math.max(0, n));
}

export function LionWatermarkDynamicsProvider({ children }: { children: ReactNode }) {
  const [dynamics, setState] = useState<LionWatermarkDynamics>(DEFAULT_DYNAMICS);

  const setDynamics = useCallback((patch: Partial<LionWatermarkDynamics>) => {
    setState((prev) => ({
      capitalRiskNorm:
        patch.capitalRiskNorm !== undefined ? clamp01(patch.capitalRiskNorm) : prev.capitalRiskNorm,
      lionScore: patch.lionScore !== undefined ? clampScore(patch.lionScore) : prev.lionScore,
    }));
  }, []);

  const value = useMemo(() => ({ dynamics, setDynamics }), [dynamics, setDynamics]);

  return (
    <LionWatermarkDynamicsContext.Provider value={value}>{children}</LionWatermarkDynamicsContext.Provider>
  );
}

export function useLionWatermarkDynamics(): LionWatermarkDynamics {
  const ctx = useContext(LionWatermarkDynamicsContext);
  return ctx?.dynamics ?? DEFAULT_DYNAMICS;
}

export function useSetLionWatermarkDynamics(): (patch: Partial<LionWatermarkDynamics>) => void {
  const ctx = useContext(LionWatermarkDynamicsContext);
  return ctx?.setDynamics ?? (() => {});
}

/**
 * Pushes calculator-derived risk + score into the watermark (must render under {@link LionWatermarkDynamicsProvider}).
 */
export function LionWatermarkStateSync(props: { capitalRiskNorm: number; lionScore: number }) {
  const setDynamics = useSetLionWatermarkDynamics();

  useEffect(() => {
    setDynamics({
      capitalRiskNorm: clamp01(props.capitalRiskNorm),
      lionScore: clampScore(props.lionScore),
    });
  }, [props.capitalRiskNorm, props.lionScore, setDynamics]);

  return null;
}
