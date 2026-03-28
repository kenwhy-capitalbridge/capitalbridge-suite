# Advisory E2E (Playwright)

These tests guard **auth continuity** (model app → **BACK** → platform) and the **Forever** `POST /api/advisory-report` save path. They are **not** tied to CSS changes.

## Why not localhost multi-app?

Supabase auth cookies use a shared **`.thecapitalbridge.com`** domain only in **production** (`NODE_ENV=production`). On `localhost` each port has its own cookie jar, so a session on `:3006` does not exist on `:3000`. Run E2E against **staging or production** origins (or a single host that mirrors prod cookie settings).

## One-time: create storage state

1. Install browser binaries (once per machine):

   ```bash
   npx playwright install chromium
   ```

2. Record cookies after a **manual** login (avoids brittle selectors on `/access`):

   ```bash
   CB_E2E_LOGIN_ORIGIN=https://login.thecapitalbridge.com npm run e2e:storage
   ```

   Complete sign-in in the window; wait for the timer. Output: `e2e/.auth/storage.json` (gitignored).

3. Use a **paid** test user if you want the **Save** test to run (not trial / not “Save disabled”).

## Run tests

```bash
CB_E2E_FOREVER_ORIGIN=https://forever.thecapitalbridge.com \
CB_E2E_PLATFORM_ORIGIN=https://platform.thecapitalbridge.com \
npm run test:e2e
```

Defaults match production hostnames above. Override when pointing at a preview URL.

## CI

- Store `e2e/.auth/storage.json` from a dedicated bot account **securely** (e.g. GitHub secret), decode into the job workspace before `npm run test:e2e`.
- Rotate storage when the session expires.
- Optional: `.github/workflows/e2e-model-platform.yml` — **workflow_dispatch** (manual) and a **weekly schedule** (Wed 08:00 UTC). Set repository secret **`CB_E2E_STORAGE_JSON`** to the full file contents. Optional **repository variables** **`CB_E2E_FOREVER_ORIGIN`** and **`CB_E2E_PLATFORM_ORIGIN`** override defaults (`https://forever.thecapitalbridge.com` and `https://platform.thecapitalbridge.com`) when you want staging or preview hosts.

## Periodic staging runs (local)

Use the same `storage.json` as production if cookies are valid for `*.thecapitalbridge.com`, or re-run `npm run e2e:storage` against the login origin you use for staging:

```bash
CB_E2E_LOGIN_ORIGIN=https://login-staging.example.com npm run e2e:storage
CB_E2E_FOREVER_ORIGIN=https://forever-staging.example.com \
CB_E2E_PLATFORM_ORIGIN=https://platform-staging.example.com \
npm run test:e2e
```

## What is tested

| Test | Asserts |
|------|---------|
| BACK link | From Forever `/dashboard`, **BACK** navigates to the **platform** hostname (`CB_E2E_PLATFORM_ORIGIN`). |
| Save | **Save** triggers `POST …/api/advisory-report` with **200** (skips if `Save off` or button disabled). |
