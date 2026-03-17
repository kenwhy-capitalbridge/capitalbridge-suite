# Capital Bridge Architecture

## Principle

- **api.thecapitalbridge.com** is the single billing authority: creates pending membership, Billplz bill, and payment record. Uses `SUPABASE_SERVICE_ROLE_KEY` and `BILLPLZ_*` only on the API app.
- **login.thecapitalbridge.com** provides auth UI and a **proxy**: `POST /api/bill/create` reads session from cookies and forwards to `API_APP_URL/billing/create` with Bearer token. No billing logic or service role on login (except if webhook is still pointed at login).
- Shared auth and membership validation across subdomains via root-domain cookies and shared packages.

## Billing flow

1. User selects plan on login → confirm-payment page.
2. Frontend calls **login** `POST /api/bill/create` (same-origin, credentials included).
3. Login server gets session from cookies, calls **API** `POST /billing/create` with `Authorization: Bearer <access_token>` and `{ plan }`.
4. API validates JWT, creates pending membership, creates Billplz bill, upserts payment row, returns `{ checkoutUrl }`.
5. User is redirected to Billplz; after payment, Billplz calls **API** `/billing/billplz-webhook` (or login webhook if configured).
6. Webhook updates payment and membership; idempotent for retries.

## API Endpoints

### API app (api.thecapitalbridge.com)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/billing/create` | POST | Create pending membership + Billplz bill (Bearer token required). Returns `{ checkoutUrl }`. |
| `/billing/billplz-webhook` | POST | Billplz callback: update payment, activate membership. Idempotent. |
| `/billing/request-bill` | POST | Create bill without login (pending_bills flow); CORS for login origin. |

### Login app (login.thecapitalbridge.com)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/bill/create` | POST | **Proxy** to API `/billing/create` with session token. No billing logic. |
| `/api/webhooks/billplz` | POST | Billplz webhook (optional; prefer API webhook). |
| `/api/membership-status` | GET | Returns `{ active: boolean }` for current user. |
| `/api/membership/status` | GET | Returns `{ status, plan, expires_at, active }` for access control. |

## Verification checklist

After deploying, verify:

### Browser console
- [ ] No CORS errors when creating payment from login.thecapitalbridge.com
- [ ] No OPTIONS preflight failures

### Network
- [ ] `POST /api/bill/create` (on login origin) returns `{ checkoutUrl }`
- [ ] Pending bills / payments are created in Supabase as expected

### Billing flow
- [ ] User can select plan on login → confirm-payment → redirect to Billplz checkout
- [ ] After payment, webhook activates membership
- [ ] User is redirected to platform.thecapitalbridge.com and has access

### Authentication
- [ ] User logs in once on login.thecapitalbridge.com
- [ ] User is automatically authenticated on platform.thecapitalbridge.com (and other subdomains) via shared cookie domain

### Access control
- [ ] Users without a session are redirected to login when visiting platform / capitalstress / capitalhealth / incomeengineering / forever dashboard
- [ ] Users with session but no active membership see the payment gate or are redirected to login/pricing

### Monorepo deployment
- [ ] All applications deploy correctly from capitalbridge-suite on Vercel (each project: correct Root Directory, domain, env vars; see VERCEL_MONOREPO.md)

## Monorepo layout

- **apps/login** — Auth UI, pricing, signup, and all API routes (`/api/*`).
- **apps/platform** — Advisory dashboard; protected by middleware and membership check.
- **apps/capitalstress** — CapitalStress financial tool.
- **apps/capitalhealth** — CapitalHealth advisory tool.
- **apps/incomeengineering** — Income Engineering planning tool.
- **apps/forever** — Legacy planning tool.
- **packages/supabase** — Shared Supabase client (browser, server, service).
- **packages/auth** — Session validation utilities.
- **packages/membership** — Active-membership check utilities.
- **packages/ui** — Shared UI components (stub).
- **packages/shared** — URLs, plans, etc.

## Vercel monorepo deployment

Each app is a separate Vercel project with its own **Root Directory** and domain. See **VERCEL_MONOREPO.md** for step-by-step setup. Cursor does not configure Vercel projects directly; use the Vercel dashboard or CLI per that guide.
