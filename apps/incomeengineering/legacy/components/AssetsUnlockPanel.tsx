import React, { useState, useEffect, useRef } from 'react';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { formatCurrency } from '../utils/format';
import { Plus, Trash2 } from 'lucide-react';
import type { AssetUnlock, UnlockMechanismType } from '../types/calculator';
import { MECHANISM_LABELS, MECHANISM_SUBTITLES } from '../lib/assetUnlockDefaults';
import { DEFAULT_UNLOCK_EST_INVESTMENT_RETURN_PERCENT, RETURN_MAX, RETURN_STEP } from '../config/constants';
import { getUnlockedLiquidity, getLoanForAsset } from '../lib/assetUnlockToLoans';
import { monthlyPayment } from '../lib/amortize';
import { NumberInput } from './ui/NumberInput';
import { CurrencyAmountInput } from './ui/CurrencyAmountInput';

const MECHANISM_OPTIONS: UnlockMechanismType[] = [
  'refinancing',
  'short_term_loan',
  'sploc',
  'sbl',
  'fd_pledge',
  'life_policy',
  'term_loan',
  'asset_sale',
];

const inputWrapperClass =
  'min-h-[44px] rounded-lg border border-[#1A4D2E] bg-[#0A2E18] focus-within:ring-2 focus-within:ring-[#FFCC6A]/50 focus-within:border-[#FFCC6A]/60 transition-colors touch-manipulation';
const inputInnerClass = 'w-full min-h-[44px] rounded-lg border-0 bg-transparent px-3 py-2 text-sm text-[#F6F5F1] focus:ring-0 focus:outline-none touch-manipulation';
const labelClass = 'text-xs text-[#B8B5AE] mb-1 block';

