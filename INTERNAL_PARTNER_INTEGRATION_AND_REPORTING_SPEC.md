# INTERNAL_PARTNER_INTEGRATION_AND_REPORTING_SPEC.md

**Classification:** Internal only — founder, product, architecture, and GPT configuration.  
**Not legal advice.** Counsel required for consent, data processing, and regulated activities.

**Sources:** `INTERNAL_FULL_SYSTEM_SPEC.md`, `INTERNAL_INVESTMENT_AND_FLOW_SPEC.md`, `INTERNAL_TRUTH_OVERRIDES.md`, `INTERNAL_LIABILITY_MAP.md`, `INTERNAL_REGULATORY_POSITIONING.md`, `INTERNAL_GPT_OPERATING_SYSTEM.md`, `INTERNAL_COMMUNICATION_RULES.md`, `INTERNAL_PRICING_BY_MARKET.md`, and repository audit (Supabase types, platform APIs, billing, reports).

**Runtime code:** Unchanged by this document.

### Classification used throughout this document

| Label | Meaning |
|-------|---------|
| **A — Confirmed in-repo** | Observable in this monorepo (tables, routes, packages, UI strings). Cite paths. |
| **B — Intended future architecture** | Design target for partner integration, reporting, statements, reconciliation — **not** shipped unless a later migration implements it. |
| **C — Founder / product / legal / partner decision** | Requires explicit choice, contract, licence, or counsel — **do not** treat as built. |

When a sentence describes banks, CRMs, statement vaults, or reconciliation engines without **A**, treat it as **B** unless marked **C**.

---

## 1. Document role

### 1.1 What this document is for

- Defines how Capital Bridge **could evolve** into a **partner-connected orchestration and reporting layer**: ingestion, reconciliation, dashboards, alerts, and audit — **without** claiming current implementation where none exists.
- Bridges **product vision** (e.g. Strategic Execution / partners language in UI) with **technical reality** (subscription + calculators + JSON persistence today).
- Complements:
  - **`INTERNAL_FULL_SYSTEM_SPEC.md`** — calculator/PDF/Lion mechanics (today).
  - **`INTERNAL_INVESTMENT_AND_FLOW_SPEC.md`** — subscription vs investment, no custody in-repo.
  - This file — **future** integration architecture, canonical data concepts, phased rollout, decisions.

### 1.2 Governance scope

This spec **governs** (as design authority for internal planning):

- Partner integration **patterns** and **maturity levels**.
- Future **reporting cockpit** sections and data dependencies.
- **Canonical data objects** (recommended — not DB migrations).
- **Reconciliation** and **variance** logic (framework).
- **Consent/security** **design principles** (not legal conclusions).
- **API architecture** recommendations (adapters, events, idempotency).

It does **not** replace database migrations, partner contracts, or security reviews.

### 1.3 How this differs from other internal specs

| Document | Primary focus | This document |
|----------|----------------|----------------|
| `INTERNAL_FULL_SYSTEM_SPEC.md` | **A** — model math, Lion, PDFs, gating per app | References model outputs as **expected** side of reconciliation; does not redefine formulas |
| `INTERNAL_INVESTMENT_AND_FLOW_SPEC.md` | **A** — subscription vs investment, Billplz, no custody | Aligns: execution/custody external; this file adds **B** partner data layer |
| `INTERNAL_TRUTH_OVERRIDES.md` | **A/C** — authoritative naming for headline metrics | Plan snapshots for variance should reference same headline definitions |
| `INTERNAL_LIABILITY_MAP.md` | **C** — risk ownership | Partner data errors, parsing, misleading dashboards — extend here + counsel |
| `INTERNAL_REGULATORY_POSITIONING.md` | **C** — positioning | Reporting cockpit must not read as regulated portfolio management without licence |
| `INTERNAL_GPT_OPERATING_SYSTEM.md` | GPT routing and truth order | **§15** below — this file is **B** unless cross-checked against **A** |
| `INTERNAL_COMMUNICATION_RULES.md` | Client-facing language | Dashboard and partner copy must stay non-custodial |
| `INTERNAL_PRICING_BY_MARKET.md` | **A** — `MARKET_PLAN_PRICES`, Billplz sen | Orthogonal to partner reporting; market affects **jurisdiction** priorities only |

---

## 2. Current-state reality (confirmed in repo)

### 2.1 Identity, auth, membership, billing

