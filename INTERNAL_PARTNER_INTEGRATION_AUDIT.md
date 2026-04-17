# INTERNAL_PARTNER_INTEGRATION_AUDIT.md

**Classification:** Internal only.  
**Scope:** Cross-check `INTERNAL_PARTNER_INTEGRATION_AND_REPORTING_SPEC.md` (hereafter **PARTNER_SPEC**) against selected internal docs. **Not legal advice.**

**Constraints honoured:** No runtime code changes; no commit; no push.

---

## 1. Executive summary

| Area | Verdict |
|------|---------|
| **Contradictions** | No **direct** factual contradiction with `INTERNAL_INVESTMENT_AND_FLOW_SPEC.md`, `INTERNAL_REGULATORY_POSITIONING.md`, `INTERNAL_LIABILITY_MAP.md`, `INTERNAL_GPT_OPERATING_SYSTEM.md`, or `INTERNAL_COMMUNICATION_RULES.md` **when PARTNER_SPEC is read as B (future design)** and existing docs as **A (today)**. |
| **Overstatement risk** | **Low** inside PARTNER_SPEC **if** A/B/C discipline holds. **Medium** if **short phrases** (e.g. “orchestration,” “plan updates,” “governance”) are reused in **client-facing** copy without `INTERNAL_COMMUNICATION_RULES.md` qualifiers — see §4. |
| **Missing founder decisions** | Several **material** gaps remain vs `INTERNAL_REGULATORY_POSITIONING.md` §8 and `INTERNAL_LIABILITY_MAP.md` §6; PARTNER_SPEC §13 does not fully subsume them — see §5. |
| **Missing canonical objects** | First-class **Partner / Institution**, **Integration connection**, **Case / milestone**, **Reconciliation run**, and **Audit event** are under-specified relative to PARTNER_SPEC’s own §11 event pipeline — see §6. |
| **Best Phase 1 candidate** | **Statement (or CSV) upload + immutable raw storage + metadata + manual mapping + minimal parse or none** — with **consent + ToS** workstreams before any **client-visible** “actuals” claims — see §7. |

---

## 2. Audit methodology

- Read **PARTNER_SPEC** in full.
- Compare claims to:
  - `INTERNAL_INVESTMENT_AND_FLOW_SPEC.md`
  - `INTERNAL_REGULATORY_POSITIONING.md`
  - `INTERNAL_LIABILITY_MAP.md`
  - `INTERNAL_GPT_OPERATING_SYSTEM.md`
  - `INTERNAL_COMMUNICATION_RULES.md`
- Classify issues as: **contradiction**, **tension** (needs careful wording), **gap** (missing decision or object), or **doc-hygiene** (cross-reference / hierarchy).

---

## 3. Contradiction and alignment check

### 3.1 `INTERNAL_INVESTMENT_AND_FLOW_SPEC.md`

| Topic | Investment & flow position | PARTNER_SPEC position | Assessment |
|-------|---------------------------|------------------------|------------|
| Subscription vs investment capital | Subscription is **software access**; Billplz → `memberships` / `payments`; **not** investment principal | §2.1–2.2 repeats **A**; billing webhooks ≠ partner bank feeds | **Aligned** |
| Custody / execution | **None in repo**; assets at client’s bank/broker | §2.6 absent capabilities; §3.2 custody **external**; §15 GPT rule | **Aligned** |
| Real investment income | **Not tracked** in platform ledgers **today** | Future **B** cashflow events / statements — explicitly **not A** | **Aligned** (time-separation: today vs future) |
| Strategic Execution | **Coming Soon**; not deployed as execution | §2.4–2.5 **A** citations | **Aligned** |
| Future capital markets / partner models | **B/C** table in Investment & flow §2.B | PARTNER_SPEC §4–5 is **B** roadmap | **Aligned** if labelled roadmap |

**Tension (not contradiction):** Investment & flow §2.B lists **possible** future institutional shapes (SMA, fund, etc.). PARTNER_SPEC assumes a **reporting/orchestration overlay**. Those futures are **mutually compatible** but **not** uniquely determined — **C** which business model wins.

### 3.2 `INTERNAL_REGULATORY_POSITIONING.md`

