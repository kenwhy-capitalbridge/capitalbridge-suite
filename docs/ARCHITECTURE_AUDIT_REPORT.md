# Architecture Audit Report — Capital Bridge Suite

**Date:** 2026-03-14  
**Scope:** Full monorepo audit; billing, Supabase, Vercel, and API routes.

---

## 1. Monorepo structure (Step 1)

### Applications

| App | Purpose | Required for billing |
|-----|---------|------------------------|
| **apps/api** | Billing API, Billplz webhook, request-bill (pending_bills) | **Yes** — single billing authority |
| **apps/login** | Auth UI, pricing, confirm-payment, proxy to API | **Yes** — proxy + session |
| apps/platform | Advisory dashboard; payment gate redirects to login | No |
| apps/capitalstress | CapitalStress tool | No |
| apps/capitalhealth | CapitalHealth tool | No |
| apps/incomeengineering | Income Engineering tool | No |
| apps/forever | Legacy planning tool | No |

**Duplicate apps:** platform, capitalstress, capitalhealth, incomeengineering, forever are **product apps**, not duplicates of api/login. They were not removed; only **api** and **login** are required for the billing flow. Other apps remain for product dashboards.

### Packages

- **packages/supabase** — Browser client, server client (cookies), service client (service role). Used by api and login.
- **packages/auth** — Session validation (login, platform).
- **packages/membership** — `hasActiveMembership` (login, platform).
- **packages/db-types** — Shared DB types.
- **packages/shared** — URLs, shared code.
- **packages/ui** — Stub.

No duplicate or accidental packages found.

---

## 2. Next.js application structure (Step 2)

- **apps/api:** Next.js App Router; routes under `app/billing/create`, `app/billing/billplz-webhook`, `app/billing/request-bill`. All export `POST` handlers. No `pages/api`.
- **apps/login:** Next.js App Router; API routes under `app/api/bill/create`, `app/api/webhooks/billplz`, `app/api/membership/status`, etc. All valid route handlers.

**`/api/bill/create`** (login): Now a **proxy** only — no billing logic; forwards to API with Bearer token.  
**`/billing/create`** (API): Single canonical implementation; compiles and returns structured JSON.

---

## 3. Billing architecture (Step 3) — FIXED

**Before:** Login app contained full billing logic: Supabase service client, Billplz call, membership insert, payment upsert. API had a deprecated duplicate.

**After:**

- **Login** does **not** call Billplz or use the service role for billing. It only:
  1. Reads session from cookies (`createAppServerClient().auth.getSession()`).
  2. Calls `API_APP_URL/billing/create` with `Authorization: Bearer <access_token>` and `{ plan }`.
  3. Returns the API response to the client.
- **API** owns all billing: plan lookup, trial limit, pending membership insert, Billplz bill creation, payment upsert. Uses `createServiceClient()` and `createBillplzBill()` only in the API app.

---

## 4. Resilient billing flow (Step 4) — IMPLEMENTED

1. **API** generates no separate “billing session”; the pending membership is the record.
2. **API** inserts a **pending membership** (user_id, plan_id, status = `pending`, `updated_at`) **before** calling Billplz.
3. **API** creates the Billplz bill and attaches the bill ID to the existing membership via the **payments** table (upsert on `membership_id`).
4. If Billplz fails temporarily, the membership record remains; the client receives a 502 and can retry; no orphan rows.
5. Payment URL is returned to the frontend; redirect is unchanged.

---

## 5. Billplz webhook (Step 5) — IDEMPOTENCY

- **API** webhook (`/billing/billplz-webhook`): If a payment row already has `status === "paid"`, returns `{ ok: true }` without re-applying updates. Membership update now sets `started_at` and `expires_at` in addition to `start_date`/`end_date`.
- **Login** webhook (`/api/webhooks/billplz`): Same pattern (already paid → return ok). No duplicate memberships created.
- **Recommendation:** Point Billplz callback to **API** (`https://api.thecapitalbridge.com/billing/billplz-webhook`) so one canonical webhook lives on the API.

---

## 6. Supabase security (Step 6)

- **Service role** (`SUPABASE_SERVICE_ROLE_KEY`): Used only in **API** (billing/create, billplz-webhook, request-bill) and, if webhook is on login, in **login** (webhooks/billplz). All usages are **server-side** (Node route handlers). Not used in browser or in login’s billing proxy.
- **Anon key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`): Used by server and browser clients for auth and RLS. No service key in client code.
- **Supabase client init:** `@cb/supabase` server/client/service split is correct; no init errors introduced.

---

## 7. Authentication propagation (Step 7)

- **Login → API:** Login server reads session via `createAppServerClient().auth.getSession()`, then sends `Authorization: Bearer <session.access_token>` to the API. API validates with `createServiceClient().auth.getUser(token)`. No cookies sent to the API; JWT is sufficient.
- **API** rejects requests without a valid Bearer token with 401 and a `detail` field.

---

## 8. Vercel deployment (Step 8)

- **apps/login** → Root Directory `apps/login`, domain `login.thecapitalbridge.com`.
- **apps/api** → Root Directory `apps/api`, domain `api.thecapitalbridge.com`.
- Both are Next.js; `next build` and API route compilation are standard. Framework preset Next.js and correct Root Directories are documented in VERCEL-SETUP.md.

---

## 9. Preview environments (Step 9)

- **Login** uses `API_APP_URL` or `NEXT_PUBLIC_API_BASE_URL` to call the API. For preview: set `API_APP_URL` (or `NEXT_PUBLIC_API_BASE_URL`) to the **API** preview URL for that branch so the proxy hits the right backend.
- **API** redirect URL is configurable via `BILLPLZ_REDIRECT_URL`; avoid hardcoding production only.
- **Local dev:** If `API_APP_URL` / `NEXT_PUBLIC_API_BASE_URL` are unset, login proxy defaults to `http://127.0.0.1:3002` in development so both apps can run locally.