| Area | What exists | Evidence |
|------|-------------|----------|
| Auth | Supabase Auth; cross-subdomain cookies (`.thecapitalbridge.com` pattern in docs) | `apps/login`, `packages/supabase` |
| Memberships | `public.memberships` — `plan_id`, `status`, `start_date` / `end_date`, `expires_at`, `billing_session_id` | `packages/db-types/src/database.ts` |
| Plans | `public.plans` — `slug`, `price_cents`, `duration_days`, `is_trial` | same |
| Billing sessions | `public.billing_sessions` — plan, status, `bill_id`, `payment_url`, `membership_id`, checkout metadata | same |
| Payments | `public.payments` — `billplz_bill_id`, amounts, status, `raw_webhook` | same |
| Charge amounts | MYR sen per market+plan | `packages/shared/src/markets.ts` `getBillplzChargeAmountSen`, `MARKET_PLAN_BILLPLZ_MYR_SEN` |
| Webhooks | Billplz → `apps/api/app/billing/billplz-webhook/route.ts` (and optional login proxy) | `VERCEL-SETUP.md`, `ARCHITECTURE_AUDIT_REPORT.md` |

**Confirmed:** Billing webhooks are **subscription payment** lifecycle — **not** investment cash movement, not partner bank transaction feeds.

### 2.2 Advisory reports and model persistence

| Area | What exists | Evidence |
|------|-------------|----------|
| Advisory sessions | `advisory_v2.advisory_sessions` | `db-types`, `packages/advisory-graph/src/platformAccess.ts` |
| Advisory reports | `advisory_v2.advisory_reports` — `model_type`, `inputs` JSON, `results` JSON | same; `handleAdvisoryReportGET/POST` in `advisory-graph/src/server/advisoryRoutes.ts` |
| Model types | `forever-income` \| `income-engineering` \| `capital-health` \| `capital-stress` | Row type in `db-types` |
| Forever PDF exports | `public.report_exports` — `report_id`, `tier`, `lion_config` JSONB | `apps/forever/.../insertForeverReportExport.ts`, `ensureForeverReportLionConfig.ts` |
| Model runs / shared facts (public schema) | `model_runs`, `model_inputs`, `model_outputs`, `model_shared_facts` | `db-types`; API `apps/platform/app/api/model/run/route.ts`, `shared-facts/route.ts` |

**Confirmed:** Persistence is **user-entered calculator state** and **derived outputs** — **not** live holdings or bank statement lines.

### 2.3 Profile and market

| Area | What exists | Evidence |
|------|-------------|----------|
| Profile | `public.profiles` — names, `advisory_market`, `access_type`, campaign fields | `db-types` |
| Market pricing | `MarketId`, `MARKET_PLAN_PRICES`, Billplz sen | `packages/shared/src/markets.ts` |
| Report audit / zone | `marketIdToReportExportTimeZone`, `formatAdvisoryReportExportZoneLabel` | `markets.ts`, `reportTraceability.ts` |

### 2.4 Dashboards and routes (today)

| Surface | Role |
|---------|------|
| Model apps | `/dashboard` per app (Forever, Income Eng., Health, Stress) — calculators + reports |
| Platform `/framework`, `/solutions` | Framework landing; **Strategic Execution** UI — **“Coming Soon”**; partner copy | `apps/platform/app/solutions/page.tsx` |
| Strategic interest | `public.strategic_interest` — interest capture; admin briefing loads `strategic_interest` + `advisory_v2.advisory_reports` | `platform/lib/strategicBriefingLoad.ts`, `app/api/strategic-interest/route.ts` |
| Admin strategic briefing | `apps/platform/app/admin/login/strategic/briefing/` | connects interest rows to advisory reports |
| Forever PDF | `/dashboard/report-document/[exportId]`, `GET /api/forever/report-pdf/[exportId]` | Playwright PDF |

### 2.5 Partner-language references (non-integration)

- **Strategic Execution (Coming Soon)** — financing, investment opportunities, structured income via **Capital Bridge™ partners** — `apps/platform/app/solutions/page.tsx` (**A**).
- **`public.strategic_interest`** — clients can submit interest rows from model apps; platform API — `apps/platform/app/api/strategic-interest/route.ts`; legacy inserts from `apps/incomeengineering/legacy/App.tsx` and `apps/capitalstress/legacy/App.tsx` (**A**).
- **Platform dashboard tile** — “Strategic Execution” loads `strategic_interest` — `apps/platform/app/dashboard/components/DashboardTiles.tsx` (**A**).
- **Checkout / plan copy** — `strategic` plan labelled “Strategic Execution (365 Days)” — `apps/login/app/checkout/page.tsx`, `apps/login/app/payment-handoff/page.tsx` (**A**).
- **PriorityAccessClient** — `apps/platform/app/solutions/PriorityAccessClient.tsx` (**A**).

**None of the above** implement **API integrations** to banks or CRMs. They are **interest capture + UX + admin briefing** (`apps/platform/lib/strategicBriefingLoad.ts`, `apps/platform/app/admin/login/strategic/briefing/`), not partner feeds.

### 2.6 What does **NOT** exist (confirmed absent in repo)

