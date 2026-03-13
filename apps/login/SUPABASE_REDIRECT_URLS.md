# Supabase Auth redirect URLs (password reset)

For **Forgot password** to work, the reset link in the email must open the **Set new password** page, not the login or home page.

In **Supabase Dashboard** → **Authentication** → **URL Configuration** → **Redirect URLs**, add:

- **Production:** `https://login.thecapitalbridge.com/reset-password`
- **Local:** `http://localhost:3001/reset-password`

You can also use a wildcard: `https://login.thecapitalbridge.com/**` and `http://localhost:3001/**`.

If the reset link sends users to the login page instead of the change-password page, the redirect URL above is missing or does not match exactly.
