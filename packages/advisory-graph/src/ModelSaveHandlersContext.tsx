"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Passed when restoring from the header “Rolling saves” picker (model-specific UX). */
export type ApplyInputsMeta = {
  fromRollingSave?: boolean;
};

export type ModelSaveHandlers = {
  getInputs: () => Record<string, unknown>;
  getResults: () => Record<string, unknown>;
  applyInputs: (inputs: Record<string, unknown>, meta?: ApplyInputsMeta) => void;
};

type Ctx = {
  setHandlers: (h: ModelSaveHandlers | null) => void;
  getHandlers: () => ModelSaveHandlers | null;
  registered: boolean;
};

const ModelSaveHandlersContext = createContext<Ctx | null>(null);

export function ModelSaveHandlersProvider({ children }: { children: ReactNode }) {
  const ref = useRef<ModelSaveHandlers | null>(null);
  const [registered, setRegistered] = useState(false);
  const setHandlers = useCallback((h: ModelSaveHandlers | null) => {
    ref.current = h;
    setRegistered(!!h);
  }, []);
  const getHandlers = useCallback(() => ref.current, []);

  return (
    <ModelSaveHandlersContext.Provider value={{ setHandlers, getHandlers, registered }}>
      {children}
    </ModelSaveHandlersContext.Provider>
  );
}

export function useModelSaveHandlers(): Ctx {
  const ctx = useContext(ModelSaveHandlersContext);
  if (!ctx) {
    throw new Error("ModelSaveHandlersProvider is missing");
  }
  return ctx;
}
