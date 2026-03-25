"use client";

import type { ReactNode } from "react";

const useV2 = process.env.NEXT_PUBLIC_USE_V2 === "1";

type AdvisoryShellProps = {
  children: ReactNode;
};

/**
 * Layout wrapper for the Forever dashboard. Save/restore lives in the fixed header
 * (ForeverHeaderSaveRestore + ForeverCalculatorProvider).
 */
export function AdvisoryShell({ children }: AdvisoryShellProps) {
  if (!useV2) {
    return <>{children}</>;
  }

  return (
    <div style={{ padding: "1rem", maxWidth: 1200, margin: "0 auto" }}>
      {children}
    </div>
  );
}
