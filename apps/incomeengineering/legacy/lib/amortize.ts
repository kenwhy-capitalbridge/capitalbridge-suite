/**
 * Amortizing loan: monthly payment from principal, annual rate, tenure in years.
 * Monthly rate = annual rate / 12; number of payments = tenure * 12.
 */

export function monthlyPayment(principal: number, annualRatePercent: number, tenureYears: number): number {
  if (principal <= 0) return 0;
  const r = annualRatePercent / 100 / 12;
  const n = tenureYears * 12;
  if (r <= 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Loan balance at end of month `monthIndex` (0-based), given fixed monthly payment.
 */
export function balanceAtMonth(
  principal: number,
  annualRatePercent: number,
  tenureYears: number,
  monthIndex: number
): number {
  if (principal <= 0 || monthIndex < 0) return 0;
  const pay = monthlyPayment(principal, annualRatePercent, tenureYears);
  const r = annualRatePercent / 100 / 12;
  const n = tenureYears * 12;
  if (monthIndex >= n) return 0;
  // B_k = P(1+r)^k - pay * ((1+r)^k - 1)/r
  const factor = Math.pow(1 + r, monthIndex);
  return principal * factor - pay * ((factor - 1) / r);
}

/**
 * Payment due in month `monthIndex` (0-based). Returns 0 if beyond tenure.
 */
export function paymentInMonth(
  principal: number,
  annualRatePercent: number,
  tenureYears: number,
  monthIndex: number
): number {
  const n = tenureYears * 12;
  if (monthIndex < 0 || monthIndex >= n) return 0;
  return monthlyPayment(principal, annualRatePercent, tenureYears);
}
