-- Idempotent: production may never have applied 20260411120000_billing_sessions_checkout_metadata.sql.
-- Fixes PostgREST: "Could not find the 'checkout_metadata' column of 'billing_sessions' in the schema cache"
ALTER TABLE public.billing_sessions
  ADD COLUMN IF NOT EXISTS checkout_metadata jsonb;

COMMENT ON COLUMN public.billing_sessions.checkout_metadata IS
  'Optional JSON: country code, phone, market id from login checkout.';

-- Refresh PostgREST schema cache after DDL (hosted Supabase / PostgREST).
NOTIFY pgrst, 'reload schema';
