# INTERNAL_ALIGNMENT_TABLES.md

**Classification:** Internal — screen vs PDF/export vs Lion input alignment.  
**Companion:** `INTERNAL_TRUTH_OVERRIDES.md` (headline hierarchy), `INTERNAL_FORMULA_INDEX.md`.

---

## 1. Document role

Reconciles **where the same English label** may bind to **different variables** or **display conventions** across surfaces. Used to prevent the GPT from **flattening** metrics that are **not identical**.

---

## 2. Forever Income — alignment table

| Metric / Output | Screen source | Calculation source | PDF / export source | Lion input source | Label vs variable | Notes | Status |
|-----------------|---------------|--------------------|--------------------|-------------------|-------------------|-------|--------|
| Target Capital | `useModelMetricSpine` in `legacy/App.tsx` | `computeForeverResults` → `capitalNeeded` (∞ if unsustainable) | `deriveForeverReportModel` + `ForeverReportDocumentClient` | `ForeverLionInputs.capitalNeeded` | Display “Target Capital” vs `capitalNeeded` | PDF may show formatted tables from `derived` | **aligned** (same engine) |
| Total Assets | spine slot2 | `currentAssets` | same | `currentAssets` | “Total Assets” | | **aligned** |
| Horizon / runway | spine slot3 | `runway` string | same + charts from `foreverReportDerived` | `runwayLabel`, `runwayYears` from `parseForeverRunway` | | | **aligned** |
| Lion score (0–100) | `foreverLionReport.verdict.score` | `runLionVerdictEngineForever` → `foreverProgressTechnicalToLion0to100` | **If** `foreverDisplayScore0to100(tier)` used: **mid-band by tier** (`FOREVER_TIER_MID_SCORE` in `ForeverReportDocumentClient.tsx`) | Same engine on dashboard | PDF line “Lion score: X / 100” | **Drift:** PDF may show **tier mid-score** not live `engine.score0to100` | **partially aligned** |
| Lion public status | chip from `foreverLionReport.verdict.status` | `lionPublicStatusFromScore0to100` + `lionStrongEligibilityFromForeverInput` | tier chip from stored `lion.verdictTier` | same | | Export stores **tier**; numeric score may not persist | **partially aligned** |
| Gap / progress | UI cards | `gap`, `progressPercent` | `derived` waterfall | `gap`, `progressPercent` in inputs | | | **aligned** |
| `getLionVerdict` headline | `LionVerdictActive` | `@cb/lion-verdict/getLionVerdict` + copy library | PDF may embed **ensureForeverReportLionConfig** lines | tier + indices | | Paid: server-picked lines; trial: locked | **gated** |

**Official for “Lion score”:** **Interactive** = `engine.score0to100`. **PDF score line** = `foreverDisplayScore0to100` when mid-map path — **INTERNAL_TRUTH_OVERRIDES** §4.4.

---

## 3. Income Engineering — alignment table

| Metric / Output | Screen source | Calculation source | PDF (`PrintReportView.tsx`) | Lion input source | Label vs variable | Notes | Status |
|-----------------|---------------|--------------------|----------------------------|-------------------|-------------------|-------|--------|
| Median / worst coverage | Summary components | **Same number** in `runSimulation` (`medianCoverage` = `worstMonthCoverage`) | `medianCoverage`, `worstMonthCoverage` props | `IncomeEngineeringClientVerdictInputs` | “coverage %” | Worst = median in single month | **aligned** |
| Sustainability badge | `SustainabilityBadge` / summary | `summary.sustainabilityStatus` from thresholds | `getStatusLabel` mapping in PrintReportView | Drives `incomeEngineeringCoverageToLion0to100` | SUSTAINABLE / PLAUSIBLE / UNSUSTAINABLE vs green/amber/red | | **aligned** (naming map) |
| Net cashflow | UI | `summary.netMonthlySurplusShortfall` | same | `monthlyNetCashflow` in client report | | | **aligned** |
| Total capital | UI | Sum of bucket allocations (+ unlock context) | `totalCapital` prop | `totalCapital` | | | **aligned** |
| Store: `autoReinvestSurplus`, tax, liquidate | **Reducer only** | **Not in `runSimulation`** | **Unlikely** unless PrintReport reads store directly — **verify** if PDF adds | **Not** in `incomeEngineeringCoverageToLion0to100` | | **If** PDF shows these, **diverged** from headline engine | **unresolved / ignore for headline** |

---

## 4. Capital Health — alignment table

