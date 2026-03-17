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

## Rollback

Revert the checkout-hardening PR (code only). The SQL function `public.email_exists` is safe to leave in place. To restore the old flow: remove the pre-check call and the anti-enum branch; billing will run after create-account as before (with possible partial writes on duplicate email).
