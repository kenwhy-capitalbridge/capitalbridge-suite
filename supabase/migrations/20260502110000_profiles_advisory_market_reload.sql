-- Production may have skipped 20260409120000 / 20260420120000; fixes:
--   "column profiles.advisory_market does not exist"
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS advisory_market text;

COMMENT ON COLUMN public.profiles.advisory_market IS
  'Advisory display region (MY|SG|TH|…); drives model-app currency/labels.';

NOTIFY pgrst, 'reload schema';
