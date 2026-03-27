"use client";

import type { GetLionVerdictOutput } from "./getLionVerdict";
import { LionVerdictMark } from "./LionVerdictMark";
import { LION_VERDICT_HEADER_RULE, LION_VERDICT_PANEL_BOX } from "./lionVerdictPanelStyles";

type FullVerdict = {
  closingLine: string;
  reality: string;
  horizon: string;
  gap: string;
  progress: string;
  capitalReality: string;
  strategicOptions: string[];
  capitalDecision: string;
  scenarioGuidance: string;
  actionPlan: string[];
  doNothingOutcome: string;
};

type LionCopyPanelProps = {
  copy: GetLionVerdictOutput | null;
  canSeeVerdict: boolean;
  className?: string;
  tierLabel?: string;
  score?: number;
  fullVerdict?: FullVerdict;
};

const LD = "\u201C";
const RD = "\u201D";

export function LionCopyPanel({
  copy,
  canSeeVerdict,
  className,
  tierLabel,
  score,
  fullVerdict,
}: LionCopyPanelProps) {
  if (!canSeeVerdict || !copy || !fullVerdict) return null;
  const cleanHeadline = copy.headline?.replace(" ,", ",").replace("The lion", "the lion");

  return (
    <div className={`${LION_VERDICT_PANEL_BOX} ${className ?? ""} space-y-5`}>
      <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${LION_VERDICT_HEADER_RULE}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          <LionVerdictMark className="h-7 w-7 shrink-0 text-[#FFCC6A] sm:h-8 sm:w-8" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#FFCC6A]">
            THE LION&apos;S VERDICT
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end sm:text-right">
          {tierLabel ? (
            <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/85">
              {tierLabel.replaceAll("_", " ")}
            </div>
          ) : null}
          {typeof score === "number" ? (
            <div className="text-[20px] font-black tabular-nums tracking-wide text-[#FFCC6A] sm:text-[22px]">
              {Math.round(score)}
            </div>
          ) : null}
        </div>
      </div>

      <blockquote className="m-0 border-none p-0">
        <p
          className="font-serif text-xl font-bold italic leading-snug text-[#FFCC6A] sm:text-2xl sm:leading-tight lg:text-[1.65rem]"
          aria-live="polite"
        >
          {LD}
          {cleanHeadline}
          {RD}
        </p>
      </blockquote>

      {copy.emphasis ? (
        <div className="rounded-xl border border-[#FFCC6A]/35 bg-[#16331f]/75 px-4 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#F6F5F1]/90">
          {copy.emphasis}
        </div>
      ) : null}

      <div className="space-y-3 text-sm text-white/85">
        <Section label="Where things stand" content={fullVerdict.reality} />
        <Section label="How long the money may last" content={fullVerdict.horizon} />
        <Section label="The gap to close" content={fullVerdict.gap} />
        <Section label="Progress so far" content={fullVerdict.progress} />
        <Section label="What your money can realistically do" content={fullVerdict.capitalReality} />
        <div className="rounded-xl bg-[#122419]/85 px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#FFCC6A]">
            Options to discuss
          </p>
          <ul className="list-none space-y-1.5 pl-0 text-sm leading-relaxed text-white/85">
            {fullVerdict.strategicOptions.map((option) => (
              <li key={option} className="flex gap-2">
                <span className="text-[#FFCC6A]" aria-hidden>
                  •
                </span>
                <span>{option}</span>
              </li>
            ))}
          </ul>
        </div>
        <Section label="Decision on your money" content={fullVerdict.capitalDecision} bordered />
        <Section label="If things change" content={fullVerdict.scenarioGuidance} bordered />
        <div className="rounded-xl bg-[#122419]/85 px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#FFCC6A]">
            Practical next steps
          </p>
          <ul className="list-none space-y-1.5 pl-0 text-sm leading-relaxed text-white/85">
            {fullVerdict.actionPlan.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-[#FFCC6A]" aria-hidden>
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <Section label="If no changes are made" content={fullVerdict.doNothingOutcome} muted />
        <Section label="Closing thought" content={fullVerdict.closingLine} muted />
      </div>
    </div>
  );
}

function Section({
  label,
  content,
  bordered,
  muted,
}: {
  label: string;
  content: string;
  bordered?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3 ${
        bordered
          ? "border border-[#FFCC6A]/22 bg-[#0f2219]/85"
          : muted
            ? "bg-[#0a1810]/90"
            : "bg-[#122419]/85"
      }`}
    >
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#FFCC6A]">{label}</p>
      <p className="text-sm leading-relaxed text-white/88">{content}</p>
    </div>
  );
}