| Topic | Regulatory doc | PARTNER_SPEC | Assessment |
|-------|------------------|--------------|------------|
| Present-state regulated roles | **Not** fund, custodian, broker, DPM, OMS in-repo | §2.6 denies custody/OMS; §14 regulatory misinterpretation | **Aligned** |
| Strategic Execution | **Not** implemented as execution | §2.4–2.5 | **Aligned** |
| Future triggers (§5) | Assisted execution, discretion, pooled funds, nominee, SMA, custody handling… | PARTNER_SPEC §3.1 “orchestration” and §4 “rebalance suggestions… unless licensed workflow” **acknowledge** licence boundary | **Aligned** if future features stay **non-discretionary** and **non-custodial** — **C** per feature |
| Counsel gaps (§8) | Entity map, licences, marketing, SE partner model, PDPA/GDPR-style data | PARTNER_SPEC §10–11, §13 overlap but **do not replace** §8 list | **Gap** — see §5 |

**Tension:** `INTERNAL_REGULATORY_POSITIONING.md` §5 flags **“rebalancing authority”** as a typical trigger. PARTNER_SPEC §4 mentions **“rebalance suggestions.”** That is **not** inherently contradictory (suggestions ≠ authority), but **client-facing** wording can slide into **personal recommendation** or **dealing** territory in some jurisdictions — **counsel +** `INTERNAL_COMMUNICATION_RULES.md` §3 “Advisory” / §4 restricted phrases.

### 3.3 `INTERNAL_LIABILITY_MAP.md`

| Topic | Liability map | PARTNER_SPEC | Assessment |
|-------|-----------------|--------------|------------|
| Execution / custody | **None in repo**; client / 3P | §2.6, §3.2 | **Aligned** |
| Projected vs actual yield | **Pressure point** §4.1 | §9 variance engine explicitly compares **expected vs actual** — **increases** this pressure **when shipped** | **Not a contradiction** — it is an **intended future product risk** that **must** inherit LIABILITY_MAP guardrails |
| Third-party failure | Billplz, Supabase, hosting | PARTNER_SPEC adds **partner feed errors**, **parser failure**, **stale data** — same class of risk | **Extends** the matrix; LIABILITY_MAP does not yet enumerate partner-data rows |

**Tension:** LIABILITY_MAP §5 says **qualify** projections. A future dashboard that shows **“actual”** income must **not** imply the **model** was wrong **or** that **CB guarantees** alignment — needs explicit **labelling** (PARTNER_SPEC §8.9 three layers helps; comms must mirror).

### 3.4 `INTERNAL_GPT_OPERATING_SYSTEM.md`

| Topic | GPT OS | PARTNER_SPEC | Assessment |
|-------|--------|--------------|------------|
| Truth order | Code → OVERRIDES → FULL_SYSTEM → other INTERNAL_* | §15 defers to GPT OS; labels PARTNER content as **B** | **Aligned** |
| “No custody, no execution, no fund in-repo” | §1 principle 3 | PARTNER_SPEC does not assert these exist **today** | **Aligned** |
| Document list (reference set) | Table in GPT OS § intro — **PARTNER_SPEC not listed** | PARTNER_SPEC is **new** | **Doc-hygiene gap** — GPT OS should eventually **add** PARTNER_SPEC for **I-INST** / roadmap questions, with **explicit subordination** to truth order (not a “contradiction”) |
| Question routing **I-INST** | Points to Investment + Regulatory + LIABILITY | PARTNER_SPEC is **additional** material for **partner integration roadmap** | **Complementary** |

**Tension:** GPT OS §3 hierarchy does not place PARTNER_SPEC. Until updated, answers must **not** treat PARTNER_SPEC as overriding **A** facts from code or **INTERNAL_TRUTH_OVERRIDES.md** — PARTNER_SPEC §15 is correct; **maintainers** should add one line to GPT OS **Maintenance** when partner roadmap stabilises.

### 3.5 `INTERNAL_COMMUNICATION_RULES.md`

| Topic | Communication rules | PARTNER_SPEC | Assessment |
|-------|---------------------|--------------|------------|
| Custody / execution | Restricted phrases; “not in platform” | §15; §3.2 | **Aligned** |
| Strategic Execution | Must qualify **Coming soon** | §2.4–2.5 | **Aligned** |
| “Advisory” | Software/educational unless licensed human | PARTNER_SPEC uses “adviser” as **reviewer_role** in variance — **internal ops role**, not claiming CB is licensed adviser | **Mostly aligned** — **watch** export to client UI |
| Terminology | “Execution” = not in platform | PARTNER_SPEC uses **“orchestration”** — **not** in comm rules glossary | **Tension** — see §4 |