| Capability | Status |
|------------|--------|
| Bank / broker trading or account APIs | **Not present** |
| Custody ledger / positions / holdings sync | **Not present** |
| Partner CRM connectors (Salesforce, etc.) | **Not present** |
| Canonical **monthly statement** ingestion pipeline (PDF/OFX) | **Not present** |
| External **statement vault** with parsing | **Not present** |
| **Reconciliation engine** (plan vs actuals) | **Not present** |
| Live holdings feed | **Not present** |
| Exception alert engine tied to partner data | **Not present** |

**Category:** All of the above are **FUTURE STATE** unless and until implemented.

---

## 3. Strategic role of the future integration layer

### 3.1 Intended positioning (design intent — not shipped)

Capital Bridge evolves as:

- **Orchestration layer:** Coordinates **visibility** across institutions — **not** execution of trades inside CB software (unless a **future licensed entity** and product **explicitly** add execution — **FOUNDER DECISION**).
- **Reporting cockpit:** Single place to see **plan assumptions** (from models) vs **partner-reported actuals** (from feeds/uploads).
- **Structure governance layer:** Tracks **approved** structure (leverage, facilities, trust) vs **implementation** status and **covenant / maturity** signals when data exists.
- **Partner-connected monitoring:** Ingests **statements, case status, distributions** where partners allow — **subject to consent and contracts**.

### 3.2 Hard boundaries (align with existing internal docs)

- **Execution remains external** — `INTERNAL_INVESTMENT_AND_FLOW_SPEC.md`, `INTERNAL_REGULATORY_POSITIONING.md`.
- **Custody remains external** — client assets at **custodian/bank**; CB holds **metadata + documents + reconciled facts** in FUTURE design.
- **Capital Bridge becomes** the system that **tracks implementation and income sustainability across institutions** **only when** integrations are built and **consent** is in place.

### 3.3 A / B / C for this layer

- **A:** Subscription, auth, `advisory_reports`, `report_exports`, `strategic_interest`, Billplz — as in §2.  
- **B:** Partner adapters, statement vault, reconciliation jobs, §6 objects, §7 dashboard — **design only** until implemented.  
- **C:** Whether CB may ever **initiate** instructions to partners, **who** signs DPAs, **which** jurisdictions first, **retention** — **not** decided in code.

---

## 4. Partner ecosystem map

For each category: **data wanted**, **what to monitor**, **what CB sends back**, **out of scope**.

| Category | Data CB would want | Monitor / status | CB likely sends back | Outside CB scope |
|----------|-------------------|------------------|----------------------|------------------|
| **Banks** | Account balances, loan statements, facility letters, payment history | Drawdowns, repayments, covenant breaches (if in data) | Plan updates, variance alerts, document requests | **Granting credit**; **settling payments** |
| **Investment houses / platforms** | Holdings, statements, NAV, distributions | Allocation vs plan, missed distributions | Rebalance **suggestions** (not orders) unless licensed workflow | **Order execution** |
| **Trustees** | Trust accounts, distributions, trustee reports | Trust compliance vs plan | Case notes, reporting pack | **Trust law** |
| **Insurers** | Policy CSV, cash value, premium due | Liquidity vs plan | Premium reminders (data-driven) | **Underwriting** |
| **Accounting firms** | P&L, tax packs | Income recognition vs plan | Exception flags | **Tax filing** |
| **Legal firms** | Matter status, closing conditions | Deal pipeline | Status dashboard | **Legal advice** |
| **Family offices** | Consolidated reporting, mandates | Multi-entity view | Governance dashboards | **FO management** |
| **RM / adviser CRMs** | Lead, KYC status, suitability notes | Case lifecycle | **Read-only** plan links or exports | **CRM ownership** |
| **Portfolio admin** | Holdings file, corporate actions | Position reconciliation | Variance | **PA execution** |

---

## 5. Target integration types (layers)

| Type | Purpose | Key fields (examples) | Frequency | Direction | Difficulty | Value | Phase |
|------|---------|------------------------|-----------|-----------|------------|-------|-------|
| **CRM integration** | Case + contact sync | `contact_id`, `stage`, `owner` | Daily / webhook | Pull + push notes | Medium | Ops efficiency | **3** |
| **Case management** | Implementation pipeline | `case_id`, `milestone`, `due_date` | On change | Webhook / poll | Medium | Visibility | **3** |
| **Document / statement ingestion** | Truth for actuals | `period_start`, `end`, `account_id`, `amount` | Monthly | Upload + **FUTURE** API | High | Reconciliation | **1–2** |
| **Portfolio / valuation feeds** | Holdings truth | `ISIN`, `qty`, `price`, `as_of` | Daily | File/API | High | Drift detection | **2–3** |
| **Loan servicing / refinance** | Debt reality | `principal`, `rate`, `next_payment` | Monthly | Upload/API | Medium | Cashflow truth | **2** |
| **Distribution / coupon / dividend** | Income events | `pay_date`, `gross`, `net` | Event | File/API | Medium | Income vs target | **2–3** |
| **Trust / structure admin** | Entity layer | `entity_id`, `distribution_policy` | Quarterly | Manual upload | **3** | Governance | **2** |
| **Identity / consent** | Legal basis | `consent_id`, `scopes`, `expiry` | On change | OAuth / manual | Medium | Compliance | **1** |
| **Alert / webhook** | Push updates | `event_type`, `payload` | Real-time | Push | Medium | **3** | **3** |

