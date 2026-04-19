# Staging handover — Capital Bridge platform (`@cb/platform`)

Newbie-proof summary after the staging access gate and safeguards. Technical detail: [`STAGING.md`](./STAGING.md).

---

## STEP 1 — Audit summary (hosts, URLs, auth)

### A. Safe as-is (no code change required for staging)

- **Production-only fallbacks** in `@cb/shared/urls` (`LOGIN_APP_URL`, `PLATFORM_APP_URL`, etc.) — correct when env vars are unset; staging Vercel should **override** with staging URLs where needed.
- **Login / API apps** (`apps/login`, `apps/api`) — unchanged; staging gate lives **only** on `apps/platform`.
- **Model apps** (Forever, Capital Health, …) — no staging gate in code yet; they keep current behaviour unless you map extra staging domains later.
- **`NEXT_PUBLIC_ENV=staging`** usages in login checkout / advisory-graph email checks — orthogonal to the hostname gate; production does not set them on prod builds.
- **Forever redirects** — use `foreverDashboardUrl()` so `NEXT_PUBLIC_FOREVER_APP_URL` controls redirect targets.

### B. Must change for staging (outside code or via Vercel env)

| Item | Action |
|------|--------|
| **Vercel env** | Set `STAGING_GATE_PASSWORD`, `NEXT_PUBLIC_PLATFORM_APP_URL=https://staging.thecapitalbridge.com`, optional `NEXT_PUBLIC_APP_URL` (same origin), `NEXT_PUBLIC_CB_AUTH_COOKIE_SCOPE=host`, staging **Supabase** keys, and model `NEXT_PUBLIC_*_APP_URL` if you must not deep-link to production models. |
| **Supabase dashboard** | Add redirect allowlist URLs for `https://staging.thecapitalbridge.com/**` (see below). |
| **Custom domain** | `staging.thecapitalbridge.com` → Preview deployment / staging branch (you already mapped this). |

### C. Risky / needs manual external config

| Risk | Notes |
|------|--------|
| **Same Supabase project as production** | Sessions/data bleed risk. Prefer a **separate** Supabase project for staging. |
| **`NEXT_PUBLIC_APP_URL` mis-set to a production host** | Code **ignores** known production hosts and falls back to `staging.thecapitalbridge.com` — still fix the env var to avoid confusion. |
| **`NEXT_PUBLIC_CB_AUTH_COOKIE_SCOPE` unset on staging** | Auth cookies may use `Domain=.thecapitalbridge.com` and be visible across subdomains like production login — set to **`host`** on staging unless you explicitly want suite-wide cookies with a dedicated Supabase project. |
| **Billing / Billplz** | Staging should not reuse production billing secrets or live webhooks. |
| **Email templates in Supabase** | If they hardcode `https://platform.thecapitalbridge.com`, links from staging flows may confuse users — review templates when you add staging URLs. |

---

## STEP 5 — Supabase / auth (manual checklist)

**Add or verify in Supabase (Authentication → URL configuration):**

1. **Redirect URLs** — add exactly (adjust if you use trailing slashes differently):
   - `https://staging.thecapitalbridge.com/**`
2. **Site URL** — keep production as primary if one project serves both; **prefer a staging Supabase project** with Site URL = `https://staging.thecapitalbridge.com`.
3. **Email confirmations / magic links** — ensure redirect parameters allow your staging origin (Supabase validates redirect against allowlist).
4. **Cookie behaviour** — with `NEXT_PUBLIC_CB_AUTH_COOKIE_SCOPE=host`, the browser stores Supabase cookies only for `staging.thecapitalbridge.com`; users will **not** share a session with `login.thecapitalbridge.com` unless you change cookie policy.

**Safe to share between prod and staging (only if you accept trade-offs):**

- Same **marketing** site URL.
- Same **production login** for quick tests — possible but cookies won’t cross to staging with `host` scope; users sign in again on staging.

**Should stay isolated:**

- Supabase **project** (database + auth users).
- **Service role** keys.
- **Billing** keys and webhook endpoints.

---

## STEP 7 — Test results (automated + manual)

### Automated (run locally)

```bash
npm run verify:staging-helpers
npm run typecheck -w @cb/platform
```

| # | Check | Result |
|---|--------|--------|
| 1 | Staging host detection (`getStagingCapitalBridgeHostname`, guards) | **Pass** (`verify:staging-helpers`) |
| 6 | Staging badge / metadata only on staging host | **Pass** (code path: `generateMetadata` + layout use same host check) |
| 8 | Auth routes unchanged on production | **Pass** (gate returns `null` off staging host) |

