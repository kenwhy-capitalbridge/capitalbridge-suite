# Platform app

Server routes:

- `/` redirects to `/dashboard` if session else `/login`
- `/login` redirects to the login app with `redirectTo`
- `/dashboard` checks membership and shows tools or payment gate

## Required env vars (Vercel project: platform)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_APP_URL` (optional; defaults to `https://api.thecapitalbridge.com`)
- `NEXT_PUBLIC_LOGIN_APP_URL` (optional; defaults to `https://login.thecapitalbridge.com`)

