# INTERNAL_FORMULA_INDEX.md

**Classification:** Internal — formula registry across four model apps.  
**Primary sources:** `INTERNAL_FULL_SYSTEM_SPEC.md`, `packages/advisory-graph/src/lionsVerdict/`, app `legacy/` engines.

**Legend — Status:** `live` = executed in current path; `legacy` = deprecated or unused import; `duplicate` = same math, two names; `inferred` = UI-only derivation; `unresolved` = needs founder tie-break.

**Legend — Disclosure sensitivity:** `low` (conceptual), `medium` (thresholds), `high` (full formula), `critical` (could enable replication + commercial risk).

---

## 1. Document role

Single lookup for **metric → file → function → inputs/outputs → consumers** (screen, Lion, PDF). Use with **`INTERNAL_ALIGNMENT_TABLES.md`** for parity checks.

---

## 2. Master formula registry (abridged — see per-app sections for completeness)

| Metric / algorithm | App | Source file | Function | Inputs (summary) | Output | Rounding / clamps | Screen | Lion | PDF | Status | Disclosure |
|--------------------|-----|-------------|----------|------------------|--------|---------------------|--------|------|-----|--------|------------|
| Forever sustainability & runway | Forever | `apps/forever/legacy/foreverModel.ts` | `computeForeverResults` | `ForeverModelInputs` | `ForeverRunwayResult` | runway `.toFixed(1)`; `progressPercent` min 100 | Y | via client report | Y | live | high |
| Forever Lion engine score | Shared | `packages/advisory-graph/src/lionsVerdict/engine.ts` | `runLionVerdictEngineForever` | `ForeverLionInputs` | `LionVerdictOutput.score0to100` | `foreverProgressTechnicalToLion0to100` | Y | Y | Y | live | high |
| Forever progress nudge | Shared | `packages/advisory-graph/src/lionsVerdict/lionScoreMapping.ts` | `foreverProgressTechnicalToLion0to100` | progress %, context | 0–100 | ±10 nudge clamped | via engine | Y | Y | live | high |
| Income coverage ratio | Inc. Eng. | `apps/incomeengineering/legacy/lib/simulation.ts` | `runSimulation` | incomes, expenses, loans, buckets, unlocks | `medianCoverage`, `worstMonthCoverage` | same as coverageRatio | Y | Y | Y | live | high |
| Sustainability badge | Inc. Eng. | `simulation.ts` | thresholds | `coverageRatio` vs `COVERAGE_GREEN`/`AMBER` | `green`/`amber`/`red` | — | Y | via status | Y | live | medium |
| Health month simulation | Health | `apps/capitalhealth/legacy/calculator-engine.ts` | `runSimulation` | `CalculatorInputs` | `SimulationResult` | clamp return 0–15; max 600 months withdrawal | Y | partial | Y | live | high |
| Health headline coverage overlay | Health | `apps/capitalhealth/legacy/src/hooks/buildCalculatorResults.ts` | `buildCalculatorResults` | results + `evaluatePlan` | `coveragePct`, runway overrides | chart depletion threshold 0.5% capital | Y | Y | Y | live | high |
| Health plan evaluator | Health | `apps/capitalhealth/legacy/src/lib/evaluatePlan.ts` | `evaluatePlan` | blended `r_portfolio`, withdrawals | `PlanStatus`, `sustainableMonthly` | EPS guards | Y | indirect | Y | live | high |
| Target withdrawal path | Health | `simulateTargetWithdrawal.ts` | `simulateTargetWithdrawal` | capital, months, rates | depletion month, series | — | charts | — | Y | live | high |
| Risk tier | Health | `apps/capitalhealth/legacy/src/lib/riskTier.ts` | `getRiskTier` | survival 0–100 | tier 1–5 | thresholds 90/75/55/30 | Y | Y | Y | live | medium |
| Goal status | Health | `goalStatus.ts` | `classifyStatus` | ratio % | `on_track`/`close`/`off_target` | 100 / 90 | Y | — | partial | live | medium |
| Stress Monte Carlo | Stress | `apps/capitalstress/legacy/services/mathUtils.ts` | `runMonteCarlo` | capital, withdrawal, return band, years, severity, paths, confidence | `MonteCarloResult` | score clamped -100..100 | Y | Y | Y | live | critical |
| Resilience score | Stress | `mathUtils.ts` | `computeCapitalResilienceScore` | survival, confidence, severity, capital, avg outcome, withdrawal %, structural stress | number | `Math.round` + clamp | Y | mapped | Y | live | critical |
| Depletion pressure | Stress | `mathUtils.ts` | `computeDepletionPressurePct` | several rates | ±125 cap → rounded 1dp | Y | Y | Y | live | high |
| Policy B bar | Stress | `mathUtils.ts` | `getDepletionBarOutput` | `depletionPressurePct` | `segmentIndex`, `pillLabel` | — | Y | fragility input | partial | live | medium |
| Stress scenarios | Stress | `mathUtils.ts` | `runStressScenarios` | ±1–2% return, withdrawal +10/20%, inflation scenarios | array of scores | 400 paths each | Y | — | partial | live | high |
| Fragility heuristic | Stress | `mathUtils.ts` | `computeFragility` | drawdown, p5, survival, withdrawal % | `FragilityLevel` | discrete rules | Y | fallback | partial | live | medium |
| Stress → Lion 0–100 | Shared | `lionScoreMapping.ts` | `technicalResilienceToLion0to100` | `capitalResilienceScore` | 0–100 | linear map -100..100 | Y | Y | Y | live | high |
| Public Lion bands | Shared | `lionScoreMapping.ts` | `lionPublicStatusFromScore0to100` | score, optional strong eligibility | STRONG…NOT_SUSTAINABLE | STRONG→STABLE if gate fails | Y | Y | Y | live | medium |
| Income Eng. Lion score | Shared | `lionScoreMapping.ts` | `incomeEngineeringCoverageToLion0to100` | median/worst coverage, status | 0–100 | ±10 nudge | Y | Y | Y | live | high |
| Health Lion engine | Shared | `engine.ts` | `runLionVerdictEngineCapitalHealth` | mode, tier 1–5, vars | `LionVerdictOutput` | tier from `healthTierToLion` | Y | Y | Y | live | high |
| Solvers (binary search) | Health | `solver.ts` | `solveStartingCapital` etc. | `simulateTargetWithdrawal` feasibility | required values | 80 iters, tol | partial | — | partial | live | high |

