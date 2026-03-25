import type { UnlockMechanismType, UnlockParams } from '../types/calculator';

export const MECHANISM_LABELS: Record<UnlockMechanismType, string> = {
  refinancing: 'Property Refinance',
  short_term_loan: 'Short-Term Low-Cost Loan',
  sploc: 'Borrow Against Investments',
  sbl: 'Securities-Backed Loan',
  fd_pledge: 'Loan Using Assets as Collateral',
  life_policy: 'Life Policy Pledge',
  term_loan: 'Personal Loan',
  asset_sale: 'Sell an Asset',
};

export const MECHANISM_SUBTITLES: Record<UnlockMechanismType, string> = {
  refinancing: 'Unlock cash from property you own.',
  short_term_loan: 'Temporary borrowing at lower interest.',
  sploc: 'Access cash without selling your portfolio.',
  sbl: 'Use shares, ETFs, or unit trusts as collateral.',
  fd_pledge: 'Borrow using deposits or other secured assets.',
  life_policy: 'Liquidity without cancelling your policy.',
  term_loan: 'Personal term loan (unsecured).',
  asset_sale: 'Convert part or all of an asset into cash.',
};

export function defaultParamsForMechanism(mechanism: UnlockMechanismType): UnlockParams {
  switch (mechanism) {
    case 'refinancing':
      return {
        currentValue: 0,
        targetLTV: 70,
        interestRate: 4,
        tenureYears: 20,
      };
    case 'sploc':
      return {
        portfolioValue: 0,
        allowedLTV: 60,
        interestRate: 5,
        tenureYears: 10,
        marginCallBufferPercent: 15,
      };
    case 'sbl':
      return {
        portfolioValue: 0,
        advanceRate: 50,
        rate: 5,
        tenureYears: 5,
      };
    case 'fd_pledge':
      return {
        depositValue: 0,
        advanceRate: 90,
        rate: 4,
        tenureYears: 3,
      };
    case 'life_policy':
      return {
        cashSurrenderValue: 0,
        advanceRate: 90,
        rate: 5,
        tenureYears: 10,
      };
    case 'term_loan':
      return {
        amount: 0,
        rate: 8,
        tenureYears: 5,
      };
    case 'short_term_loan':
      return {
        amount: 0,
        rate: 3,
        tenureYears: 5,
      };
    case 'asset_sale':
      return {
        currentValue: 0,
        percentToSell: 100,
        feesPercent: 0,
        taxesPercent: 0,
        useProceedsFor: 'investments',
      };
    default:
      return {} as UnlockParams;
  }
}
