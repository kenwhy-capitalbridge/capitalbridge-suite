"use client";

import { useEffect, useRef } from "react";
import LegacyApp, { type CapitalStressAppHandle } from "@/legacy/App";
import { useModelSaveHandlers } from "@cb/advisory-graph/ModelSaveHandlersContext";
import type { LionAccessUser } from "../../../../packages/lion-verdict/access";

type Props = {
  canUseStressModel: boolean;
  canSeeVerdict: boolean;
  lionAccessUser: LionAccessUser;
};

export function CapitalStressDashboardClient({
  canUseStressModel,
  canSeeVerdict,
  lionAccessUser,
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
        canUseStressModel={canUseStressModel}
        canSeeVerdict={canSeeVerdict}
        lionAccessUser={lionAccessUser}
      />
    </main>
  );
}
