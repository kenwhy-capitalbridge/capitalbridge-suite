# Capital Bridge — Internal Investment & Flow Specification

**Classification:** Internal only. **Source:** Repository audit (`capitalbridge-suite`) as of 2026-04-13, plus explicit gaps where the codebase does not define investment product or regulatory status.

**Companion:** Technical calculator/report behaviour is documented separately in `INTERNAL_FULL_SYSTEM_SPEC.md`.

---

## 1. What Capital Bridge is (institutional view)

### 1.1 Precise classification (evidence-based)

| Role | Applies today? | Evidence |
|------|----------------|----------|
| **Technology / SaaS platform** | **Yes** | Multiple Next.js apps (`apps/login`, `apps/platform`, model apps), Supabase auth, subscription billing. |
| **Financial education & planning software** | **Yes** | `packages/shared/src/advisoryFramework.ts`: reports described as “for learning and planning with a qualified adviser — not a product recommendation” / “educational — not buy/sell investment advice”. |
| **Advisory (regulated sense)** | **Not implemented as licensed advisory in code** | No adviser registration, KYC/AML modules, or client suitability workflows in-repo. Copy positions outputs as **inputs to discussion with a qualified adviser**. |
| **Portfolio constructor / model portfolio provider** | **No (software only)** | Calculators produce **user-parameterized projections**; no canonical “Capital Bridge portfolio” or rebalance engine tied to live accounts. |
| **Fund / collective investment scheme** | **No** | No fund vehicle, unit registry, NAV, or pooled asset ledger in application code or `db-types` tables reviewed. |
| **Execution layer (trading, custody, order routing)** | **No** | No broker integrations, order APIs, or custody records for client securities in-repo (see §4). |
| **Payment intermediary for investment principal** | **No** | Billplz flows attach to **subscription / plan purchase** (`plans`, `memberships`, `billing_sessions`, `payments`), not client investment principal. |

### 1.2 Alternative interpretations (how outsiders might misread)

- **“They pay Capital Bridge, so they invest in Capital Bridge.”** — **Misleading.** Payment is for **subscription access** to software and advisory-style outputs, not equity/debt in a Capital Bridge investment vehicle (no such instrument in code).
- **“The models allocate my money.”** — **Misleading.** Models **simulate** user inputs; they do not move money or instruct a custodian (unless a human process exists outside this repo).
- **“Strategic Execution means my capital is deployed.”** — **Not live in product UI.** Platform page states **“Strategic Execution (Coming Soon)”** and describes future partner-mediated financing and distribution (`apps/platform/app/solutions/page.tsx`).

### 1.3 Single-sentence institutional definition

**Today:** Capital Bridge is a **subscription-gated financial planning and stress-testing software platform** that stores user inputs and generated advisory reports, and **does not**, in this codebase, hold client investment assets or execute trades.

---

## 2. What the client is actually “investing in”

### 2.A Current state (today)

**Direct answer:** The client is **not** recorded in this system as purchasing **securities, fund units, or segregated mandate assets**. They are purchasing **access to a software subscription** (plan: trial / monthly / quarterly / yearly / strategic per `deriveEntitlements` and `plans`).

- **Money flow:** Client pays via **Billplz** (MYR-denominated bills; amounts from `getBillplzChargeAmountSen` in `packages/shared/src/markets.ts`) → payment confirmation → **membership** activation (`memberships`, `payments`, `billing_sessions` per `packages/db-types` and `apps/api` billing routes).
- **What they “own” after payment:** Entitlements to use model apps, PDF/report features (tier-dependent), platform areas — **not** a pro-rata share of an investment pool stored in application data.

**Category label:** **A. Confirmed live (code):** subscription for software + advisory-style analytics; **not** pooled investment principal in-repo.

### 2.B Intended future states (from product copy, not implemented as ledgers)

The following are **positioning options** for institutional design — **none** are fully implemented as capital accounts in this repository.

| Scenario | Asset types (examples) | Yield / risk | Liquidity | Execution / control |
|----------|-------------------------|--------------|-----------|---------------------|
| **Model portfolio (non-custodial)** | Listed equities, bonds, ETFs per a published sleeve | Market + manager skill | T+0–T+3 typical | **Client or their broker** executes; CB could publish weights only. |
| **Segregated managed account** | As per mandate letter | Strategy-dependent | Per asset class | **Licensed manager / bank** with client name account. |
| **Pooled fund / unit trust** | Multi-asset per prospectus | NAV-based | Redemption per fund docs | **Fund manager**; CB could be promoter/tech only depending on license. |
| **Structured income / private credit baskets** | Loans, notes, private funds | Credit + illiquidity premium | Often **longer lockups** | Originator / SPV; CB role must be defined legally. |
| **External partner funds** | Third-party UCITS, REITs, etc. | Fund-specific | Per prospectus | **Partner** as manager; CB as referrer or tech overlay only if licensed accordingly. |

