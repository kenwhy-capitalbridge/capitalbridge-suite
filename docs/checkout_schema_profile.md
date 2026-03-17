# Checkout & billing: schema and Accept-Profile

Billing and checkout must use the **public** schema only. Do not set `Accept-Profile: advisory_v2` (or any non-public profile) on requests that touch billing tables.

## Rules

- **Billing queries** (memberships, payments, billing_sessions, billing_events, plans, pending_bills, profiles, active_memberships): always call `.schema('public').from('<table>')` (or equivalent). No bare `.from("<table>")` in checkout/auth paths.
- **Accept-Profile**: use `public` for billing. If any client or middleware sets a default `Accept-Profile`, ensure it is `public` for login/checkout/billing routes, not `advisory_v2`.
- **Persona RPC**: platform/login uses `public.get_user_persona` first; on 404/PGRST202-type errors it falls back to `advisory_v2.get_user_persona`. UI shows "Welcome, Guest • Plan: TRIAL • 0 day(s) left" when persona is unavailable.

## 60-second smoke test

1. **Incognito** → open `/checkout?plan=trial` → submit the form (email, name, password, confirm). You should **not** see the red error: "Could not find the 'updated_at' column of 'memberships' in the schema cache."
2. **Network**: Inspect the failing request from before (e.g. the one that used to return 500). It should show:
   - **Host** = your current Supabase project (e.g. `ijeymuokgaduerocqprh.supabase.co`).
   - **Accept-Profile: public** (or no Accept-Profile; PostgREST defaults to public when using `.schema('public')`).
3. **Persona**: After login, open the platform dashboard. The header should show name, plan, and days left (from the persona RPC). If the RPC is down, it should show the graceful fallback (Guest / TRIAL / 0 days) without crashing.

## Rollback

Revert the PR that introduced these changes. There are no DB migrations; rollback is code-only.
