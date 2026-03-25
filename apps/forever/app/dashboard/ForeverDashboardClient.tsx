"use client";

import { useRef } from "react";
import ForeverApp, { type ForeverAppHandle } from "@/legacy/App";
import { AdvisoryShell } from "./AdvisoryShell";

export function ForeverDashboardClient({ userId }: { userId: string }) {
  const appRef = useRef<ForeverAppHandle>(null);

  return (
    <AdvisoryShell
      userId={userId}
      getInputs={() => appRef.current?.getInputs() ?? {}}
      getResults={() => appRef.current?.getResults() ?? {}}
      onRestoreInputs={(inputs) => appRef.current?.applyInputs(inputs)}
    >
      <ForeverApp ref={appRef} />
    </AdvisoryShell>
  );
}
