"use client";

import type { GetLionVerdictOutput } from "./getLionVerdict";

type LionCopyPanelProps = {
  copy: GetLionVerdictOutput | null;
  canSeeVerdict: boolean;
  className?: string;
};

export function LionCopyPanel({ copy, canSeeVerdict, className }: LionCopyPanelProps) {
  if (!canSeeVerdict || !copy) return null;
  return (
    <div className={className ?? "space-y-2 text-[13px] text-[#F6F5F1]"}>
      <p className="text-base sm:text-lg font-semibold text-[#FFCC6A] italic">{copy.headline}</p>
      <p className="text-sm text-white">{copy.guidance}</p>
      {copy.emphasis && <p className="text-xs text-[#F6F5F1]/80 italic">{copy.emphasis}</p>}
    </div>
  );
}