**Category label:** **B. Intended / designed at business level** — Strategic Execution copy points here; **C. Institutional readiness** requires legal wrappers, licenses, and operational separation from the current subscription stack.

---

## 3. Capital flow architecture

### 3.1 Subscription flow (implemented)

**Actors:** Client browser → Login app (`apps/login`) → **API** `apps/api` (billing authority per `ARCHITECTURE.md` / `VERCEL-SETUP.md`) → **Billplz** → webhook → Supabase.

**Data objects (confirmed):**

- `billing_sessions`: checkout session, `plan_id`, `bill_id`, status `pending` → `bill_created` → `paid`.
- `payments`: `billplz_bill_id`, `status`, amounts, `paid_at`.
- `memberships`: `plan_id`, `status`, `start_date` / `end_date`, `expires_at`, link to `billing_session_id`.
- `plans`: `slug`, `price_cents`, `duration_days`, `is_trial`.

**When is money “invested”?** — **It is not modeled as investment capital.** It is **subscription revenue** (or trial entitlement). **“Invested” in a securities sense does not apply** inside this codebase.

**Region / market:** `profiles.advisory_market` set from checkout metadata (`finalizePaidBillingSession.ts`); market changes can trigger **additional Billplz bill** for MYR delta (`request-market-change`).

### 3.2 Capital allocation (client portfolio principal)

| Question | Answer (repo) |
|----------|----------------|
| Who holds client investable assets? | **Not the Capital Bridge application.** No custody table or asset positions. |
| Who decides allocation? | **User** enters assumptions in calculators; optional human adviser outside system. |
| Do model outputs become orders? | **No automated bridge** to brokers in-repo. |
| Manual vs automated? | **Manual** interpretation of reports; **Strategic Execution** is “Coming Soon” as a **future** partner-mediated layer. |

### 3.3 Income generation

| Type | In product today |
|------|-------------------|
| **Real investment income** | **Not tracked** in platform ledgers. |
| **Modeled income** | Yes — Forever, Income Engineering, Capital Health simulations (see `INTERNAL_FULL_SYSTEM_SPEC.md`). |
| **Reinvestment** | Where modeled (e.g. Capital Health `reinvestmentSplitPct`), it is **simulation logic**, not bank instruction. |

### 3.4 Reporting

- **Advisory reports:** `advisory_v2.advisory_reports` (via `/api/advisory-report` handlers) store `inputs` + `results` JSON per model type.
- **Forever PDF exports:** `public.report_exports` stores calculator snapshot + Lion config for PDF regeneration.
- **Institutional interpretation:** Reports are **analytics deliverables** tied to subscription, not fund factsheets or regulated portfolio statements unless separately produced by a licensed party.

### 3.5 Redemption / withdrawal (investment sense)

**Not applicable in-repo** — there is no redemption from a pooled fund in application data.

**Subscription lifecycle:** Membership **expires** per plan duration (`activateFromBillingSession` uses `computeExpiry`, `getPlanDuration`); renewal would be a **new billing session** (business process; implementation in billing routes). **No T+2 settlement** of securities — that would belong to a future execution/custody stack.

---

## 4. Execution model

### 4.1 Does Capital Bridge execute?

**No — in this codebase.** There is no:

- Order management system,
- FIX/broker API,
- Custodian feed,
- Holdings reconciliation,
- Corporate actions processing.

### 4.2 Who executes (today)

**Outside the platform:** Clients’ **banks, brokers, fund platforms, or advisers** — implied by advisory-framework disclaimers and absence of execution code.

### 4.3 If execution were added (future)

| Model | Description | Typical license / structure notes (high-level, not legal advice) |
|-------|-------------|-------------------------------------------------------------------|
| **Advisory-only** | Recommendations without discretion | Jurisdiction-specific (e.g. RIA-like, exempt adviser); **current copy aligns with non-dealing advisory**. |
| **Assisted execution** | Client approves each trade | Broker/dealer or agent of client; clear order flow audit. |
| **Discretionary** | Manager trades within mandate | Asset management license + custody arrangements + reporting. |

