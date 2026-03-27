"use client";

import type { ReactNode } from "react";

type LionVerdictLockedProps = {
  className?: string;
  tierLabel?: string;
};

export function LionVerdictLocked({ className = "", tierLabel = "TRIAL" }: LionVerdictLockedProps) {
  return (
    <div
      className={`rounded-[18px] border border-[#FFCC6A]/20 bg-[#0B1D11]/70 px-6 py-6 text-left backdrop-blur-sm shadow-[0_10px_35px_rgba(0,0,0,0.35)] ${className}`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#FFCC6A]">THE LION&apos;S VERDICT</p>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/80">{tierLabel.replaceAll("_", " ")}</span>
        </div>
        <div>
          <h3 className="text-2xl font-black text-white">Unlock Your Lion’s Verdict</h3>
        <p className="text-sm text-white/80 mt-1">
          With care, the lion collapses. No footing remains.
        </p>
      </div>
        <p className="text-sm text-white/80">
          Your capital will not last indefinitely at your current withdrawal. The full analysis, exact depletion timeline, gap, and recovery plan are behind the lock.
        </p>
        <div className="rounded-xl border border-[#FFCC6A]/30 bg-gradient-to-br from-black/30 via-[#00160f]/80 to-black/50 p-4 text-[13px] text-white/70 tracking-wide">
          <div className="flex items-center gap-2 text-[#FFCC6A]">
            <span>🔒</span>
            <span className="font-semibold uppercase tracking-[0.2em] text-[10px]">Hidden analysis</span>
          </div>
          <ul className="mt-3 space-y-1">
            <li>• Exact year your capital runs out</li>
            <li>• How far short you are (RM gap)</li>
            <li>• What to change immediately to avoid depletion</li>
          </ul>
        </div>
        <button
          type="button"
          className="w-full text-center rounded-full bg-[#FFCC6A] px-6 py-3 text-sm font-semibold uppercase tracking-widest text-[#0D3A1D] shadow-[0_10px_30px_rgba(255,204,106,0.4)]"
        >
          Unlock your full financial diagnosis
        </button>
        <p className="text-xs text-white/60">See exactly when your money runs out — and how to fix it</p>
        <p className="text-[10px] text-white/70 uppercase tracking-[0.3em]">Without this, you’re making decisions blind.</p>
      </div>
    </div>
  );
}
