# Smart email-first `/access` flow

## Database

Apply migration `20260329000000_email_access_state_rpc.sql` (or run SQL in Studio) so `public.email_access_state(p_email)` exists and is granted to `anon` + `authenticated`.

**If that RPC is missing** (migration not applied on production), `getEmailAccessState` **falls back** to existing `public.email_exists(p_email)`: existing emails are treated as **active** (password step). Unconfirmed-only accounts are a rare edge case until the migration is applied.

## Behaviour

1. **Recovery / set-password** (hash `access_token`, PKCE `code`) — unchanged; user sets password then enters platform.
2. **Default** — email-only step → `email_access_state` RPC:
   - **Unknown** → pricing CTA (no password field).
   - **Unconfirmed** (`email_confirmed_at` null) → resend uses `resetPasswordForEmail` (same onboarding template as payment-first).
   - **Active** (confirmed) → password field + sign-in; wrong password shows explicit copy; **Forgot password?** sends `resetPasswordForEmail` only on click.

## Session

`signOut()` runs before state detection so stale cookies don’t skew results.

## Cooldown

45s between “send email” actions that use `resetPasswordForEmail` (resend activation + forgot password).