---

## 6. Canonical data model (recommended — FUTURE)

**B — Not implemented as tables below** — design targets for schema and services. Names are **illustrative**.

### 6.1 Client / Household

**Purpose:** Anchor identity for RLS, consent scopes, and cross-entity reporting.

| Recommended field | Notes |
|-------------------|--------|
| `internal_client_id` | UUID — aligns with `auth.users` / `profiles` |
| `household_id` | Optional grouping for joint planning |
| `entity_relationships` | Graph: spouse, trust, holding co — **C** legal structure |
| `advisory_market` | Today: `profiles.advisory_market` pattern (**A**) |
| `jurisdiction` / `tax_residence` | May exceed `MarketId` — **C** |
| `partner_org_links` | `(partner_id, external_ref, role)` |
| `consent_records` | Scopes: `statements_read`, `crm_read`, …; `granted_at`, `revoked_at` |

**Sources (today A):** `public.profiles`. **Sources (B):** CRM, partner admin portals. **Consumers:** dashboards, variance engine, RLS policies.

### 6.2 Capital structure snapshot

**Purpose:** Point-in-time view of assets/liabilities/insurance/facilities for drift and covenant monitoring.

| Recommended field | Notes |
|-------------------|--------|
| `snapshot_id`, `as_of`, `client_id` | Versioned |
| `assets[]` | Class, value, encumbrance |
| `liabilities[]` | Facility type, limit, drawn, rate, maturity |
| `insurance[]` | Policy id, coverage, cash value, premium |
| `investable_capital` | Derived or ingested |
| `collateral_links` | Asset ↔ facility |
| `provenance` | `partner_feed` \| `user_entry` \| `cb_model` |

**Sources:** **B** — statements + uploads + `advisory_reports` inputs overlay. **Consumers:** reconciliation, §7 dashboards.

### 6.3 Plan / strategy snapshot

**Purpose:** Frozen **expected** side for variance — must align with `INTERNAL_TRUTH_OVERRIDES` headline definitions when comparing to UI/report claims.

| Recommended field | Notes |
|-------------------|--------|
| `plan_id`, `client_id` | |
| `originating_model_types[]` | `forever-income`, `income-engineering`, `capital-health`, `capital-stress` (**A** enum in DB) |
| `source_report_ids[]` | FK to `advisory_v2.advisory_reports.id` (or hash bundle) |
| `approved_strategy_version` | Human-approved semver or content hash |
| `target_income` | Periodicity explicit (monthly/annual) |
| `assumption_bundle` | JSON — yields, leverage, spend, buffers |
| `expected_yield_band` | If used in comms, match overrides |
| `approved_leverage_structure` | **C** — policy limits |
| `risk_boundaries` | From Stress/Health outputs |
| `effective_date`, `superseded_at` | |

**Sources (A):** `advisory_v2.advisory_reports` JSON. **Sources (B):** explicit “approval” record. **Consumers:** variance engine, GPT context (read-only).

### 6.4 Position / exposure

**Purpose:** Institution-level exposure for allocation and liquidity monitoring.

| Recommended field | Notes |
|-------------------|--------|
| `position_id`, `client_id` | |
| `institution_id` | Bank / platform / trustee |
| `account_id` / `facility_id` | Partner-native id |
| `instrument_type` | Cash, bond, fund, loan, policy, … |
| `quantity`, `unit`, `value_native`, `value_reporting_ccy` | |
| `cost_or_principal` | |
| `coupon` / `distribution_yield` / `expected_income` | |
| `liquidity_bucket` | T+0, T+2, illiquid |
| `source_of_truth_tag` | `partner_feed` \| `user_entry` \| `cb_model` |
| `as_of` | **Critical** for stale-data risk |

### 6.5 Cash flow event

**Purpose:** Actual income and debt cash flows vs plan.

| Recommended field | Notes |
|-------------------|--------|
| `event_id`, `client_id` | |
| `value_date`, `booking_date` | Partner may differ |
| `type` | `coupon`, `dividend`, `rent`, `loan_interest`, `principal`, `fee`, … |
| `amount`, `currency` | |
| `source_institution_id` | |
| `expected_vs_actual` | Enum + link to planned cashflow line |
| `recurring` | Bool + schedule ref if any |
| `mapped_plan_category` | Ties to §6.3 lines |
| `ingestion_source` | `statement_line`, `api`, `manual` |

### 6.6 Statement / document

**Purpose:** Evidence store + parsed facts + review workflow.

