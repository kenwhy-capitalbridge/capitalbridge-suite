"use client";

import { useLayoutEffect, useRef } from "react";
import LegacyApp, { type IncomeEngineeringAppHandle } from "@/legacy/App";
import {
  type ApplyInputsMeta,
  useModelSaveHandlers,
} from "@cb/advisory-graph/ModelSaveHandlersContext";
import type { CurrencyCode } from "@/legacy/config/currency";
import type { LionAccessUser } from "../../../../packages/lion-verdict/access";

type Props = {
  lionAccessUser: LionAccessUser;
  reportClientDisplayName: string;
  initialCurrencyCode?: CurrencyCode;
};

export function IncomeEngineeringDashboardClient({
  lionAccessUser,
  reportClientDisplayName,
  initialCurrencyCode,
}: Props) {
  const appRef = useRef<IncomeEngineeringAppHandle>(null);
  const { setHandlers } = useModelSaveHandlers();

  useLayoutEffect(() => {
    const handlers = {
      getInputs: () => appRef.current?.getInputs() ?? {},
      getResults: () => appRef.current?.getResults() ?? {},
      applyInputs: (inputs: Record<string, unknown>, meta?: ApplyInputsMeta) =>
        appRef.current?.applyInputs(inputs, meta),
    };
    setHandlers(handlers);
    return () => setHandlers(null);
  }, [setHandlers]);

  return (
    <main>
      <LegacyApp
        ref={appRef}
        lionAccessUser={lionAccessUser}
        reportClientDisplayName={reportClientDisplayName}
        initialCurrencyCode={initialCurrencyCode}
      />
    </main>
  );
}
