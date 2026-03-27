"use client";

import type { GetLionVerdictOutput } from "./getLionVerdict";

type FullVerdict = {
  openingLine: string;
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

export function LionCopyPanel({
  copy,
  canSeeVerdict,
  className,
  tierLabel,
  score,
  fullVerdict,
}: LionCopyPanelProps) {
  if (!canSeeVerdict || !copy || !fullVerdict) return null;
  const cleanHeadline = copy.headline?.replace(' ,', ',').replace('The lion', 'the lion');
  return (
    <div
      className={`${className ?? ""} w-full rounded-[18px] border border-[#FFCC6A]/20 bg-[#0B1D11]/90 p-6 shadow-[0_20px_45px_rgba(0,0,0,0.45)] backdrop-blur-sm space-y-6`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#FFCC6A]">THE LION&apos;S VERDICT</p>
        <div className="text-right">
          {tierLabel ? (
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/80">
              {tierLabel.replaceAll("_", " ")}
            </div>
          ) : null}
          {typeof score === "number" ? (
            <div className="text-[18px] font-black tracking-wide text-[#FFCC6A]">{Math.round(score)}</div>
          ) : null}
        </div>
      </div>
      <div>
        <p className="text-lg sm:text-2xl font-black text-[#FFCC6A] leading-snug" aria-live="polite">
          {cleanHeadline}
        </p>
      </div>
      <div>
        <p className="text-sm text-white leading-relaxed">{fullVerdict.openingLine}</p>
      </div>
      {copy.emphasis && (
        <div className="rounded-xl border border-[#FFCC6A]/40 bg-[#16331f]/70 p-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#F6F5F1]/90">
          {copy.emphasis}
        </div>
      )}
      <div className="space-y-4 text-sm text-white/80">
        <Section label="Reality" content={fullVerdict.reality} />
        <Section label="Horizon" content={fullVerdict.horizon} />
        <Section label="Gap" content={fullVerdict.gap} />
        <Section label="Progress" content={fullVerdict.progress} />
        <Section label="Capital reality" content={fullVerdict.capitalReality} />
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#FFCC6A] mb-2">Strategic options</p>
          <ul className="space-y-1 pl-4 text-xs text-white/80">
            {fullVerdict.strategicOptions.map((option) => (
              <li key={option} className="leading-snug">
                {option}
              </li>
            ))}
          </ul>
        </div>
        <Section label="Capital decision" content={fullVerdict.capitalDecision} bordered />
        <Section label="Scenario guidance" content={fullVerdict.scenarioGuidance} bordered />
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#FFCC6A] mb-2">Action plan</p>
          <ul className="space-y-1 pl-4 text-xs text-white/80">
            {fullVerdict.actionPlan.map((item) => (
              <li key={item} className="leading-snug">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg bg-[#122419]/90 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#FFCC6A] mb-1">If you do nothing</p>
          <p>{fullVerdict.doNothingOutcome}</p>
        </div>
        <div className="text-sm text-white/80">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#FFCC6A] mb-1">Closing line</p>
          <p>{fullVerdict.closingLine}</p>
        </div>
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
      className={`rounded-lg px-4 py-3 ${bordered ? "border border-[#FFCC6A]/20 bg-[#0f2219]/80" : "bg-[#122419]/80"}`}
    >
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#FFCC6A] mb-1">{label}</p>
      <p>{content}</p>
    </div>
  );
}
