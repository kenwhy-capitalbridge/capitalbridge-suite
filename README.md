# Capital Bridge Suite (Standalone)

Monorepo for the Capital Bridge ecosystem. **All backend APIs run on the login app** at `login.thecapitalbridge.com/api/*` to avoid cross-origin requests and CORS.

- `apps/login` → `login.thecapitalbridge.com` (auth, billing, APIs: `/api/bill/create`, `/api/webhooks/billplz`, etc.)
- `apps/platform` → `platform.thecapitalbridge.com`
- `apps/api` → `api.thecapitalbridge.com` (optional/legacy; do not call from frontends)

## Architecture

- **Same-origin APIs**: Payment and auth are served from the login app. Frontends on `login.thecapitalbridge.com` call `/api/bill/create` (relative URL). No CORS.
- **Session sharing**: Cookies use domain `.thecapitalbridge.com` so one login works across subdomains.
- **Payment flow**: User selects plan on login → `POST /api/bill/create` → Billplz checkout → webhook `POST /api/webhooks/billplz` → membership activated.

See `ARCHITECTURE.md` for a verification checklist.

## Local development

Install deps at repo root:

```bash
npm install
```

Run apps:

```bash
npm run dev:login
npm run dev:platform
npm run dev:api
```

For payment testing, set `BILLPLZ_*` and `SUPABASE_SERVICE_ROLE_KEY` in the **login** app env (see `VERCEL-SETUP.md`).

