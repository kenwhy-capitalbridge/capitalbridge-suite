-- Locked advisory region from first successful checkout (or explicit change via profile top-up).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS advisory_market text;

COMMENT ON COLUMN public.profiles.advisory_market IS 'Advisory pricing region (MY|SG|TH|…); set from checkout; change via profile when higher regional price requires top-up.';