---

## 4. Overstatement risk (custody, execution, live integrations, regulated activity)

### 4.1 Custody

| Risk | Assessment |
|------|--------------|
| PARTNER_SPEC implies CB holds assets | **Mitigated:** §3.2, §15.7, §2.6 explicit **no** custody ledger. |
| “Statements vault” implies CB is **document custodian** for **securities** | **Semantic risk:** vault = **file storage**, not **asset custody** — external copy should say **“document storage for reporting”** not **“we hold your assets.”** |

### 4.2 Execution

| Risk | Assessment |
|------|--------------|
| “Orchestration layer” | In **internal** architecture, used as **visibility / coordination** — **not** order routing. **Risk** if quoted externally without definition — sounds like **workflow execution**. Prefer **“reporting and monitoring layer”** for **external** audiences unless counsel approves “orchestration.” |
| §3.1 optional future execution | Marked **FOUNDER DECISION** — **not** overstating current product. |
| §4 “rebalance suggestions” | Could be read as **dealing** or **personal recommendation** — **regulated activity risk** depends on jurisdiction and presentation — **C**; align with `INTERNAL_REGULATORY_POSITIONING.md` §5. |

### 4.3 Live integrations

| Risk | Assessment |
|------|--------------|
| Implies banks are connected **today** | **Mitigated** by §2.6, §11.2 Billplz clarification, **A/B/C** table. |
| Billplz vs partner webhooks | **Well disambiguated** in §11.2 — **low** confusion risk if GPT follows §15. |

### 4.4 Regulated activity (software framing)

| Risk | Assessment |
|------|--------------|
| Dashboard as **portfolio management** | §7 labelled **FUTURE**; §14 calls out regulatory misinterpretation — **good**. |
| **Variance alerts** to clients | Could be framed as **advice** — **C**; LIABILITY_MAP §4.1 (yield confusion) **amplifies** once actuals exist. |
| Data processing (PDPA/GDPR-style) | REGULATORY §8.5; PARTNER_SPEC §10 — **aligned**; **not** a substitute for counsel. |

---

## 5. Missing founder decisions (beyond PARTNER_SPEC §13)

The following appear in **`INTERNAL_REGULATORY_POSITIONING.md` §8** or **`INTERNAL_LIABILITY_MAP.md` §6** but are **absent or thin** in PARTNER_SPEC §13. They should be **tracked** in product/legal backlog when partner reporting proceeds.

1. **Legal entity map** and **which entity** contracts with partners and **holds** DPAs (REGULATORY §8.1).  
2. **Whether** any **existing licence** (exempt or full) applies to **data-only** or **adviser-facing** reporting surfaces — **counsel** (REGULATORY §8.2, §7).  
3. **Financial promotion / marketing** rules per target country once **actual performance** or **partner-backed** narratives appear (REGULATORY §8.3).  
4. **Strategic Execution** — **who** holds **capital markets** licence for partner-mediated activities; PARTNER_SPEC §13 item 4 touches **trust/legal** monitoring but not **SE** specifically (REGULATORY §8.4).  
5. **PDPA / GDPR-style** obligations for **financial statement** PII — cross-border (REGULATORY §8.5; PARTNER_SPEC §10 partial).  
6. **Terms of service** and **limitation of liability** for **partner data errors** and **parser mistakes** (LIABILITY §6.1).  
7. **E&O / PI** coverage for **new** reporting surfaces (LIABILITY §6.2).  
8. **Dispute resolution:** when **model** conflicts with **partner statement**, **which** is “for discussion only” vs **operational** truth — product policy (**C**).  
9. **Adviser-facing** dashboard: does it trigger **suitability** / **advice** rules if **recommendations** are implied (REGULATORY §5 + **C**).  
10. **Minimum viable consent**: **clickwrap** vs **wet signature** for **fetch** vs **upload** — **C** (PARTNER_SPEC §10 high-level only).

---

## 6. Missing canonical data objects (relative to PARTNER_SPEC’s own architecture)

PARTNER_SPEC §6 covers **Client/Household**, **Capital structure snapshot**, **Plan snapshot**, **Position**, **Cash flow event**, **Statement/document**, **Alert**. For **implementation coherence** with §5, §8–9, and §11, consider **explicit** first-class objects (names illustrative):

