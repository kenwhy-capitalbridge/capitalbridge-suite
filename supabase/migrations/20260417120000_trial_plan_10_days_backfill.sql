-- Backfill trial = 10 days for rows that did not match 20260416120000
-- (e.g. id = 'trial' as text, slug-only match edge cases, legacy duplicates).
UPDATE public.plans
SET
  duration_days = 10,
  name = 'Trial Access (10 days)'
WHERE slug = 'trial';

UPDATE public.plans
SET
  duration_days = 10,
  name = 'Trial Access (10 days)'
WHERE id::text = 'trial';

UPDATE public.plans
SET
  duration_days = 10,
  name = 'Trial Access (10 days)'
WHERE is_trial = true
  AND duration_days = 7
  AND name ILIKE '%trial access%';
