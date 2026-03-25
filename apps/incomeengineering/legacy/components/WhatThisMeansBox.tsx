import React from 'react';
import type { SustainabilityStatus } from '../types/calculator';

interface WhatThisMeansBoxProps {
  status: SustainabilityStatus;
  medianCoverage: number;
  worstMonthCoverage: number;
  invalidReason?: string;
}

function statusPillStyles(status: SustainabilityStatus): string {
  if (status === 'green') return 'bg-[#11B981] text-white border-[#11B981]';
  if (status === 'amber') return 'bg-[#FFAB40] text-[#0D3A1D] border-[#FFAB40]';
  if (status === 'red') return 'bg-[#DD524C] text-white border-[#DD524C]';
  return 'bg-[#6B7280] text-white border-[#6B7280]';
}

function statusPillLabel(status: SustainabilityStatus): string {
  if (status === 'green') return 'SUSTAINABLE';
  if (status === 'amber') return 'PLAUSIBLE';
  if (status === 'red') return 'UNSUSTAINABLE';
  return 'INVALID';
}

type SectionContent = {
  sectionTitle: string;
  summary: string;
  subheading: string;
  suggestions: string[];
  tagline: string;
};

function getSectionContent(
  status: SustainabilityStatus,
  invalidReason?: string
): SectionContent {
  if (status === 'invalid') {
    const summary = invalidReason
      ? `The numbers don't fit the limits (${invalidReason}). Lower your spending or total investments to stay within the allowed range.`
      : 'Your totals are over the allowed limits. Try lowering monthly spending or total investments.';
    return {
      sectionTitle: 'Optimisation recommendations',
      summary,
      subheading: 'What you could do',
      suggestions: [
        'Lower monthly spending to the max allowed for your currency.',
        'Lower total investments to the max allowed.',
        'Double-check that no single value is above the limits shown.',
        'Come back to the calculator every month to check your STATUS.',
      ],
      tagline: '',
    };
  }
  if (status === 'green') {
    return {
      sectionTitle: 'Optimisation recommendations',
      summary: 'Your plan is healthy and steady. Your income and investment returns are covering your expenses and loans. Even in your most challenging month, you are still above 100%. This shows good balance and strong control.',
      subheading: 'Where strength meets structure',
      suggestions: [
        'Keep using realistic numbers. Do not overestimate returns.',
        'Review your plan if your income or expenses change.',
        'Check your plan once a year to stay on track.',
        'Review your status every month to stay confident and prepared.',
      ],
      tagline: 'You are in control. Now focus on steady progress.',
    };
  }
  if (status === 'amber') {
    return {
      sectionTitle: 'Optimisation recommendations',
      summary: 'Your plan is close to stable, but the margin is thin. Most months are covered, but there is little room for unexpected changes. Small problems can affect the structure.',
      subheading: 'Strength needs adjustment',
      suggestions: [
        'Review your income and investment return assumptions carefully.',
        'Reduce or adjust some expenses if possible.',
        'Build a small safety buffer to protect against surprises.',
        'Monitor your plan monthly until coverage is clearly above 100%.',
      ],
      tagline: 'You are close. A few smart adjustments can make the plan strong.',
    };
  }
  return {
    sectionTitle: 'Structural review required',
    summary: 'Your current income and returns are not enough to cover your expenses and loan commitments. If no changes are made, the gap may grow over time.',
    subheading: 'Restore balance',
    suggestions: [
      'Review your income stability and future outlook.',
      'Cut or delay non-essential expenses.',
      'Consider restructuring or extending loan commitments if needed.',
      'Adjust your investment strategy to reduce risk and improve stability.',
    ],
    tagline: 'Take action early. Stability comes before growth.',
  };
}

export const WhatThisMeansBox: React.FC<WhatThisMeansBoxProps> = ({
  status,
  medianCoverage,
  worstMonthCoverage,
  invalidReason,
}) => {
  const { sectionTitle, summary, subheading, suggestions, tagline } = getSectionContent(status, invalidReason);

  return (
    <div className="rounded-xl border border-[#1A4D2E] bg-[#0D3A1D]/60 p-4 sm:p-6" aria-labelledby="what-means-label">
      <h2 id="what-means-label" className="font-serif-section mb-2 text-sm font-bold uppercase">
        {sectionTitle}
      </h2>
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] sm:text-xs font-bold uppercase tracking-wider shrink-0 ${statusPillStyles(status)}`}
        aria-label={`Status: ${statusPillLabel(status)}`}
      >
        {statusPillLabel(status)}
      </span>
      <p className="mt-3 text-sm leading-relaxed text-[#F6F5F1]">{summary}</p>
      <h3 className="mt-3 font-serif-section mb-2 text-sm font-bold uppercase">{subheading}</h3>
      <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-[#F6F5F1]">
        {suggestions.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {tagline ? (
        <p className="mt-4 text-sm italic font-light text-[#FFCC6A]">&ldquo;{tagline}&rdquo;</p>
      ) : null}
    </div>
  );
};
