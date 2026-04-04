"use client";

import { useEffect, useRef } from "react";
import ForeverApp, { type ForeverAppHandle } from "@/legacy/App";
import { AdvisoryShell } from "./AdvisoryShell";
import { useForeverCalculatorContext } from "../ForeverCalculatorProvider";
import type { LionAccessUser } from "../../../../packages/lion-verdict/access";

type Props = {
  lionAccessUser: LionAccessUser;
  reportClientDisplayName: string;
  modelCurrencyPrefix?: string | null;
};

export function ForeverDashboardClient({
  lionAccessUser,
  reportClientDisplayName,
  modelCurrencyPrefix = null,
}: Props) {
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
      <ForeverApp
        ref={appRef}
        lionAccessUser={lionAccessUser}
        reportClientDisplayName={reportClientDisplayName}
        modelCurrencyPrefix={modelCurrencyPrefix}
      />
    </AdvisoryShell>
  );
}
