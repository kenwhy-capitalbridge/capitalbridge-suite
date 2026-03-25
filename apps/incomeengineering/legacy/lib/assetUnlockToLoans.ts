import type { AssetUnlock, LoanRow } from '../types/calculator';
import type {
  RefinancingParams,
  SPLOCParams,
  SBLParams,
  FDPledgeParams,
  LifePolicyParams,
  TermLoanParams,
  ShortTermLoanParams,
} from '../types/calculator';
import { monthlyPayment } from './amortize';
import { DEFAULT_UNLOCK_EST_INVESTMENT_RETURN_PERCENT } from '../config/constants';

/**
 * Derive loan rows from enabled assets with lending mechanisms.
 * Asset sale does not create a loan.
 */
export function assetUnlocksToLoans(assets: AssetUnlock[]): LoanRow[] {
  const loans: LoanRow[] = [];
  for (const asset of assets) {
    if (!asset.enabled) continue;
    const loan = assetToLoan(asset);
    if (loan) loans.push(loan);
  }
  return loans;
}

/** Get the loan derived from a single asset (for display, e.g. monthly repayment). */
export function getLoanForAsset(asset: AssetUnlock): LoanRow | null {
  return assetToLoan(asset);
}

function assetToLoan(asset: AssetUnlock): LoanRow | null {
  const label = asset.label || mechanismLabel(asset.mechanism);
  const id = asset.id;
  switch (asset.mechanism) {
    case 'refinancing': {
      const p = asset.params as RefinancingParams;
      const principal = Math.max(0, (p.currentValue * p.targetLTV) / 100);
      if (principal <= 0) return null;
      return {
        id: `loan-${id}`,
        label: `${label} (Refinancing)`,
        principal,
        annualRate: p.interestRate,
        tenureYears: p.tenureYears,
        startMonthIndex: 0,
        feesUpfront: 0,
        feesOngoing: 0,
      };
    }
    case 'sploc': {
      const p = asset.params as SPLOCParams;
      const principal = (p.portfolioValue * p.allowedLTV) / 100;
      if (principal <= 0) return null;
      return {
        id: `loan-${id}`,
        label: `${label} (SPLOC)`,
        principal,
        annualRate: p.interestRate,
        tenureYears: p.tenureYears,
        startMonthIndex: 0,
        feesUpfront: 0,
        feesOngoing: 0,
      };
    }
    case 'sbl': {
      const p = asset.params as SBLParams;
      const principal = (p.portfolioValue * p.advanceRate) / 100;
      if (principal <= 0) return null;
      return {
        id: `loan-${id}`,
        label: `${label} (SBL)`,
        principal,
        annualRate: p.rate,
        tenureYears: p.tenureYears,
        startMonthIndex: 0,
        feesUpfront: 0,
        feesOngoing: 0,
      };
    }
    case 'fd_pledge': {
      const p = asset.params as FDPledgeParams;
      const principal = (p.depositValue * p.advanceRate) / 100;
      if (principal <= 0) return null;
      return {
        id: `loan-${id}`,
        label: `${label} (FD pledge)`,
        principal,
        annualRate: p.rate,
        tenureYears: p.tenureYears,
        startMonthIndex: 0,
        feesUpfront: 0,
        feesOngoing: 0,
      };
    }
    case 'life_policy': {
      const p = asset.params as LifePolicyParams;
      const principal = (p.cashSurrenderValue * p.advanceRate) / 100;
      if (principal <= 0) return null;
      return {
        id: `loan-${id}`,
        label: `${label} (Life policy)`,
        principal,
        annualRate: p.rate,
        tenureYears: p.tenureYears,
        startMonthIndex: 0,
        feesUpfront: 0,
        feesOngoing: 0,
      };
    }
    case 'term_loan': {
      const p = asset.params as TermLoanParams;
      if (p.amount <= 0) return null;
      return {
        id: `loan-${id}`,
        label: `${label} (Term loan)`,
        principal: p.amount,
        annualRate: p.rate,
        tenureYears: p.tenureYears,
        startMonthIndex: 0,
        feesUpfront: 0,
        feesOngoing: 0,
      };
    }
    case 'short_term_loan': {
      const p = asset.params as ShortTermLoanParams;
      if (p.amount <= 0) return null;
      return {
        id: `loan-${id}`,
        label: `${label} (Short-term)`,
        principal: p.amount,
        annualRate: p.rate,
        tenureYears: p.tenureYears,
        startMonthIndex: 0,
        feesUpfront: 0,
        feesOngoing: 0,
      };
    }
    case 'asset_sale':
      return null;
    default:
      return null;
  }
}

