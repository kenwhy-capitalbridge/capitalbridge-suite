# Internal — Pricing by market (summary)

**Classification:** Internal reference.  
**Source of truth:** `packages/shared/src/markets.ts` (commit as audited in-repo).  
**Last extracted:** 2026-04-13 — **re-verify** after any edit to `MARKET_PLAN_PRICES` or `MARKET_PLAN_BILLPLZ_MYR_SEN`.

---

## 1. How pricing works (implementation)

- **List prices** are shown per **advisory market** (`MarketId`: MY, SG, TH, PH, US, AU, CN, HK, VN) in local **display currency** (`MARKET_PLAN_PRICES`).
- **Checkout / charging** uses **Billplz**, which bills in **MYR only**. Amounts are sent as **MYR sen** (1 sen = 1/100 MYR): `MARKET_PLAN_BILLPLZ_MYR_SEN`.
- **MY** and **SG** use the **same MYR sen** amounts (parallel numerals in RM vs S$ on the price card).
- **Other markets:** MYR sen is derived from regional list amounts using **reference FX** in code comments — **finance should revise** when FX or list prices change.
- **Plan keys** in this file: `trial` | `monthly` | `quarterly` | `strategic`. Card id `yearly_full` maps to **`strategic`** for price lookup (`planPriceKeyFromCardId`).

---

## 2. Display list prices by country

Values are **exact strings** from `MARKET_PLAN_PRICES` (UI copy).

| Market | Code | Trial | Monthly | Quarterly | Strategic |
|--------|------|-------|---------|-----------|-----------|
| Malaysia | MY | RM29 | RM200 | RM540 | RM3,000 |
| Singapore | SG | S$29 | S$200 | S$540 | S$3,000 |
| Thailand | TH | ฿249 | ฿1,690 | ฿4,590 | ฿25,000 |
| Philippines | PH | ₱399 | ₱2,290 | ₱6,290 | ₱36,000 |
| United States | US | $7.50 | $24.99 | $69.99 | $399 |
| Australia | AU | A$11 | A$34.99 | A$99 | A$549 |
| China | CN | ¥50 | ¥168 | ¥468 | ¥2,880 |
| Hong Kong | HK | HK$48 | HK$188 | HK$580 | HK$3,800 |
| Vietnam | VN | ₫150,000 | ₫1,200,000 | ₫3,300,000 | ₫18,000,000 |

---

## 3. Billplz charge amounts (MYR sen)

These are the values passed to Billplz `amount` for the given **market + plan** (`getBillplzChargeAmountSen` → `MARKET_PLAN_BILLPLZ_MYR_SEN`).

| Market | Trial | Monthly | Quarterly | Strategic |
|--------|-------|---------|-----------|-----------|
| MY | 2,900 | 20,000 | 54,000 | 300,000 |
| SG | 2,900 | 20,000 | 54,000 | 300,000 |
| TH | 3,320 | 22,533 | 61,200 | 333,333 |
| PH | 3,312 | 19,007 | 52,207 | 298,800 |
| US | 3,338 | 111,206 | 311,456 | 177,555 |
| AU | 3,135 | 99,722 | 28,215 | 156,465 |

| Market | Trial | Monthly | Quarterly | Strategic |
|--------|-------|---------|-----------|-----------|
| CN | 3,250 | 10,920 | 30,420 | 187,200 |
| HK | 2,640 | 10,340 | 31,900 | 209,000 |
| VN | 2,586 | 20,690 | 56,897 | 310,345 |

**MYR amount (for sanity check):** sen ÷ 100 = RM charged (e.g. MY trial 2,900 sen = **RM29.00**).

**Data sanity flag (as implemented in `markets.ts`):** Reconcile **Billplz sen** against **display list × implied MYR** before commercial use. Examples that **look** like an **extra digit** vs rough FX (USD ~4.45, AUD ~2.85 MYR per unit in comments): **US monthly** 111,206 sen vs **$24.99** list (~11,120 sen if ~4.45 MYR/USD); **AU monthly** 99,722 sen vs **A$34.99** (~9,972 sen if ~2.85). **Confirm with finance** — do not assume the table is free of typos.

---

## 4. Reference FX / conversion notes (from code comments)

Used to build non-MY/SG MYR sen (paraphrased from `markets.ts`):

- THB: **1 THB ≈ 1/7.5 MYR** (implied)
- PHP: **0.083** MYR per PHP unit (implied)
- USD: **4.45** MYR per USD (implied)
- AUD: **2.85** MYR per AUD (implied)
- CNY: **0.65** MYR per CNY (implied)
- HKD: **0.55** MYR per HKD (implied)
- VND: **MYR sen = round(VND list ÷ 5800 × 100)** (comment in file)

**Issuer/card FX:** Payers using non-MYR cards may see issuer FX; Billplz side remains MYR.

---

## 5. Checkout countries (UI ↔ market)

`CHECKOUT_COUNTRIES` maps **checkout country code** to **market** (for billing region validation):

| Country | Market id |
|---------|-----------|
| Malaysia (MY) | MY |
| Singapore (SG) | SG |
| United States (US) | US |
| Australia (AU) | AU |
| China (CN) | CN |
| Hong Kong (HK) | HK |
| Thailand (TH) | TH |
| Philippines (PH) | PH |
| Vietnam (VN) | VN |

`validateBillingRegionForRequest` ties **IP-derived market** to **checkout country** to reduce cross-region underpricing.

---

## 6. Default ISO currency for model apps

From `CURRENCY_BY_MARKET` / `marketToModelCurrencyPrefix` (Forever / Income Engineering / Capital Health defaults):

| Market | ISO (stored hint) |
|--------|-------------------|
| MY | MYR |
| SG | SGD |
| TH | THB |
| PH | PHP |
| US | USD |
| AU | AUD |
| CN | CNY |
| HK | HKD |
| VN | VND |

---

## 7. Related code (quick reference)

| Item | Location |
|------|----------|
| Display + sen tables | `packages/shared/src/markets.ts` |
| Billplz API create bill | `apps/api/lib/billplz.ts` |
| Charge amount resolution | `getBillplzChargeAmountSen`, `computeMarketChangeDeltaSen` |
| Plan duration (DB) | `packages/advisory-graph/src/plans/planMap.ts` — `public.plans.duration_days` |

---

## 8. Maintenance

When **list prices** or **FX policy** changes:

1. Update **`MARKET_PLAN_PRICES`** and **`MARKET_PLAN_BILLPLZ_MYR_SEN`** together.  
2. Re-run any **pricing** or **checkout** tests.  
3. Update **this document** or replace with an automated extract from `markets.ts`.

---

**Disclaimer:** This file is a **summary of implementation**. **Legal/commercial** price lists for contracts may live outside the repo.