---

## 3. Per-app sections

### 3.1 Forever (`apps/forever/legacy/foreverModel.ts`)

| Output field | Formula / rule |
|--------------|------------------|
| `realReturnRate` | `(expectedReturn - inflationRate)` as % |
| `capitalNeeded` | If `realReturnRateDecimal > 0`: `netAnnualExpense / realReturnRateDecimal`; else ∞ or 0 |
| `gap` | `max(0, capitalNeeded - totalAssets)` if sustainable else 0 |
| `progressPercent` | `min(100, totalAssets/capitalNeeded*100)` if sustainable |
| `runway` | Piecewise: Perpetual; log years; C/W if r=0; negative r branch |

**Property payment:** Standard amortization `PMT = P*r/(1-(1+r)^-n)` or linear if rate 0.

### 3.2 Income Engineering

| Constant | Value | File |
|----------|-------|------|
| `COVERAGE_GREEN` | 0.98 | `legacy/config/constants.ts` |
| `COVERAGE_AMBER` | 0.75 | same |

**Coverage:** `(baseIncome + bucketIncome + unlockIncome) / (monthlyExpenses + loanRepayments)`.

**Bucket income:** `allocation * (expectedReturnAnnual/100/12)` per bucket.

### 3.3 Capital Health

Key thresholds in `calculator-engine.ts` status logic: growth `coveragePct` vs target capital; withdrawal `formulaSustainable`, `coveragePct` bands 81/100, buffer breach, depletion vs horizon.

