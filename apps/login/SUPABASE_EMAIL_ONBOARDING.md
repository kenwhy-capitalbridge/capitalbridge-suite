# Onboarding email (payment-first) — Reset Password template

Payment-first onboarding **does not** use Supabase **“Confirm Sign Up”**.

## Primary path: password on payment-return (no email link required)

On **payment-return**, users can **set their password in the browser** via **`POST /api/billing/set-initial-password-for-bill`** (service role updates the auth user). They then sign in at **`/access`** with **email + password** on **any device or browser** — no shared cookies or magic link between checkout and login.

## Backup: onboarding / recovery email

The API may still send the same mail as **password recovery** by calling `resetPasswordForEmail` (recover endpoint), with idempotency via `payments.recovery_email_sent`. Use this for users who prefer a link or who did not finish on the return page.

## Dashboard: Auth → Email Templates → **Reset Password**

Rewrite this template so it reads as **onboarding**, not “forgot password”.

### Suggested subject

**Access your Capital Bridge account**

### Suggested body

> Your account is ready.
>
> Click below to set your password and access your dashboard. (In-app success copy: “Email sent. Check your inbox to set your password.”)

**Button / CTA label:** `Set your password`

Remove wording such as “reset password”, “forgot password”, or “magic link” if present in your project’s custom template.

## Redirect

Links must land on **`/access`** (set password + sign-in).

In **Authentication** → **URL Configuration** → **Redirect URLs**, allow:

- `https://login.thecapitalbridge.com/access`
- `http://localhost:3001/access` (local)

See also `SUPABASE_REDIRECT_URLS.md`.

## Optional email resend (billing flows)

**payment-return** and **payment-handoff** can resend the same template via **`POST /api/billing/send-setup-email-for-bill`**: the server reads **`billing_sessions.email`** (and `user_id`) and calls the same GoTrue recover path as the API — **no client-side** `resetPasswordForEmail` for those pages (avoids stale email / race with wrong-email correction).

**`/access`** and **forgot-password** still call `resetPasswordForEmail` from the browser when the user types an email and there is **no** `bill_id` context.

Use this success line where relevant: **“Password setup email sent to {email}”** (or the generic inbox reminder).
