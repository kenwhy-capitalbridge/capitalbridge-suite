# INTERNAL_REGULATORY_POSITIONING.md

**Classification:** Internal — **not legal advice.** Jurisdiction-specific licensing requires **qualified counsel**.  
**Evidence base:** Repository behaviour + `INTERNAL_INVESTMENT_AND_FLOW_SPEC.md`.

---

## 1. Document role

Internal map of **what the platform is and is not** in **fact** (code), where **regulatory risk** typically arises if product evolves, and **where counsel must decide**. Does **not** determine Capital Bridge’s actual license status in any country.

---

## 2. Present-state positioning (practical, repo-based)

Capital Bridge operates as:

- **SaaS** delivered via Next.js apps with **Supabase** auth and **Billplz** subscription billing (`apps/api`, `apps/login`, `packages/db-types`).
- **Financial planning / educational analytics** — user-entered assumptions produce **simulations and PDFs**; copy in `packages/shared/src/advisoryFramework.ts` states outputs are for **learning and planning with a qualified adviser**, not buy/sell advice.
- **No** in-repo **custody ledger**, **order management**, **fund NAV**, or **client securities account** integration.

---

## 3. Explicit “what we are not” (code support)

| Role | Supported by repo? | Notes |
|------|-------------------|--------|
| Fund / CIS | **No** | No unit registry, prospectus workflow, or pooled NAV in `db-types` tables reviewed. |
| Custodian | **No** | No custody positions table or bank feed. |
| Broker / dealer | **No** | No order API, FIX, execution reports. |
| Discretionary portfolio manager | **No** | No discretion engine tied to live accounts. |
| Execution platform | **No** | |
| Order management system | **No** | |
| Client asset holder (legal) | **No** | Subscription payments ≠ client investment principal. |
| Pooled investment vehicle | **No** | |
| Licensed adviser (regulated) **as implemented** | **No** — no suitability, KYC/AML product suite in-repo | Human advisers may exist **off-platform**; not encoded as licensed activity. |

**“Strategic Execution”** (`apps/platform/app/solutions/page.tsx`): **Coming Soon** — future partner layer; **not** implemented as execution in this repo.

---

## 4. Activity mapping (current)

| Activity | Present? | Mechanism |
|----------|----------|-----------|
| Subscription billing | Yes | Billplz, `billing_sessions`, `memberships`, `payments` |
| Memberships / entitlements | Yes | `deriveEntitlements`, `planSlugDeniesLionsVerdict` |
| Modelling | Yes | Four model apps |
| Advisory outputs (software sense) | Yes | Reports, Lion narrative, PDFs |
| Scenario analysis | Yes | Calculators + stress MC |
| Recommendations (text) | Yes | Lion + strategic option blocks — **narrative**, not orders |
| Custody | **No** | |
| Orders / execution | **No** | |
| Investment redemption ledger | **No** | Membership expiry ≠ fund redemption |

---

## 5. Future-state triggers (high-level regulatory **significance** — not advice)

| Capability | Typical regulatory significance (jurisdiction-dependent) |
|------------|--------------------------------------------------------|
| Assisted execution (client clicks approve) | Brokerage / dealing rules; best execution; audit trail. |
| Discretionary mandates | Asset management licensing; client agreements. |
| Pooled funds | Fund / CIS registration; prospectus; depositary. |
| Nominee / trustee | Trust law; segregation; client money rules. |
| SMA | Investment management; advisory vs management distinction. |
| Custodial handling | Custodian regulation; AML. |
| Rebalancing authority | Depends on discretion level — may cross into managing. |
| Performance fee | Often tied to regulated fund or managed account regime. |

**FOUNDER DECISION REQUIRED** for target markets (MY, SG, others) before architecture.

---

## 6. Jurisdiction notes (internal)

- **Malaysia-oriented framing:** Billplz MYR, `advisory_market` on profiles — product appears APAC-first; **no** automatic conclusion about **SC** licensing from software alone.
- **Singapore / others:** Same — **counsel** for cross-border marketing of financial tools.

---

## 7. Bank / legal / trustee — draft internal answer positions

| Question | Draft position (internal) |
|----------|----------------------------|
| What are you regulated as **today**? | **Cannot be answered from code.** Operationally: **software company** with subscription billing; **not** asserting a financial services license in-repo. **Counsel to confirm** actual entity licences. |
| What are you **not**? | **Not** a fund manager **in product**; **not** custodian; **not** executing trades in this codebase. |
| What would require licensing **later**? | See §5 — any **handling of client assets** or **personal recommendations** for a market may trigger local rules. |

---

## 8. Founder / counsel decision gaps

1. **Legal entity** map (holding company, operating company, any licensed subsidiary).  
2. **Whether** any jurisdiction already holds **exempt** or **full** financial advice / dealing licence.  
3. **Marketing** in each country — financial promotion rules.  
4. **Strategic Execution** — partner model and **who** holds licence for capital markets activities.  
5. **Data** — PDPA / GDPR-style obligations for financial data.

---

**Cross-reference:** `INTERNAL_INVESTMENT_AND_FLOW_SPEC.md`, `INTERNAL_LIABILITY_MAP.md`.