const addButtonClass =
  'mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#FFCC6A]/60 px-3 py-2.5 text-xs text-[#F6F5F1]/90 hover:bg-[#134833]/50 focus:outline-none focus:ring-2 focus:ring-[#FFCC6A]/50 touch-manipulation';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function MechanismForm({
  asset,
  currency,
  onParams,
}: {
  asset: AssetUnlock;
  currency: string;
  onParams: (params: Partial<AssetUnlock['params']>) => void;
}) {
  const params = asset.params as Record<string, number | string>;
  const set = (key: string, value: number | string) => onParams({ [key]: value } as Partial<AssetUnlock['params']>);

  switch (asset.mechanism) {
    case 'refinancing':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Field label="Property Value">
            <CurrencyAmountInput
              value={Number(params.currentValue) || 0}
              onChange={(v) => set('currentValue', v)}
              currency={currency}
              min={0}
              ariaLabel="Property Value"
            />
          </Field>
          <Field label="Loan-to-Value (%)">
            <div className={inputWrapperClass}>
              <NumberInput value={Number(params.targetLTV) || 0} onChange={(v) => set('targetLTV', v)} min={0} max={100} allowDecimals decimalPlaces={1} className={inputInnerClass} />
            </div>
          </Field>
          <Field label="Interest Rate (p.a.)">
            <div className={inputWrapperClass}>
              <NumberInput value={Number(params.interestRate) || 0} onChange={(v) => set('interestRate', v)} min={0} allowDecimals decimalPlaces={2} className={inputInnerClass} />
            </div>
          </Field>
          <Field label="Tenure (years)">
            <div className={inputWrapperClass}>
              <NumberInput value={Number(params.tenureYears) || 1} onChange={(v) => set('tenureYears', v)} min={1} max={40} className={inputInnerClass} />
            </div>
          </Field>
        </div>
      );
    case 'sploc':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Field label="Portfolio value">
            <CurrencyAmountInput value={Number(params.portfolioValue) || 0} onChange={(v) => set('portfolioValue', v)} currency={currency} min={0} ariaLabel="Portfolio value" />
          </Field>
          <Field label="Allowed LTV (%)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.allowedLTV) || 0} onChange={(v) => set('allowedLTV', v)} min={0} max={100} className={inputInnerClass} /></div>
          </Field>
          <Field label="Interest rate (EIR% p.a.)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.interestRate) || 0} onChange={(v) => set('interestRate', v)} min={0} allowDecimals decimalPlaces={2} className={inputInnerClass} /></div>
          </Field>
          <Field label="Tenure (years)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.tenureYears) || 1} onChange={(v) => set('tenureYears', v)} min={1} className={inputInnerClass} /></div>
          </Field>
          <Field label="Margin call buffer (%)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.marginCallBufferPercent) || 0} onChange={(v) => set('marginCallBufferPercent', v)} min={0} max={50} className={inputInnerClass} /></div>
          </Field>
        </div>
      );
    case 'sbl':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Field label="Portfolio value">
            <CurrencyAmountInput value={Number(params.portfolioValue) || 0} onChange={(v) => set('portfolioValue', v)} currency={currency} min={0} ariaLabel="Portfolio value" />
          </Field>
          <Field label="Advance rate (%)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.advanceRate) || 0} onChange={(v) => set('advanceRate', v)} min={0} max={100} className={inputInnerClass} /></div>
          </Field>
          <Field label="Rate (EIR% p.a.)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.rate) || 0} onChange={(v) => set('rate', v)} min={0} allowDecimals decimalPlaces={2} className={inputInnerClass} /></div>
          </Field>
          <Field label="Tenure (years)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.tenureYears) || 1} onChange={(v) => set('tenureYears', v)} min={1} className={inputInnerClass} /></div>
          </Field>
        </div>
      );
    case 'fd_pledge':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Field label="Deposit value">
            <CurrencyAmountInput value={Number(params.depositValue) || 0} onChange={(v) => set('depositValue', v)} currency={currency} min={0} ariaLabel="Deposit value" />
          </Field>
          <Field label="Advance rate (%)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.advanceRate) || 0} onChange={(v) => set('advanceRate', v)} min={0} max={100} className={inputInnerClass} /></div>
          </Field>
          <Field label="Rate (EIR% p.a.)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.rate) || 0} onChange={(v) => set('rate', v)} min={0} allowDecimals decimalPlaces={2} className={inputInnerClass} /></div>
          </Field>
          <Field label="Tenure (years)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.tenureYears) || 1} onChange={(v) => set('tenureYears', v)} min={1} className={inputInnerClass} /></div>
          </Field>
        </div>
      );
    case 'life_policy':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Field label="Cash surrender value">
            <CurrencyAmountInput value={Number(params.cashSurrenderValue) || 0} onChange={(v) => set('cashSurrenderValue', v)} currency={currency} min={0} ariaLabel="Cash surrender value" />
          </Field>
          <Field label="Advance rate (%)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.advanceRate) || 0} onChange={(v) => set('advanceRate', v)} min={0} max={100} className={inputInnerClass} /></div>
          </Field>
          <Field label="Rate (EIR% p.a.)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.rate) || 0} onChange={(v) => set('rate', v)} min={0} allowDecimals decimalPlaces={2} className={inputInnerClass} /></div>
          </Field>
          <Field label="Tenure (years)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.tenureYears) || 1} onChange={(v) => set('tenureYears', v)} min={1} className={inputInnerClass} /></div>
          </Field>
        </div>
      );
    case 'term_loan':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Field label="Amount">
            <CurrencyAmountInput value={Number(params.amount) || 0} onChange={(v) => set('amount', v)} currency={currency} min={0} ariaLabel="Amount" />
          </Field>
          <Field label="Rate (EIR% p.a.)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.rate) || 0} onChange={(v) => set('rate', v)} min={0} allowDecimals decimalPlaces={2} className={inputInnerClass} /></div>
          </Field>
          <Field label="Tenure (years)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.tenureYears) || 1} onChange={(v) => set('tenureYears', v)} min={1} max={15} className={inputInnerClass} /></div>
          </Field>
        </div>
      );
    case 'short_term_loan':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Field label="Amount">
            <CurrencyAmountInput value={Number(params.amount) || 0} onChange={(v) => set('amount', v)} currency={currency} min={0} ariaLabel="Amount" />
          </Field>
          <Field label="Rate (EIR% p.a.)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.rate) || 0} onChange={(v) => set('rate', v)} min={0} allowDecimals decimalPlaces={2} className={inputInnerClass} /></div>
          </Field>
          <Field label="Tenure (years)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.tenureYears) || 1} onChange={(v) => set('tenureYears', v)} min={0.5} max={10} step={0.5} allowDecimals decimalPlaces={1} className={inputInnerClass} /></div>
          </Field>
        </div>
      );
    case 'asset_sale':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Field label="Current value of asset">
            <CurrencyAmountInput value={Number(params.currentValue) || 0} onChange={(v) => set('currentValue', v)} currency={currency} min={0} ariaLabel="Current value of asset" />
          </Field>
          <Field label="% to sell">
            <div className={inputWrapperClass}><NumberInput value={Number(params.percentToSell) || 0} onChange={(v) => set('percentToSell', v)} min={0} max={100} allowDecimals decimalPlaces={1} className={inputInnerClass} /></div>
          </Field>
          <Field label="Fees (%)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.feesPercent) || 0} onChange={(v) => set('feesPercent', v)} min={0} allowDecimals decimalPlaces={1} className={inputInnerClass} /></div>
          </Field>
          <Field label="Taxes (%)">
            <div className={inputWrapperClass}><NumberInput value={Number(params.taxesPercent) || 0} onChange={(v) => set('taxesPercent', v)} min={0} allowDecimals decimalPlaces={1} className={inputInnerClass} /></div>
          </Field>
          <Field label="Use net proceeds for">
            <div className={inputWrapperClass}>
              <select value={params.useProceedsFor ?? 'investments'} onChange={(e) => set('useProceedsFor', e.target.value)} className="w-full min-h-[44px] rounded-lg border-0 bg-transparent px-3 py-2 text-sm text-[#F6F5F1] focus:ring-0 focus:outline-none">
                <option value="investments">Investments</option>
                <option value="debt_paydown">Debt paydown</option>
              </select>
            </div>
          </Field>
        </div>
      );
    default:
      return null;
  }
}

