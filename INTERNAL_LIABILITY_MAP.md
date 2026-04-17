# INTERNAL_LIABILITY_MAP.md

**Classification:** Internal — responsibility and exposure map. **Not legal advice.**

---

## 1. Document role

Clarifies **who owns** each part of the value chain **as implied by codebase** (Capital Bridge platform vs client vs third parties) and where **misunderstanding** creates commercial or legal pressure.

---

## 2. Responsibility matrix

Legend: **CB** = Capital Bridge (software platform as implemented). **3P** = bank / broker / custodian / trustee / fund manager / future partner.

| Topic | Capital Bridge | Client | 3P | Notes / gaps |
|-------|----------------|--------|-----|--------------|
| Onboarding & identity | Auth UI + Supabase; payment session | Provides email, payment, profile | Billplz as payment provider | Recovery flows in `docs/`, API routes |
| Payment (subscription) | Billing routes, webhooks | Pays invoice | Billplz settles | **Not** investment principal |
| Modelling | Calculator code, assumptions sliders | Enters numbers | — | Garbage-in affects outputs |
| Assumptions | Default presets in apps | Responsible for truthfulness | Adviser may assist (off-system) | |
| Recommendations (text) | Lion + narrative generators | Interprets | Licensed adviser if any | **Educational** framing in framework copy |
| Execution | **None in repo** | Via own broker | Broker executes | |
| Custody | **None in repo** | At bank/broker | Custodian | |
| Rebalancing | **None automated** | Manual | Adviser / manager | |
| Income generation (real) | **Not tracked** | Receives real income outside CB | Issuers | Models show **projections** |
| Reporting | PDFs, `advisory_reports`, exports | Consumes | — | |
| Redemptions (investment) | **N/A** | **N/A in platform** | Per real holding | Membership **expiry** ≠ fund exit |
| Tax | Not calculated comprehensively | Own obligation | — | Some sliders mention tax in places — not full tax engine |
| Legal suitability | Not in-repo suitability engine | Must seek professionals | Regulated adviser | |
| Portfolio performance | Not linked to live accounts | Actuals at custodian | — | |

---

## 3. Output nature clarification

| Output type | What it is **not** |
|-------------|-------------------|
| Simulation / scenario | **Not** a promise of future results |
| Advisory view (software) | **Not** regulated personal advice **unless** separately provided by licensed human |
| Lion narrative | **Not** a fiduciary mandate |
| Stress test | **Not** exhaustive of all risks |
| PDF | **Not** a fund factsheet or regulated disclosure document **by default** |

---

## 4. Liability pressure points

1. **Projected yield vs actual yield** — user may conflate sliders with **realised** returns.  
2. **Advisory vs execution** — CB software does not execute; **misstatement** in sales creates gap expectation.  
3. **Subscription fee vs investment capital** — see `INTERNAL_INVESTMENT_AND_FLOW_SPEC.md` §7.  
4. **Model as promise** — any claim that “the platform guarantees sustainability” is **false** vs code (hypothetical).  
5. **Third-party failure** — Billplz, Supabase, hosting outages — **operational** risk; terms of service govern (outside repo).  
6. **Multi-pipeline divergence (Health)** — internal inconsistency could confuse **support** if not using `INTERNAL_TRUTH_OVERRIDES.md`.

---

## 5. Recommended internal guardrails (GPT & staff)

- **Never** state Capital Bridge **holds** client investment assets **in product**.  
- **Always** separate **subscription** from **investable capital** in institutional answers.  
- **Qualify** projections with **assumptions** and **non-guarantee** language consistent with `advisoryFramework.ts`.  
- **Do not** imply **licensed** status without counsel-approved wording.  
- For **formula questions**, prefer **internal docs** over impromptu paraphrase that drifts from code.

---

## 6. Founder / legal gaps

- **Terms of service** and **limitation of liability** — not audited in this task.  
- **Professional indemnity** / **E&O** for software vs advice — business decision.  
- **Jurisdiction** of disputes.

---

**Cross-references:** `INTERNAL_DISCLOSURE_BOUNDARY.md`, `INTERNAL_REGULATORY_POSITIONING.md`, `INTERNAL_INVESTMENT_AND_FLOW_SPEC.md`.
