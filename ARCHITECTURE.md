# Capital Bridge Architecture

## Principle

- **login.thecapitalbridge.com** handles authentication, billing, and all APIs.
- All backend operations run through `login.thecapitalbridge.com/api/*`.
- No frontend application should call `api.thecapitalbridge.com`.
- Shared auth and membership validation across subdomains via root-domain cookies and shared packages.

## API Endpoints (login app)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/bill/create` | POST | Create Billplz bill (authenticated; session from cookies). Returns `{ checkoutUrl }`. |
| `/api/webhooks/billplz` | POST | Billplz webhook: update payment, activate membership, create user if payment-first. |
| `/api/membership-status` | GET | Returns `{ active: boolean }` for current user (session required). |
| `/api/membership/status` | GET | Returns `{ status, plan, expires_at, active }` for access control and middleware. |
| `/api/auth/session` | (Supabase handles session via cookies) | — |

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
- [ ] User is redirected to platform.thecapitalbridge.com/dashboard and has access

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
