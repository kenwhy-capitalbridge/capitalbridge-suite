"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ForeverCalculatorHandlers = {
  getInputs: () => Record<string, unknown>;
  getResults: () => Record<string, unknown>;
  applyInputs: (inputs: Record<string, unknown>) => void;
};

type Ctx = {
  setHandlers: (h: ForeverCalculatorHandlers | null) => void;
  getHandlers: () => ForeverCalculatorHandlers | null;
  /** True after dashboard registers calculator ref (Save can read inputs). */
  registered: boolean;
};

const ForeverCalculatorContext = createContext<Ctx | null>(null);

export function ForeverCalculatorProvider({ children }: { children: ReactNode }) {
  const ref = useRef<ForeverCalculatorHandlers | null>(null);
  const [registered, setRegistered] = useState(false);
  const setHandlers = useCallback((h: ForeverCalculatorHandlers | null) => {
    ref.current = h;
    setRegistered(!!h);
  }, []);
  const getHandlers = useCallback(() => ref.current, []);

  return (
    <ForeverCalculatorContext.Provider value={{ setHandlers, getHandlers, registered }}>
      {children}
    </ForeverCalculatorContext.Provider>
  );
}

export function useForeverCalculatorContext(): Ctx {
  const ctx = useContext(ForeverCalculatorContext);
  if (!ctx) {
    throw new Error("ForeverCalculatorProvider is missing");
  }
  return ctx;
}
