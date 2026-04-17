# Capital Bridge — Internal Full System Specification

**Classification:** Internal / confidential. Source of truth: this repository as audited on 2026-04-13.

**Monorepo app name mapping (requested names → actual workspace packages):**

| Product name | NPM workspace | Dev port |
|----------------|---------------|----------|
| forever-income-model | `@cb/forever` (`apps/forever`) | 3006 |
| capital-engineering-model | `@cb/incomeengineering` (`apps/incomeengineering`) | 3005 |
| capital-health-model | `@cb/capitalhealth` (`apps/capitalhealth`) | 3004 |
| capital-stress-model | `@cb/capitalstress` (`apps/capitalstress`) | 3003 |

---

## Table of contents

1. [Executive system map](#1-executive-system-map)
2. [Monorepo architecture map](#2-monorepo-architecture-map)
3. [Framework-level methodology](#3-framework-level-methodology)
4. [Per-app deep specification](#4-per-app-deep-specification)
5. [Cross-app comparison matrix](#5-cross-app-comparison-matrix)
6. [Shared calculation and logic dependencies](#6-shared-calculation-and-logic-dependencies)
7. [PDF / report generation full specification](#7-pdf--report-generation-full-specification)
8. [Data persistence / export / snapshot dependencies](#8-data-persistence--export--snapshot-dependencies)
9. [Auth / access / membership / paid-gating effects](#9-auth--access--membership--paid-gating-effects)
10. [UI-to-logic mapping](#10-ui-to-logic-mapping)
11. [Risks / ambiguities / technical debt](#11-risks--ambiguities--technical-debt)
12. [Rebuild readiness assessment](#12-rebuild-readiness-assessment)
13. [Appendix A: File inventory](#appendix-a-file-inventory)
14. [Appendix B: Formula registry](#appendix-b-formula-registry)
15. [Appendix C: Questions requiring founder clarification](#appendix-c-questions-requiring-founder-clarification)
16. [Specification confidence notes](#specification-confidence-notes)

---

## 1. Executive system map

### 1.1 Intended role of each app (from live calculation code)

| App | Core question answered | Primary mechanism |
|-----|------------------------|-------------------|
| **Forever Income** | Is lifestyle spending supported indefinitely by assets at assumed nominal return minus inflation? What capital is “needed” vs held? How long does money last if not perpetual? | Closed-form + runway formula in `computeForeverResults` (`apps/forever/legacy/foreverModel.ts`). |
| **Capital Engineering (Income Engineering)** | Does monthly cash flow cover expenses + loan service + modeled investment/unlock income (single-period snapshot)? | `runSimulation` (`apps/incomeengineering/legacy/lib/simulation.ts`) — no multi-month path, no compounding. |
| **Capital Health** | Over a user horizon, does capital grow to a target (growth) or support a withdrawal path (withdrawal) with buffer/reinvest rules? | `runSimulation` (`apps/capitalhealth/legacy/calculator-engine.ts`) + auxiliary `evaluatePlan`, `simulateTargetWithdrawal`, solvers. |
| **Capital Stress** | Under Monte Carlo paths with optional shock, what is survival probability, resilience score, depletion pressure, and stress scenarios? | `runMonteCarlo` / `runStressScenarios` (`apps/capitalstress/legacy/services/mathUtils.ts`) + Lion engine in `@cb/advisory-graph`. |

### 1.2 Relationships in the broader framework

- All four are **Next.js** apps under `apps/*`, consuming **`@cb/advisory-graph`** (Lion’s Verdict client builders + advisory session/report APIs), **`@cb/pdf`** (narrative helpers, Playwright PDF, layout primitives), **`@cb/shared`** (URLs, legal monocopy, report traceability, plans), **`@cb/ui`** (header spine, report chrome), **`@cb/supabase`**, and (except Capital Health) **`@cb/lion-verdict`** (runtime copy picker UI).
- **No app imports another app’s calculation module.** Cross-app consistency is via **shared packages** and **parallel patterns** (e.g. similar Lion public bands).
- **Platform** (`apps/platform`) hosts marketing/framework landing; **login** (`apps/login`) handles auth/checkout. Model apps deep-link to pricing via `@cb/shared/urls`.

### 1.3 Suggested user journey ordering (not enforced in code)

Logical flow implied by product positioning:

1. **Income Engineering** — structural monthly cash flow vs obligations.  
2. **Capital Health** — longer-horizon capital trajectory and withdrawal sustainability.  
3. **Forever Income** — simplified “forever capital” and runway vs lifestyle.  
4. **Capital Stress** — distribution of outcomes and stress (typically needs membership tier; trial users are redirected from stress in some flows).

**Note:** Code does **not** pipe outputs from one model into another automatically.

### 1.4 Reuse across apps

| Kind | Reuse |
|------|--------|
| Lion scoring / public bands | `@cb/advisory-graph/src/lionsVerdict/*` (all models that show Lion). |
| PDF primitives / TOC | `@cb/pdf/shared` (Forever + Income Engineering PDF layouts). |
| Advisory report CRUD | `handleAdvisoryReportGET/POST` → `advisory_v2.advisory_reports` (each app exposes `/api/advisory-report`). |
| Membership entitlements | `deriveEntitlements` / `deriveEntitlementsFromRawPlan` in `packages/advisory-graph/src/platformAccess.ts`. |
| Plan-based Lion copy access | `planSlugDeniesLionsVerdict` in `packages/shared/src/plans.ts` + `packages/lion-verdict/access.ts`. |

### 1.5 High-level data flow

```
User inputs (React state / store)
  → domain calculators (per app)
  → displayed KPIs + charts
  → Lion client report builders (advisory-graph) + optional @cb/lion-verdict narrative picker
  → PDF: client blob (react-pdf / html) OR Playwright capture of report URL (Forever)
```

---

## 2. Monorepo architecture map

### 2.1 Packages that drive behaviour

| Package | Role |
|---------|------|
| `@cb/advisory-graph` | Lion engines (`engine.ts`), client report JSON builders, `ModelSaveHandlersContext`, `reports/*` (cover, charts contracts), server `advisoryRoutes`, `platformAccess` entitlements. |
| `@cb/lion-verdict` | `LionVerdictActive`, `getLionVerdict`, copy library, access helpers. **Not** a dependency of `@cb/capitalhealth` (Health uses advisory-graph Lion only). |
| `@cb/pdf` | `renderPdf` (Playwright), `reportReady` (`window.__REPORT_READY__`), `buildPdfNarrative`, shared PDF React components (`PdfLayout`, `PdfLionsVerdictBlock`, etc.), `templates/BaseReport`. |
| `@cb/shared` | `urls`, `legalMonocopy`, `reportTraceability`, `reportIdentity`, `plans`, `markets`, `formatCurrency`, `cbReportTemplate`, `reportPdfPlaywright` constants. |
| `@cb/ui` | `ModelAppHeader`, `ModelReportDownloadFooter`, `useModelMetricSpine`, watermark chrome. |
| `@cb/db-types` | Supabase types (incl. `report_exports`). |

### 2.2 Source-of-truth vs wrappers vs legacy

| Area | Source of truth | Wrapper / legacy |
|------|------------------|------------------|
| Forever math | `apps/forever/legacy/foreverModel.ts` `computeForeverResults` | `ForeverCalculatorProvider` re-exports `ModelSaveHandlersProvider` from advisory-graph (no math). |
| Income Engineering math | `legacy/lib/simulation.ts` | Store toggles (`autoReinvestSurplus`, `flatTaxOnReturns`, etc.) — **not consumed** by `runSimulation` (see §11). |
| Capital Health math | `legacy/calculator-engine.ts` | `buildCalculatorResults.ts` layers goal/risk/teaser + chart alignment; `evaluatePlan.ts` is separate canonical plan evaluator. |
| Stress Monte Carlo | `capitalstress/legacy/services/mathUtils.ts` | `advisory_engine.ts` re-exports advisory-graph only. |
| Lion score tiers (stress) | `lionTierFromTechnicalResilience` in advisory-graph | UI maps engine tier to `Tier` for copy in `capitalstress/legacy/App.tsx` (`mapStressStatusToTier`). |
| Forever PDF | `/dashboard/report-document/[exportId]` + Playwright `GET /api/forever/report-pdf/[exportId]` | `apps/forever/app/dashboard/print/page.tsx` redirects to `/dashboard` (legacy URL). |
| Generic narrative PDF | `apps/platform/app/print/[model]/page.tsx` parses `?data=` JSON into `BaseReport` | For ad-hoc / tooling, not the four model dashboards’ primary UX. |

---

## 3. Framework-level methodology

### 3.1 Conceptual role and interpretation

- **Forever Income:** Answers whether **real return** is positive and whether **total assets** meet implied **capital needed** for spending (with property payment annuity). Runway is either “Perpetual”, a **log**-based finite horizon, or **C/W** depletion when real return ≤ 0. Outputs are **not** tax-aware beyond user-entered nominal return and inflation.

- **Income Engineering:** Answers whether **one month** of income (recurring + bucket yield + unlock yield) covers **expenses + amortized loans**. Sustainability badge uses **coverage ratio** vs `COVERAGE_GREEN` / `COVERAGE_AMBER`. No multi-period compounding.

- **Capital Health:** Answers trajectory questions with **monthly simulation**: cash buffer %, reinvest % of returns, optional inflation-adjusted **real** return when inflation enabled, withdrawal rules (fixed vs % of capital). Separate **target withdrawal path** (`simulateTargetWithdrawal`) for depletion and **blended** `evaluatePlan` for banner/sustainable monthly. Interpreters must note **three** related but non-identical pipelines (§4.4.3).

- **Capital Stress:** Answers distribution of **terminal wealth** under **daily** simulation, optional **shock day**, regime sampling, and penalties feeding **capitalResilienceScore** (-100…100) mapped to Lion 0–100. **Stochastic** — results vary between runs unless seeded (no seed in repo for UI).

### 3.2 Independence / sequencing

- Apps are **independent** at runtime. Persistence is per **`advisory_v2.advisory_reports`** (via `/api/advisory-report`) with `model_type` discriminating; no foreign key chains between models in client code.

### 3.3 Common advisory structure

- **Persistent header** via `@cb/ui` `useModelMetricSpine` (each app sets slots in legacy UI).
- **Lion’s Verdict:** Public status bands **0–38 / 39–56 / 57–76 / 77–89 / 90–100** with **STRONG** gated by eligibility (`lionScoreMapping.ts`). **Income Engineering** sets `capitalSufficientVsTarget: false` in strong eligibility — STRONG effectively blocked.

---

## 4. Per-app deep specification

---

### 4.A Forever Income Model (`apps/forever`)

#### 4.A.1 Purpose

- **Measures:** “Forever” capital target, gap, progress %, runway string, real return, property payment.
- **Decision support:** Whether assets + return assumptions support lifestyle; how large the shortfall is; horizon until exhaustion when not perpetual.

#### 4.A.2 Entry points and main files

| Concern | Location |
|---------|----------|
| Routes | `/` → `app/page.tsx`; `/dashboard` → `app/dashboard/page.tsx` + `ForeverDashboardClient.tsx` |
| UI + calculation | `legacy/App.tsx` (client); uses `computeForeverResults` from `legacy/foreverModel.ts` |
| Save handlers context | `app/ForeverCalculatorProvider.tsx` → `@cb/advisory-graph/ModelSaveHandlersContext` |
| Dashboard gate | `app/dashboard/foreverDashboardGate.ts` |
| Advisory API | `app/api/advisory-report/route.ts` (`modelType`: `forever-income`), `app/api/advisory-session/route.ts`, `app/api/advisory-persona/route.ts` |
| Report PDF | `app/dashboard/report-document/[exportId]/page.tsx`, `ForeverReportDocumentClient.tsx`, `ForeverReportModuleSections.tsx`, `foreverReportDerived.ts` |
| Export API | `app/api/forever/report-export/start/route.ts`, `app/api/forever/report-pdf/[exportId]/route.ts`, `app/api/forever/report-export/lion-config/route.ts` |
| Snapshot types | `app/dashboard/print/foreverPrintSnapshot.ts` |
| Lion ensure (paid) | `lib/ensureForeverReportLionConfig.ts` |

#### 4.A.3 Input schema (implemented field names)

From `ForeverApp` state + `ForeverModelInputs`:

| Field | Type | Meaning |
|-------|------|---------|
| `currency` | string | Display / formatting (RM, SGD, …). |
| `expense` | number | Lifestyle amount. |
| `expenseType` | `ExpenseType.MONTHLY` \| `ANNUAL` | Scales to annual expense. |
| `familyContribution` | number | Offset in same period as expense type. |
| `expectedReturn` | number % | Nominal portfolio return. |
| `inflationRate` | number % | Subtracted to get real return. |
| `cash`, `investments`, `realEstate` | number | Asset buckets. |
| `propertyLoanCost` | number % | Annual rate for amortization of `realEstate` over `propertyTimeHorizon`. |
| `propertyTimeHorizon` | years | If 0 or no property, no payment. |

Slider maxima depend on currency group and expense type (`legacy/App.tsx` `sliderConfigs`).

#### 4.A.4 Calculation pipeline

**Function:** `computeForeverResults(inputs: ForeverModelInputs)` — `apps/forever/legacy/foreverModel.ts`.

1. **Annual expense:** `baseAnnualExpense = expense * 12` if monthly else `expense`.
2. **Property payment:** If `realEstate > 0` and `propertyTimeHorizon > 0`: standard amortization; if `monthlyRate === 0`, linear principal `realEstate / totalMonths`.
3. **Annual contribution:** Same month/annual scaling as expense for `familyContribution`.
4. **Total gross annual expense:** `baseAnnualExpense + propertyMonthlyRepayment * 12`.
5. **Net annual expense:** `max(0, totalGrossAnnualExpense - annualContribution)`.
6. **Real return (decimal):** `(expectedReturn - inflationRate) / 100` → `isSustainable = realReturnRateDecimal > 0`.
7. **Capital needed:** If sustainable: `netAnnualExpense / realReturnRateDecimal`; else if `netAnnualExpense > 0` then `Infinity`, else `0`.
8. **Total assets:** `cash + investments + realEstate`.
9. **Gap:** If sustainable: `max(0, capitalNeeded - totalAssets)`; else `0`.
10. **Progress %:** If sustainable: `capitalNeeded === 0 ? 100 : min(100, (totalAssets / capitalNeeded) * 100)`; else `0`.
11. **Runway string:** If `netAnnualExpense <= 0` → `"Perpetual"`. Else if `r > 0`: if `C*r >= W` → `"Perpetual"`; else `years = log(W/(W - C*r)) / log(1+r)`. If `r === 0`: `C/W` years. If `r < 0`: log formula with NaN guard.

**Rounding:** Runway years formatted with `.toFixed(1)` where applicable.

#### 4.A.5 Formula inventory (Forever)

| Output | Formula / rule | Where |
|--------|----------------|-------|
| `realReturnRate` | `(expectedReturn - inflationRate)` (display %) | `foreverModel.ts` |
| `capitalNeeded` | `W/r` with `W = netAnnualExpense`, `r = real return decimal` | same |
| `gap` | `max(0, capitalNeeded - totalAssets)` when sustainable | same |
| `progressPercent` | `min(100, totalAssets/capitalNeeded*100)` | same |
| Lion `ForeverLionInputs` | Built in `legacy/App.tsx` from `parseForeverRunway`, results, `nominalExpectedReturnPct` | client |

#### 4.A.6 Score bands / classifications

- **Sustainability:** Boolean `isSustainable` from `realReturnRateDecimal > 0`.
- **Lion:** Engine `runLionVerdictEngineForever` uses `foreverProgressTechnicalToLion0to100(progressPercent, context)` then `lionEngineTierFromLionScore0to100`. Public label via `lionPublicStatusFromScore0to100` + `lionStrongEligibilityFromForeverInput`.

#### 4.A.7 Displayed outcomes

- **Metric spine:** Target Capital / Total Assets / Horizon (`useModelMetricSpine` in `App.tsx`).
- **Charts:** Recharts pie of asset breakdown + gap.
- **Lion:** `LionVerdictActive` when `canAccessLion(lionAccessUser)`.
- **Save PDF:** Requires `results.isSustainable` for `saveForeverReportPdf` path (`App.tsx`).

#### 4.A.8 Scenario / solver

- No automated solver for “required return” or “required capital” beyond user sliders. Strategic options are **narrative** from Lion client report builder.

#### 4.A.9 Lion’s Verdict integration

- **Client JSON:** `buildLionVerdictClientReportFromForever` (`buildClientVerdictFromForever.ts`).
- **Engine:** `runLionVerdictEngineForever` — score from progress + adjustments (`foreverProgressTechnicalToLion0to100`).
- **On-screen copy:** `getLionVerdict` from `@cb/lion-verdict/getLionVerdict` (inputs: userId, tier from `foreverLionReport.verdict.status`, persona, confidence, histories) — see `App.tsx` usage.
- **PDF / export:** Trial users: `planSlugDeniesLionsVerdict` → no server-side Lion line ensure; paid: `ensureForeverReportLionConfig` picks **headlineIndex/guidanceIndex** from `LION_COPY` with **anti-repeat** vs last exports.

---

### 4.B Capital Engineering / Income Engineering (`apps/incomeengineering`)

#### 4.B.1 Purpose

Single-period **monthly** cash-flow coverage with optional **unlocking capital** mechanisms producing loans and investment income.

#### 4.B.2 Entry points

| Concern | Location |
|---------|----------|
| Dashboard | `app/dashboard/page.tsx` → `IncomeEngineeringDashboardClient.tsx` → `legacy/App.tsx` |
| Simulation | `legacy/lib/simulation.ts` `runSimulation` |
| State | `legacy/store/useCalculatorStore.tsx` |
| Advisory API | `app/api/advisory-report/route.ts` (`modelType`: `income-engineering`) |
| PDF | `legacy/components/PrintReportView.tsx` (jspdf/html2canvas path via `@cb/pdf` helpers) |

#### 4.B.3 Input schema

From `CalculatorState` / `SimulationInput`:

- `currency` → `CURRENCIES` in `legacy/config/currency.ts` (max monthly expenses per currency).
- `monthlyExpenses`, `incomeRows[]` (label + amount), `loans[]`, `investmentBuckets[]` (allocation + `expectedReturnAnnual` 0–15%), `assetUnlocks[]`.
- **Store-only (not in simulation):** `autoReinvestSurplus`, `flatTaxOnReturns`, `flatTaxRate`, `liquidateToCoverShortfall` — **confirmed not read by `runSimulation`** (§11).

#### 4.B.4 Calculation pipeline

`runSimulation`:

1. `baseIncome = sum(incomeRows.amount)`.
2. `bucketInvestmentIncome = sum(allocation * (expectedReturnAnnual/100/12))`.
3. `unlockingInvestmentIncome = totalMonthlyInvestmentIncomeFromUnlocking(assetUnlocks)` (`assetUnlockToLoans.ts`).
4. `totalLoanRepayment = sum(monthlyPayment(principal, annualRate, tenureYears))` per loan.
5. `totalIncome = baseIncome + bucketInvestmentIncome + unlockingInvestmentIncome`.
6. `totalExpenses = monthlyExpenses + totalLoanRepayment`.
7. `net = totalIncome - totalExpenses`.
8. `coverageRatio = totalIncome / (monthlyExpenses + totalLoanRepayment)` if denominator > 0 else 0.
9. **Invalid** if `monthlyExpenses > cfg.maxMonthlyExpenses`.
10. Sustainability: `invalid` / `green` (`>= COVERAGE_GREEN` 0.98) / `amber` (`>= COVERAGE_AMBER` 0.75) / `red`.

Constants: `legacy/config/constants.ts` — `COVERAGE_GREEN = 0.98`, `COVERAGE_AMBER = 0.75`.

#### 4.B.5 Formula inventory

| Metric | Definition |
|--------|------------|
| Median / worst coverage | Both set to same `coverageRatio` (single month). |
| Sustainability badge | Green / amber / red per thresholds above. |

#### 4.B.6 Lion integration

- `buildLionVerdictClientReportFromIncomeEngineering` — score `incomeEngineeringCoverageToLion0to100` (average of median + worst coverage %, ± nudge by status).
- **STRONG eligibility** explicitly sets `capitalSufficientVsTarget: false` → STRONG never passes (becomes STABLE at high scores).

#### 4.B.7 PDF

- `PrintReportView.tsx`: builds PDF narrative via `buildPdfNarrative`, `PdfLayout`, `PDF_TOC_INCOME_ENGINEERING`, coverage chart block, Lion block when `lionAccessEnabled`.

---

### 4.C Capital Health (`apps/capitalhealth`)

#### 4.C.1 Purpose

**Growth:** Project capital at horizon vs target. **Withdrawal:** Sustainability of draws with buffer, reinvestment, optional inflation; runway / depletion messaging.

#### 4.C.2 Main files

| Concern | Location |
|---------|----------|
| Engine | `legacy/calculator-engine.ts` |
| Aggregated results | `legacy/src/hooks/buildCalculatorResults.ts` |
| Target path | `legacy/src/lib/simulateTargetWithdrawal.ts` |
| Plan banner | `legacy/src/lib/evaluatePlan.ts` |
| Solvers | `legacy/src/lib/solver.ts`, `solverCoverage.ts` |
| Risk tier | `legacy/src/lib/riskTier.ts` |
| UI | `legacy/App.tsx`, `ReportPrint.tsx`, `CapitalGrowthReport.tsx` |
| Export | `legacy/src/lib/exportCapitalHealthReport.ts` |

#### 4.C.3 Input schema (`CalculatorInputs`)

See `legacy/calculator-types.ts`: `mode`, `currency`, `riskPreset`, `targetMonthlyIncome`, `targetFutureCapital`, `timeHorizonYears`, `startingCapital`, `expectedAnnualReturnPct`, `monthlyTopUp`, `inflationEnabled`, `inflationPct`, `cashBufferPct`, `cashAPY`, `reinvestmentSplitPct`, `withdrawalRule` (`fixed` \| `pct_capital`), `withdrawalPctOfCapital`, `yieldBoost`.

`PRESETS` in `calculator-types.ts` define default returns, buffers, reinvest %, withdrawal % of capital per risk preset.

#### 4.C.4 Calculation pipeline (core)

**A. `runSimulation` (`calculator-engine.ts`)**

- Clamps annual return to 0–15%; if inflation on: `effectiveAnnualReturn = max(0.01, expectedAnnualReturnPct - inflationPct)`.
- Monthly invest return: **compound** `(1 + annual/100)^(1/12) - 1`; cash similarly.
- Monthly loop: apply buffer %, returns, reinvest `reinvestmentSplitPct` of total return, add `monthlyTopUp`, subtract withdrawal from `getWithdrawalAmount` (fixed draw capped by capital − buffer; or `% of total capital` in withdrawal mode).
- **Withdrawal mode** extends run to `max(horizonMonths, 600)` for depletion detection.
- **Coverage % (growth):** `nominalAtHorizon / targetFutureCapital * 100`.
- **Coverage % (withdrawal) in engine:** `(monthlyReturnOnCapital / targetMonthlyIncome) * 100` where `monthlyReturnOnCapital = (R/12) * startingCapital` with `R = effective annual % / 100` — **not** using post-simulation balance for coverage numerator.

**B. `buildCalculatorResults` overlays**

- `sustainableIncomeMonthly`: from `evaluatePlan` when withdrawal mode (`planOutput.sustainableMonthly`), else growth uses `passiveIncomeMonthly` from engine.
- **Displayed `coveragePct`:** withdrawal mode uses `sustainableIncomeMonthly / targetMonthlyIncome * 100` (can **differ** from engine’s `result.coveragePct`).
- `simulateTargetWithdrawal` for target series and solvers.
- Chart-aligned depletion: finds first month in snapshots where `totalCapital <= max(EPS, startingCapital * 0.005)` and overrides `runwayPhrase` / `depletionMonth`.

**C. `evaluatePlan`**

- Blended monthly portfolio return `r_portfolio` from asset weight and cash weight.
- **Important:** `inputsToEvaluatePlan` sets `indexWithdrawalsToInflation: false` and uses **effective return = expected − inflation** when inflation enabled — withdrawals stay **constant in nominal terms** while return is **real**. Documented in code as intentional.

#### 4.C.5 Formula inventory (selected)

| Item | Rule |
|------|------|
| Status `sustainable` / `plausible` / `unsustainable` | Engine rules in `calculator-engine.ts` (coverage thresholds 81%, 100%, buffer breach, depletion vs horizon). |
| Risk tier | `getRiskTier(survivalProbabilityDisplay)` — bands 90 / 75 / 55 / 30 / else. |
| Lion tier for client report | `getRiskTier` → `tier` 1–5 fed into `runLionVerdictEngineCapitalHealth`. |

#### 4.C.6 Lion integration

- `buildLionVerdictClientReportFromCapitalHealth` calls `runLionVerdictEngineCapitalHealth(mode, tier, vars)`.
- `ReportPrint.tsx` builds `LionHealthVariables` with formatted currency strings and horizon/runway.

#### 4.C.7 PDF

- `exportCapitalHealthReport` → `generateReportBlob` in `CapitalGrowthReport.tsx` (**@react-pdf/renderer**). `includeLionsVerdict` defaults true; **trial** flows pass false to omit Lion.

---

### 4.D Capital Stress (`apps/capitalstress`)

#### 4.D.1 Purpose

Monte Carlo **daily** paths with optional **stress shock**, resilience score, depletion pressure bar (Policy B), fragility heuristics, scenario grid.

#### 4.D.2 Main files

| Concern | Location |
|---------|----------|
| Monte Carlo | `legacy/services/mathUtils.ts` |
| Lion re-export | `legacy/services/advisory_engine.ts` |
| UI | `legacy/App.tsx`, `legacy/PrintReport.tsx` |
| Context | `legacy/DepletionBarContext.tsx` |

#### 4.D.3 User inputs — `getInputs()` payload (`capitalstress/legacy/App.tsx`)

| Key | Meaning |
|-----|---------|
| `investment` | Initial capital (number). |
| `withdrawal` | **Annual** withdrawal amount (number) — feeds `yearlyWithdrawal` in `runMonteCarlo`. |
| `lowerPct`, `upperPct` | Annual return band **%** (Monte Carlo daily bounds via `pow(1+r,1/365)-1`). |
| `years` | Horizon (years). |
| `confidence` | Confidence level for MC stats (default 90); feeds resilience score penalty. |
| `currencyIndex` | Index into `CURRENCIES` array (formatting). |
| `inflationAdjustmentOn`, `inflationPct` | `effectiveInflation = inflationAdjustmentOn ? inflationPct : 0`. **Confirmed:** `runMonteCarlo` is called with **unadjusted** `lowerPct`/`upperPct` — inflation does **not** enter `mathUtils.ts`. It is used for **display** (e.g. deflating `simulatedAverage` by `(1+effectiveInflation/100)^years`) and for **Fragility Index** sensitivity components (`inflationSens = min(100, effectiveInflation * 25)`), not for path generation. |
| `stressSeverity` | `'none'` \| `'moderate'` \| `'bear'` \| `'crisis'`. |
| `pathView` | `'worst'` \| `'median'` \| `'best'` — which path drives chart display. |

Path count: `getSimulationCount(years)` = `max(365, round(years * 365))`.

#### 4.D.3b Results — `getResults()` payload

- Always includes `mcResult`, `stressScenarioResults`, `adjustmentResults` (from component state).
- When `canSeeVerdict && lionAccessEnabled && mcResult`, merges **`lionVerdictClient`** from `buildLionVerdictClientReportFromStress(advisoryInputs, { formatCurrency })`.
- **`LionStressAdvisoryInputs` construction:** `fragilityIndicator` = `depletionBarRef.current.pillLabel` **if** depletion bar ref set, else `mcResult.fragilityIndicator` — **Category A live behaviour:** Lion fragility label can follow **Policy B depletion pill** rather than `computeFragility` output when bar is available.

#### 4.D.3c Fragility Index (UI)

- `getFragilityIndexTier(score)` maps a 0–100 score to `FORTIFIED` … `Critical` (`App.tsx`). Distinct visual system from Depletion Pressure Policy B (documented in-file).

#### 4.D.4 Resilience score (`computeCapitalResilienceScore`)

Located in `mathUtils.ts`:

- `blendedSurvival = 0.7 * survivalProbability + 0.3 * (1 - avgStructuralStressRate)` when structural stress series exists; else `survivalProbability`.
- `base = (blendedSurvival - 0.5) * 200` → maps 50% survival to 0.
- Penalties: confidence `(confidenceLevel - 90) * 0.2`, stress severity 5/10/15, erosion vs initial capital up to 40 pts, withdrawal % of initial up to 35 pts.
- Clamped to [-100, 100], rounded.

**Depletion pressure** `computeDepletionPressurePct` combines depletion probability, drawdown, withdrawal, erosion; clamp to [-125, 125] then displayed with bar mapping.

**Policy B bar:** `segmentIndexFromPressure` thresholds on pressure: `<0` Stable, `0–10` Watchful, `10–30` Vulnerable, `30–60` Fragile, `≥60` Critical. **Distinct** from `computeFragility` labels (still in same file) used for `fragilityIndicator`.

**Lion tier from score:** `lionTierFromTechnicalResilience` → maps technical -100…100 to Lion 0–100 then `lionEngineTierFromLionScore0to100`.

#### 4.D.5 Dead / legacy in stress math file

- `generateForecast` in `mathUtils.ts` is **never imported** elsewhere — **dead code** (Category C).

#### 4.D.6 Lion integration

- `runLionVerdictEngineStress` for narrative; `buildLionVerdictClientReportFromStress` for client JSON PDF.
- `lionStrongEligibilityFromStressInputs` optionally uses **goal snapshot** from monthly income goal + target capital.

---

## 5. Cross-app comparison matrix

| Dimension | Forever | Income Eng. | Capital Health | Capital Stress |
|-----------|---------|-------------|----------------|----------------|
| Primary question | Forever capital & runway | Monthly coverage | Horizon growth / withdrawal | Distribution + stress |
| Input complexity | Medium (assets + property) | High (unlocks, buckets, loans) | High (modes, buffers, inflation) | Medium–high (MC params) |
| Main outputs | capitalNeeded, gap, runway | coverage, sustainability | status, runway, charts, risk tier | survival, resilience score, pressure |
| Score type | Progress % → Lion | Coverage % → Lion | Risk tier 1–5 → Lion | Resilience index → Lion 0–100 |
| Interpretation | Deterministic | Single-period | Multi-month deterministic + auxiliary evaluators | Stochastic |
| Charts | Pie (assets) | Summary / coverage | Area (capital path) | Timeline / bands |
| Verdict | @cb/lion-verdict + advisory-graph | advisory-graph + pdf | advisory-graph only | advisory-graph + @cb/lion-verdict |
| Report sections | Forever PDF modules + TOC | PrintReportView TOC | react-pdf sections | PrintReport |
| Shared deps | advisory-graph, pdf, ui, lion-verdict | advisory-graph, pdf, ui, lion-verdict | advisory-graph, pdf, ui (no lion-verdict pkg) | advisory-graph, pdf, ui, lion-verdict |
| Completeness | High | High (unused store fields) | High (multiple pipelines) | High |

---

## 6. Shared calculation and logic dependencies

| Module | Purpose | Used by |
|--------|---------|---------|
| `@cb/advisory-graph/lionsVerdict/engine.ts` | Lion engines + tier | All four (Health via engine only) |
| `@cb/advisory-graph/lionsVerdict/lionScoreMapping.ts` | Public bands, STRONG gates, mappings | All client builders |
| `@cb/shared/plans.ts` | `planSlugDeniesLionsVerdict`, normalize slug | Forever ensure, login entitlements |
| `@cb/shared/reportTraceability` | `buildReportId`, `createReportAuditMeta` | Forever export, stress, income PDF, health |
| `@cb/shared/urls` | Pricing return URLs | Dashboards |
| `@cb/pdf/report-ready` | `window.__REPORT_READY__` contract | Forever report document client |

**Duplication risk:** Capital Health has **three** withdrawal sustainability concepts (engine coverage, `evaluatePlan`, `simulateTargetWithdrawal`). Changes must be coordinated.

---

## 7. PDF / report generation full specification

### 7.1 Playwright pipeline (`@cb/pdf` `renderPdf.ts`)

- Launches Chromium (local or serverless via `@sparticuz/chromium` when env indicates).
- Navigates to **real URL**; waits for `window.__REPORT_READY__` unless disabled.
- Optional footer from DOM attributes (`CB_PDF_FOOTER_DOM_*`) or static wordmark.
- Forever: `GET /api/forever/report-pdf/[exportId]` calls `renderPdf({ url: report-document page, playwrightFooterFromDom: true, cookies })`.

### 7.2 Forever v6 flow (authoritative)

1. User clicks save → `POST /api/forever/report-export/start` with `ForeverPrintSnapshotV1` + `verdictTier`.
2. Row inserted in `public.report_exports`; paid users get `ensureForeverReportLionConfig` **or** skip for trial.
3. Client fetches `GET /api/forever/report-pdf/[exportId]` → Playwright loads `/dashboard/report-document/[exportId]`.
4. Report page renders calculator + Lion from DB + `deriveForeverReportModel`; sets audit meta on root; `completeReportReadyCycle` for `__REPORT_READY__`.

**Recomputation on PDF:** `deriveForeverReportModel` (`foreverReportDerived.ts`) **re-runs** `computeForeverResults` from persisted `inputs` (via `parseForeverModelInputs`). It adds **report-only** analytics: `monthlyNeed`, `monthlySupported`, `monthlyGap`, waterfall, capital curve, liquidity haircuts, sensitivity charts — **not** all of these exist in the dashboard `App.tsx` at the same granularity. PDF is therefore **authoritative for PDF sections**; dashboard shows a subset.

**Trial:** Lion lines may be locked; `foreverPrintSnapshot` `buildLionSection` sets `locked: true` when no snapshot.

### 7.3 Income Engineering

- **Client-generated** PDF via `PrintReportView.tsx` (not Playwright route in repo). Uses `@cb/pdf/shared` components and `buildPdfNarrative`.

### 7.4 Capital Health

- **Client-generated** `generateReportBlob` — `@react-pdf/renderer`. Font registration: `registerCapitalHealthPdfFontsBrowser.ts`. Optional rasterized brand lockup in `exportCapitalHealthReport`.

### 7.5 Capital Stress

- `legacy/PrintReport.tsx` + `buildCapitalTimelinePrintPayload` from advisory-graph for timeline data.

### 7.6 Platform generic print

- `apps/platform/app/print/[model]/page.tsx`: `JSON.parse(decodeURIComponent(searchParams.data))` passed to `BaseReport` — **tooling / generic** narrative PDF, not the primary production path for the four apps.

### 7.7 Screen vs PDF parity risks

- **Forever PDF** may show **mid-band score** from tier chip if only tier stored (`FOREVER_TIER_MID_SCORE` in `ForeverReportDocumentClient.tsx`) — can differ from live numeric score.
- **Stochastic stress:** PDF capture is **one realization** unless PDF triggers deterministic seed (none documented).

---

## 8. Data persistence / export / snapshot dependencies

| Store | Table / mechanism | What’s stored |
|-------|-------------------|---------------|
| Advisory reports | `advisory_v2.advisory_reports` | `inputs`, `results` JSON per `model_type` |
| Forever PDF | `public.report_exports` | `lion_config` JSONB (schema v2: calculator + lion lines), `report_id`, `tier` (plan slug) |

**Forever** is the only app with **`report_exports`** integration in this repo. Others rely on advisory_reports + client-side PDF blobs.

---

## 9. Auth / access / membership / paid-gating effects

### 9.1 `deriveEntitlements` (`platformAccess.ts`)

- **Trial:** `canSaveToServer: false`, `canSeeVerdict: false`, `canUseStressModel: false`.
- **Paid (monthly/quarterly):** save + verdict + stress true; `canSeeSolutions: false`.
- **Yearly / strategic:** `canSeeSolutions: true` (flagship).

### 9.2 Lion copy access

- `planSlugDeniesLionsVerdict`: **trial** and **gitex_*** and **unknown/null** slugs → no Lion verdict content / ensure skipped.
- `canAccessLion`: paid OR `hasActiveTrialUpgrade` (currently always false from `lionAccessUserFromPlanSlug`).

### 9.3 Calculations vs display

- **Income Engineering / Forever:** Calculations run regardless; Lion **UI** gated by `canAccessLion`.
- **Stress dashboard:** `canUseStressModel` / `canSeeVerdict` passed to `LegacyApp` — UI may hide or limit (see `App.tsx` for branches).

---

## 10. UI-to-logic mapping (summary)

| App | Visible KPI | Source |
|-----|-------------|--------|
| Forever | Target capital, assets, horizon | `computeForeverResults` + spine |
| Income Eng. | Coverage %, badge | `runSimulation` |
| Health | Runway, coverage, risk tier | `buildCalculatorResults` + `riskTier` |
| Stress | Resilience score, depletion bar | `runMonteCarlo` + `getDepletionBarOutput` |

---

## 11. Risks / ambiguities / technical debt

1. **Income Engineering:** `autoReinvestSurplus`, `flatTaxOnReturns`, `liquidateToCoverShortfall` stored but **not used** in `runSimulation` — **Category C** (dead for math) or incomplete feature.
2. **Capital Health:** Three withdrawal semantics (engine vs evaluatePlan vs simulateTargetWithdrawal) — **reconciliation burden** and potential user confusion.
3. **Forever PDF score:** Tier mid-score mapping when full score not stored — **screen vs PDF** divergence risk.
4. **Stress:** Monte Carlo **non-deterministic**; `generateForecast` **dead code**.
5. **Policy B vs fragility:** Two parallel label systems in `mathUtils.ts` — must not swap when auditing.
6. **gitex_** plans normalize to trial — affects verdict and entitlements.
7. **Stress inflation:** UI suggests “real terms” but **paths do not** apply inflation to returns — only deflated display and sensitivity index (see §4.D.3).

---

## 12. Rebuild readiness assessment

| App | Calc | Architecture | Report | Verdict | Confidence |
|-----|------|--------------|--------|---------|------------|
| Forever | High | High | High (documented scripts) | High | **High** |
| Income Eng. | High (note unused store) | Medium | High | High | **Medium–High** |
| Health | Medium (multi-pipeline) | Medium | High | High | **Medium** |
| Stress | High | High | Medium | High | **Medium–High** (stochastic caveat) |

---

## Appendix A: File inventory

**Forever:** `legacy/foreverModel.ts`, `legacy/App.tsx`, `app/dashboard/report-document/[exportId]/ForeverReportDocumentClient.tsx`, `app/api/forever/report-export/start/route.ts`, `app/api/forever/report-pdf/[exportId]/route.ts`, `lib/ensureForeverReportLionConfig.ts`.

**Income Engineering:** `legacy/lib/simulation.ts`, `legacy/store/useCalculatorStore.tsx`, `legacy/components/PrintReportView.tsx`, `legacy/App.tsx`.

**Capital Health:** `legacy/calculator-engine.ts`, `legacy/src/hooks/buildCalculatorResults.ts`, `legacy/src/lib/evaluatePlan.ts`, `legacy/src/lib/simulateTargetWithdrawal.ts`, `legacy/src/lib/solver.ts`, `legacy/CapitalGrowthReport.tsx`, `legacy/ReportPrint.tsx`.

**Capital Stress:** `legacy/services/mathUtils.ts`, `legacy/App.tsx`, `legacy/PrintReport.tsx`.

**Shared:** `packages/advisory-graph/src/lionsVerdict/engine.ts`, `lionScoreMapping.ts`, `packages/pdf/src/renderPdf.ts`, `packages/pdf/src/reportReady.ts`, `packages/advisory-graph/src/server/advisoryRoutes.ts`, `packages/advisory-graph/src/platformAccess.ts`.

---

## Appendix B: Formula registry (consolidated)

See §4 per app. Global Lion mapping:

- **Stress Lion 0–100:** `(technicalResilience - (-100)) / 200 * 100`, clamped (`technicalResilienceToLion0to100`).
- **Public bands:** 90+ STRONG (gated), 77–89 STABLE, 57–76 FRAGILE, 39–56 AT_RISK, &lt;39 NOT_SUSTAINABLE (`lionPublicStatusFromScore0to100`).
- **Health Lion 0–100:** `(5 - tier) / 4 * 100` for tier 1…5 (`healthRiskTierTechnicalToLion0to100`).
- **Income Engineering Lion:** `tech = (medianCoveragePct + worstMonthCoveragePct) / 2`, then ± adjustment for green/amber/red (`incomeEngineeringCoverageToLion0to100`).

---

## Appendix C: Questions requiring founder clarification

1. **Income Engineering:** Are unused store fields (`autoReinvestSurplus`, tax, liquidate) **planned** features or safe to delete?
2. **Capital Health:** Which pipeline should be **canonical** for “sustainable income” in client-facing advice when `evaluatePlan` and `runSimulation` disagree?
3. **Stress:** Should Monte Carlo be **deterministic** (seeded) for audit reproducibility?

---

## Specification confidence notes

### Confirmed (from code)

- Forever closed-form formulas in `foreverModel.ts`.
- Income Engineering coverage and thresholds in `simulation.ts` + `constants.ts`.
- Capital Health month-loop and `evaluatePlan` / `simulateTargetWithdrawal` implementations.
- Stress `runMonteCarlo` and score penalties in `mathUtils.ts`.
- Capital Stress: `runMonteCarlo` ignores inflation; `effectiveInflation` used for display + fragility index sensitivities only (`App.tsx` `runCalculation`).
- Lion stress payload prefers `depletionBarRef.current.pillLabel` for `fragilityIndicator` when set.
- PDF flows: Forever Playwright route; Health react-pdf; Income Engineering PrintReportView; entitlements in `platformAccess.ts`.
- `report_exports` usage limited to Forever in this repo.

### Inferred (not separately proven)

- Exact branching of **every** UI gate in Stress `LegacyApp` for trial users (large file — partial read). Further audit recommended for **all** `canUseStressModel` / `canSeeVerdict` branches.

### Ambiguous / inconsistent

- Capital Health **multiple** sustainability definitions (§11).
- Forever PDF **tier → score** mid-band mapping vs live score.

### Legacy / dead / stub

- `apps/forever/app/dashboard/print/page.tsx` redirects — legacy URL.
- `generateForecast` in stress `mathUtils.ts` — unused.
- Platform `print/[model]` — generic BaseReport, not primary product PDF.

### Legacy logic still present

- `foreverPdfBuild.ts`, `getLionVerdict` history-based copy system, dual persona RPC fallbacks in `fetchPersona`.

---

**End of document.**
