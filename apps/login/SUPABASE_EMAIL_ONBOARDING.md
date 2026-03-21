# Onboarding email (payment-first) — Reset Password template

Payment-first onboarding **does not** use Supabase **“Confirm Sign Up”** or `signUp()`.

- Checkout creates users via **admin `createUser`** with **`email_confirm: true`** (see `request-bill` / API billing).
- After Billplz payment, the webhook resolves the Auth user (`resolveAuthUserForPayment`), then sends **one** email via **`resetPasswordForEmail`** (same as the Recover / Reset Password flow).
- Idempotency: **`payments.recovery_email_sent`** (see `withOnboardingEmailOncePerBill`).
- **Backup only:** “Resend access email” on `payment-return` also uses `resetPasswordForEmail` — same mechanism, not a second system.

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