---

## 10. API routes (Step 10)

| Route | App | Handler | Status |
|-------|-----|---------|--------|
| `POST /billing/create` | api | Valid; returns JSON | Repaired (error detail, updated_at, logging) |
| `POST /billing/billplz-webhook` | api | Valid; idempotent | Repaired (started_at/expires_at) |
| `POST /billing/request-bill` | api | Valid; CORS for login | No change |
| `POST /api/bill/create` | login | Proxy to API | Replaced (no billing logic) |
| `POST /api/webhooks/billplz` | login | Webhook | No change (optional) |
| `GET /api/membership/status` | login | Session + membership | No change |

**500 mitigation:** API `/billing/create` now returns `membership_create_failed` with a `detail` field (Supabase error message) and logs the error for debugging. Same pattern applied to Billplz and payment upsert errors.

---

## 11. Environment variables (Step 11)

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | login, api, platform, others | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | login, api, platform, others | Anon key (client + server auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | **api** (and login only if webhook on login) | Billing + webhook |
| `API_APP_URL` | **login** | Base URL for API (proxy target); server-only preferred |
| `NEXT_PUBLIC_API_BASE_URL` | login (optional) | Alternative to API_APP_URL |
| `BILLPLZ_API_KEY` | **api** (and login if webhook on login) | Billplz API |
| `BILLPLZ_COLLECTION_ID` | **api** (and login if webhook on login) | Billplz collection |
| `BILLPLZ_CALLBACK_URL` | **api** | Webhook URL (e.g. api.thecapitalbridge.com/billing/billplz-webhook) |
| `BILLPLZ_REDIRECT_URL` | api (optional) | Post-payment redirect (default platform dashboard) |

**Corrections:** Login no longer needs `SUPABASE_SERVICE_ROLE_KEY` or `BILLPLZ_*` for the main flow; only if Billplz callback is still set to login. API must have all BILLPLZ_* and SUPABASE_SERVICE_ROLE_KEY. VERCEL-SETUP.md updated accordingly.

---

## 12. Supabase server auth (Step 12)

- **Login proxy:** Uses `createAppServerClient()` (cookies) and `getSession()` to obtain the access token. No `getUser()` without cookies; session is read in a server route with access to the cookie store. No bug found.
- **API:** Uses only the Bearer token; no cookie access. Correct for a separate origin.

---

## 13. Error handling (Step 13)

- **API `/billing/create`:** Try/catch; 401/400/403/500/502 with `error` and optional `detail`. Logging for membership insert failure, Billplz failure, and payment upsert failure.
- **Login proxy:** Try/catch; forwards API status and body; logs proxy errors.
- **API webhook:** Returns 400 for missing bill ID; 404 when payment/pending not found; 500 on membership/user creation failure; 200 with `{ ok: true }` on success or already-paid (idempotent).

---

## 14. Final architecture (Step 14)

```
login.thecapitalbridge.com
  User logs in (Supabase auth, cookies)
  User selects plan → confirm-payment
  Frontend: POST /api/bill/create (same-origin, credentials: include)

  Login server:
    - Reads session from cookies
    - POST api.thecapitalbridge.com/billing/create
      Authorization: Bearer <access_token>
      Body: { plan: "trial" }

api.thecapitalbridge.com
  - Validates JWT
  - Fetches plan by slug
  - Inserts pending membership (or reuses existing)
  - Creates Billplz bill
  - Upserts payment (membership_id, billplz_bill_id, ...)
  - Returns { checkoutUrl }

  User completes payment on Billplz

  Billplz → POST api.thecapitalbridge.com/billing/billplz-webhook
  - Finds payment by billplz_bill_id
  - Updates payment status to paid
  - Updates membership status to active, started_at, expires_at
  - Idempotent for retries
```

---

## 15. Summary

- **Architecture:** Billing logic centralized in **API**; login only proxies with the user’s Bearer token. No billing or service role in the login app for the main flow.
- **Duplicate apps:** None removed; platform and tool apps remain for product use. Only api and login are required for billing.
- **API routes:** `/billing/create` and `/billing/billplz-webhook` repaired (error detail, updated_at, started_at/expires_at, logging). Login `/api/bill/create` replaced with a proxy.
- **Env:** Documented and scoped so API holds service role and Billplz keys; login holds API_APP_URL for the proxy.
- **Supabase:** Service role only in API (and login only if webhook is on login). No client-side service role.
- **Billing flow:** Pending membership created first; then Billplz; then payment record. Resilient and consistent.
- **Webhook:** Idempotent; single recommended endpoint on API.
- **Repo:** Ready for production with the above deployment and env configuration.
