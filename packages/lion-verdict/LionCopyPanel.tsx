"use client";

import type { GetLionVerdictOutput } from "./getLionVerdict";
import type { Tier } from "./copy";
import { LionVerdictMark } from "./LionVerdictMark";
import {
  LION_VERDICT_HEADLINE,
  LION_VERDICT_HEADER_RULE,
  LION_VERDICT_PANEL_BOX,
  LION_VERDICT_TITLE,
} from "./lionVerdictPanelStyles";
import { LionVerdictScoreLine, LionVerdictStatusBadge } from "./LionVerdictStatusBadge";
import { buildPaidLionSectionModel } from "./lionVerdictSectionModel";

type LionCopyPanelProps = {
  copy: GetLionVerdictOutput | null;
  canSeeVerdict: boolean;
  className?: string;
  tier: Tier;
  score?: number;
};

const LD = "\u201C";
const RD = "\u201D";

/**
 * Paid Lion’s Verdict — headline + library guidance + preset options/decision boundary.
 * Kept compact for single printed page where possible.
 */
export function LionCopyPanel({ copy, canSeeVerdict, className, tier, score }: LionCopyPanelProps) {
  if (!canSeeVerdict || !copy) return null;
  const cleanHeadline = copy.headline?.replace(" ,", ",");
  const sectionModel = buildPaidLionSectionModel(copy, tier);

  return (
    <div
      className={`lion-verdict-one-page ${LION_VERDICT_PANEL_BOX} ${className ?? ""} max-h-[min(100vh,56rem)] space-y-3 overflow-y-auto sm:space-y-4 print:max-h-none print:overflow-visible`}
    >
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${LION_VERDICT_HEADER_RULE}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <LionVerdictMark className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
          <p className={LION_VERDICT_TITLE}>THE LION&apos;S VERDICT</p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end sm:text-right">
          <LionVerdictStatusBadge tierLabel={tier} />
          <LionVerdictScoreLine score={score} />
        </div>
      </div>

      <blockquote className="m-0 border-none p-0">
        <p className={`${LION_VERDICT_HEADLINE} !text-[clamp(0.95rem,2.5vw,1.05rem)] !leading-snug`} aria-live="polite">
          {LD}
          {cleanHeadline}
          {RD}
        </p>
      </blockquote>

      {copy.emphasis ? (
        <div className="rounded-xl border border-[#FFCC6A]/35 bg-[#16331f]/75 px-3 py-2 font-serif text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F6F5F1]/90 sm:px-4 sm:text-[11px] sm:tracking-[0.28em]">
          {copy.emphasis}
        </div>
      ) : null}

      <div className="space-y-2 text-[13px] leading-snug text-white/85 sm:space-y-2.5 sm:text-sm sm:leading-relaxed">
        {sectionModel.narrative.map(({ label, text }) => (
          <Section key={label} label={label} content={text} />
        ))}

        <div className="rounded-xl bg-[#122419]/85 px-3 py-2.5 sm:px-4 sm:py-3">
          <p className="mb-1.5 font-serif text-[10px] font-semibold uppercase tracking-[0.26em] text-[#FFCC6A] sm:text-[11px] sm:tracking-[0.28em]">
            Options
          </p>
          <ul className="list-none space-y-1 pl-0 text-[13px] leading-snug text-white/85 sm:text-sm sm:leading-relaxed">
            {sectionModel.options.map((option) => (
              <li key={option} className="flex gap-2">
                <span className="text-[#FFCC6A]" aria-hidden>
                  •
                </span>
                <span>{option}</span>
              </li>
            ))}
          </ul>
        </div>

        <Section label="Decision boundary" content={sectionModel.decisionBoundary} bordered />
      </div>
    </div>
  );
}

function Section({
  label,
  content,
  bordered,
}: {
  label: string;
  content: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 ${
        bordered ? "border border-[#FFCC6A]/22 bg-[#0f2219]/85" : "bg-[#122419]/85"
      }`}
    >
      <p className="mb-1 font-serif text-[10px] font-semibold uppercase tracking-[0.26em] text-[#FFCC6A] sm:text-[11px] sm:tracking-[0.28em]">
        {label}
      </p>
      <p className="text-[13px] leading-snug text-white/88 sm:text-sm sm:leading-relaxed">{content}</p>
    </div>
  );
}
