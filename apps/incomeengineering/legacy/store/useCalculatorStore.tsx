import React, { createContext, useContext, useMemo, useReducer } from 'react';
import {
  type CalculatorState,
  type IncomeRow,
  type AssetUnlock,
  type LoanRow,
  type InvestmentBucket,
} from '../types/calculator';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  type CurrencyCode,
} from '../config/currency';
import { TIME_HORIZON_DEFAULT } from '../config/constants';
import { getDefaultInvestmentBuckets } from '../config/investmentCategories';
import { defaultParamsForMechanism } from '../lib/assetUnlockDefaults';
import type { UnlockMechanismType } from '../types/calculator';

function defaultIncomes(currency: CurrencyCode): IncomeRow[] {
  return [
    { id: 'inc-1', label: 'Salary / Wages', amount: 0 },
    { id: 'inc-2', label: 'Rental Income', amount: 0 },
    { id: 'inc-3', label: 'Family Contribution', amount: 0 },
    { id: 'inc-4', label: 'Other Recurring Income', amount: 0 },
  ];
}

function defaultBuckets(): InvestmentBucket[] {
  return getDefaultInvestmentBuckets();
}

function resetForCurrency(currency: CurrencyCode): Partial<CalculatorState> {
  const cfg = CURRENCIES[currency];
  return {
    currency,
    monthlyExpenses: cfg.defaultMonthlyExpenses,
    incomeRows: defaultIncomes(currency),
    assetUnlocks: [],
    loans: [],
    investmentBuckets: defaultBuckets().map((b) => ({ ...b, allocation: 0 })),
  };
}

type Action =
  | { type: 'SET_CURRENCY'; code: CurrencyCode }
  | { type: 'CONFIRM_CURRENCY'; code: CurrencyCode }
  | { type: 'SET_TIME_HORIZON'; years: number }
  | { type: 'SET_MONTHLY_EXPENSES'; value: number }
  | { type: 'SET_INCOME_ROW'; id: string; amount: number }
  | { type: 'SET_INCOME_LABEL'; id: string; label: string }
  | { type: 'ADD_INCOME_ROW'; label?: string }
  | { type: 'REMOVE_INCOME_ROW'; id: string }
  | { type: 'SET_ASSET_UNLOCKS'; assets: AssetUnlock[] }
  | { type: 'ADD_ASSET_UNLOCK'; mechanism: import('../types/calculator').UnlockMechanismType; label?: string }
  | { type: 'REMOVE_ASSET_UNLOCK'; id: string }
  | {
      type: 'UPDATE_ASSET_UNLOCK';
      id: string;
      updates: Partial<Pick<AssetUnlock, 'label' | 'enabled' | 'mechanism' | 'estimatedInvestmentReturnPercent'>>;
    }
  | { type: 'UPDATE_ASSET_UNLOCK_PARAMS'; id: string; params: Partial<AssetUnlock['params']> }
  | { type: 'SET_LOANS'; loans: LoanRow[] }
  | { type: 'ADD_LOAN'; loan: Omit<LoanRow, 'id'> }
  | { type: 'REMOVE_LOAN'; id: string }
  | { type: 'SET_INVESTMENT_BUCKETS'; buckets: InvestmentBucket[] }
  | { type: 'SET_BUCKET_ALLOCATION'; id: string; allocation: number }
  | { type: 'SET_BUCKET_RETURN'; id: string; expectedReturnAnnual: number }
  | { type: 'SET_AUTO_REINVEST'; v: boolean }
  | { type: 'SET_FLAT_TAX'; v: boolean }
  | { type: 'SET_FLAT_TAX_RATE'; v: number }
  | { type: 'SET_LIQUIDATE'; v: boolean }
  /** Replace calculator state from a saved snapshot (server restore). */
  | { type: 'HYDRATE'; payload: unknown };

function mergeHydratedState(base: CalculatorState, raw: unknown): CalculatorState {
  if (!raw || typeof raw !== 'object') return base;
  const p = raw as Partial<CalculatorState>;
  return {
    ...base,
    ...p,
    incomeRows: Array.isArray(p.incomeRows) ? p.incomeRows : base.incomeRows,
    assetUnlocks: Array.isArray(p.assetUnlocks) ? p.assetUnlocks : base.assetUnlocks,
    loans: Array.isArray(p.loans) ? p.loans : base.loans,
    investmentBuckets: Array.isArray(p.investmentBuckets) ? p.investmentBuckets : base.investmentBuckets,
  };
}

