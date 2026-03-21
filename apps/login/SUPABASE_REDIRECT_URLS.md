# Supabase Auth redirect URLs (access / recovery)

Payment-first onboarding emails (sent via **`resetPasswordForEmail`**, same as the **Reset Password** template) land on the unified **`/access`** page. See **`SUPABASE_EMAIL_ONBOARDING.md`** for suggested template copy (onboarding, not “forgot password”).

In **Supabase Dashboard** → **Authentication** → **URL Configuration** → **Redirect URLs**, add:

- **Production:** `https://login.thecapitalbridge.com/access`
- **Local:** `http://localhost:3001/access`

You can also use a wildcard: `https://login.thecapitalbridge.com/**` and `http://localhost:3001/**`.

If links send users to the wrong place, the redirect URL above is missing or does not match exactly.
