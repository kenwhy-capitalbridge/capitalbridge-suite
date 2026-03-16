# Live Test Mode

Production-like environment for QA: signup, checkout, membership, persona, and plan gating. All billing and checkout use the **public** schema; persona RPC tries `public.get_user_persona` first, then `advisory_v2.get_user_persona`.

## Environment

Set these in Vercel (or `.env.local` for local runs):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ijeymuokgaduerocqprh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
NEXT_PUBLIC_USE_V2=1
NEXT_PUBLIC_ENV=staging
```

No DB migrations required. No changes to `advisory_v2` tables or RLS. No production secrets.

## Smoke test (~90 seconds)

1. **Checkout** — Open login app checkout (e.g. `?plan=trial`). Submit signup form; complete or cancel payment. Confirm no "updated_at column" or schema cache errors.
2. **Dashboard header** — After login, open platform dashboard. Header should show name/plan and days left (or Guest / TRIAL / 0 when unauthenticated or RPC fails).
3. **Tiles** — Tiles should reflect plan (e.g. Stress Test and Solutions disabled for trial).
4. **Paid vs trial** — With a paid plan, confirm Stress Test and (for yearly) Solutions are enabled; saved reports work when allowed.
5. **Saved reports** — In Forever / Income Engineering / Capital Health / Capital Stress dashboards, confirm Save/Load behavior and that list loads.

## Troubleshooting

- **"Could not find the 'updated_at' column" / schema cache** — All billing table access must use `public` schema. Ensure every `.from("memberships")` (and similar) in billing/checkout/auth paths is `.schema("public").from("memberships")`. Check that no `Accept-Profile` or default schema points at `advisory_v2` for these tables.
- **Wrong project** — Check request URL host and `NEXT_PUBLIC_SUPABASE_URL`; the shared browser client logs once: `Live Test Mode: project=<ref>, env=<NEXT_PUBLIC_ENV>`.
- **Persona always null** — Persona calls `public.get_user_persona` first, then `advisory_v2.get_user_persona` on not-found. Ensure at least one of these RPCs exists and returns the expected shape; check browser console for `[platformAccess] get_user_persona failed`.
- **Shared client** — Browser code that needs Supabase for persona/dashboard should import `createSupabaseBrowserClient` from `@cb/advisory-graph/supabaseClient` so the same client and schema behavior are used everywhere.
