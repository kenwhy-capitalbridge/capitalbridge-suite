import { describe, expect, it } from 'vitest';
import {
  buildLionVerdictClientReportFromForever,
  parseForeverRunway,
} from '../src/lionsVerdict/buildClientVerdictFromForever';

const fmt = (n: number) => `RM ${Math.round(n).toLocaleString('en-MY')}`;

describe('parseForeverRunway', () => {
  it('parses perpetual and years', () => {
    expect(parseForeverRunway('Perpetual')).toEqual({ perpetual: true, years: null });
    expect(parseForeverRunway('15.2 years')).toEqual({ perpetual: false, years: 15.2 });
  });
});

describe('buildLionVerdictClientReportFromForever', () => {
  it('uses engine score from progressPercent + bounded context nudge', () => {
    const input = {
      isSustainable: true,
      progressPercent: 45,
      gap: 400_000,
      currentAssets: 600_000,
      capitalNeeded: 1_000_000,
      annualExpense: 48_000,
      runwayLabel: '12.5 years',
      realReturnRate: 3,
      runwayYears: 12.5,
      perpetualRunway: false,
      nominalExpectedReturnPct: 7,
    };

    const r = buildLionVerdictClientReportFromForever(input, { formatCurrency: fmt });

    expect(r.verdict.score).toBe(35);
    expect(r.verdict.status).toBe('NOT_SUSTAINABLE');
    expect(r.verdict.summary).toContain('about 12.5 years');
    expect(r.verdict.summary).toContain('more in capital');
    expect(r.verdict.summary.toLowerCase()).toContain('urgent');
    expect(r.goal_gap.desired_monthly_income).toBe(4_000);
    expect(r.goal_gap.target_capital_required).toBe(1_000_000);
    expect(r.progress.current_capital).toBe(600_000);
    expect(['NEUTRAL', 'WORSENS', 'IMPROVES']).toContain(r.capital_unlock.decision);
    expect(r.strengths.length).toBeGreaterThanOrEqual(3);
    expect(r.priority_actions.length).toBeGreaterThanOrEqual(3);
  });

  it('perpetual runway: copy reflects no run-out', () => {
    const input = {
      isSustainable: true,
      progressPercent: 95,
      gap: 0,
      currentAssets: 2_000_000,
      capitalNeeded: 1_800_000,
      annualExpense: 36_000,
      runwayLabel: 'Perpetual',
      realReturnRate: 4,
      runwayYears: null,
      perpetualRunway: true,
      nominalExpectedReturnPct: 8,
    };

    const r = buildLionVerdictClientReportFromForever(input, { formatCurrency: fmt });
    expect(r.verdict.summary.toLowerCase()).toContain('indefinitely');
    expect(r.strengths.some((s) => s.toLowerCase().includes('open-ended'))).toBe(true);
    expect(r.verdict.score).toBe(100);
    expect(r.verdict.status).toBe('STRONG');
  });
});
