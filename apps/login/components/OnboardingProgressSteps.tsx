"use client";

const STEPS = ["Step 1: Payment", "Step 2: Email", "Step 3: Set Password", "Step 4: Access"] as const;

export type OnboardingStep = 1 | 2 | 3 | 4;

export function OnboardingProgressSteps({ current }: { current: OnboardingStep }) {
  return (
    <p className="mb-4 text-center text-xs leading-relaxed text-cb-green/85 sm:text-sm" role="status">
      {STEPS.map((label, i) => (
        <span key={label}>
          {i > 0 ? <span className="text-cb-green/50"> · </span> : null}
          <span className={i + 1 === current ? "font-bold text-cb-green" : ""}>{label}</span>
        </span>
      ))}
    </p>
  );
}
