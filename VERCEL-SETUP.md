# Vercel setup (monorepo)

**Billing architecture:** The **API** app is the single billing authority. The **login** app does not call Billplz or write to Supabase with the service role; it proxies payment creation to the API with the user's Bearer token.

Create **three** Vercel projects connected to this repo, each with a different **Root Directory**:

1. **login** project (auth UI + same-origin proxy to API)
   - Root Directory: `apps/login`
   - Domain: `login.thecapitalbridge.com`
   - Env:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY` (required for server routes: payment return recovery, webhooks, etc.)
     - `PAYMENT_RECOVERY_JWT_SECRET` (min 32 chars) — HMAC secret for short-lived **payment email recovery** tokens (`/api/billing/recovery-token` → `/api/billing/recover-correct-email`). Rotate if leaked.
     - `NEXT_PUBLIC_LOGIN_APP_URL` or `LOGIN_APP_URL` = canonical login origin (e.g. `https://login.thecapitalbridge.com`) — **production** recovery endpoints reject `Origin`/`Referer` that don’t match (CSRF-style protection).
     - `API_APP_URL` = `https://api.thecapitalbridge.com` (used by login server to call API; use preview URL for preview deployments)
     - `NEXT_PUBLIC_EXIT_LOGIN_URL` (optional) = `https://thecapitalbridge.com/advisory-platform/`
     - `NEXT_PUBLIC_MARKETING_SITE_URL` (optional) = `https://thecapitalbridge.com`
   - **No** `BILLPLZ_*` on login for normal checkout; Billplz lives on the API. Service role is still needed for selected login server routes (recovery, optional webhooks).
   - Payment flow: Browser → `POST /api/bill/create` (same-origin) → login server forwards to `API_APP_URL/billing/create` with Bearer token → API creates membership + Billplz bill.

2. **api** project (billing + webhook)
   - Root Directory: `apps/api`
   - Domain: `api.thecapitalbridge.com`
   - Env:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `BILLPLZ_API_KEY`
     - `BILLPLZ_COLLECTION_ID`
     - `BILLPLZ_CALLBACK_URL` = `https://api.thecapitalbridge.com/billing/billplz-webhook` (recommended)
     - `BILLPLZ_REDIRECT_URL` (optional) = `https://platform.thecapitalbridge.com`
     - `BILLING_ADMIN_RECOVERY_SECRET` (min 32 chars) — **support-only** bearer for `POST /billing/admin/recover-email` (wrong-email recovery when the user cannot self-serve). Store in a password manager; rotate if leaked. Requires DB migration `admin_billing_email_recoveries`.
     - `LOGIN_APP_URL` or `NEXT_PUBLIC_LOGIN_APP_URL` — used for password-setup email redirect (same as other billing emails).
   - Endpoints: `POST /billing/create` (Bearer token), `POST /billing/billplz-webhook` (Billplz callback), `POST /billing/admin/recover-email` (admin bearer, see `docs/ADMIN_BILLING_EMAIL_RECOVERY.md`).

3. **platform** project
   - Root Directory: `apps/platform`
   - Domain: `platform.thecapitalbridge.com`
   - Env:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_LOGIN_APP_URL` = `https://login.thecapitalbridge.com` (redirect for payment / login)

## DNS

For each subdomain, add a CNAME record to Vercel as prompted:

- `login` → `cname.vercel-dns.com`
- `api` → `cname.vercel-dns.com`
- `platform` → `cname.vercel-dns.com`

## Preview deployments

- **Login**: Set `API_APP_URL` (or `NEXT_PUBLIC_API_BASE_URL`) to the **API** preview URL for that branch (e.g. `https://capitalbridge-api-xxx.vercel.app`) so the proxy reaches the correct API.
- **API**: Ensure `BILLPLZ_CALLBACK_URL` for production points to the **production** API webhook URL; for testing you can use a tunnel (e.g. ngrok) to your API webhook.

## Important

- **Billing**: All billing logic runs in **API**. Login only proxies with the user's token. Service role and Billplz keys exist only on the API project.
- **Session**: Supabase auth cookies use domain `.thecapitalbridge.com` in production, so one login works across login, platform, and other subdomains.
- **Webhook**: Prefer `https://api.thecapitalbridge.com/billing/billplz-webhook`. If you keep using `https://login.thecapitalbridge.com/api/webhooks/billplz`, add `SUPABASE_SERVICE_ROLE_KEY` and `BILLPLZ_*` to the login project as well.

