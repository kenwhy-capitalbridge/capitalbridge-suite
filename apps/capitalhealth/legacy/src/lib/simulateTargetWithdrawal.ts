/**
 * Target withdrawal path simulator.
 * Simulates monthly cash flow when user withdraws the full target income (no clamping to sustainable yield).
 * Used to determine if/when capital depletes under the target withdrawal path.
 */

export type TargetSimInput = {
  startCapital: number;
  months: number;
  monthlyTopUp: number;
  targetIncomeMonthly: number;
  inflationAnnualPct: number;
  investedAnnualPct: number;
  cashAnnualPct: number;
  cashBufferPct: number;
  topUpTo?: 'invested' | 'cash' | 'proportional';
  withdrawFrom?: 'cashFirst' | 'proportional';
  applyInflationToIncome?: boolean;
  captureSeries?: boolean;
};

export type TargetSimPoint = {
  month: number;
  cash: number;
  invested: number;
  total: number;
  withdrawal: number;
};

export type TargetSimResult = {
  depleted: boolean;
  /** 1-indexed month when capital depletes (month 1 = first month); same convention as calculator-engine. */
  depletionMonth?: number;
  endingCapital: number;
  series?: TargetSimPoint[];
};

/**
 * Pure function: simulates target withdrawal path month-by-month.
 * Do not clamp withdrawal to sustainable yield; report when capital actually depletes.
 */
export function simulateTargetWithdrawal(input: TargetSimInput): TargetSimResult {
  const {
    startCapital,
    months,
    monthlyTopUp,
    targetIncomeMonthly,
    inflationAnnualPct,
    investedAnnualPct,
    cashAnnualPct,
    cashBufferPct,
    topUpTo = 'invested',
    withdrawFrom = 'cashFirst',
    applyInflationToIncome = true,
    captureSeries = false,
  } = input;

  /** Monthly return rates: compound formula to match calculator-engine (not simple /12). */
  const mInv = Math.pow(1 + investedAnnualPct / 100, 1 / 12) - 1;
  const mCash = Math.pow(1 + cashAnnualPct / 100, 1 / 12) - 1;
  const mInfl = applyInflationToIncome
    ? Math.pow(1 + inflationAnnualPct / 100, 1 / 12) - 1
    : 0;

  let cash = startCapital * (cashBufferPct / 100);
  let invested = startCapital - cash;

  let withdrawalNow = targetIncomeMonthly;

  const series: TargetSimPoint[] = [];
  let depleted = false;
  let depletionMonth: number | undefined;

  for (let t = 1; t <= months; t++) {
    // 1) Returns
    cash *= 1 + mCash;
    invested *= 1 + mInv;

    // 2) Top-up
    if (monthlyTopUp > 0) {
      if (topUpTo === 'invested') {
        invested += monthlyTopUp;
      } else if (topUpTo === 'cash') {
        cash += monthlyTopUp;
      } else {
        const totalPostTopUp = cash + invested + monthlyTopUp;
        const targetCash = totalPostTopUp * (cashBufferPct / 100);
        const neededToCash = Math.max(0, targetCash - cash);
        const toCash = Math.min(neededToCash, monthlyTopUp);
        cash += toCash;
        invested += monthlyTopUp - toCash;
      }
    }

    // 3–4) Withdraw (do not clamp to sustainable yield)
    let w = withdrawalNow;

    if (withdrawFrom === 'cashFirst') {
      const fromCash = Math.min(cash, w);
      cash -= fromCash;
      w -= fromCash;

      const fromInv = Math.min(invested, w);
      invested -= fromInv;
      w -= fromInv;
    } else {
      const total = cash + invested;
      const cashShare = total > 0 ? cash / total : 0;
      cash = Math.max(0, cash - w * cashShare);
      invested = Math.max(0, invested - w * (1 - cashShare));
    }

    const totalAfter = cash + invested;

    if (captureSeries) {
      series.push({
        month: t,
        cash,
        invested,
        total: totalAfter,
        withdrawal: withdrawalNow,
      });
    }

    if (totalAfter <= 0 && !depleted) {
      depleted = true;
      depletionMonth = t;
      break;
    }

    // 6) Index withdrawal for next month
    withdrawalNow *= 1 + mInfl;
  }

  return {
    depleted,
    depletionMonth,
    endingCapital: cash + invested,
    series: captureSeries ? series : undefined,
  };
}