| Recommended field | Notes |
|-------------------|--------|
| `statement_id`, `client_id` | |
| `partner_source_id` | Issuer |
| `statement_kind` | `bank`, `loan`, `broker`, `trust`, … |
| `period_start`, `period_end`, `timezone` | Align with partner; **B** normalisation |
| `raw_storage_uri`, `sha256`, `mime_type` | Immutable blob |
| `parsed_json`, `parser_version` | **B** |
| `reconciliation_status` | `pending` \| `matched` \| `partial` \| `exception` |
| `review_status` | `none` \| `queued` \| `approved` |
| `reviewed_by`, `reviewed_at` | |
| `audit_metadata` | Extend `ReportAuditMeta` ideas from `packages/shared/src/reportTraceability.ts` |

### 6.7 Alert / exception

**Purpose:** Operational response to variance rules and ingestion failures.

| Recommended field | Notes |
|-------------------|--------|
| `alert_id`, `type`, `severity` | |
| `trigger_rule_id`, `trigger_payload_ref` | Idempotent dedupe |
| `client_id`, `partner_id`, `plan_id`, `statement_id` | Nullable FKs |
| `state` | `open` \| `acknowledged` \| `resolved` \| `suppressed` |
| `owner_role` | `founder`, `ops`, `partner` — **C** |
| `resolution_notes` | Audit |

---

## 7. Dashboard vision (FUTURE)

| Section | Shows | Data sources | Frequency | Audience (future) |
|---------|-------|--------------|-----------|---------------------|
| **Overview** | Health of plan vs reality | Aggregates | Daily | **Founder** → later client/adviser |
| **Monthly income vs target** | Actual vs model target | **FUTURE** cashflow + `advisory_reports` | Monthly | **FUTURE** |
| **Assets / liabilities by institution** | Exposure map | **FUTURE** positions + liabilities | Weekly | **FUTURE** |
| **Loan / refinance tracker** | Servicing, maturity | **FUTURE** loan + case data | Monthly | **FUTURE** |
| **Distribution tracker** | Coupons vs expected | **FUTURE** events | **FUTURE** | **FUTURE** |
| **Plan vs actual variance** | KPI deltas | **FUTURE** reconciliation | **FUTURE** | **FUTURE** |
| **Forever / Health / Stress drift** | Model re-run vs baseline | `advisory_reports` + new runs | On demand | **FUTURE** |
| **Statements vault** | Raw + parsed | **FUTURE** storage | Monthly | **FUTURE** |
| **Open partner cases** | CRM/case | **FUTURE** | **FUTURE** | **FUTURE** |
| **Alerts / exceptions** | Rule engine | **FUTURE** | **FUTURE** | **FUTURE** |
| **Audit trail** | Who changed what | **FUTURE** | **FUTURE** | **FUTURE** |

**Today:** Model dashboards are **calculator-only** — no unified cockpit.

---

## 8. Monthly statement architecture (FUTURE)

### 8.1 Who provides statements

- **Partner institutions** (bank, platform, trustee) — **source of truth** for **actuals**.
- **Client** may upload PDF/CSV when partner has no API.

### 8.2 Raw vs structured

- **Raw:** Immutable blob in object storage (checksum, virus scan, retention policy).
- **Structured:** Parser output — **FUTURE** normalisation layer (templates per institution).

### 8.3 Storage model

- **B:** `statement_id` → `raw_uri` + `parsed_json` + `period` + `user_id` + RLS; optional **virus scan** and **malware** quarantine state before parse.

### 8.4 Statement period handling

- **Calendar month** vs **partner statement cycle** may differ — store **both** `partner_period_label` and normalised `period_start`/`period_end` UTC (or market timezone via `marketIdToReportExportTimeZone` patterns — **A** in `packages/shared/src/markets.ts`).  
- **B:** Handle **partial month** (account opened mid-period) as exception or prorated category — **C** product rule.

### 8.5 Reconciliation rules (conceptual)

- Map **line items** to **plan categories** (income, interest, fee, principal, tax withholding).
- Compare **period totals** to **model-expected** ranges from **approved** §6.3 snapshot (not raw slider drift unless that snapshot is updated).
- **B:** **Tolerance bands** — absolute and relative — **C** who sets defaults (founder vs adviser).
- **B:** **FX** — if statement currency ≠ reporting currency, store **rate source** and **date** alongside converted amounts.

### 8.6 Versioning

- **Plan baseline** version hash when “approved.”
- **Statement** raw blob **immutable**; **re-parse** creates new `parser_version` row or supersedes parsed child records — keep pointer to which parse drove reconciliation.

### 8.7 Manual override / review flow

- Human marks **exception resolved** or **adjusts mapping** — **append-only audit** (who, when, before/after).
- **B:** **Four-eyes** optional for material amounts — **C**.

### 8.8 Linking statement facts to plan and income

