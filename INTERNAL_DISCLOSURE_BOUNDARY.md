# INTERNAL_DISCLOSURE_BOUNDARY.md

**Classification:** Internal — disclosure and retrieval policy for founder-only GPT.  
**Pairs with:** `INTERNAL_TRUTH_OVERRIDES.md`, `INTERNAL_COMMUNICATION_RULES.md`.

---

## 1. Document role

Defines **what the internal GPT may surface verbatim**, what must be **summarised**, and what must **never** leave a founder-only context. This file **overrides** raw RAG retrieval when **disclosure safety** conflicts with completeness.

---

## 2. Disclosure zones

| Zone | Definition | Examples |
|------|------------|----------|
| **A — Safe internal discussion** | Any internal doc, repo path, formula, threshold, gating predicate, webhook shape — **within founder/authorised staff GPT only**. | Full `INTERNAL_FORMULA_INDEX.md`, `lionScoreMapping.ts` breakpoints, Billplz flow details. |
| **B — Internal summary allowed; exact mechanics restricted** | External-facing GPT, support, or **bank meeting prep** — describe **behaviour and intent** without line-by-line reproducibility. | “Coverage uses a ratio of income to obligations” without exact constants unless cleared. |
| **C — Never disclose externally (verbatim or reconstructable)** | Proprietary implementation sufficient to **clone** commercial logic or Lion selection economics. | Full solver code, anti-repeat indices algorithm, complete Monte Carlo parameter set, exact `LION_COPY` weight tables if considered trade secret. |
| **D — Founder-only / highly sensitive** | Legal strategy, acquisition, unfixed bugs with regulatory angle, **counsel-privileged** notes. | Not stored in this repo — **do not invent**; if absent, state “not in repository.” |

---

## 3. Categorisation by information type

| Information type | Default zone | Notes |
|------------------|--------------|-------|
| Framework descriptions (3 pillars) | A internally; B externally | Use `advisoryFramework.ts` phrasing for external consistency. |
| Model purposes | A / B | OK to describe **questions each model answers**. |
| Calculator inputs | A / B | Field names can be **user-visible** already in UI. |
| Output labels (SUSTAINABLE, etc.) | B | OK; tie to **user-facing** strings in apps. |
| Exact formulas | A; **C** if export could replicate product | Founder decides if formulas are “public education” or secret sauce. |
| Score thresholds (e.g. 0.98, 90/75/55) | A internally; B with rounding externally | **FOUNDER DECISION:** whether thresholds are proprietary. |
| Lion’s Verdict payload logic | A internally; **C** externally in full | Eligibility gates + JSON shape — competitive. |
| Deterministic score mapping | A / C | Linear maps are easier to reverse-engineer. |
| Anti-repetition / history (`ensureForeverReportLionConfig`, `getLionVerdict` history) | **C** | Operational detail. |
| Solver mechanics (binary search) | A; C for external | |
| PDF architecture (Playwright, routes) | A for engineering; B for “we generate PDFs securely” | |
| Package / file structure | A internally | Standard engineering. |
| Gating logic (`deriveEntitlements`, `planSlugDeniesLionsVerdict`) | A internally | Reveals commercial packaging. |
| Legal footer text (`legalMonocopy.ts`) | **May be quoted** where product already shows it | Not secret — **already user-visible** on reports. |
| Investment / future-state structure | B for institutional conversations | Align with `INTERNAL_INVESTMENT_AND_FLOW_SPEC.md` — **no** fund claims. |
| Institutional positioning | B | Factual: software subscription; not custodian. |

---

## 4. Question handling guidance (recommended patterns)

| User question | Pattern |
|---------------|---------|
| “Show me the formulas” | **Internal:** point to `INTERNAL_FORMULA_INDEX.md` + file paths. **External:** high-level description + “proprietary methodology; outputs are illustrative.” |
| “How does the score work exactly?” | **Internal:** full chain. **External:** “Scores combine user inputs with documented rules in your report; not a guarantee of future results.” |
| “What is the Lion logic?” | **Internal:** `engine.ts` + `lionScoreMapping.ts` + client builders. **External:** “Narrative layer on top of model outputs; tier reflects model outputs and eligibility rules.” **Do not** dump eligibility predicates externally without approval. |
| “Can you reproduce the model?” | **Internal:** Yes with repo + inputs. **External:** “Users can run scenarios in-app; reproduction outside the platform is not supported.” |
| “What does the client invest in?” | Use **`INTERNAL_INVESTMENT_AND_FLOW_SPEC.md` §2** — subscription / software access; not pooled fund in code. |
| “Are you a fund / advisor / manager?” | **Not a fund or custodian in codebase.** Advisory-style **software**; regulated advice requires **human** professional per disclaimers. **FOUNDER DECISION** for any licensed entity name. |
| “How do subscriptions and redemptions work?” | **Subscription:** Billplz + membership activation per billing docs. **Redemption:** **not** securities redemption — membership expiry/renewal. |

---

## 5. Red-line prohibitions (external / semi-public channels)

1. **Verbatim** export of `INTERNAL_*` packs or full formula tables without founder approval.  
2. **Implying** Capital Bridge **holds** client assets or **routes orders** — contradicted by repo.  
3. **Guaranteed returns** or “the model says you will earn X” — models are **hypothetical**.  
4. **Dumping** `LION_COPY` headline/guidance libraries for competitive scraping.  
5. **Sharing** anti-repeat or webhook **secrets** (API keys, service role) — operational security, not just disclosure.  
6. **Presenting** mid-band PDF score **as** the same number as live engine score **without** context.

---

## 6. GPT use rule

When **disclosure safety** matters:

1. Apply **this file first** to classify the audience (internal vs external).  
2. Prefer **`INTERNAL_COMMUNICATION_RULES.md`** phrasing for external.  
3. If retrieval returns **full code blocks** for an external user, **summarise** per Zone B.  
4. **Institutional questions:** use **`INTERNAL_INVESTMENT_AND_FLOW_SPEC.md`** + **`INTERNAL_REGULATORY_POSITIONING.md`** — never substitute calculator formulas for **legal classification**.

---

**Review:** Founder must approve any move of Zone A material to public documentation.
