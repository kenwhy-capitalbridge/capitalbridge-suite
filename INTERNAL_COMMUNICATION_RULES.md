# INTERNAL_COMMUNICATION_RULES.md

**Classification:** Internal — tone and wording for founder GPT and institutional-facing prep.  
**Align with:** `INTERNAL_DISCLOSURE_BOUNDARY.md`, `INTERNAL_INVESTMENT_AND_FLOW_SPEC.md`.

---

## 1. Document role

Keeps explanations **precise**, **non-promotional**, and **legally sober** — avoiding accidental claims of custody, guaranteed returns, or regulated advice **not supported by repo**.

---

## 2. Allowed language (current-state)

- “**Subscription** gives access to Capital Bridge **planning tools** and **reports** for the membership period.”
- “**Models simulate** outcomes using **your inputs** and **stated assumptions**.”
- “Outputs are **illustrative** and **not** a guarantee of future results.”
- “Discuss results with a **qualified financial adviser**.” (Matches `advisoryFramework.ts` intent.)
- “**Billplz** processes **membership** payment; the platform does **not** take **investment capital** into a pooled fund **in this software**.”
- “**Lion’s Verdict** is a **narrative layer** on model outputs — not a managed portfolio mandate.”

---

## 3. Use-with-care language (qualify every time)

| Phrase | Required qualifier |
|--------|-------------------|
| “Advisory” | Specify **software / educational** unless referring to a **named licensed human**. |
| “Sustainable” | **Under the assumptions you entered**; not a life guarantee. |
| “Resilience score” | **Model output** from simulations; **stochastic** where applicable. |
| “Coverage” | Define **numerator/denominator** (Income Eng. vs Health differ). |
| “Redemption” | Clarify **membership** vs **investment** exit. |
| “Strategic Execution” | **Coming soon** — not live execution in repo. |

---

## 4. Restricted / avoid language (casual misuse)

- “**We invest your money**” — **false** in codebase.  
- “**Guaranteed income**” — **false**.  
- “**Our fund**” — **no fund in repo**.  
- “**We execute trades**” — **false**.  
- “**Custody** with Capital Bridge — **false** for investment assets.  
- “**Regulated as a fund manager**” — **not evidenced in code**; **counsel only**.  
- “**Official portfolio allocation**” — models are **user-parameterised**, not firm mandate.

---

## 5. Mandatory clarifiers (by topic)

| Topic | Include |
|-------|---------|
| Current product | Software + subscription; **not** a bank or fund. |
| Investments | Client’s **external** assets — numbers are **inputs** to calculators. |
| Subscriptions | **Fee for access**; separate from **investable wealth**. |
| Redemptions | **Membership renewal/expiry**; not **securities** redemption. |
| Advisory outputs | **Scenarios and narratives**; **not** personalised regulated advice **from software alone**. |
| Institutional conversations | Offer **`INTERNAL_INVESTMENT_AND_FLOW_SPEC.md`** facts; **defer** licensing labels to counsel. |

---

## 6. Terminology standardisation (internal preferred)

| Term | Preferred internal definition |
|------|-------------------------------|
| Model | One of four **calculator apps** (Forever, Income Eng., Health, Stress). |
| Framework | **Capital Bridge Advisory Framework** — three-pillar **journey** copy (`advisoryFramework.ts`). |
| Subscription | **Plan** paid via **Billplz** → **membership** row. |
| Investment capital | **Not** on-platform ledger — **user-entered** or external. |
| Advisory output | **Report JSON, PDF, Lion text** — software-generated. |
| Simulation | **Deterministic or MC** path per app rules. |
| Scenario | User-changed inputs or stress presets. |
| Sustainability | **Model-specific** (Forever real return; IE coverage; Health status). |
| Resilience | **Stress** `capitalResilienceScore` + bands. |
| Fragility | **Stress** — Policy B pill **and/or** `computeFragility` (see alignment doc). |
| Coverage | **IE:** monthly income/expense ratio; **Health:** sustainable/target (headline overlay). |
| Recommendation | **Text blocks** (Lion, priorities) — **not** orders. |
| Execution | **Not in platform** — client/broker. |
| Custody | **Not in platform** for securities. |
| Redemption | **Membership** end or **external** asset sale — clarify which. |

---

## 7. Tone rules

- **Precise** — name the **app** and **metric** when comparing.  
- **Sober** — no superlatives on returns.  
- **Non-promotional** — no “you will be rich.”  
- **Institution-ready** — separate **fact (code)** from **intent (roadmap)**.  
- **No overclaiming** — if unsure, cite **`INTERNAL_REGULATORY_POSITIONING.md`** and **counsel**.

---

## 8. Phrase rewrites (say this / not that)

| Don’t say | Say instead |
|-----------|-------------|
| “We manage your portfolio.” | “The **software** helps you **model** scenarios; **management** happens **outside** the platform.” |
| “Your returns are 8%.” | “You **assumed** 8%; the **illustration** shows…” |
| “Subscribe to invest.” | “**Subscribe** for **access** to **tools**; **investing** happens **elsewhere**.” |
| “Withdraw from Capital Bridge.” | “**Cancel or renew membership**; **investment withdrawals** are **only** in your **bank/broker**.” |
| “The Lion says buy/sell.” | “Lion provides **narrative guidance** based on **model outputs** — **not** a trade instruction.” |
| “Redeem your units.” | “There are **no units** in this software; **membership** **expires** per **plan**.” |

---

## 9. GPT use rule

Default to **§2–§8** for any **user-facing** or **institutional** summary. For **full technical truth**, use **`INTERNAL_TRUTH_OVERRIDES.md`** + **`INTERNAL_FORMULA_INDEX.md`** without applying §4’s restrictions **only when** audience is founder-internal.

---

**Review cadence:** Update when product copy changes (e.g. Strategic Execution launch).
