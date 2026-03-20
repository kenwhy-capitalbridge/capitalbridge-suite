# Login app

Pages:

- `/access` (sign-in, password setup, recovery email link)
- `/login` → redirects to `/access`
- `/pricing`
- `/signup`

## Required env vars (Vercel project: login)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PLATFORM_APP_URL` (optional; defaults to `https://platform.thecapitalbridge.com`)

