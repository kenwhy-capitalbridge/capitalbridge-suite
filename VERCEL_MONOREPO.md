# Vercel monorepo deployment (Section 17)

All CapitalBridge apps deploy from the **same repository** (`capitalbridge-suite`). Each app is a **separate Vercel project** with its own Root Directory and domain.

## 1. Connect the repo once

- In Vercel, link this repository to your team/account (if not already).
- You will create **one Vercel project per app**, all pointing to the same repo.

## 2. Create a project per app (or link existing)

For each application, use a Vercel project with the settings below. If you already have projects (e.g. from a previous setup), **link them to this repo** and set the **Root Directory** and **Domain** in the table.

| Your Vercel project name   | Root Directory           | Domain (production)                  |
|----------------------------|--------------------------|--------------------------------------|
| capitalbridgelogin         | `apps/login`             | `login.thecapitalbridge.com`         |
| advisoryplatform           | `apps/platform`          | `platform.thecapitalbridge.com`      |
| **capital-stress-model**   | `apps/capitalstress`     | `capitalstress.thecapitalbridge.com` |
| **capital-health-calculator** | `apps/capitalhealth`  | `capitalhealth.thecapitalbridge.com` |
| **incomeengineeringmodel** | `apps/incomeengineering` | `incomeengineering.thecapitalbridge.com` |
| **forever-income-calculator** | `apps/forever`       | `forever.thecapitalbridge.com`       |
| api (optional)             | `apps/api`               | `api.thecapitalbridge.com`           |

Env vars for the four tool apps are already set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_LOGIN_APP_URL`. Ensure each of these projects is connected to the **capitalbridge-suite** repo and has **Root Directory** set as in the table so builds use the monorepo app code.

## 3. Set Root Directory per project

In each project:

1. **Settings → Build and Deployment → Root Directory**
2. Set to the value in the table (e.g. `apps/login`, `apps/platform`). Leave "Include source files outside of the Root Directory in the Build Step" enabled for monorepos if that option appears.
3. Leave **Framework Preset** as **Next.js** (Vercel usually detects it).

Each app has a `vercel.json` with:

```json
{
  "installCommand": "cd ../.. && npm install"
}
```

This runs install from the monorepo root so all `packages/*` and workspace deps are available.

## 4. Assign domains

In each project:

1. **Settings → Domains**
2. Add the production domain (e.g. `login.thecapitalbridge.com`).
3. Add a CNAME in your DNS pointing that host to Vercel (as shown in the dashboard).

## 5. Environment variables per project

- **Login**: Supabase (URL, anon key, service role), Billplz (API key, collection ID, callback URL). See `VERCEL-SETUP.md`.
- **Platform, CapitalStress, CapitalHealth, IncomeEngineering, Forever**:  
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_LOGIN_APP_URL` = `https://login.thecapitalbridge.com`.

## 6. Deployments

- **Automatic**: Push to the connected branch; Vercel builds and deploys the project whose Root Directory contains the changed files.
- **Preview**: Each PR can get preview deployments; each project builds from its own Root Directory.
- **Independent scaling**: Each project is a separate deployment and can scale independently.

## 7. Link existing Vercel projects to this repo

For **capital-stress-model**, **incomeengineeringmodel**, **capital-health-calculator**, and **forever-income-calculator**:

1. **Connect to capitalbridge-suite repo**  
   In each project: **Settings → Git** → Connect to the `capitalbridge-suite` repository (same repo for all).

2. **Set Root Directory**  
   **Settings → Build and Deployment → Root Directory** (or under **Git** if your layout differs) → set to:
   - capital-stress-model → `apps/capitalstress`
   - incomeengineeringmodel → `apps/incomeengineering`
   - capital-health-calculator → `apps/capitalhealth`
   - forever-income-calculator → `apps/forever`

3. **Set production domain** (optional but recommended)  
   **Settings → Domains** → add the domain from the table (e.g. `capitalstress.thecapitalbridge.com`) and point DNS to Vercel.

4. **Redeploy**  
   After changing Root Directory, trigger a new deployment (e.g. **Deployments → … → Redeploy**) so the app builds from the monorepo.

No Cursor-specific Vercel tool is required; the dashboard steps above are enough. If you use **Vercel CLI** (`npm i -g vercel`), run `vercel link` inside each `apps/<name>` folder and choose the matching existing project when prompted.

## 8. Platform (`platform.thecapitalbridge.com`) still shows old UI

If the live site still shows legacy copy (e.g. “To request access…”) or no sticky header, the deployment is **not** running the current `apps/platform` from **this** monorepo.

1. **Settings → Git** — Connected repository must be **`kenwhy-capitalbridge/capitalbridge-suite`** (not the old standalone `advisoryplatform` repo).
2. **Settings → Build and Deployment → Root Directory** — **`apps/platform`**.
3. **Redeploy** after fixing either setting.
4. If you use **Cloudflare** (or another CDN) in front of Vercel, **purge cache** for `platform.thecapitalbridge.com`.

After you are signed in and the home page loads, responses include **`X-CB-Commit`** (Git SHA on Vercel builds). Compare that SHA to the latest commit on `main` in GitHub to confirm the right deploy.

**Quick check (no login):** open or run:

`https://platform.thecapitalbridge.com/api/build-info`

You should see JSON like `{ "app": "platform", "monorepo": "capitalbridge-suite", "commit": "<sha>", ... }`.

- **404** → this hostname is **not** the monorepo `apps/platform` app (wrong Vercel project or old deploy).
- **`commit` matches `main`** but the page still shows the old footer → **browser or CDN cache**; hard-refresh, clear site data for this host, or purge Cloudflare.