| Metric / Output | Screen source | Calculation source | PDF (`CapitalGrowthReport` / `ReportPrint`) | Lion input source | Notes | Status |
|-----------------|---------------|--------------------|---------------------------------------------|-------------------|-------|--------|
| Withdrawal **coverage %** (headline) | Cards / header | **`buildCalculatorResults.coveragePct`** = `sustainableIncomeMonthly/target*100` from `evaluatePlan` path | `result.coveragePct` in export | `coveragePct` in `buildLionVerdictClientReportFromCapitalHealth` | Engine `runSimulation.coveragePct` uses **r×P/target** — **different** | **diverged** engine vs headline | **partially aligned** — **truth:** `buildCalculatorResults` per OVERRIDES |
| Sustainable monthly | UI | `sustainableIncomeMonthly` from `evaluatePlan` | same | `passiveIncomeMonthly` vs target in Lion `goal_gap` | `passiveIncomeMonthly` from engine for some displays | **evaluatePlan** `sustainableMonthly` is plan copy driver | **partially aligned** |
| Runway phrase | UI | `runwayPhrase` **overridden** in `buildCalculatorResults` for chart depletion | Report uses `result` | `vars.runway` string in Lion | | **aligned** after overlay |
| Risk tier / label | UI | `getRiskTier` on `survivalProbabilityDisplay` in `buildCalculatorResults` | `riskMetrics` | `tier` 1–5 → `runLionVerdictEngineCapitalHealth` | | | **aligned** |
| Goal status | UI | `classifyStatus` on coverage or progress | `goalStatusKey` | | | | **aligned** |
| Chart series | Recharts | `monthlySnapshots` from engine | `chartPoints` from snapshots | | Target path series from `simulateTargetWithdrawal` | Two paths **different purposes** | **aligned by design** (two lines of sight) |
| Plan status banner | `evaluatePlan` | `planStatus`, `planDepletionMonth` | | | | | **aligned** |

---

## 5. Capital Stress — alignment table

| Metric / Output | Screen source | Calculation source | PDF / print | Lion input source | Notes | Status |
|-----------------|---------------|--------------------|------------|-------------------|-------|--------|
| Resilience score (Lion 0–100) | Display | `technicalResilienceToLion0to100(capitalResilienceScore)` | `buildLionVerdictClientReportFromStress` | `verdict.score` | | | **aligned** |
| Engine tier (Very Strong…Critical) | Pills | `mcResult.tier` from `lionTierFromTechnicalResilience` | | `LionStressAdvisoryInputs.tier` | | | **aligned** |
| `mapStressStatusToTier` | Lion copy tier | Maps engine tier → `Tier` for `getLionVerdict` | | | STRONG/STABLE/FRAGILE/AT_RISK/NOT_SUSTAINABLE | **Separate** from public Lion band | **partially aligned** — two tier systems |
| Depletion pressure / Policy B | Bar + pill | `getDepletionBarOutput(depletionPressurePct)` | Print payload | **`fragilityIndicator` for Lion** = **bar `pillLabel`** if `depletionBarRef` set | Else `mcResult.fragilityIndicator` from `computeFragility` | **Authoritative for Lion:** bar when ref present | **partially aligned** |
| `computeFragility` | May still show in UI | `mathUtils` | | Used when bar ref null for Lion path | Different logic than Policy B | | **dual** |
| Fragility Index (teal scale) | Separate UI | Composite sensitivities incl. `effectiveInflation` | | **Not** passed to Lion as primary | **Not** same as Policy B | | **aligned** (distinct metric) |
| Survival probability | UI | `mcResult.survivalProbability` | | In stress inputs indirectly | | | **aligned** |
| Inflation | Toggle | **Not** in `runMonteCarlo` paths | Display deflation only | | | **divergence** label vs path math | **diverged** (documented) |
| Monte Carlo paths | — | Non-seeded RNG | Snapshot at print time | | PDF **non-reproducible** unless seeded | | **stochastic drift** |

---

## 6. Special attention summary

| Area | Issue | Intentional? | GPT official side |
|------|-------|--------------|-------------------|
| Forever PDF score | Tier mid-score | Likely **display shortcut** | Live engine on dashboard |
| Health coverage | Engine vs `buildCalculatorResults` | **Different definitions** — product should pick one for **external** copy | **`buildCalculatorResults`** per OVERRIDES |
| Stress fragility | Bar vs `computeFragility` | **Lion uses bar** when ref set — **intentional** wiring in `getResults` | **Bar for Lion** when available |
| IE unused store | No effect on `runSimulation` | **Dead / roadmap** | **`runSimulation` only** |
| Stress inflation | Display only | UI copy vs math | **Paths = nominal band** |

---

## 7. Reconciliation notes

1. **Forever PDF drift:** **Likely accidental** convenience; **fix:** persist `score0to100` on `report_exports`.  
2. **Health coverage:** **Likely intentional** layering — evaluatePlan headline vs engine physics; **founder** should pick **one client-facing definition**.  
3. **Stress dual fragility:** **Intentional** wiring for Lion vs separate UI index; **do not merge** without refactor.

---

## 8. Priority fix list (ranked)

1. **Forever:** Persist full Lion **numeric score** on PDF export to remove **tier mid-score** ambiguity.  
2. **Health:** Document or unify **coverage %** for marketing (engine vs evaluatePlan overlay).  
3. **Stress:** Document **inflation** as **post-processing** only; consider **renaming** UI to avoid “real path” misread.  
4. **Income Eng.:** Remove or implement **unused store** fields to eliminate **ghost features**.

---

## 9. GPT use rule

When **metrics conflict**, apply **`INTERNAL_TRUTH_OVERRIDES.md` §3** first, then this table. **Never** average two incompatible **coverage** definitions without naming both.

---

**Cross-references:** `INTERNAL_FULL_SYSTEM_SPEC.md` §7 (PDF), `INTERNAL_FORMULA_INDEX.md` §5 (duplicates).
