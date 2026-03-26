import { describe, expect, it } from 'vitest';
import { buildLionVerdictClientReportFromStress } from '../src/lionsVerdict/buildClientVerdictFromStress';

const fmt = (n: number) => `RM ${Math.round(n).toLocaleString('en-MY')}`;

describe('buildLionVerdictClientReportFromStress', () => {
  it('maps technical score to public status (FRAGILE band) and non-null goal fields', () => {
    const inputs = {
      capitalResilienceScore: 18,
      tier: 'Moderate' as const,
      fragilityIndicator: 'Vulnerable' as const,
      initialCapital: 2_400_000,
      withdrawalAmount: 132_000,
      timeHorizonYears: 28,
      simulatedAverageOutcome: 2_180_000,
      maximumDrawdownPct: 38,
      worstCaseOutcome: 890_000,
    };

    const r = buildLionVerdictClientReportFromStress(inputs, { formatCurrency: fmt });

    expect(r.verdict.score).toBe(59);
    expect(r.verdict.status).toBe('FRAGILE');
    expect(r.verdict.summary).toBe(
      'Your structure is stable for now, but your capital is slowly declining and needs adjustment.',
    );
    expect(r.strengths[0]).toContain('RM');
    expect(r.strengths[0]).toContain('2,400,000');
    expect(r.strengths).toContain('Your current risk level is manageable');
    expect(r.risks[0]).toBe('Your capital is gradually decreasing over time');
    expect(r.goal_gap.desired_monthly_income).toBe(0);
    expect(r.goal_gap.summary).toContain('Target capital cannot be calculated');
    expect(r.goal_gap.summary).toContain('modeled withdrawal');
    expect(r.goal_gap.current_sustainable_income).toBe(11_000);
    expect(r.progress.current_capital).toBe(2_400_000);
    expect(r.progress.summary).toContain('capital base');
    expect(r.strategic_options).toHaveLength(3);
    expect(r.strategic_options.map((x) => x.type)).toEqual(['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE']);
    expect(r.strategic_options[0].action).toBe('Reduce your withdrawal rate slightly');
    expect(r.capital_unlock.decision).toBe('NEUTRAL');
    expect(r.capital_unlock.summary.toLowerCase()).toContain('expected return');
    expect(r.capital_unlock.summary.toLowerCase()).toContain('borrowing cost');
    expect(r.capital_unlock.available).toBe(true);
    expect(r.capital_unlock.amount_unlockable).toBe(0);
    expect(r.scenario_actions.base).toContain('capital');
    expect(r.priority_actions[0]).toBe('Review and reduce your withdrawal rate where possible');
    expect(r.do_nothing_outcome).toContain('declining');
    expect(r.closing_line).toBe(
      'You are stable today, but without adjustments, your position will weaken over time.',
    );
    expect(r.priority_actions).toHaveLength(5);
  });

  it('fills goal_gap and progress when goalContext provides income and return', () => {
    const inputs = {
      capitalResilienceScore: 40,
      tier: 'Moderate' as const,
      fragilityIndicator: 'Watchful' as const,
      initialCapital: 1_000_000,
      withdrawalAmount: 40_000,
      timeHorizonYears: 20,
      simulatedAverageOutcome: 1_050_000,
      maximumDrawdownPct: 25,
      worstCaseOutcome: 600_000,
    };

    const r = buildLionVerdictClientReportFromStress(inputs, {
      formatCurrency: fmt,
      goalContext: { desiredMonthlyIncome: 5_000, expectedAnnualReturnPct: 5 },
    });

    expect(r.verdict.status).toBe('STABLE');
    expect(r.goal_gap.desired_monthly_income).toBe(5_000);
    expect(r.goal_gap.current_sustainable_income).toBeCloseTo((1_000_000 * 0.05) / 12, 5);
    expect(r.goal_gap.target_capital_required).toBeCloseTo((5_000 * 12) / 0.05, 5);
    expect(r.goal_gap.monthly_gap).not.toBe(0);
    expect(r.goal_gap.summary).toContain('target spend');
    expect(r.progress.target_capital).toBe(r.goal_gap.target_capital_required);
    expect(r.progress.progress_percentage).toBeGreaterThan(0);
    expect(r.capital_unlock.expected_return).toBe(5);
  });
});
