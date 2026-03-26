import { describe, expect, it } from 'vitest';
import { buildLionVerdictClientReportFromIncomeEngineering } from '../src/lionsVerdict/buildClientVerdictFromIncomeEngineering';

const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

describe('buildLionVerdictClientReportFromIncomeEngineering', () => {
  it('produces public status from coverage and non-null numerics', () => {
    const r = buildLionVerdictClientReportFromIncomeEngineering(
      {
        medianCoveragePct: 108,
        worstMonthCoveragePct: 102,
        sustainabilityStatus: 'green',
        totalMonthlyIncome: 12_000,
        totalMonthlyExpenses: 10_000,
        monthlyNetCashflow: 2_000,
        totalCapital: 500_000,
      },
      { formatCurrency: fmt },
    );
    expect(r.verdict.score).toBeGreaterThanOrEqual(85);
    // Income model has no capital target → STRONG gate never passes (trust-first).
    expect(r.verdict.status).toBe('STABLE');
    expect(r.goal_gap.target_capital_required).toBe(0);
    expect(r.goal_gap.summary).toContain('Capital Health');
    expect(r.capital_unlock.expected_return).toBe(0);
    expect(isNaN(r.progress.progress_percentage)).toBe(false);
  });

  it('invalid inputs yield NOT_SUSTAINABLE with explanation', () => {
    const r = buildLionVerdictClientReportFromIncomeEngineering(
      {
        medianCoveragePct: 0,
        worstMonthCoveragePct: 0,
        sustainabilityStatus: 'invalid',
        totalMonthlyIncome: 0,
        totalMonthlyExpenses: 0,
        monthlyNetCashflow: 0,
        totalCapital: 0,
      },
      { formatCurrency: fmt },
    );
    expect(r.verdict.score).toBe(0);
    expect(r.verdict.status).toBe('NOT_SUSTAINABLE');
    expect(r.verdict.summary).toContain('cannot produce a score');
  });
});
