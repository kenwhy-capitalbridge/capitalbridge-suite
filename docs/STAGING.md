# Staging environment (Capital Bridge)

This monorepo supports a **dedicated staging deployment** without forking code. Production behaviour is unchanged unless the HTTP host is exactly the staging hostname (default: `staging.thecapitalbridge.com`).

## What was implemented

1. **Host detection** (`@cb/shared/staging`)  
   - `isStagingCapitalBridgeHost(host)` is true only for `staging.thecapitalbridge.com` (override with `NEXT_PUBLIC_CB_STAGING_HOSTNAME` for local tests).

2. **Staging access gate** (`apps/platform` only)  
   - Edge middleware runs first on every request. On the staging host, requests must present a signed **httpOnly** cookie (`cb_staging_gate`), except for exempt paths (`/_next/*`, `/staging-access`, `/api/staging-gate/*`, common static extensions).  
   - Password is checked only on the server via `POST /api/staging-gate/login` (body: `{ "password": "…" } }`).  
   - **Logout / clear access:** `GET /api/staging-gate/logout` clears the cookie. The top ribbon also links here.

3. **Staging ribbon**  
   - Server-rendered in `apps/platform/app/layout.tsx` when the host matches staging. Not shown on `platform.thecapitalbridge.com` or any other production host.

4. **Auth cookie scope** (`@cb/supabase`)  
   - Set `NEXT_PUBLIC_CB_AUTH_COOKIE_SCOPE=host` on staging so Supabase auth cookies are **host-only** (not `Domain=.thecapitalbridge.com`). This prevents staging sessions from being visible on other subdomains and is the recommended default for `staging.thecapitalbridge.com` unless you deliberately use a separate Supabase project and still want suite-wide cookies.

5. **URL hygiene**  
   - Forever login redirects use `foreverDashboardUrl()` from `@cb/shared/urls` (respects `NEXT_PUBLIC_FOREVER_APP_URL`).

## Vercel (separate staging project)

Create a **second Vercel project** (e.g. `capitalbridge-platform-staging`) pointing at this repo:

| Setting | Value |
|--------|--------|
| **Branch** | `staging` (or your preferred branch) |
| **Root Directory** | `apps/platform` |
| **Install command** | `cd ../.. && npm install` (matches `apps/platform/vercel.json`) |
| **Build command** | `npm run build` (from `apps/platform`; default in vercel.json) |

**Custom domain:** `staging.thecapitalbridge.com` → assign to this staging project only (not the production platform project).

### Required environment variables (staging platform)

| Variable | Purpose |
|----------|---------|
| `STAGING_GATE_PASSWORD` | Password for `/staging-access` (required on staging host; missing → HTTP 503 text) |
| `NEXT_PUBLIC_CB_AUTH_COOKIE_SCOPE` | Set to `host` for isolated cookies on the staging hostname |
| `NEXT_PUBLIC_SUPABASE_URL` | Prefer a **staging** Supabase project URL, not production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging project anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service role (only if platform server routes need it) |
| `NEXT_PUBLIC_LOGIN_APP_URL` | Usually `https://login.thecapitalbridge.com` **or** a dedicated staging login URL if you add one |
| `NEXT_PUBLIC_PLATFORM_APP_URL` | `https://staging.thecapitalbridge.com` |
| `NEXT_PUBLIC_API_APP_URL` / `NEXT_PUBLIC_API_BASE_URL` | Point to a **staging API** host if you have one; otherwise keep production API only if you accept that risk (not recommended for write paths) |

Optional:

| Variable | Purpose |
|----------|---------|
| `STAGING_GATE_SIGNING_SECRET` | Separate secret for HMAC signing the staging cookie (defaults to `STAGING_GATE_PASSWORD`) |
| `NEXT_PUBLIC_CB_STAGING_HOSTNAME` | Override detected staging hostname |
| All `NEXT_PUBLIC_*_APP_URL` for model apps | Set to preview URLs or future `*.staging` hosts so tiles and redirects never send users to production models by mistake |

Production platform project: **do not** set `STAGING_GATE_PASSWORD` unless you intentionally want the gate on another host (it only activates when the request host matches the staging hostname).

## Cloudflare

1. **DNS:** `CNAME` (or `A`/`AAAA` per Vercel docs) for `staging` → your Vercel staging project.  
2. **SSL:** Full (strict) recommended.  
3. **No** Page Rule required for the password gate — the app handles it.  
4. Optional: IP allowlist / Cloudflare Access in front of staging if you want defense in depth (not implemented in-repo).

## Supabase (and other OAuth / magic-link providers)

1. **Separate project** for staging is strongly recommended so anon/service keys never touch production data.  
2. **Authentication → URL configuration:** add to **Redirect URLs** (and Site URL if you use it for email links):  
   - `https://staging.thecapitalbridge.com/**`  
   - `https://staging.thecapitalbridge.com/api/*` if your flow requires explicit API callbacks  
3. If users sign in via **production** `login.thecapitalbridge.com` and return to staging, add the same staging origins to Supabase **Additional Redirect URLs** as needed for your flow.  
4. With `NEXT_PUBLIC_CB_AUTH_COOKIE_SCOPE=host`, cookies set on `login.thecapitalbridge.com` **do not** automatically apply to `staging.thecapitalbridge.com` — users may need to sign in again on staging, or you deploy a staging login app on a hostname that shares the cookie policy you want (advanced).

## Risks and follow-ups

- **Same Supabase as production + suite cookie domain:** high risk of session bleed and wrong-environment writes. Prefer staging Supabase + `NEXT_PUBLIC_CB_AUTH_COOKIE_SCOPE=host`.  
- **Model apps** (Forever, Capital Health, etc.) do not yet include the hostname gate; only **platform** does. If you map other hostnames to those apps in Vercel, reuse `@cb/shared/staging` and the same cookie/API pattern or add Cloudflare Access.  
- **Billing / Billplz / webhooks:** point staging API (if any) at test collections; never reuse production `BILLPLZ_*` secrets on staging.  
- **Password gate** is not a substitute for strong RBAC; rotate `STAGING_GATE_PASSWORD` when people leave.

## Changing the staging password

Update `STAGING_GATE_PASSWORD` (and optionally `STAGING_GATE_SIGNING_SECRET`) in the **staging** Vercel project and redeploy. Existing `cb_staging_gate` cookies become invalid when the signing secret changes (if you only change the password and not `STAGING_GATE_SIGNING_SECRET`, cookies signed with the old password remain valid until expiry — rotate both or bump cookie logic if you need immediate global revoke).
