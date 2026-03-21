# Onboarding email (payment-first) — Reset Password template

Payment-first onboarding **does not** use Supabase **“Confirm Sign Up”**. After Billplz payment, the API sends the same mail as **password recovery** by calling `resetPasswordForEmail` (recover endpoint), with idempotency via `payments.recovery_email_sent`.

## Dashboard: Auth → Email Templates → **Reset Password**

Rewrite this template so it reads as **onboarding**, not “forgot password”.

### Suggested subject

**Access your Capital Bridge account**

### Suggested body

> Your account is ready.
>
> Click below to set your password and access your dashboard.

**Button / CTA label:** `Set your password`

Remove wording such as “reset password”, “forgot password”, or “magic link” if present in your project’s custom template.

## Redirect

Links must land on **`/access`** (set password + sign-in).

In **Authentication** → **URL Configuration** → **Redirect URLs**, allow:

- `https://login.thecapitalbridge.com/access`
- `http://localhost:3001/access` (local)

See also `SUPABASE_REDIRECT_URLS.md`.

## Backup resend

The **payment-return** page may offer **“Resend access email”** for users who don’t see the first mail. That path also uses `resetPasswordForEmail` → same template.
