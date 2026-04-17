# INTERNAL_TRUTH_OVERRIDES.md

**Classification:** Internal — founder / GPT configuration.  
**Purpose:** Product-authority layer when `INTERNAL_FULL_SYSTEM_SPEC.md` and raw code allow multiple readings.

**Supersedes:** Nothing in git — this file **interprets** code + specs for consistent answers. If this file conflicts with code, **code wins** unless explicitly marked **FOUNDER DECISION REQUIRED**.

---

## 1. Document role

- Resolves **ambiguity** between product intent, user-facing labels, and implementation (multiple pipelines, legacy fields, PDF shortcuts).
- Does **not** replace reading `INTERNAL_FULL_SYSTEM_SPEC.md` for mechanics.
- **Truth order for the internal GPT:**
  1. **Executable code path** actually run for the user’s context (live build).
  2. **`INTERNAL_TRUTH_OVERRIDES.md`** (this file) for “which pipeline is headline.”
  3. **`INTERNAL_FULL_SYSTEM_SPEC.md`** for file paths and detailed chains.
  4. **`INTERNAL_INVESTMENT_AND_FLOW_SPEC.md`** for subscription vs investment and institutional facts.

---

## 2. Override rules

### 2.1 When code and “product interpretation” differ

| Situation | Official stance |
|-----------|-----------------|
| Marketing or deck language vs calculator | **Calculator + persisted report JSON** are authoritative for **numeric** claims. |
| Two formulas yield different numbers for the “same” concept | Use **this file’s per-app hierarchy**; treat the other as **supporting** or **legacy**. |
| Comment in code says X but implementation does Y | **Implementation (Y)** is live truth; comment is **Category B** until fixed. |

### 2.2 Multiple pipelines — headline vs secondary

| App | Headline truth (user-facing primary) | Secondary / supporting |
|-----|--------------------------------------|-------------------------|
| **Forever** | `computeForeverResults` in `apps/forever/legacy/foreverModel.ts` for core KPIs; `deriveForeverReportModel` for **PDF-only** analytics built on top of the same `computeForeverResults`. | `foreverReportDerived.ts` curve / sensitivity charts — explain as **report-layer analytics**, not a second economic engine. |
| **Income Engineering** | `runSimulation` (`legacy/lib/simulation.ts`) — coverage ratio + sustainability status. | Store fields not read by `runSimulation` — **non-authoritative** until wired (see §4.2). |
| **Capital Health** | **Withdrawal mode headline:** `buildCalculatorResults` outputs that drive **status copy, risk tier, Lion** — specifically `coveragePct` from `sustainableIncomeMonthly / target` when withdrawal; `runwayPhrase` after chart depletion alignment; `riskMetrics` from `getRiskTier`. **Underlying simulation:** `runSimulation` in `calculator-engine.ts`. **Plan narrative:** `evaluatePlan` for `planStatus`, `sustainableMonthly`, coverage months. | `simulateTargetWithdrawal` series for charts/solvers; engine-only `coveragePct` where it differs from `buildCalculatorResults` overlay — **secondary** for headline “coverage %” label. |
| **Capital Stress** | `runMonteCarlo` in `mathUtils.ts` for **capitalResilienceScore**, survival, percentiles, **Policy B** `getDepletionBarOutput(depletionPressurePct)` for bar + pill when used. **Lion narrative:** `runLionVerdictEngineStress` + `buildLionVerdictClientReportFromStress`; `fragilityIndicator` passed to Lion uses **depletion bar `pillLabel` when `depletionBarRef` is set** else `mcResult.fragilityIndicator`. | `computeFragility` output vs Policy B pill — **both exist**; **Lion follows bar when ref present** (authoritative for Lion input). `generateForecast` in same file — **ignore for GPT** (dead, not imported). |

### 2.3 Legacy code — GPT handling

