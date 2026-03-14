# Vercel setup (monorepo)

All backend APIs run on the **login** app at `login.thecapitalbridge.com/api/*`. No frontend should call `api.thecapitalbridge.com`; this eliminates CORS and preflight failures.

Create **three** Vercel projects connected to this repo, each with a different **Root Directory**:

1. **login** project (auth, billing, and all APIs)
   - Root Directory: `apps/login`
   - Domain: `login.thecapitalbridge.com`
   - Env:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY` (for API routes and webhooks)
     - `BILLPLZ_API_KEY`
     - `BILLPLZ_COLLECTION_ID`
     - `BILLPLZ_CALLBACK_URL` = `https://login.thecapitalbridge.com/api/webhooks/billplz` (Billplz webhook)
     - `NEXT_PUBLIC_EXIT_LOGIN_URL` (optional) = `https://thecapitalbridge.com/advisory-platform/`
     - `NEXT_PUBLIC_MARKETING_SITE_URL` (optional) = `https://thecapitalbridge.com`
   - Payment: `POST /api/bill/create` (same-origin). Webhook: `POST /api/webhooks/billplz`.

2. **platform** project
   - Root Directory: `apps/platform`
   - Domain: `platform.thecapitalbridge.com`
   - Env:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_LOGIN_APP_URL` = `https://login.thecapitalbridge.com` (redirect for payment / login)

3. **api** project (optional / legacy)
   - Root Directory: `apps/api`
   - Domain: `api.thecapitalbridge.com`
   - Use only if you need the deprecated billing endpoints. Prefer login app APIs.

## DNS

For each subdomain, add a CNAME record to Vercel as prompted, typically:

- `login` → `cname.vercel-dns.com`
- `platform` → `cname.vercel-dns.com`
- `api` → `cname.vercel-dns.com` (if still used)

## Important

- **Same-origin APIs**: All payment and auth APIs are served from `login.thecapitalbridge.com/api/*`. No CORS configuration is required.
- **Session sharing**: Supabase auth cookies use domain `.thecapitalbridge.com` in production (`@cb/supabase/server`), so one login works across login, platform, and other CapitalBridge subdomains.
- **Billplz webhook**: Configure Billplz to send webhooks to `https://login.thecapitalbridge.com/api/webhooks/billplz`.

