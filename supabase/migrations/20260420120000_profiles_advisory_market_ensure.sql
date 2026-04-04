-- Ensure advisory region column exists (idempotent). Apply on hosted Supabase if profile
-- region change returns PGRST204 "advisory_market" / schema cache errors, then reload API schema.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS advisory_market text;

COMMENT ON COLUMN public.profiles.advisory_market IS
  'Advisory pricing region (MY|SG|TH|…); set from checkout; change via profile when higher regional price requires top-up.';
