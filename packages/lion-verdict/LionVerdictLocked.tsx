"use client";

import type { ReactNode } from "react";

type LionVerdictLockedProps = {
  className?: string;
  children?: ReactNode;
};

export function LionVerdictLocked({ className = "", children }: LionVerdictLockedProps) {
  return (
    <div
      className={`rounded-[18px] border border-[#FFCC6A]/20 bg-[#0B1D11]/70 px-6 py-6 text-left backdrop-blur-sm shadow-[0_10px_35px_rgba(0,0,0,0.35)] ${className}`}
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#FFCC6A]">The Lion&apos;s Verdict</p>
        <h3 className="text-2xl font-black text-white">Unlock Your Lion’s Verdict</h3>
        <p className="text-sm text-white/80">
          See how sustainable your income strategy truly is. The Lion&apos;s Verdict evaluates your structure, highlights risks, and guides your next move.
        </p>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full bg-[#FFCC6A] px-6 py-3 text-sm font-semibold uppercase tracking-widest text-[#0D3A1D] shadow-[0_10px_30px_rgba(255,204,106,0.4)]"
        >
          Unlock full access for RM1 / 7 days
        </button>
        {children ? <div className="text-xs text-white/70">{children}</div> : null}
      </div>
    </div>
  );
}
