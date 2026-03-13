# Ship to GitHub + Vercel

## 1. Push to GitHub

From the repo root (`capitalbridge-suite`):

```bash
git init
git add .
git commit -m "Initial commit: Capital Bridge login, platform, API"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/capitalbridge-suite.git
git push -u origin main
```

Replace `YOUR_ORG/capitalbridge-suite` with your GitHub org/repo. If the repo already exists on GitHub, create it first (empty, no README), then run the commands above.

---

## 2. Deploy on Vercel

Create **three** Vercel projects, each linked to the **same** GitHub repo with a different **Root Directory**. See **VERCEL-SETUP.md** for full env and domains.

| Project  | Root Directory | Domain                      |
|----------|----------------|-----------------------------|
| **login**   | `apps/login`   | `login.thecapitalbridge.com`  |
| **platform** | `apps/platform` | `platform.thecapitalbridge.com` |
| **api**   | `apps/api`     | `api.thecapitalbridge.com`   |

1. Vercel Dashboard → **Add New** → **Project** → **Import** your GitHub repo.
2. Set **Root Directory** to the app folder (e.g. `apps/login`), then **Deploy**.
3. In **Settings → Environment Variables**, add the env vars from VERCEL-SETUP.md for that project.
4. In **Settings → Domains**, add the custom domain and point DNS (CNAME) as instructed.
5. Repeat for the other two apps (new project each time, same repo, different root).

---

## 3. After first deploy

- Supabase: ensure production URL/keys are used in Vercel env (no local `.env`).
- Cookie domain: auth cookie is set for `.thecapitalbridge.com` in production so login and platform share the session.
- Run any Supabase migrations (if not already applied) in the production project’s SQL Editor.
