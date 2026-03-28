"use client";

import type { ReactNode } from "react";
import { LionWatermarkBackdrop } from "./LionWatermarkBackdrop";
import { LionWatermarkDynamicsProvider } from "./lionWatermarkDynamics";

/**
 * Client wrapper: monorepo-root layouts use this so {@link LionWatermarkBackdrop} shares dynamics context with model apps.
 */
export function LionWatermarkShell({ children }: { children: ReactNode }) {
  return (
    <LionWatermarkDynamicsProvider>
      <div className="relative min-h-screen">
        <LionWatermarkBackdrop />
        <div className="relative z-10">{children}</div>
      </div>
    </LionWatermarkDynamicsProvider>
  );
}