**Institutional readiness:** Would require **new systems** (custody integration, best execution policy, client money rules) **not present** in this monorepo.

---

## 5. Legal / structural options (institutional-grade possibilities)

These are **standard industry patterns** for a firm that evolves from **software** to **capital markets participation**. Capital Bridge’s **current repo does not implement** any of them as legal entities or registers.

| Structure | Pros | Cons / complexity | Regulatory (high-level) |
|-----------|------|---------------------|-------------------------|
| **Segregated managed account (SMA)** | Client assets in own name; transparency | Per-client ops; scale costs | Investment management rules per jurisdiction. |
| **Nominee / omnibus** | Operational efficiency | Clear segregation and client money rules | Broker-dealer / custody regime. |
| **Unit trust / OEIC** | Pooled scale; familiar to banks | Prospectus, ongoing compliance | CIS / fund regulations. |
| **SPV for private deals** | Ring-fenced assets per deal | Setup cost; illiquidity | Securities / prospectus / private placement rules. |
| **Multi-asset income fund** | Diversified mandate | NAV, valuation, liquidity management | Fund rules + depositary depending on region. |
| **Feeder into external strategies** | Leverage third-party managers | Double fee layer; DD burden | Depends on feeder domicile. |

---

## 6. Role of the four models in the investment stack

Mapping is **logical / intended** — **not** wired to live portfolios in code.

| Model | Analytical role | Translation to “real” allocation (if/when execution exists) |
|-------|-----------------|--------------------------------------------------------------|
| **Forever Income** | Lifestyle spend vs capital + return/inflation; runway | **Income need** and **longevity gap** for strategic asset-liability discussion. |
| **Income Engineering** | Monthly coverage vs expenses + debt + modeled unlock income | **Cash-flow stress** and **leverage** narrative; not a portfolio optimizer. |
| **Capital Health** | Horizon path, withdrawal sustainability, growth vs target | **Savings rate, withdrawal rate, buffer** monitoring concepts. |
| **Capital Stress** | Monte Carlo resilience, shock, depletion pressure | **Risk tolerance** and **sequence-of-returns** dialogue. |

**Rebalancing triggers:** **Not automated** in-repo. Any “rebalance when model X says Y” would be a **business rule** layered on top by humans or a future rules engine — **not shipped** as production trading logic.

---

## 7. Subscription vs investment — clear separation

| Concept | Definition in this system |
|---------|---------------------------|
| **Subscription fee** | Billplz charge for `plan` → unlocks software duration and features (`deriveEntitlements`: save to server, verdict access, stress model, strategic solutions visibility). |
| **Investment capital** | User’s **external** wealth entered as **inputs** to calculators; **not** deposited into a Capital Bridge investment account in application data. |

**Why separation matters:** Conflating subscription payment with **investment principal** creates **mis-selling, regulatory, and litigation risk**. Banks and trustees should hear: **subscription pays for analytics access; deployment of investable assets is out-of-platform unless a separate legal arrangement exists.**

**How confusion arises:** Marketing language (“capital starts working for you”) must be read alongside **Strategic Execution — Coming Soon** and the fact that **current flows** are **Billplz → membership**, not **client AUM → strategy**.

---

## 8. Risks and misalignments

1. **Model vs reality:** Projections **will not** match executed portfolios (fees, taxes, timing, human behaviour absent from models — partially explicit in disclaimers).
2. **Liquidity mismatch:** Models may assume smooth withdrawal; illiquid holdings in real life differ.
3. **Yield expectation:** Users may treat **slider assumptions** as **promises**; institutional messaging must repeat **non-guaranteed**.
4. **Advisory vs execution liability:** Platform generates **educational outputs**; **who gives regulated advice** must be clear in client agreements (outside repo).
5. **Over-reliance on projections:** Stress tests are **stochastic** (Capital Stress) or **simplified** (single-period Income Engineering) — not exhaustive of tail risk.

---

## 9. Institutional questions — direct answers

*Framed for banks / trustees / legal. Answers reflect **codebase + explicit UI copy**; regulatory classification requires **founder counsel**.*

**Q1. What does the client invest in?**  
- **Today (defensible):** They purchase a **software subscription** (plan) that grants access to planning tools and reports. They do **not** invest in a Capital Bridge fund **as implemented in this repository**.  
- **Future (if product evolves):** Could be **none of the above** until a prospectus or mandate defines the vehicle; see §2.B.