- **B:** Each **parsed line** or **aggregated bucket** links to `mapped_plan_category` and optionally to a **Forever / IE** income line identifier derived from `advisory_reports.results` structure (schema-specific — integrate per model app).
- **B:** **Monthly actual income** roll-up feeds §7 “Monthly income vs target” by joining **cash flow events** (§6.5) to **plan snapshot** (§6.3).

### 8.9 Three layers (repeat for clarity)

1. **Raw archive** — compliance / evidence.  
2. **Normalised facts** — queryable.  
3. **CB insights** — variance, alerts — **computed**; **never** confuse with **partner** figures.

---

## 9. Reconciliation and variance engine (FUTURE)

### 9.1 Comparisons

| Dimension | Expected source | Actual source |
|-----------|----------------|----------------|
| Income | Model output / target from plan snapshot | **FUTURE** cashflow events |
| Debt servicing | Model loan assumptions | **FUTURE** loan feed |
| Yield | Slider assumptions | **FUTURE** realised from statements |
| Resilience / buffer | Stress / Health outputs | **FUTURE** liquidity from bank |
| Distributions | **FUTURE** plan schedule | **FUTURE** events |
| Refi / maturity | User input | **FUTURE** facility data |
| **Partner case delays** | Milestones from **B** case/CRM | **B** actual stage transitions vs SLA |
| **Covenant / repricing** | **B** facility metadata | **B** bank feed or manual |

### 9.2 Variance framework (design)

| Field | Description |
|-------|-------------|
| `variance_type` | `income_shortfall` \| `yield_drift` \| `payment_missed` \| `distribution_missed` \| `buffer_breach` \| `covenant_warning` \| `maturity_cluster` \| `case_delay` \| `feed_stale` \| … |
| `threshold` | Absolute or %; may differ by **market** or **client tier** — **C** |
| `materiality` | Tier 1–3 — **C** thresholds; **B** default: tier 1 = notify founder only |
| `severity` | `info` \| `warn` \| `critical` — drives §6.7 |
| `reviewer_role` | `adviser` \| `ops` \| `client` — **C** |
| `comparison_window` | MTD, QTD, rolling 12m — **B** |

### 9.3 Materiality and alert routing (conceptual)

- **B:** **Suppress** noise — e.g. immaterial FX rounding — via **materiality** gates.  
- **B:** **Stale feed** — if `as_of` older than SLA, raise `feed_stale` before numeric variance (avoid false “income shortfall”).  
- **C:** **Who** receives alerts (founder-only Phase 2 vs client later) — **§13**.

---

## 10. Consent, access, and security model (design — counsel required)

### 10.1 Principles

- **Explicit consent** to fetch partner data — scope, time, revoke.
- **Partner-scoped** credentials — least privilege per integration.
- **Audit** all access — who, when, what object.
- **Separate** `partner_reported` vs `cb_computed` in UI and APIs.
- **Retention** — policy per jurisdiction + product **FOUNDER DECISION**.
- **PII** — minimise in CB; encrypt at rest; **FUTURE** field-level encryption for sensitive notes.

### 10.2 Counsel-required

- **Data processing agreements** with partners.
- **Cross-border** transfer (MY/SG/APAC).
- **Whether** CB acts as **data processor** vs **controller** for different datasets.

---

## 11. API architecture recommendations (FUTURE)

### 11.1 Patterns

- **Adapter per partner** — normalise to canonical objects (§6).
- **Ingestion service** — idempotent writes; `source` + `external_id` uniqueness.
- **Event bus** — internal topics: `statement.uploaded`, `position.reconciled`.
- **Webhooks** — verify signatures; **FUTURE** partner callbacks.
- **Polling** — fallback for partners without push.
- **Reconciliation jobs** — scheduled workers (cron / queue).
- **Document pipeline** — upload → virus scan → classify → parse → review queue.
- **Mappers** — partner schema → canonical.
- **Idempotency** — `Idempotency-Key` on writes; dedupe by `(partner, external_ref)`.
- **Retry** — exponential backoff; dead-letter queue.
- **Audit** — append-only log for compliance.

### 11.2 Maturity levels

| Level | Description |
|-------|-------------|
| **0** | Manual upload + CRM notes only |
| **1** | CSV / PDF upload + manual mapping |
| **2** | CRM API sync (read-heavy) |
| **3** | Webhooks + event-driven |
| **4** | Near-real-time feeds + operational cockpit |

**Today (A):** Partner-actuals ingestion is **Level 0** (no automated partner data feeds).  
**Today (A):** Subscription **payments** use **Billplz** webhooks — that is a **billing rail**, not an integration maturity level for **portfolio/statement** data; do not conflate “automated payment webhook” with “Level 3 partner webhooks” in §11.2.

---

## 12. Recommended phased rollout

### Phase 1 — **Highest leverage, lowest integration risk**

