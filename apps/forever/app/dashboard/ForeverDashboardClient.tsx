"use client";

import { useEffect, useRef } from "react";
import ForeverApp, { type ForeverAppHandle } from "@/legacy/App";
import { AdvisoryShell } from "./AdvisoryShell";
import { useForeverCalculatorContext } from "../ForeverCalculatorProvider";

export function ForeverDashboardClient() {
  const appRef = useRef<ForeverAppHandle>(null);
  const { setHandlers } = useForeverCalculatorContext();

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
    <AdvisoryShell>
      <ForeverApp ref={appRef} />
    </AdvisoryShell>
  );
}