| Item | GPT must |
|------|----------|
| `apps/forever/app/dashboard/print/page.tsx` redirect | Treat `/dashboard/print` as **legacy URL**; official PDF path is **`/dashboard/report-document/[exportId]`**. |
| `foreverPdfBuild.ts`, client jsPDF paths | **Docs / smoke only** unless user explicitly works on those scripts. |
| Deprecated exports in `lionScoreMapping.ts` (`stressScoreToDisplay0to100` alias) | Prefer **`technicalResilienceToLion0to100`** naming in explanations; acknowledge alias exists. |
| Stress `generateForecast` | **Do not** describe as part of live stress engine. |

---

## 3. Per-app truth overrides

### 3.1 Forever Income (`@cb/forever`)

| Field | Override |
|-------|----------|
| **Official purpose** | Closed-form sustainability: capital needed vs assets, runway, real return; educational planning outputs per `advisoryFramework.ts`. |
| **Official headline metrics** | Target capital (or ∞), total assets, horizon/runway string — from `computeForeverResults` + spine in `legacy/App.tsx`. |
| **Interpretation hierarchy** | (1) `foreverModel.ts` (2) `foreverLionInput` / `buildLionVerdictClientReportFromForever` (3) `@cb/lion-verdict` headline/guidance when paid (4) PDF `deriveForeverReportModel` for extended charts. |
| **Secondary** | Mid-band PDF score line when only tier stored (`foreverDisplayScore0to100` in `ForeverReportDocumentClient.tsx`). |
| **Legacy / non-authoritative** | Any user belief that PDF **recomputes a different economic model** — false; PDF **extends** same `computeForeverResults` via `parseForeverModelInputs`. |
| **FOUNDER DECISION REQUIRED** | Whether PDF mid-score should be replaced with persisted numeric Lion score everywhere for strict parity. |

### 3.2 Income Engineering (`@cb/incomeengineering`)

| Field | Override |
|-------|----------|
| **Official purpose** | Single-month cash-flow coverage vs expenses + loans + modeled investment/unlock income. |
| **Official headline metrics** | Coverage ratio (median = worst in single row); sustainability badge (green/amber/red/invalid); net surplus. |
| **Interpretation hierarchy** | (1) `runSimulation` (2) sustainability thresholds `COVERAGE_GREEN` / `COVERAGE_AMBER` (`legacy/config/constants.ts`) (3) `buildLionVerdictClientReportFromIncomeEngineering`. |
| **Secondary** | `timeHorizonYears`, `autoReinvestSurplus`, `flatTaxOnReturns`, `liquidateToCoverShortfall` — **not in `runSimulation`** — do not describe as affecting KPIs. |
| **Legacy** | N/A unless old UI branches still present — treat store fields as **roadmap or dead** pending founder call. |
| **FOUNDER DECISION REQUIRED** | **Unused store fields:** remove, implement, or document as intentionally inert (see §4). |

### 3.3 Capital Health (`@cb/capitalhealth`)

| Field | Override |
|-------|----------|
| **Official purpose** | Horizon simulation with buffer/reinvest; withdrawal vs growth modes; goal status and risk tier for advisory narrative. |
| **Official headline metrics** | **Withdrawal:** user-facing **coverage** and **runway** should follow **`buildCalculatorResults`** (includes `evaluatePlan` sustainable monthly + chart depletion alignment). **Growth:** progress to capital goal via `compoundingProgressPct` / `classifyStatus`. |
| **Interpretation hierarchy** | (1) `buildCalculatorResults` for displayed coverage, runway phrase alignment, riskMetrics (2) `runSimulation` for month snapshots (3) `evaluatePlan` for plan banner / sustainable monthly (4) `simulateTargetWithdrawal` for target path and solvers. |
| **Secondary** | Raw `result.coveragePct` from `calculator-engine.ts` alone when it **differs** from `buildCalculatorResults.coveragePct` — explain as “engine snapshot metric” vs “headline coverage.” |
| **FOUNDER DECISION REQUIRED** | Single canonical definition of “sustainable income” / “coverage %” for client communications (see §4). |

### 3.4 Capital Stress (`@cb/capitalstress`)