`evaluatePlan`: `sustainableMonthly = startingCapital * r_portfolio + monthlyTopUp` with blended monthly rates.

### 3.4 Capital Stress

**Daily returns:** `dailyLower/Upper` from annual via `pow(1+r,1/365)-1`.  
**Regime sampling** + **shock day** + **withdrawal** yearly — see `runSingleDailyPath`.  
**Resilience:** documented block comment in `computeCapitalResilienceScore` (70/30 blend when structural stress rate present).

**Dead:** `generateForecast` — **not** in live path (`legacy`).

---

## 4. Score band / classification registry

### 4.1 Lion public bands (classification only)

**File:** `packages/advisory-graph/src/lionsVerdict/lionScoreMapping.ts` — `lionPublicStatusFromScore0to100`

| Score range | Label |
|-------------|--------|
| 90–100 | STRONG (requires `lionStrongEligible` or downgraded to STABLE) |
| 77–89 | STABLE |
| 57–76 | FRAGILE |
| 39–56 | AT_RISK |
| 0–38 | NOT_SUSTAINABLE |

**Engine tier** (`lionEngineTierFromLionScore0to100`): Very Strong / Strong / Moderate / Weak / Critical — **same breakpoints** as comment in file.

### 4.2 Income Engineering sustainability

| Condition | Status |
|-----------|--------|
| `coverageRatio >= 0.98` | green |
| `>= 0.75` | amber |
| else valid | red |
| expenses > currency max | invalid |

### 4.3 Capital Health `getRiskTier`

| Survival (input) | Tier | Label |
|------------------|------|-------|
| ≥90 | 1 | Very Strong |
| ≥75 | 2 | Strong |
| ≥55 | 3 | Moderate |
| ≥30 | 4 | Weak |
| else | 5 | Critical |

### 4.4 Capital Health `classifyStatus`

| ratioPct | Key |
|----------|-----|
| ≥100 | on_track |
| ≥90 | close |
| else | off_target |

### 4.5 Stress Policy B (`segmentIndexFromPressure`)

| Pressure | Index | Pill |
|----------|-------|------|
| <0 | 4 | Stable |
| [0,10) | 3 | Watchful |
| [10,30) | 2 | Vulnerable |
| [30,60) | 1 | Fragile |
| ≥60 | 0 | Critical |

### 4.6 STRONG eligibility (per model)

**Files:** `lionScoreMapping.ts` — `lionStrongEligibilityFromForeverInput`, `FromIncomeEngineering`, `FromHealthTier`, `FromStressInputs`.

**Income Engineering:** `capitalSufficientVsTarget: false` → **STRONG blocked** via eligibility.

---

## 5. Duplicate / divergence warnings

| Issue | Details |
|-------|---------|
| Stress `fragilityIndicator` | `computeFragility` vs Policy B `pillLabel` — Lion may use **bar** when ref available. |
| Health `coveragePct` | Engine vs `buildCalculatorResults` — **different numerators** for withdrawal headline. |
| `stressScoreToDisplay0to100` | Alias of `technicalResilienceToLion0to100` — duplicate name. |
| Forever PDF score | `foreverDisplayScore0to100` vs live `engine.score0to100` — **tier mid-score** in PDF path. |
| Capital Stress inflation | UI “real terms” display **not** in Monte Carlo — **divergence** between label intuition and path math. |

---

## 6. Formula confidence notes

| Area | Proven from code | Depends on founder |
|------|------------------|---------------------|
| Forever closed form | Yes | — |
| Income unused store | N/A — not in formula | Roadmap vs delete |
| Health triple pipeline | Yes — all three exist | Which to cite externally |
| Stress RNG | Yes — non-seeded | Seed for audit? |
| Regulatory labels | No | Counsel |

---

**End of registry.** For narrative IP, see `packages/shared/src/legalMonocopy.ts`.