- **Scope:** Manual **statement upload** (PDF/CSV) + **metadata** in **FUTURE** tables; **strategic_interest** + **advisory_reports** already linked in admin briefing — **extend** with “attachment” concept.
- **Value:** Actuals begin to exist beside models.
- **Dependencies:** Storage, consent UX, parser MVP.
- **Partner requirements:** None for API — **client** uploads.
- **Risks:** Parser quality; manual ops load.

### Phase 2 — **Normalised data + basic dashboard**

- **Scope:** Parsed line items; **variance** v1; **founder-only** cockpit.
- **Dependencies:** Phase 1 + canonical schema.
- **Risks:** Wrong mapping → false alerts.

### Phase 3 — **Event-driven + CRM**

- **Scope:** Webhooks + CRM read + case status.
- **Dependencies:** Partner agreements.
- **Risks:** API drift; SLA.

### Phase 4 — **Multi-partner orchestration**

- **Scope:** Full §7 dashboard; governed income monitoring.
- **Dependencies:** Scale, compliance, support.
- **Risks:** Regulatory perception if language implies **management** without licence.

---

## 13. Founder / product / legal / partner decision list

1. **First partner type:** banks vs platforms vs CRM — **FOUNDER**.  
2. **CRM-first vs statement-first:** — **FOUNDER** (spec recommends **statement upload** first for actuals).  
3. **Dashboard:** founder-only vs adviser vs client — **FOUNDER**.  
4. **Trust/legal entities:** monitored only vs operational hub — **FOUNDER + counsel**.  
5. **Reporting layer only vs workflow owner** — **FOUNDER** (affects licensing narrative).  
6. **Consent model** — **counsel**.  
7. **Jurisdiction priorities** — **FOUNDER**.  
8. **Data retention** — **FOUNDER + counsel**.  
9. **Trade secret** — partner integration docs under `INTERNAL_DISCLOSURE_BOUNDARY.md`.  
10. **Execution:** **never** implied in product until **licensed** and **coded** — **FOUNDER**.

---

## 14. Risks and failure modes

| Risk | Mitigation (design) |
|------|---------------------|
| Partner data inconsistent | **Source-of-truth** tags; **never** overwrite partner raw with CB computed |
| Stale data | **As-of** timestamps; **SLA** display |
| Reconciliation errors | Human review queue; **materiality** |
| Over-reliance on uploads | Phase toward APIs |
| **Client thinks dashboard = custody** | **INTERNAL_COMMUNICATION_RULES.md**; always external custody |
| Conflicting numbers | **Label** partner vs model vs CB |
| Parser failures | **Exception** workflow + manual entry |
| PII / security | **Least privilege**, encryption, **counsel** |
| Exception fatigue | **Severity** tuning |
| **Regulatory misinterpretation** | **INTERNAL_REGULATORY_POSITIONING.md**; no “managed account” language without licence |

---

## 15. GPT use rule

When answering from this file:

1. Follow **`INTERNAL_GPT_OPERATING_SYSTEM.md`** truth order: **code and `INTERNAL_TRUTH_OVERRIDES.md` and other INTERNAL_* facts** before **B** architecture in this file.  
2. **Separate** **A** (today’s repo) vs **B** (this spec) — **never** imply live bank integrations, statement parsing, or reconciliation **unless** **A** or founder explicitly confirms shipping.  
3. **Default** to **`INTERNAL_INVESTMENT_AND_FLOW_SPEC.md`** for **custody** and **subscription**; **`INTERNAL_REGULATORY_POSITIONING.md`** for licence boundaries.  
4. **Orchestration / reporting** language describes **B**; **execution and custody remain external** per existing specs.  
5. **Point to** `Appendix A` for **existing** touchpoints to extend.  
6. **Decisions** — **§13** — flag **C**; do not present as implemented.  
7. **Never** describe Capital Bridge as **custodian** or **holder of client assets** in software — reporting and governance **visibility** only.

---

## 16. Appendix A — Existing repo touchpoints (extend, not replace)