### Manual (on deployed `staging.thecapitalbridge.com`)

| # | Check | How |
|---|--------|-----|
| 2 | Unauthenticated blocked | Open staging in private window → should redirect to `/staging-access`. |
| 3 | Password works | Submit correct `STAGING_GATE_PASSWORD` → land on `from` or `/`. |
| 4 | Wrong password blocked | Wrong password → calm error, stay on form. |
| 5 | Production bypass | Visit `platform.thecapitalbridge.com` → no staging gate, no staging title. |
| 7 | Navigation | Browse dashboard after unlock → no loop. |
| 9 | Redirect loops | After unlock, `/` and `/dashboard` load without bouncing between login and staging-access. |
| 10 | Cookies | `cb_staging_gate` is **httpOnly**; clear via “Clear staging access” or `/api/staging-gate/logout`. |

### Known limitations

- Gate is **platform only**; model apps are not gated by this code.
- **E2E** against production URLs is unchanged; do not point Playwright at staging without setting the gate cookie or disabling gate in a test-only deployment.

---

## STEP 8 — What changed (files)

| File | Purpose |
|------|---------|
| `packages/shared/src/staging.ts` | Hostname resolution (`NEXT_PUBLIC_APP_URL` safe parse), `isStagingHost`, `getAppEnv`, gate cookie crypto, exempt paths |
| `packages/supabase/src/suiteAuthCookieDomain.ts` | Optional host-only auth cookies |
| `packages/supabase/src/authCookieOptions.ts` | Uses suite cookie domain helper |
| `packages/supabase/src/browser.ts` | Same for browser client |
| `packages/supabase/src/server.ts` | Comment only |
| `packages/shared/src/urls.ts` | `foreverDashboardUrl()` |
| `apps/platform/middleware.ts` | Runs staging gate before existing auth |
| `apps/platform/lib/stagingGateMiddleware.ts` | Staging gate redirect / 401 API |
| `apps/platform/app/layout.tsx` | Staging ribbon + **noindex** `generateMetadata` on staging host |
| `apps/platform/app/components/StagingEnvironmentBanner.tsx` | Staging ribbon UI |
| `apps/platform/app/staging-access/*` | Access form |
| `apps/platform/app/api/staging-gate/login/route.ts` | Password → httpOnly cookie |
| `apps/platform/app/api/staging-gate/logout/route.ts` | Clears cookie |
| `apps/forever/app/page.tsx`, `foreverDashboardGate.ts` | Env-based Forever redirect URL |
| `docs/STAGING.md`, `docs/STAGING_HANDOVER.md`, `.env.example`, `scripts/verify-staging-helpers.ts`, `package.json` | Docs + verification |

---

## Vercel env vars (staging Preview / `capitalbridge-suite`)

**Required**

- `STAGING_GATE_PASSWORD` — staging-only password (never commit).
- `NEXT_PUBLIC_PLATFORM_APP_URL` = `https://staging.thecapitalbridge.com`
- `NEXT_PUBLIC_APP_URL` = `https://staging.thecapitalbridge.com` (optional but recommended; hostname must not be a blocked production host).
- `NEXT_PUBLIC_APP_ENV` = `staging` (optional label for humans / future use; **does not** enable the gate without the staging host).
- `NEXT_PUBLIC_CB_AUTH_COOKIE_SCOPE` = `host`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — prefer **staging** Supabase project.

**Recommended**

- All `NEXT_PUBLIC_*_APP_URL` for models → staging or preview URLs so tiles do not send users to production.
- `STAGING_GATE_SIGNING_SECRET` — separate from password if you rotate password often.

---

## Cloudflare

- DNS for `staging` → Vercel (already done if the domain resolves).
- SSL full (strict). No extra Page Rule required for the app gate.

---

## How to test yourself

1. Deploy `staging` branch Preview with custom domain `staging.thecapitalbridge.com`.
2. Set env vars above in the **Preview** environment for that project.
3. Private window → open `https://staging.thecapitalbridge.com` → expect `/staging-access`.
4. Enter password → expect dashboard or home.
5. Click **Clear staging access** in the ribbon → expect to need password again.
6. Open production platform → confirm no staging UI and no extra login gate.

---

## Risks / follow-up

- Add the same gate pattern to other apps if they receive public staging domains.
- Rotate `STAGING_GATE_PASSWORD` when access should be revoked for everyone (or change `STAGING_GATE_SIGNING_SECRET` to invalidate cookies immediately).