const initialState: CalculatorState = {
  currency: DEFAULT_CURRENCY,
  timeHorizonYears: TIME_HORIZON_DEFAULT,
  monthlyExpenses: CURRENCIES[DEFAULT_CURRENCY].defaultMonthlyExpenses,
  incomeRows: defaultIncomes(DEFAULT_CURRENCY),
  assetUnlocks: [],
  loans: [],
  investmentBuckets: defaultBuckets(),
  autoReinvestSurplus: true,
  flatTaxOnReturns: false,
  flatTaxRate: 0,
  liquidateToCoverShortfall: false,
};

function buildInitialStateFromCurrency(code?: CurrencyCode): CalculatorState {
  const c: CurrencyCode = code && CURRENCIES[code] ? code : DEFAULT_CURRENCY;
  return {
    currency: c,
    timeHorizonYears: TIME_HORIZON_DEFAULT,
    monthlyExpenses: CURRENCIES[c].defaultMonthlyExpenses,
    incomeRows: defaultIncomes(c),
    assetUnlocks: [],
    loans: [],
    investmentBuckets: defaultBuckets(),
    autoReinvestSurplus: true,
    flatTaxOnReturns: false,
    flatTaxRate: 0,
    liquidateToCoverShortfall: false,
  };
}

function reducer(state: CalculatorState, action: Action): CalculatorState {
  switch (action.type) {
    case 'SET_CURRENCY':
      return { ...state, ...resetForCurrency(action.code) };
    case 'CONFIRM_CURRENCY':
      return action.code === state.currency ? state : { ...state, ...resetForCurrency(action.code) };
    case 'SET_TIME_HORIZON':
      return { ...state, timeHorizonYears: Math.max(1, Math.min(30, action.years)) };
    case 'SET_MONTHLY_EXPENSES': {
      const cfg = CURRENCIES[state.currency];
      return { ...state, monthlyExpenses: Math.max(0, Math.min(cfg.maxMonthlyExpenses, action.value)) };
    }
    case 'SET_INCOME_ROW':
      return {
        ...state,
        incomeRows: state.incomeRows.map((r) => (r.id === action.id ? { ...r, amount: action.amount } : r)),
      };
    case 'SET_INCOME_LABEL':
      return {
        ...state,
        incomeRows: state.incomeRows.map((r) => (r.id === action.id ? { ...r, label: action.label } : r)),
      };
    case 'ADD_INCOME_ROW':
      return {
        ...state,
        incomeRows: [...state.incomeRows, { id: `inc-${Date.now()}`, label: action.label ?? 'Custom Income', amount: 0 }],
      };
    case 'REMOVE_INCOME_ROW':
      return { ...state, incomeRows: state.incomeRows.filter((r) => r.id !== action.id) };
    case 'SET_ASSET_UNLOCKS':
      return { ...state, assetUnlocks: action.assets };
    case 'ADD_ASSET_UNLOCK': {
      const id = `asset-${Date.now()}`;
      const params = defaultParamsForMechanism(action.mechanism);
      const asset: AssetUnlock = {
        id,
        enabled: true,
        mechanism: action.mechanism,
        label: action.label ?? undefined,
        params,
      };
      return { ...state, assetUnlocks: [...state.assetUnlocks, asset] };
    }
    case 'REMOVE_ASSET_UNLOCK':
      return { ...state, assetUnlocks: state.assetUnlocks.filter((a) => a.id !== action.id) };
    case 'UPDATE_ASSET_UNLOCK': {
      const { id, updates } = action;
      return {
        ...state,
        assetUnlocks: state.assetUnlocks.map((a) => {
          if (a.id !== id) return a;
          if (updates.mechanism !== undefined) {
            return { ...a, ...updates, params: defaultParamsForMechanism(updates.mechanism) } as AssetUnlock;
          }
          return { ...a, ...updates };
        }),
      };
    }
    case 'UPDATE_ASSET_UNLOCK_PARAMS': {
      return {
        ...state,
        assetUnlocks: state.assetUnlocks.map((a) =>
          a.id === action.id ? { ...a, params: { ...a.params, ...action.params } } : a
        ),
      };
    }
    case 'SET_LOANS':
      return { ...state, loans: action.loans };
    case 'ADD_LOAN':
      return { ...state, loans: [...state.loans, { ...action.loan, id: `loan-${Date.now()}` }] };
    case 'REMOVE_LOAN':
      return { ...state, loans: state.loans.filter((l) => l.id !== action.id) };
    case 'SET_INVESTMENT_BUCKETS':
      return { ...state, investmentBuckets: action.buckets };
    case 'SET_BUCKET_ALLOCATION':
      return {
        ...state,
        investmentBuckets: state.investmentBuckets.map((b) =>
          b.id === action.id ? { ...b, allocation: Math.max(0, action.allocation) } : b
        ),
      };
    case 'SET_BUCKET_RETURN':
      return {
        ...state,
        investmentBuckets: state.investmentBuckets.map((b) =>
          b.id === action.id ? { ...b, expectedReturnAnnual: Math.max(0, Math.min(15, action.expectedReturnAnnual)) } : b
        ),
      };
    case 'SET_AUTO_REINVEST':
      return { ...state, autoReinvestSurplus: action.v };
    case 'SET_FLAT_TAX':
      return { ...state, flatTaxOnReturns: action.v };
    case 'SET_FLAT_TAX_RATE':
      return { ...state, flatTaxRate: action.v };
    case 'SET_LIQUIDATE':
      return { ...state, liquidateToCoverShortfall: action.v };
    case 'HYDRATE':
      return mergeHydratedState(initialState, action.payload);
    default:
      return state;
  }
}

