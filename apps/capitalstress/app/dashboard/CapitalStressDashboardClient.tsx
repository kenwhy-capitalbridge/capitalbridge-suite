"use client";

import { useEffect, useRef } from "react";
import LegacyApp, { type CapitalStressAppHandle } from "@/legacy/App";
import { useModelSaveHandlers } from "@cb/advisory-graph/ModelSaveHandlersContext";
import type { LionAccessUser } from "../../../../packages/lion-verdict/access";

type Props = {
  advisoryUserId: string;
  canUseStressModel: boolean;
  canSeeVerdict: boolean;
  lionAccessUser: LionAccessUser;
  reportClientDisplayName: string;
  initialCurrencyLabel?: string | null;
};

export function CapitalStressDashboardClient({
  advisoryUserId,
  canUseStressModel,
  canSeeVerdict,
  lionAccessUser,
  reportClientDisplayName,
  initialCurrencyLabel = null,
}: Props) {
  const appRef = useRef<CapitalStressAppHandle>(null);
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
      <LegacyApp
        ref={appRef}
        advisoryUserId={advisoryUserId}
        canUseStressModel={canUseStressModel}
        canSeeVerdict={canSeeVerdict}
        lionAccessUser={lionAccessUser}
        reportClientDisplayName={reportClientDisplayName}
        initialCurrencyLabel={initialCurrencyLabel}
      />
    </main>
  );
}
