"use client";

import type { GetLionVerdictOutput } from "./getLionVerdict";

type LionCopyPanelProps = {
  copy: GetLionVerdictOutput | null;
  canSeeVerdict: boolean;
  className?: string;
  tierLabel?: string;
};

export function LionCopyPanel({ copy, canSeeVerdict, className, tierLabel }: LionCopyPanelProps) {
  if (!canSeeVerdict || !copy) return null;
  return (
    <div
      className={`${className ?? ""} w-full rounded-[18px] border border-[#FFCC6A]/20 bg-[#0B1D11]/80 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.45)] backdrop-blur-sm`}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#FFCC6A]">THE LION&apos;S VERDICT</p>
        {tierLabel ? (
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/80">{tierLabel.replaceAll("_", " ")}</span>
        ) : null}
      </div>
      <div className="mb-3">
        <p className="text-lg sm:text-2xl font-black text-[#FFCC6A] leading-snug">{copy.headline}</p>
      </div>
      <div className="mb-4">
        <p className="text-sm text-white">{copy.guidance}</p>
      </div>
      {copy.emphasis && (
        <div className="rounded-xl bg-[#16331f]/60 p-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#F6F5F1]/90">
          {copy.emphasis}
        </div>
      )}
    </div>
  );
}
