"use client";

import { useEffect, useRef } from "react";
import LegacyApp, { type CapitalHealthAppHandle } from "@/legacy/App";
import { useModelSaveHandlers } from "@cb/advisory-graph/ModelSaveHandlersContext";
import type { LionAccessUser } from "../../../../packages/lion-verdict/access";

type Props = {
  canSeeVerdict: boolean;
  lionAccessUser: LionAccessUser;
  reportClientDisplayName: string;
  /** When omitted (e.g. preview), legacy app uses built-in defaults. */
  defaultCurrencyCode?: string | null;
};

export function CapitalHealthDashboardClient({
  canSeeVerdict,
  lionAccessUser,
  reportClientDisplayName,
  defaultCurrencyCode = null,
}: Props) {
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
    <main className="min-w-0 w-full">
      <LegacyApp
        ref={appRef}
        canSeeVerdict={canSeeVerdict}
        lionAccessUser={lionAccessUser}
        reportClientDisplayName={reportClientDisplayName}
        defaultCurrencyCode={defaultCurrencyCode}
      />
    </main>
  );
}