| Area | Path / table / route |
|------|----------------------|
| Advisory persistence | `advisory_v2.advisory_reports`, `advisory_v2.advisory_sessions` |
| Advisory routes (server) | `packages/advisory-graph/src/server/advisoryRoutes.ts` (`handleAdvisoryReportGET` / `POST`) |
| Forever PDF / exports | `public.report_exports`; `apps/forever/app/api/forever/report-export/start/route.ts`, `apps/forever/app/api/forever/report-export/lion-config/route.ts`, `apps/forever/app/api/forever/report-pdf/[exportId]/route.ts` |
| Model run API | `apps/platform/app/api/model/run/route.ts` → `public.model_runs` |
| Model inputs/outputs (schema) | `public.model_inputs`, `public.model_outputs` |
| Shared facts API | `apps/platform/app/api/model/shared-facts/route.ts` → `public.model_shared_facts` |
| Strategic interest | `public.strategic_interest`; `apps/platform/app/api/strategic-interest/route.ts`; admin `apps/platform/app/api/admin/strategic-interest/route.ts` |
| Strategic briefing API | `apps/platform/app/api/admin/strategic-briefing/route.ts`; loader `apps/platform/lib/strategicBriefingLoad.ts` |
| Billing / Billplz | `apps/api/app/billing/billplz-webhook/route.ts`; tables `public.billing_sessions`, `public.payments`, `public.memberships`, `public.plans` |
| Markets / pricing | `packages/shared/src/markets.ts` (`MarketId`, `MARKET_PLAN_PRICES`, `getBillplzChargeAmountSen`) |
| Persona / entitlements | `packages/advisory-graph/src/platformAccess.ts` (incl. Strategic Execution tier notes) |
| Report audit / traceability | `packages/shared/src/reportTraceability.ts` |
| PDF narrative | `packages/pdf/src/buildPdfNarrative.ts` (references `strategic_interest` flag) |
| Login checkout copy | `apps/login/app/checkout/page.tsx`, `apps/login/app/payment-handoff/page.tsx` |
| Solutions / priority access | `apps/platform/app/solutions/page.tsx`, `apps/platform/app/solutions/PriorityAccessClient.tsx` |
| Platform dashboard tiles | `apps/platform/app/dashboard/components/DashboardTiles.tsx` |

---

## 17. Appendix B — Recommended canonical event types (FUTURE)

- `statement_uploaded`
- `statement_parsed`
- `statement_parse_failed`
- `cashflow_posted`
- `distribution_received`
- `distribution_missed`
- `loan_payment_due`
- `loan_payment_paid`
- `refinancing_case_opened`
- `refinancing_case_closed`
- `allocation_executed` (external — **metadata only** in CB)
- `income_below_target`
- `risk_drift_detected`
- `consent_granted`
- `consent_revoked`
- `partner_feed_stale`
- `reconciliation_exception_opened`
- `reconciliation_exception_resolved`

---

## 18. Appendix C — Open questions for institutional partners (draft)

Use as a **due diligence checklist** (**C** — refine with counsel before sending). Not exhaustive.

### Bank

- Which **accounts and facilities** can be covered (savings, OD, loan, LC)? In what **format** are statements delivered (PDF, MT940, proprietary API)?  
- Is **read-only API** access available? **OAuth** / corporate token model? **IP allowlisting**?  
- **Data accuracy** warranties and **error** handling; **liability** caps for feed mistakes.  
- **Retention** and **audit** rights for Capital Bridge as **data recipient** (not legal conclusion).  
- **Frequency** of balance/transaction updates; **intraday** vs **EOD**.

### Investment platform / investment house

- **Holdings** file: columns, instrument IDs (`ISIN`/internal), **as-of** rules.  
- **NAV** and **pricing** frequency; **corporate actions** (splits, mergers) delivery.  
- **Distribution** notices: timing vs payment date; **tax** withholding fields if any.  
- Whether **API** vs **SFTP** vs **portal export**; **sandbox** environment.

### Trustee

- **Trust account** reporting cycle; **distribution** approval workflow visibility (status only).  
- **Beneficiary** reporting boundaries — what identifiers are permitted on the feed.  
- **Document** types available (annual letter, tax letters) — **upload** vs **structured**.

### Insurer

- **Policy** export format; **cash value** update cadence; **premium** schedule and **lapse** status.  
- **Illustration** vs **in-force** data separation.

### RM / adviser CRM vendor

- **API scopes** (read vs write); **object model** (Contact, Account, Opportunity).  
- **Rate limits**, **webhooks** for stage change, **sandbox** refresh policy.  
- **Data ownership** and **subprocessor** list; **termination** export.

### General (all partner types)

- **BCP** / **DR**; **RTO** expectations for feeds.  
- **Change notification** for schema or field deprecation (notice period).  
- **Security**: **SOC2** / equivalent; **penetration** test summary availability under NDA.  
- **Audit** and **exam** support clauses (high-level — **counsel**).

---

## Summary (for founder)

| Item | Content |
|------|---------|
| **File created** | `INTERNAL_PARTNER_INTEGRATION_AND_REPORTING_SPEC.md` (repo root) |
| **What exists today** | Supabase auth/membership/billing; `advisory_v2` reports; `report_exports`; `strategic_interest`; `model_*` tables + platform APIs; **no** bank/CRM/statement/reconciliation pipelines; Strategic Execution **Coming Soon**. |
| **Recommended first phase** | **Phase 1:** statement upload + metadata + consent UX + **minimal** parser — **before** CRM APIs. |
| **Top founder decisions** | First partner type; statement-first vs CRM-first; dashboard audience; whether CB is **reporting-only** vs **workflow**; execution/custody stance. |
| **Top legal/counsel questions** | Consent; controller/processor; cross-border; retention; **partner DPAs**. |

---

**End of document.**  
*Do not commit or push unless explicitly requested.*
