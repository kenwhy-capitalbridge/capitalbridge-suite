# Capital Bridge Suite — handoff (living doc)

**Purpose:** Keep one place for context that survives new chat sessions.  
**When to update:** At the end of a meaningful session (or when starting a new one), paste or merge the latest **carry-forward** notes here so the next chat stays aligned.

---

## Repo & stack

- **Monorepo:** `kenwhy-capitalbridge/capitalbridge-suite` (npm workspaces: `apps/*`, `packages/*`).
- **Key apps:** `apps/login` (auth, pricing, `/access`), `apps/platform` (advisory home, middleware, model APIs), `apps/api` (billing/webhooks).
- **Shared packages:** `@cb/supabase` (browser + server clients), `@cb/shared` (URLs), `@cb/advisory-graph` (persona/entitlements for platform tiles).

---

## Production domains (intended)

| Host | App folder | Notes |
|------|------------|--------|
| `login.thecapitalbridge.com` | `apps/login` | Auth, `/access`, pricing |
| `platform.thecapitalbridge.com` | `apps/platform` | Vercel project often named `advisoryplatform`; **Git = `capitalbridge-suite`**, **Root Directory = `apps/platform`** (not the old standalone `advisoryplatform` repo) |

**Deploy check (platform):** `GET https://platform.thecapitalbridge.com/api/build-info`  
Expect JSON: `app: platform`, `monorepo: capitalbridge-suite`, `root: apps/platform`, `commit`, `vercelEnv`.

---

## Vercel (platform) — common mistakes

- **Symptom:** Old platform UI (e.g. “To request access…” footer, no sticky header) → often **wrong deployment** (wrong repo or root).
- **Build error:** `No Output Directory named "public"` → project treated like static export; use **Next.js**, **Output Directory empty / Next.js default**, **Root Directory `apps/platform`**.
- **Monorepo install:** `apps/platform/vercel.json` — `installCommand: cd ../.. && npm install`, `buildCommand: npm run build`.

More detail: `VERCEL_MONOREPO.md` (§8 and troubleshooting).

---

## Auth / session (critical)

- **Cross-subdomain cookies:** In production, server + browser Supabase clients should set auth cookies with **`domain: .thecapitalbridge.com`** so `login.*` and `platform.*` share the same session. Mismatch → loops: “already signed in” on login but platform redirects to `/access`.
- **Implementation:** `packages/supabase/src/server.ts` (server), `packages/supabase/src/browser.ts` (browser `cookieOptions` in production).
- **Access page:** `apps/login/app/access/page.tsx` — **Logout** on “You’re already signed in” (server `POST /api/auth/sign-out` + `supabase.auth.signOut()`, then login form).

---

## Platform home UI

- **`NEXT_PUBLIC_USE_V2 === "1"`:** Dashboard tiles + persona header path.
- **Otherwise:** `FrameworkStaticLanding` + `PlatformFrameworkHeader` (no public “request access” footer in current code).

---

## Live / sterile DB testing

- Treat **migrations + RLS** as real; don’t assume production seed data.
- For access tests, ensure **active membership** and correct **plan** in Supabase for the test user.

---

## How to update this file (for you + the assistant)

1. After a session, add a **Session log** entry (date + 1–5 bullets: what changed, deploy status, open issues).
2. Refresh the sections above if architecture, env vars, or domains change.
3. Keep long SQL or one-off debug steps in chat or `docs/`, not here — link if needed.

### Session log

| Date | Notes |
|------|--------|
| 2026-03-25 | Initial `HANDOFF.md` created from advisory platform deploy + auth cookie + access logout work. |
| 2026-03-25 | Follow-up: confirmed auth cookie + access sign-out code paths; `npm run typecheck` and builds for login, platform, api all pass. No open code task from handoff. |

---

## Quick commands (local)

```bash
npm run typecheck    # login + platform + api
npm run build -w @cb/login && npm run build -w @cb/platform && npm run build -w @cb/api
```
