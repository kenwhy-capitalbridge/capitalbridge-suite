# Capital Bridge — Lion Decision System (Cursor master instruction)

**Authority:** This document is the single conflict-free implementation spec for the Lion decision pipeline (truth, preconditions, signals, status, narrative, tiers).  
**Presentation copy pools** (headlines and guidance lines per band) live in `Lion Verdict dynamic copy.txt` at the repo root and are maintained via existing sync/guard scripts. That file supplies **wording only** — it must **never** override `lion_status`, severity, or `required_actions`.

---

## 0. Core principle (non-negotiable)

The system is **truth-first** and **deterministic**.

| Layer | Role |
|--------|------|
| Snapshot | Structural truth |
| Model | Computational truth |
| Preconditions | Validity boundary |
| Lion | Interpretation layer — **must not distort truth** |

**Tiering MUST NOT change truth.** Tiering only changes **visibility** and **depth**.

---

## 1. Architecture separation (mandatory)

### Layer 1 — Verdict engine (core logic)

- Deterministic  
- Tier-independent  
- Produces truth payload, for example:

```json
{
  "lion_status": "...",
  "reason": [],
  "signal_summary": {},
  "required_actions": []
}
```

This layer **defines truth**.

### Layer 2 — Presentation layer (tiered UX)

Controls:

- Level of detail  
- Number of guidance points  
- Execution visibility  

**MUST NOT change:**

- `lion_status`  
- Severity  
- Existence of required actions  

---

## 2. Full decision pipeline

```
model_runs.status + metrics + reason[]
  → Signal classification (coverage / buffer / resilience)
  → Lion status (deterministic)
  → Narrative construction (structured)
  → Tier slicing (visibility only)
```

---

## 3. Invalid preconditions mapping (hard rules)

**Input:**

```json
{
  "status": "invalid_preconditions",
  "reason": ["..."]
}
```

### Mapping → Lion status

| Condition | Lion status |
|-----------|-------------|
| Contains `no_assets` | `NOT_SUSTAINABLE` |
| Contains `no_income_streams` **and** `no_obligations` | `NOT_SUSTAINABLE` |
| Contains `no_income_streams` | `AT_RISK` |
| Contains `no_obligations` | `FRAGILE` |
| Contains `withdrawal_not_defined` | `FRAGILE` |
| Fallback | `AT_RISK` |

### Mandatory behavior (all tiers)

**MUST:**

- Say the system **cannot evaluate**  
- Say **what is missing**  
- Say **what must be defined**  

**MUST NOT:**

- Soften into generic suggestion  
- Hide the failure  
- Convert refusal into “insight”  

---

## 4. Metrics → signals system (model-agnostic)

### Step 1 — Normalize metrics into signals

- **Coverage** — ability to meet obligations  
- **Buffer** — margin / runway  
- **Resilience** — stability under stress  

### Step 2 — Classify each signal into bands

`STRONG` | `ADEQUATE` | `TIGHT` | `WEAK` | `FAILED`

### Step 3 — Signal → Lion status

**Hard overrides**

- If **any** signal = `FAILED` → `NOT_SUSTAINABLE`

**Mapping rules**

- If **any** signal = `WEAK` → `AT_RISK`  
- If **any** signal = `TIGHT` (and none `WEAK` / `FAILED`) → `FRAGILE`  
- If **all** ≥ `ADEQUATE` (not all `STRONG`) → `STABLE`  
- If **all** = `STRONG` → `STRONG`  

**Tie-break**

Final status = **worst** signal.

**Hierarchy (worst wins):**

`FAILED` → `NOT_SUSTAINABLE`  
`WEAK` → `AT_RISK`  
`TIGHT` → `FRAGILE`  
`ADEQUATE` → `STABLE`  
`STRONG` → `STRONG`  

---

## 5. Narrative construction (deterministic)

### Output structure

```json
{
  "lion_status": "...",
  "headline": "...",
  "core": {
    "what_is_happening": "...",
    "what_will_happen": "...",
    "what_must_be_done": "..."
  },
  "guidance": [],
  "actions": []
}
```

### Narrative rules

| Block | Source |
|--------|--------|
| `what_is_happening` | From `reason[]` and/or signals |
| `what_will_happen` | From trajectory (gap, depletion, instability) |
| `what_must_be_done` | **Required** for all `invalid_preconditions`, and for all `AT_RISK` and below |

Headline and body lines for tier bands may be **selected** from `Lion Verdict dynamic copy.txt` using deterministic indexing (see §6); they must remain consistent with `lion_status`, not contradict it.

---

## 6. Headline selection (no randomness)

Use **deterministic** selection, for example:

```text
headline_index = hash(capital_graph_id + version + model_key) % N
```

Same input → same headline. No session drift.

---

## 7. Tier slicing rules (strict)

**Core rule:** Tier controls **depth**, not **truth**.

| Tier | Show | Hide |
|------|------|------|
| **Trial** (awareness) | Headline; short `what_is_happening`; **one** required action | Full guidance; full narrative; execution actions |
| **Paid** (clarity) | Full three-part narrative; 3–5 guidance points; structured actions | — |
| **Strategic** (execution) | Full narrative; full guidance; execution actions; priority + sequencing | — |

---

## 8. Absolute safeguards

### Must always hold

1. Lion status **identical** across tiers  
2. Headline **severity** unchanged across tiers  
3. `invalid_preconditions` always includes **what must be done**  
4. `reason[]` always preserved internally  

### Must never happen

- Same data → different conclusions across tiers  
- `invalid_preconditions` softened into suggestion  
- Random headline selection  
- Partial metrics labeled as `completed`  
- **Frontend** computing Lion status  

---

## 9. Storage and ownership

This logic **MUST** live in the **core decision layer** (same authority as `model_runs` / server-side pipeline).

**NOT** in:

- Frontend alone  
- UI-only layer  
- Copy files as the source of status  

Copy files are **pools** for text selection only.

---

## 10. Final output shape (internal)

```json
{
  "lion_status": "FRAGILE",
  "signal_summary": {
    "coverage": "TIGHT",
    "buffer": "ADEQUATE",
    "resilience": "ADEQUATE"
  },
  "reason": [],
  "required_actions": []
}
```

`signal_summary` may be hidden from UI but **must exist internally** where the pipeline computes it.

---

## 11. Final validation rule

The system must satisfy:

**Same input → same Lion status → same core narrative → only detail varies by tier.**

---

## 12. One-line definition

**Capital Bridge Lion** = deterministic truth engine + tiered expression layer — **no semantic drift allowed.**

---

## Alignment with repo contracts

- `docs/CAPITAL_CORE_PHASE1_SPEC.json` — snapshot/model run preconditions, `invalid_preconditions`, reason taxonomy, completed metric completeness.  
- `apps/platform/app/api/model/run/route.ts` — API enforcement for run state and payloads.  
- `packages/advisory-graph` / `packages/lion-verdict` — implementation must converge on this document for pipeline behavior; `INTERNAL_*` docs remain for formulas, alignment, and disclosure zones.

If behavior diverges from this file after implementation, treat it as a **bug**, not a reinterpretation.