| Object | Why it is missing or implicit | Use |
|--------|-------------------------------|-----|
| **Partner organization** | `partner_source_id` / `institution_id` appear as fields but not a defined **org** record (legal name, country, type, support contacts) | Permissions, DPAs, mapper selection |
| **Integration connection** | §11 adapters assume credentials, health, scope — not consolidated | Rate limits, **feed_stale**, rotation, **least privilege** |
| **Case / milestone** (implementation pipeline) | §5 Phase 3 CRM; §9.1 “partner case delays” — no §6 object | CRM sync and **SLA** variance without overloading **Alert** |
| **Consent record** (standalone) | Embedded in §6.1 `consent_records` — acceptable if schema treats as **sub-resource** with audit | Revocation, **scope** proofs |
| **Reconciliation run / variance snapshot** | §9 defines **framework**; no persisted **run id**, **inputs hash**, **outputs** | Reproducibility, audit, **INTERNAL_TRUTH_OVERRIDES**-style traceability for **actuals** |
| **Audit log entry** | §11 “append-only audit”; §8.7 manual override — not a §6 entity | Security, **counsel** exams |
| **Data quality / lineage** | `source_of_truth_tag` exists; **full lineage** (parser version + rule version) spread across §6.6–8 | Debugging conflicting numbers (LIABILITY §4.1) |

**Note:** Absence from PARTNER_SPEC is a **design completeness** issue, not a **contradiction** with other INTERNAL_* docs.

---

## 7. Best Phase 1 build candidate

**Recommendation (internal planning):** The **lowest-integration-risk** path that still advances “plan vs reality” is **aligned** with PARTNER_SPEC §12 Phase 1:

| Element | Rationale |
|---------|-----------|
| **Manual upload** (PDF/CSV) of **bank/broker/trustee** statements **by client or ops** | No partner API, no **live integration** claim; matches §11 Level **0–1** for **portfolio data** |
| **Immutable raw object storage** + checksum + **metadata** (period, institution label, account mask) | Establishes **evidence layer** (§8.9 layer 1) without trusting parsers |
| **Consent + ToS** track **before** marketing “we see your actuals” | REGULATORY + LIABILITY |
| **Parser optional or minimal** (e.g. **totals only** + manual entry) | Reduces **false precision** and LIABILITY_MAP §4.1 confusion |
| **Link to existing `advisory_v2.advisory_reports`** as **expected** side | **A** today; no new model math |
| **Founder-only** review UI before any **client-facing** “variance” | COMMUNICATION_RULES + REGULATORY perception risk |

**Defer:** CRM API sync (PARTNER_SPEC §5 Phase **3**), webhooks, **near-real-time** feeds — higher **partner** and **regulatory** surface area.

**Explicit non-goals for Phase 1:** Custody, execution, **authoritative** NAV, **automated** rebalancing, **regulated** advice.

---

## 8. Doc-hygiene recommendations (non-blocking)

1. **`INTERNAL_GPT_OPERATING_SYSTEM.md`:** Add `INTERNAL_PARTNER_INTEGRATION_AND_REPORTING_SPEC.md` to the **reference set** table with role: *“Future partner integration / reporting cockpit — **B**; subordinate to code and OVERRIDES.”*  
2. **`INTERNAL_LIABILITY_MAP.md`:** Future revision could add rows for **partner feed accuracy**, **parser error**, **dashboard misread** — **optional**.  
3. **`INTERNAL_COMMUNICATION_RULES.md`:** When partner reporting ships, add **§** on **“actuals vs model”** and **approved** phrasing for **orchestration** / **reporting layer**.

---

## 9. Audit conclusion

- **PARTNER_SPEC** is **consistent** with the **institutional facts** in `INTERNAL_INVESTMENT_AND_FLOW_SPEC.md` and **`INTERNAL_REGULATORY_POSITIONING.md`** **provided** A/B/C labelling is preserved in GPT and product copy.  
- **Primary risks** are **communications** (orchestration / suggestions / actuals) and **future liability** from **yield confusion** — already flagged in LIABILITY_MAP and partially mitigated in PARTNER_SPEC §8–9.  
- **No runtime code** was modified; **no commit**; **no push**.

---

**End of INTERNAL_PARTNER_INTEGRATION_AUDIT.md**
