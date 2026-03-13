# Vercel setup (monorepo)

Create **three** Vercel projects connected to this repo, each with a different **Root Directory**:

1. **login** project
   - Root Directory: `apps/login`
   - Domain: `login.thecapitalbridge.com`
   - Env:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_API_APP_URL` = `https://api.thecapitalbridge.com` (for payment flow)
     - `NEXT_PUBLIC_EXIT_LOGIN_URL` (optional) = `https://thecapitalbridge.com/advisory-platform/`
     - `NEXT_PUBLIC_MARKETING_SITE_URL` (optional) = `https://thecapitalbridge.com`

2. **platform** project
   - Root Directory: `apps/platform`
   - Domain: `platform.thecapitalbridge.com`
   - Env:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_API_APP_URL` = `https://api.thecapitalbridge.com`
     - `NEXT_PUBLIC_LOGIN_APP_URL` = `https://login.thecapitalbridge.com`

3. **api** project
   - Root Directory: `apps/api`
   - Domain: `api.thecapitalbridge.com`
   - Env:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `BILLPLZ_API_KEY`
     - `BILLPLZ_COLLECTION_ID`
     - `BILLPLZ_CALLBACK_URL` (optional)

## DNS

For each subdomain, add a CNAME record to Vercel as prompted, typically:

- `login` → `cname.vercel-dns.com`
- `platform` → `cname.vercel-dns.com`
- `api` → `cname.vercel-dns.com`

## Important

- Supabase auth cookie sharing depends on cookie **domain** `.thecapitalbridge.com` in production (implemented in `@cb/supabase/server`).
- Middleware is pass-through only; auth happens in server components / route handlers.

