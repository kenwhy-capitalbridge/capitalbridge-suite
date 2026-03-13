# API app

Routes:

- `POST /billing/create`
- `POST /billing/billplz-webhook`

## Required env vars (Vercel project: api)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (for user identification via cookie session)
- `SUPABASE_SERVICE_ROLE_KEY`
- `BILLPLZ_API_KEY`
- `BILLPLZ_COLLECTION_ID`
- `BILLPLZ_CALLBACK_URL` (optional)

