"use client";

import { LOGIN_APP_URL } from "@cb/shared/urls";
import { LionVerdictMark } from "./LionVerdictMark";
import {
  LION_VERDICT_HEADLINE,
  LION_VERDICT_HEADER_RULE,
  LION_VERDICT_PANEL_BOX,
  LION_VERDICT_TITLE,
} from "./lionVerdictPanelStyles";
import { LionVerdictScoreLine, LionVerdictStatusBadge } from "./LionVerdictStatusBadge";

type LionVerdictLockedProps = {
  className?: string;
  tierLabel?: string;
  /** Shown as `Verdict Score=` when set (e.g. trial preview). */
  score?: number;
  /** Defaults to login app `/pricing` (subscribe / upgrade). */
  unlockHref?: string;
  headline?: string;
  teaserGuidance?: string[];
  hiddenGuidanceCount?: number;
};

const LD = "\u201C";
const RD = "\u201D";

function defaultUnlockHref(): string {
  const base = LOGIN_APP_URL.replace(/\/+$/, "");
  return `${base}/pricing`;
}

export function LionVerdictLocked({
  className = "",
  tierLabel = "TRIAL",
  score,
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
  const displayHeadline = headline || "Unlock your full Lion's Verdict";

  return (
    <div className={`${LION_VERDICT_PANEL_BOX} text-left ${className}`}>
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${LION_VERDICT_HEADER_RULE}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <LionVerdictMark className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
          <p className={LION_VERDICT_TITLE}>THE LION&apos;S VERDICT</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
          <LionVerdictStatusBadge tierLabel={tierLabel} />
          <LionVerdictScoreLine score={score} />
        </div>
      </div>

      <blockquote className="m-0 border-none p-0">
        <p className={LION_VERDICT_HEADLINE}>
          {LD}
          {displayHeadline}
          {RD}
        </p>
      </blockquote>

      <p className="text-sm leading-relaxed text-white/82">
        Plain-language guidance on whether your money can last — without guesswork or jargon.
      </p>
      <p className="text-sm leading-relaxed text-white/82">
        On a trial, we show you the direction of travel only. The full picture — how long your savings may last, how big
        the gap is in your currency, and practical next steps — unlocks with membership.
      </p>
      <div className="rounded-xl border border-[#FFCC6A]/30 bg-gradient-to-br from-black/30 via-[#00160f]/80 to-black/50 p-4 text-[13px] leading-relaxed text-white/72 tracking-wide">
        <div className="flex items-center gap-2 text-[#FFCC6A]">
          <span aria-hidden>🔒</span>
          <span className="font-serif text-[10px] font-semibold uppercase tracking-[0.22em]">Inside the full report</span>
        </div>
        <ul className="mt-3 list-none space-y-1.5 pl-0">
          {renderedGuidance.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="text-[#FFCC6A]" aria-hidden>
                •
              </span>
              <span>{line}</span>
            </li>
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
        className="block w-full rounded-full bg-[#FFCC6A] px-6 py-3 text-center text-sm font-semibold uppercase tracking-widest text-[#0D3A1D] shadow-[0_10px_30px_rgba(255,204,106,0.4)]"
      >
        See plans and unlock the full diagnosis
      </a>
      <p className="text-xs leading-relaxed text-white/60">This is educational planning — not a promise of investment returns.</p>
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/70">Good decisions start with a clear picture.</p>
    </div>
  );
}
