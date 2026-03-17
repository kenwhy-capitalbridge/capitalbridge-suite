# Checkout email pre-check and clean sign-up sequencing

## Purpose

- Prevent confusing repeated sign-up states: only write billing rows after a **clean** sign-up.
- Ensure all billing calls use the **public** schema (no "updated_at in schema cache" errors).
- Pre-check email existence (via RPC) before calling create-account so existing users see a clear message and no partial writes.

## Studio setup (paste-run once)

Run the following in **Supabase Studio** → SQL Editor. No migrations are shipped; the team runs this once per project.

```sql
create or replace function public.email_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(trim(p_email))
  );
$$;

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to anon, authenticated;

-- Optional sanity checks:
-- select public.email_exists('someone@example.com');
-- select public.email_exists('  SOMEONE@example.com  ');
```

## Smoke test

1. **Existing email** — Use an email that already has an account. Submit checkout. Pre-check blocks sign-up; the message "An account already exists for this email. Please log in instead or use 'Forgot password'." appears; no billing/membership rows are created.
2. **Fresh email** — Use a new email. Submit checkout. Sign-up succeeds; only then is a row added in `public.memberships` (and billing flow continues).
3. **Network** — In DevTools → Network, confirm billing requests use the expected project host and (where applicable) `Accept-Profile: public`. No "updated_at in schema cache" errors.

## planMap cache

- **What:** In-memory cache of `public.plans` id/slug → `duration_days`, used when computing membership `expires_at` so we do fewer plan table round-trips.
- **Where:** Loaded at the start of billing handlers (e.g. webhook); `getPlanDuration(planIdOrName, fallbackDays)` returns cached days; expiry uses `computeExpiry(start, days)`.
- **TTL:** 60 minutes. If the cache is older, the next `loadPlanMap(supabase)` call refetches from `public.plans` (always with `schema('public')`).
- **Refresh:** Call `refreshPlanMap(supabase)` to clear and reload (e.g. after changing plans in Studio).
- **Backstop:** The DB trigger that sets `expires_at` / `end_date` remains authoritative; if the app cache is stale or misses, the trigger still corrects on write.
- **Dev:** On first load you’ll see `planMap: loaded N plans` in the console (dev/preview only).

## memberships trigger: "NEW has no field starts_at"

If a trigger on `public.memberships` references `NEW.starts_at` but the table only has `started_at` (or `start_date`), either:

- **Option A (migration):** Run `supabase/migrations/20260324000000_memberships_starts_at_for_trigger.sql` to add `starts_at`, backfill from `started_at`/`start_date`, and set default. The existing trigger then works without changes.
- **Option B (Studio):** Recreate the trigger function to use an existing column instead of `starts_at` (e.g. `NEW.started_at` or `COALESCE(NEW.start_date::timestamptz, now())`). Drop and recreate the trigger to use the updated function.

Re-test: incognito → `/checkout?plan=trial` → create trial user → membership row is created with no trigger errors.

## Rollback

Revert the checkout-hardening PR (code only). The SQL function `public.email_exists` is safe to leave in place. To restore the old flow: remove the pre-check call and the anti-enum branch; billing will run after create-account as before (with possible partial writes on duplicate email).