**Q2. Subscription and redemption flow?**  
- **Subscription:** Select plan → Billplz bill → pay → webhook / confirm-payment path → membership active with `start_date` / `expires_at` (see §3.1, `activateMembershipFromPaidBillingSession`).  
- **“Redemption” of investment:** **N/A** in-platform. **Subscription end:** membership expiry / cancellation per business rules in DB.

**Q3. Do you custody client assets?**  
- **No** — no custody module or asset ledger in reviewed schema.

**Q4. Who is the fund manager?**  
- **N/A** — no fund product in code. Any external manager would be **off-platform**.

**Q5. How are returns generated?**  
- **Subscription revenue:** Merchant/acquirer side of Billplz (commercial).  
- **Client “returns”:** Not generated by the platform; **modeled** returns are **user assumptions** in calculators.

**Q6. Downside scenarios?**  
- **Models:** Stress and scenario outputs are **hypothetical**.  
- **Commercial:** Subscription is not a capital guarantee product.

**Q7. Regulatory category?**  
- **Cannot be answered from code alone.** The product presents as **software + educational analytics**. Actual classification depends on **jurisdiction, marketing, whether advice is given, and any future regulated activities**.

---

## 10. Ideal future state (recommended — architectural, not a commitment)

A **clean institutional architecture** if Capital Bridge adds **capital deployment**:

1. **Hold client assets** only in **regulated custodian / bank** accounts, never in the **same** PostgreSQL tables as **subscription billing** (separate legal entity and ledger).
2. **Capital Bridge Technology** remains **software + analytics**; **Capital Bridge Asset Management** (hypothetical) holds licenses and signs mandates.
3. **Models** feed **investment policy statements** and **monitoring dashboards**, not raw order generation without governance.
4. **Reporting:** Regulated **statements** from custodian + manager; CB software as **supplemental** analytics with consistent disclaimers.
5. **Entry / exit:** **Subscription** for software; **separate** subscription or fee for managed service; **redemptions** per fund/mandate docs.

---

## 11. Diagrams (text-based)

### 11.1 Subscription flow (as implemented)

```
[1] User selects plan on login/platform checkout
      ↓
[2] API creates billing_sessions + Billplz bill (MYR sen)
      ↓
[3] User pays on Billplz hosted checkout
      ↓
[4] Billplz → POST webhook (API /billing/billplz-webhook or login proxy)
      ↓
[5] payments updated; finalizePaidBillingSession / activate membership
      ↓
[6] memberships.status = active; plan entitlements apply
      ↓
[7] User accesses model apps + platform (cookie SSO .thecapitalbridge.com)
```

### 11.2 Capital flow (client wealth — conceptual; not platform ledger)

```
Client external bank/broker accounts
      ↓ (manual / outside CB)
User types balances & assumptions into calculators
      ↓
Software computes projections & stores advisory_reports / report_exports
      ↓
PDFs & narrative for discussion with professional advisers
      ↓
(No automatic loop back to broker in repo)
```

### 11.3 Income flow (modeled vs real)

```
MODELED:  Calculator engines → dividends/withdrawals in simulation → reports
REAL:      (Not in CB DB) custodian cash flows → client’s actual life
```

### 11.4 Redemption flow

```
SUBSCRIPTION:  membership expires → renew via new billing OR lose entitlements
INVESTMENT:    not applicable in-platform today
```

---

## INSTITUTIONAL CLARITY GAPS

**What cannot be answered from code**

- Exact **legal entity** that contracts with the client for software vs any future investment product.
- **Regulatory licenses** held in each jurisdiction.
- **Commercial terms** of any **off-platform** partner mentioned in “Strategic Execution” copy.
- Whether **human advisers** are employees, licensees, or independent.
- **Refund / chargeback** policy details (not fully traced in this audit).

**What requires founder / counsel decision**

- Whether Capital Bridge will ever **hold** client money or only **refer** to partners.
- **Brand architecture:** one entity vs separate **tech** vs **advisory** vs **fund** entities.
- **Target jurisdictions** for regulation (MY, SG, global).
- How **Strategic Execution** will be structured when it leaves “Coming Soon.”

**What could create friction with banks**

- Any language implying **guaranteed income** or **capital protection** from calculators.
- Mixing **subscription receipts** with **AUM** in financial statements or pitch decks.
- **Absent custody controls** if banks expect SOC 2 / asset verification tied to product — current scope is **software subscription + user-entered data**.

---

**End of document.**  
*Do not commit proprietary positioning without legal review.*
