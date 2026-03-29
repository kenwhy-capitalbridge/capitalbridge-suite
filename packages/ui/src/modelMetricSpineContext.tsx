"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type ModelMetricSpineSlot = {
  labelDesktop: string;
  labelMobile: string;
  value: ReactNode;
};

export type ModelMetricSpinePayload = {
  slot1: ModelMetricSpineSlot;
  slot2: ModelMetricSpineSlot;
  slot3: ModelMetricSpineSlot;
};

type Ctx = {
  spine: ModelMetricSpinePayload | null;
  setSpine: (next: ModelMetricSpinePayload | null) => void;
};

const ModelMetricSpineContext = createContext<Ctx | null>(null);

export function ModelMetricSpineProvider({ children }: { children: ReactNode }) {
  const [spine, setSpine] = useState<ModelMetricSpinePayload | null>(null);
  const value = useMemo(() => ({ spine, setSpine }), [spine]);
  return (
    <ModelMetricSpineContext.Provider value={value}>{children}</ModelMetricSpineContext.Provider>
  );
}

export function useModelMetricSpine(): Ctx {
  const ctx = useContext(ModelMetricSpineContext);
  return (
    ctx ?? {
      spine: null,
      setSpine: () => {},
    }
  );
}
