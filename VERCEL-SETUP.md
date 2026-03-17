# Vercel setup (monorepo)

**Billing architecture:** The **API** app is the single billing authority. The **login** app does not call Billplz or write to Supabase with the service role; it proxies payment creation to the API with the user's Bearer token.

Create **three** Vercel projects connected to this repo, each with a different **Root Directory**:

1. **login** project (auth UI + same-origin proxy to API)
   - Root Directory: `apps/login`
   - Domain: `login.thecapitalbridge.com`
   - Env:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `API_APP_URL` = `https://api.thecapitalbridge.com` (used by login server to call API; use preview URL for preview deployments)
     - `NEXT_PUBLIC_EXIT_LOGIN_URL` (optional) = `https://thecapitalbridge.com/advisory-platform/`
     - `NEXT_PUBLIC_MARKETING_SITE_URL` (optional) = `https://thecapitalbridge.com`
   - **No** `SUPABASE_SERVICE_ROLE_KEY` or `BILLPLZ_*` on login; billing is done by the API.
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
   - Endpoints: `POST /billing/create` (Bearer token), `POST /billing/billplz-webhook` (Billplz callback).

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

