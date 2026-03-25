/**
 * Single authoritative store for Capital Depletion Pressure bar output.
 * Header bar, section bar, header pill, section pill, and advisory read the same reference.
 * No per-component memos or selectors; one instance per mcResult.depletionPressurePct.
 */

import React, { useMemo, useRef, createContext, useContext } from 'react';
import type { MonteCarloResult } from './types';
import { getDepletionBarOutput } from './services/mathUtils';

export type DepletionBarOutput = ReturnType<typeof getDepletionBarOutput> & { instanceId: number };

const DepletionBarContext = createContext<DepletionBarOutput | null>(null);

export function DepletionBarProvider({
  mcResult,
  children,
}: {
  mcResult: MonteCarloResult | null;
  children: React.ReactNode;
}) {
  const instanceIdRef = useRef(0);
  const value = useMemo(() => {
    if (mcResult == null) return null;
    const raw = getDepletionBarOutput(mcResult.depletionPressurePct);
    instanceIdRef.current += 1;
    return { ...raw, instanceId: instanceIdRef.current };
  }, [mcResult?.depletionPressurePct, mcResult]);

  return (
    <DepletionBarContext.Provider value={value}>
      {children}
    </DepletionBarContext.Provider>
  );
}

export function useDepletionBar(): DepletionBarOutput | null {
  return useContext(DepletionBarContext);
}

/** Render prop so content receives same instance; no duplicate memos. */
export function DepletionBarConsumers({
  children,
}: {
  children: (depletionBarOutput: DepletionBarOutput | null) => React.ReactNode;
}) {
  const depletionBarOutput = useDepletionBar();
  return <>{children(depletionBarOutput)}</>;
}