export interface CalculatorStore extends CalculatorState {
  setCurrency: (code: CurrencyCode) => void;
  confirmCurrencyChange: (code: CurrencyCode) => void;
  setTimeHorizonYears: (years: number) => void;
  setMonthlyExpenses: (value: number) => void;
  setIncomeRow: (id: string, amount: number) => void;
  setIncomeLabel: (id: string, label: string) => void;
  addIncomeRow: (label?: string) => void;
  removeIncomeRow: (id: string) => void;
  setAssetUnlocks: (assets: AssetUnlock[]) => void;
  addAssetUnlock: (mechanism: UnlockMechanismType, label?: string) => void;
  removeAssetUnlock: (id: string) => void;
    updateAssetUnlock: (
      id: string,
      updates: Partial<Pick<AssetUnlock, 'label' | 'enabled' | 'mechanism' | 'estimatedInvestmentReturnPercent'>>,
    ) => void;
  updateAssetUnlockParams: (id: string, params: Partial<AssetUnlock['params']>) => void;
  setLoans: (loans: LoanRow[]) => void;
  addLoan: (loan: Omit<LoanRow, 'id'>) => void;
  removeLoan: (id: string) => void;
  setInvestmentBuckets: (buckets: InvestmentBucket[]) => void;
  setBucketAllocation: (id: string, allocation: number) => void;
  setBucketReturn: (id: string, expectedReturnAnnual: number) => void;
  setAutoReinvestSurplus: (v: boolean) => void;
  setFlatTaxOnReturns: (v: boolean) => void;
  setFlatTaxRate: (v: number) => void;
  setLiquidateToCoverShortfall: (v: boolean) => void;
  getCurrencyConfig: () => (typeof CURRENCIES)[CurrencyCode];
}

const StoreContext = createContext<{ state: CalculatorState; dispatch: React.Dispatch<Action> } | null>(null);

function hydrateInitialState(payload: unknown | undefined): CalculatorState {
  if (payload == null) return initialState;
  return mergeHydratedState(initialState, payload);
}

