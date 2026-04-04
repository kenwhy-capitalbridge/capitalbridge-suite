-- Optional checkout context (country, phone, market) for analytics / support.
ALTER TABLE public.billing_sessions
  ADD COLUMN IF NOT EXISTS checkout_metadata jsonb;

COMMENT ON COLUMN public.billing_sessions.checkout_metadata IS
  'Optional JSON: country code, phone, market id from login checkout.';
