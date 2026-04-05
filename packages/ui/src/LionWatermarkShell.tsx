"use client";

import type { ReactNode } from "react";
import { LionWatermarkBackdrop } from "./LionWatermarkBackdrop";

/**
 * Client wrapper for model layouts: fixed watermark behind main content (z-10 shell).
 */
export function LionWatermarkShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen" data-cb-lion-shell>
      <LionWatermarkBackdrop />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
