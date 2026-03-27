"use client";

import { LOGIN_APP_URL } from "@cb/shared/urls";

type LionVerdictLockedProps = {
  className?: string;
  tierLabel?: string;
  /** Defaults to login app `/pricing` (subscribe / upgrade). */
  unlockHref?: string;
  headline?: string;
  teaserGuidance?: string[];
  hiddenGuidanceCount?: number;
};

function defaultUnlockHref(): string {
  const base = LOGIN_APP_URL.replace(/\/+$/, "");
  return `${base}/pricing`;
}

export function LionVerdictLocked({
  className = "",
  tierLabel = "TRIAL",
  unlockHref,
  headline,
  teaserGuidance,
  hiddenGuidanceCount = 2,
}: LionVerdictLockedProps) {
  const href = unlockHref ?? defaultUnlockHref();
  const guidance = (teaserGuidance ?? []).filter(Boolean).slice(0, 2);
  const fallbackGuidance = [
    "A clear timeline: when funds may run low",
    "Simple actions to reduce the risk of running out",
  ];
  const renderedGuidance = guidance.length > 0 ? guidance : fallbackGuidance;
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
          <h3 className="text-2xl font-black text-white">{headline || "Unlock your full Lion's Verdict"}</h3>
          <p className="text-sm text-white/80 mt-1">
            Plain-language guidance on whether your money can last — without guesswork or jargon.
          </p>
        </div>
        <p className="text-sm text-white/80">
          On a trial, we show you the direction of travel only. The full picture — how long your savings may last, how big the gap is in your currency, and practical next steps — unlocks with membership.
        </p>
        <div className="rounded-xl border border-[#FFCC6A]/30 bg-gradient-to-br from-black/30 via-[#00160f]/80 to-black/50 p-4 text-[13px] text-white/70 tracking-wide">
          <div className="flex items-center gap-2 text-[#FFCC6A]">
            <span aria-hidden>🔒</span>
            <span className="font-semibold uppercase tracking-[0.2em] text-[10px]">Inside the full report</span>
          </div>
          <ul className="mt-3 space-y-1">
            {renderedGuidance.map((line) => (
              <li key={line}>• {line}</li>
            ))}
            {hiddenGuidanceCount > 0 ? (
              <li className="text-white/55">
                • +{hiddenGuidanceCount} more detailed action line{hiddenGuidanceCount > 1 ? "s" : ""} hidden
              </li>
            ) : null}
          </ul>
        </div>
        <a
          href={href}
          rel="noopener noreferrer"
          className="block w-full text-center rounded-full bg-[#FFCC6A] px-6 py-3 text-sm font-semibold uppercase tracking-widest text-[#0D3A1D] shadow-[0_10px_30px_rgba(255,204,106,0.4)]"
        >
          See plans and unlock the full diagnosis
        </a>
        <p className="text-xs text-white/60">This is educational planning — not a promise of investment returns.</p>
        <p className="text-[10px] text-white/70 uppercase tracking-[0.3em]">Good decisions start with a clear picture.</p>
      </div>
    </div>
  );
}
