import { describe, expect, it } from 'vitest';
import { buildLionVerdictClientReportFromCapitalHealth } from '../src/lionsVerdict/buildClientVerdictFromCapitalHealth';
import { isLionVerdictClientReport } from '../src/lionsVerdict/buildClientVerdictFromStress';

describe('buildLionVerdictClientReportFromCapitalHealth', () => {
  it('produces a valid client report for withdrawal mode', () => {
    const fmt = (n: number) => `RM${n.toFixed(0)}`;
    const r = buildLionVerdictClientReportFromCapitalHealth(
      {
        mode: 'withdrawal',
        tier: 3,
        vars: {
          withdrawal: 'RM10,000',
          horizon: '25.0',
          runway: '18.5',
          expectedReturn: '5.0%',
          estimatedReturn: '5.0%',
        },
        startingCapital: 2_000_000,
        targetMonthlyIncome: 10_000,
        targetFutureCapital: 0,
        passiveIncomeMonthly: 9_000,
        nominalCapitalAtHorizon: 1_500_000,
        coveragePct: 90,
      },
      { formatCurrency: fmt },
    );
    expect(isLionVerdictClientReport(r)).toBe(true);
    expect(r.verdict.score).toBeGreaterThanOrEqual(0);
    expect(r.verdict.score).toBeLessThanOrEqual(100);
    expect(r.goal_gap.desired_monthly_income).toBe(10_000);
  });

  it('produces a valid client report for growth mode', () => {
    const fmt = (n: number) => `USD${n.toFixed(0)}`;
    const r = buildLionVerdictClientReportFromCapitalHealth(
      {
        mode: 'growth',
        tier: 2,
        vars: {
          desiredCapital: 'USD5,000,000',
          horizon: '10.0',
          expectedReturn: '6.0%',
          estimatedReturn: '6.0%',
        },
        startingCapital: 1_000_000,
        targetMonthlyIncome: 0,
        targetFutureCapital: 5_000_000,
        passiveIncomeMonthly: 0,
        nominalCapitalAtHorizon: 3_200_000,
        coveragePct: 0,
      },
      { formatCurrency: fmt },
    );
    expect(isLionVerdictClientReport(r)).toBe(true);
    expect(r.goal_gap.target_capital_required).toBe(5_000_000);
  });
});
