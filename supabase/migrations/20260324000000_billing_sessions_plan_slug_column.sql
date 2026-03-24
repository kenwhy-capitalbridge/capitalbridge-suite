-- billing_sessions.plan: denormalized plans.slug (e.g. trial, monthly).
-- API inserts set both plan_id and plan; backfill existing rows before NOT NULL.

ALTER TABLE public.billing_sessions ADD COLUMN IF NOT EXISTS plan text;

UPDATE public.billing_sessions bs
SET plan = p.slug
FROM public.plans p
WHERE bs.plan_id = p.id
  AND (bs.plan IS NULL OR trim(bs.plan) = '');

DO $$
DECLARE
  n_null integer;
BEGIN
  SELECT count(*)::integer INTO n_null
  FROM public.billing_sessions
  WHERE plan IS NULL OR trim(coalesce(plan, '')) = '';

  IF n_null > 0 THEN
    RAISE WARNING 'billing_sessions.plan: % rows still null; skipping SET NOT NULL', n_null;
    RETURN;
  END IF;

  ALTER TABLE public.billing_sessions ALTER COLUMN plan SET NOT NULL;
END $$;

COMMENT ON COLUMN public.billing_sessions.plan IS 'Mirrors plans.slug for plan_id; set on insert with plan_id.';
