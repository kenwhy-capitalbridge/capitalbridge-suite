-- Extend trial membership from 7 to 10 days (must match app copy and checkout).
UPDATE public.plans
SET
  duration_days = 10,
  name = 'Trial Access (10 days)'
WHERE slug = 'trial'
  AND is_trial = true;
