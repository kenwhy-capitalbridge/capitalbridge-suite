/**
 * Analytics / telemetry for calculator events.
 * Replace the implementation with your provider (e.g. segment, gtag) when needed.
 */

export type PlanEvaluatedProperties = {
  status: string;
  depletionMonth: number | null;
  coverageMonths: number;
  desiredMonthlyWithdrawal: number;
  sustainableMonthly: number;
  r_portfolio: number;
  indexWithdrawalsToInflation: boolean;
};

export function emitPlanEvaluated(properties: PlanEvaluatedProperties): void {
  if (typeof window === 'undefined') return;
  // Replace with your analytics provider, e.g.:
  // window.gtag?.('event', 'plan_evaluated', properties);
  // segment.track('plan_evaluated', properties);
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug('plan_evaluated', properties);
  }
}