function mechanismLabel(m: AssetUnlock['mechanism']): string {
  const labels: Record<AssetUnlock['mechanism'], string> = {
    refinancing: 'Refinancing',
    sploc: 'SPLOC',
    sbl: 'SBL',
    fd_pledge: 'FD pledge',
    life_policy: 'Life policy',
    term_loan: 'Term loan',
    short_term_loan: 'Short-term loan',
    asset_sale: 'Asset sale',
  };
  return labels[m];
}

/** Monthly surplus from one asset: estimatedMonthlyYield − loan repayment. Used to offset monthly expenses. */
export function getMonthlySurplusForAsset(asset: AssetUnlock): number {
  if (!asset.enabled) return 0;
  const loan = assetToLoan(asset);
  const repayment = loan
    ? monthlyPayment(loan.principal, loan.annualRate, loan.tenureYears)
    : 0;
  const yieldAmount = asset.estimatedMonthlyYield ?? 0;
  return yieldAmount - repayment;
}

/** Total monthly surplus from all Unlocking Capital assets (yield − loan repayments); can be negative. */
export function totalUnlockingCapitalSurplus(assets: AssetUnlock[]): number {
  return (assets || []).reduce((s, a) => s + getMonthlySurplusForAsset(a), 0);
}

/** Monthly investment income from unlocked liquidity: sum of (proceeds × assumed return % / 12). Payout only; no reinvestment. Uses default return % when user has not moved the slider. */
export function totalMonthlyInvestmentIncomeFromUnlocking(assets: AssetUnlock[]): number {
  return (assets || []).reduce((s, a) => {
    if (!a.enabled) return s;
    const proceeds = getUnlockedLiquidity(a);
    const returnPct = a.estimatedInvestmentReturnPercent ?? DEFAULT_UNLOCK_EST_INVESTMENT_RETURN_PERCENT;
    return s + proceeds * (returnPct / 100 / 12);
  }, 0);
}

/** Unlocked liquidity from one asset (for display). Lending: (value × target/advance) − debt − fees; sale: net proceeds. */
export function getUnlockedLiquidity(asset: AssetUnlock): number {
  if (!asset.enabled) return 0;
  switch (asset.mechanism) {
    case 'refinancing': {
      const p = asset.params as RefinancingParams;
      return Math.max(0, (p.currentValue * p.targetLTV) / 100);
    }
    case 'sploc': {
      const p = asset.params as SPLOCParams;
      return (p.portfolioValue * p.allowedLTV) / 100;
    }
    case 'sbl': {
      const p = asset.params as SBLParams;
      return (p.portfolioValue * p.advanceRate) / 100;
    }
    case 'fd_pledge': {
      const p = asset.params as FDPledgeParams;
      return (p.depositValue * p.advanceRate) / 100;
    }
    case 'life_policy': {
      const p = asset.params as LifePolicyParams;
      return (p.cashSurrenderValue * p.advanceRate) / 100;
    }
    case 'term_loan': {
      const p = asset.params as TermLoanParams;
      return p.amount;
    }
    case 'short_term_loan': {
      const p = asset.params as ShortTermLoanParams;
      return p.amount;
    }
    case 'asset_sale': {
      const p = asset.params as import('../types/calculator').AssetSaleParams;
      const net = p.currentValue * (p.percentToSell / 100) * (1 - p.feesPercent / 100 - p.taxesPercent / 100);
      return Math.max(0, net);
    }
  }
  return 0;
}