| Field | Override |
|-------|----------|
| **Official purpose** | Monte Carlo resilience, depletion pressure (Policy B), stress scenarios; stochastic. |
| **Official headline metrics** | `capitalResilienceScore` → Lion 0–100; survival probability; Policy B bar (`getDepletionBarOutput`); engine tier `mcResult.tier`. |
| **Interpretation hierarchy** | (1) `runMonteCarlo` (2) `technicalResilienceToLion0to100` / `lionPublicStatusFromScore0to100` with STRONG gate (3) Depletion bar for UI + **Lion fragility input when ref set** (4) `computeFragility` when bar not used for Lion path. |
| **Secondary** | “Fragility Index” UI tier (`getFragilityIndexTier`) — separate colour scale; **not** the same variable as Policy B pill. |
| **Inflation UI** | **Does not** change Monte Carlo paths — display + sensitivity index only (`App.tsx` `runCalculation`). Official statement: **paths use nominal return band only.** |
| **FOUNDER DECISION REQUIRED** | Whether to seed RNG for reproducible PDFs; whether Lion should always use `computeFragility` vs bar for consistency. |

---

## 4. Specific known ambiguities to resolve

### 4.1 Income Engineering — unused store fields

**Fact:** `useCalculatorStore.tsx` includes `autoReinvestSurplus`, `flatTaxOnReturns`, `flatTaxRate`, `liquidateToCoverShortfall`. **`runSimulation` does not reference them.**

**GPT default:** Treat as **Category C (dead / unimplemented)** for numeric outputs.  
**FOUNDER DECISION REQUIRED:** Product roadmap (implement vs delete vs hide UI).

### 4.2 Capital Health — multiple pipelines

**Pipelines:** `runSimulation`, `evaluatePlan` (via `inputsToEvaluatePlan`), `simulateTargetWithdrawal`, solvers in `solver.ts` / `solverCoverage.ts`.

**Headline client truth:** **`buildCalculatorResults`** aggregate — per §3.3.  
**FOUNDER DECISION REQUIRED:** Whether marketing/legal copy should cite **evaluatePlan** sustainable monthly only, or **engine** passive income, in edge cases where they diverge.

### 4.3 Capital Stress — entitlement vs display

**Facts:** `deriveEntitlementsFromRawPlan` sets `canUseStressModel`, `canSeeVerdict` (trial vs paid). `LegacyApp` receives these props; **full branch audit not frozen in this file.**

**GPT default:** If user is trial per plan, **stress model access may be denied** at dashboard level; **authoritative outputs** are whatever the app renders for that user.  
**FOUNDER DECISION REQUIRED:** Exact UX when `canSeeVerdict` is false (partial results vs hide Lion).

### 4.4 Forever PDF / Lion score drift

**Fact:** `ForeverReportDocumentClient.tsx` uses `FOREVER_TIER_MID_SCORE` + `foreverDisplayScore0to100(lion.verdictTier)` when rendering score line if full numeric score not stored for that export path.

**GPT default:** **Live dashboard** Lion score from `buildLionVerdictClientReportFromForever` / engine is **authoritative for interactive use**; **PDF** may show **mid-band placeholder** by tier — label as **“PDF display convention”** not duplicate calculation.  
**FOUNDER DECISION REQUIRED:** Persist full `score` on export row to remove drift.

---

## 5. GPT use rule

When answering from this file:

1. **State the official headline source first** (per §3).  
2. **Name secondary pipelines** only when explaining divergence or audit questions.  
3. **Never** present unused Income Engineering store fields as live levers.  
4. **Never** cite `generateForecast` (stress) as live.  
5. For **institutional** questions on custody or investment, **defer to** `INTERNAL_INVESTMENT_AND_FLOW_SPEC.md` and **do not** infer fund mechanics from calculators.  
6. If **FOUNDER DECISION REQUIRED** appears, **say so explicitly** rather than guessing.

**Cross-references:** `INTERNAL_FULL_SYSTEM_SPEC.md`, `INTERNAL_FORMULA_INDEX.md`, `INTERNAL_ALIGNMENT_TABLES.md`.