interface AssetsUnlockPanelProps {
  totalIncome?: number;
  totalExpenses?: number;
}

export const AssetsUnlockPanel: React.FC<AssetsUnlockPanelProps> = ({
  totalIncome: globalTotalIncome = 0,
  totalExpenses: globalTotalExpenses = 0,
}) => {
  const currency = useCalculatorStore((s) => s.currency);
  const assetUnlocks = useCalculatorStore((s) => s.assetUnlocks);
  const addAssetUnlock = useCalculatorStore((s) => s.addAssetUnlock);
  const removeAssetUnlock = useCalculatorStore((s) => s.removeAssetUnlock);
  const updateAssetUnlock = useCalculatorStore((s) => s.updateAssetUnlock);
  const updateAssetUnlockParams = useCalculatorStore((s) => s.updateAssetUnlockParams);

  const [showAddPicker, setShowAddPicker] = useState(false);
  const addedFirstAssetRef = useRef(false);
  const hasInitializedTwoAssetsRef = useRef(false);

  useEffect(() => {
    if (hasInitializedTwoAssetsRef.current) return;
    if (assetUnlocks.length === 0) {
      if (addedFirstAssetRef.current) return;
      addedFirstAssetRef.current = true;
      addAssetUnlock('refinancing', MECHANISM_LABELS.refinancing);
      return;
    }
    if (assetUnlocks.length === 1 && assetUnlocks[0].mechanism === 'refinancing') {
      addAssetUnlock('short_term_loan', MECHANISM_LABELS.short_term_loan);
      hasInitializedTwoAssetsRef.current = true;
    }
  }, [assetUnlocks, addAssetUnlock]);

  const handleAdd = (mechanism: UnlockMechanismType) => {
    addAssetUnlock(mechanism, MECHANISM_LABELS[mechanism]);
    setShowAddPicker(false);
  };

  const currencyCode = currency as import('../config/currency').CurrencyCode;

  return (
    <section className="rounded-xl border border-[#1A4D2E]/60 bg-[#163d28] p-4 sm:p-6" aria-labelledby="assets-unlock-label">
      <h2 id="assets-unlock-label" className="font-serif-section mb-1 text-base font-bold uppercase sm:text-lg">
        Unlocking Capital
      </h2>
      <p className="mb-4 text-xs text-[#B8B5AE] opacity-90">Turn assets you own into reinvestable income</p>

      {assetUnlocks.length === 0 ? (
        <p className="text-sm text-[#B8B5AE] mb-3">No assets yet. Add one below to see how it affects your plan.</p>
      ) : (
        <ul className="grid grid-cols-1 min-[641px]:grid-cols-2 gap-4">
          {assetUnlocks.map((asset) => {
            const liquidity = getUnlockedLiquidity(asset);
            const loan = getLoanForAsset(asset);
            const monthlyRepayment = loan
              ? monthlyPayment(loan.principal, loan.annualRate, loan.tenureYears)
              : 0;
            const estReturnPct = asset.estimatedInvestmentReturnPercent ?? DEFAULT_UNLOCK_EST_INVESTMENT_RETURN_PERCENT;
            const reinvestMonthly = (liquidity * (estReturnPct / 100)) / 12;
            const displayLabel = asset.label || MECHANISM_LABELS[asset.mechanism];
            const subtitle = MECHANISM_SUBTITLES[asset.mechanism];
            return (
              <li key={asset.id} className="rounded-xl border border-[#1A4D2E]/60 bg-[#0f2e1c]/80 p-3 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif-section text-sm font-bold uppercase text-[#FFCC6A]">
                      {displayLabel}
                    </h3>
                    <p className="text-xs text-[#B8B5AE] mt-0.5">{subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAssetUnlock(asset.id)}
                    aria-label="Remove asset"
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#B8B5AE] hover:bg-[#1A4D2E] hover:text-[#F6F5F1]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className={inputWrapperClass}>
                  <select
                    value={asset.mechanism}
                    onChange={(e) => {
                      const m = e.target.value as UnlockMechanismType;
                      updateAssetUnlock(asset.id, { mechanism: m, label: MECHANISM_LABELS[m] });
                    }}
                    className="w-full min-h-[44px] rounded-lg border-0 bg-transparent px-3 py-2 text-sm text-[#F6F5F1] focus:ring-0 focus:outline-none"
                    aria-label="Asset type"
                  >
                    {MECHANISM_OPTIONS.map((m) => (
                      <option key={m} value={m}>{MECHANISM_LABELS[m]}</option>
                    ))}
                  </select>
                </div>
                <MechanismForm
                  asset={asset}
                  currency={currency}
                  onParams={(p) => updateAssetUnlockParams(asset.id, p)}
                />
                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={RETURN_MAX}
                    step={RETURN_STEP}
                    value={estReturnPct}
                    onChange={(e) => updateAssetUnlock(asset.id, { estimatedInvestmentReturnPercent: Number(e.target.value) })}
                    className="w-full accent-[#FFCC6A] h-8"
                    aria-valuenow={estReturnPct}
                    aria-valuetext={`${estReturnPct}%`}
                  />
                  <div className="flex items-center justify-between">
                    <span className={labelClass}>Est. Investment Return %</span>
                    <span className="text-sm font-bold text-[#FFCC6A] tabular-nums">
                      {estReturnPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-[#1A4D2E]/50 space-y-1">
                  {liquidity > 0 && (
                    <p className="text-xs text-[#F6F5F1]">
                      Loan Amount (Unlocked Liquidity): {formatCurrency(liquidity, currencyCode)}
                    </p>
                  )}
                  {loan != null && monthlyRepayment > 0 && (
                    <p className="text-xs text-[#F6F5F1]">
                      Monthly Repayment: {formatCurrency(monthlyRepayment, currencyCode)}
                    </p>
                  )}
                  {liquidity > 0 && (
                    <>
                      <p className="text-xs text-[#F6F5F1]">
                        Monthly Investment Income: {formatCurrency(reinvestMonthly, currencyCode)}
                      </p>
                      <p className="text-xs text-[#F6F5F1] flex flex-wrap items-center gap-2">
                        Net Monthly Cashflow:{' '}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold tabular-nums shrink-0 ${
                            reinvestMonthly - monthlyRepayment >= 0
                              ? 'bg-[#11B981] text-white border-[#11B981]'
                              : 'bg-[#DD524C] text-white border-[#DD524C]'
                          }`}
                        >
                          {reinvestMonthly - monthlyRepayment >= 0 ? '+' : '−'}
                          {formatCurrency(Math.abs(reinvestMonthly - monthlyRepayment), currencyCode)}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-[10px] text-[#B8B5AE] opacity-90">
        Monthly returns are paid out. No reinvestment.
      </p>

      <div className="mt-4 relative">
        {!showAddPicker ? (
          <button
            type="button"
            onClick={() => setShowAddPicker(true)}
            className={addButtonClass}
          >
            <Plus className="h-4 w-4 shrink-0" /> Add Asset
          </button>
        ) : (
          <div className="rounded-lg border border-[#FFCC6A]/40 bg-[#0A2E18] p-3">
            <p className="text-xs text-[#B8B5AE] mb-2">Choose mechanism:</p>
            <div className="flex flex-wrap gap-2">
              {MECHANISM_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleAdd(m)}
                  className="min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium text-[#F6F5F1] bg-[#0F4222] hover:bg-[#1A4D2E] border border-[#1A4D2E] touch-manipulation"
                >
                  {MECHANISM_LABELS[m]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowAddPicker(false)}
                className="min-h-[44px] rounded-lg px-3 py-2 text-xs text-[#B8B5AE] hover:bg-[#0F4222]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
