"use client";

import { useEffect, useRef } from "react";
import LegacyApp, { type CapitalHealthAppHandle } from "@/legacy/App";
import { useModelSaveHandlers } from "@cb/advisory-graph/ModelSaveHandlersContext";

type Props = {
  canSeeVerdict: boolean;
};

export function CapitalHealthDashboardClient({ canSeeVerdict }: Props) {
  const appRef = useRef<CapitalHealthAppHandle>(null);
  const { setHandlers } = useModelSaveHandlers();

  useEffect(() => {
    const handlers = {
      getInputs: () => appRef.current?.getInputs() ?? {},
      getResults: () => appRef.current?.getResults() ?? {},
      applyInputs: (inputs: Record<string, unknown>) => appRef.current?.applyInputs(inputs),
    };
    setHandlers(handlers);
    return () => setHandlers(null);
  }, [setHandlers]);

  return (
    <main>
      <LegacyApp ref={appRef} canSeeVerdict={canSeeVerdict} />
    </main>
  );
}