export function CalculatorStoreProvider({
  children,
  initialHydratePayload,
  initialCurrency,
}: {
  children: React.ReactNode;
  /** Optional snapshot (e.g. `/docs/sample-report` PDF fixture) applied before first paint. */
  initialHydratePayload?: unknown;
  /** Advisory profile currency (no in-app selector; set from account region). */
  initialCurrency?: CurrencyCode;
}) {
  const [state, dispatch] = useReducer(
    reducer,
    { initialHydratePayload, initialCurrency },
    (init) => {
      if (init.initialHydratePayload != null) return hydrateInitialState(init.initialHydratePayload);
      return buildInitialStateFromCurrency(init.initialCurrency);
    }
  );
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function useStoreContext() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useCalculatorStore must be used within CalculatorStoreProvider');
  return ctx;
}

/** Imperative access for save/restore (header); use only inside `CalculatorStoreProvider`. */
export function useCalculatorStoreInternals() {
  return useStoreContext();
}

export function useCalculatorStore<T>(selector: (store: CalculatorStore) => T): T {
  const { state, dispatch } = useStoreContext();
  const actions = useMemo(() => ({
    setCurrency: (code: CurrencyCode) => dispatch({ type: 'SET_CURRENCY', code }),
    confirmCurrencyChange: (code: CurrencyCode) => dispatch({ type: 'CONFIRM_CURRENCY', code }),
    setTimeHorizonYears: (years: number) => dispatch({ type: 'SET_TIME_HORIZON', years }),
    setMonthlyExpenses: (value: number) => dispatch({ type: 'SET_MONTHLY_EXPENSES', value }),
    setIncomeRow: (id: string, amount: number) => dispatch({ type: 'SET_INCOME_ROW', id, amount }),
    setIncomeLabel: (id: string, label: string) => dispatch({ type: 'SET_INCOME_LABEL', id, label }),
    addIncomeRow: (label?: string) => dispatch({ type: 'ADD_INCOME_ROW', label }),
    removeIncomeRow: (id: string) => dispatch({ type: 'REMOVE_INCOME_ROW', id }),
    setAssetUnlocks: (assets: AssetUnlock[]) => dispatch({ type: 'SET_ASSET_UNLOCKS', assets }),
    addAssetUnlock: (mechanism: UnlockMechanismType, label?: string) => dispatch({ type: 'ADD_ASSET_UNLOCK', mechanism, label }),
    removeAssetUnlock: (id: string) => dispatch({ type: 'REMOVE_ASSET_UNLOCK', id }),
    updateAssetUnlock: (
      id: string,
      updates: Partial<Pick<AssetUnlock, 'label' | 'enabled' | 'mechanism' | 'estimatedInvestmentReturnPercent'>>,
    ) => dispatch({ type: 'UPDATE_ASSET_UNLOCK', id, updates }),
    updateAssetUnlockParams: (id: string, params: Partial<AssetUnlock['params']>) => dispatch({ type: 'UPDATE_ASSET_UNLOCK_PARAMS', id, params }),
    setLoans: (loans: LoanRow[]) => dispatch({ type: 'SET_LOANS', loans }),
    addLoan: (loan: Omit<LoanRow, 'id'>) => dispatch({ type: 'ADD_LOAN', loan }),
    removeLoan: (id: string) => dispatch({ type: 'REMOVE_LOAN', id }),
    setInvestmentBuckets: (buckets: InvestmentBucket[]) => dispatch({ type: 'SET_INVESTMENT_BUCKETS', buckets }),
    setBucketAllocation: (id: string, allocation: number) => dispatch({ type: 'SET_BUCKET_ALLOCATION', id, allocation }),
    setBucketReturn: (id: string, expectedReturnAnnual: number) => dispatch({ type: 'SET_BUCKET_RETURN', id, expectedReturnAnnual }),
    setAutoReinvestSurplus: (v: boolean) => dispatch({ type: 'SET_AUTO_REINVEST', v }),
    setFlatTaxOnReturns: (v: boolean) => dispatch({ type: 'SET_FLAT_TAX', v }),
    setFlatTaxRate: (v: number) => dispatch({ type: 'SET_FLAT_TAX_RATE', v }),
    setLiquidateToCoverShortfall: (v: boolean) => dispatch({ type: 'SET_LIQUIDATE', v }),
    getCurrencyConfig: () => CURRENCIES[state.currency],
  }), [state.currency]);
  const store = useMemo<CalculatorStore>(() => ({ ...state, ...actions }), [state, actions]);
  return selector(store);
}
