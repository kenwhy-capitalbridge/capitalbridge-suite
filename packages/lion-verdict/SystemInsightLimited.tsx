"use client";

import {
  LOGIN_APP_URL,
  PRICING_RETURN_MODEL_QUERY,
  type PricingReturnModelSlug,
} from "@cb/shared/urls";
import { LionVerdictMark } from "./LionVerdictMark";
import {
  LION_VERDICT_HEADER_RULE,
  LION_VERDICT_PANEL_BOX,
} from "./lionVerdictPanelStyles";
import { SYSTEM_INSIGHT_LIMITED_LINES, SYSTEM_INSIGHT_LIMITED_TITLE } from "./systemInsightCopy";

type SystemInsightLimitedProps = {
  className?: string;
  /** Defaults to login `/pricing` with optional `?model=` back-link. */
  pricingReturnModel?: PricingReturnModelSlug;
  unlockHref?: string;
  /** Short note above bullets (e.g. simulation not ready) — still observational. */
  preface?: string;
};

function defaultUnlockHref(pricingReturnModel?: PricingReturnModelSlug): string {
  const base = LOGIN_APP_URL.replace(/\/+$/, "");
  const path = `${base}/pricing`;
  return pricingReturnModel ? `${path}?${PRICING_RETURN_MODEL_QUERY}=${pricingReturnModel}` : path;
}

/**
 * Trial / non-entitled insight — not The Lion’s Verdict; no headline, score, or decisive timing language.
 */
export function SystemInsightLimited({
  className = "",
  pricingReturnModel,
  unlockHref,
  preface,
}: SystemInsightLimitedProps) {
  const href = unlockHref ?? defaultUnlockHref(pricingReturnModel);

  return (
    <div className={`${LION_VERDICT_PANEL_BOX} text-left ${className}`}>
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${LION_VERDICT_HEADER_RULE}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <LionVerdictMark className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
          <p className="font-serif text-[10px] font-semibold uppercase tracking-[0.22em] text-[#FFCC6A]">
            {SYSTEM_INSIGHT_LIMITED_TITLE}
          </p>
        </div>
      </div>

      {preface ? (
        <p className="mb-4 text-sm leading-relaxed text-white/78 sm:mb-5">{preface}</p>
      ) : null}

      <ul className="mb-7 list-none space-y-2.5 pl-0 text-sm leading-relaxed text-white/82 sm:mb-8 sm:space-y-3">
        {SYSTEM_INSIGHT_LIMITED_LINES.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="shrink-0 text-[#FFCC6A]" aria-hidden>
              •
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <a
        href={href}
        rel="noopener noreferrer"
        className="cb-gold-primary-cta mx-auto mb-7 w-full max-w-none !rounded-full px-4 py-3 text-center text-[10px] font-semibold uppercase leading-snug tracking-[0.08em] sm:mb-8 sm:px-6 sm:text-xs sm:tracking-[0.12em] md:text-sm md:tracking-widest"
        aria-label="See plans for full Lion Verdict access"
      >
        See plans for full Lion Verdict access
      </a>
      <p className="mb-3 text-xs leading-relaxed text-white/60 sm:mb-4">
        Educational planning only — not a promise of outcomes.
      </p>
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/70">Good decisions start with a clear picture.</p>
    </div>
  );
}
