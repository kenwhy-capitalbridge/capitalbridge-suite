-- New catalog pricing (RM): monthly 1,399 | quarterly 3,900 | strategic 4,999
-- Trial remains RM 1.00 (100 sen). Max trials per account: 2 (was 3).

UPDATE public.plans
SET
  name = 'Monthly Access (30 days)',
  price_cents = 139900,
  updated_at = now()
WHERE slug = 'monthly';

UPDATE public.plans
SET
  name = 'Quarterly Access (90 days)',
  price_cents = 390000,
  updated_at = now()
WHERE slug = 'quarterly';

UPDATE public.plans
SET
  name = 'Strategic Advisory & Execution',
  price_cents = 499900,
  updated_at = now()
WHERE slug = 'strategic';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'price'
  ) THEN
    UPDATE public.plans SET price = 1399 WHERE slug = 'monthly';
    UPDATE public.plans SET price = 3900 WHERE slug = 'quarterly';
    UPDATE public.plans SET price = 4999 WHERE slug = 'strategic';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.check_trial_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count int;
  is_trial boolean := FALSE;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'plan_id') THEN
    is_trial := (NEW.plan_id = 'trial');
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'plan') THEN
    is_trial := (NEW.plan = 'trial');
  END IF;

  IF NOT is_trial THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(trial_count, 0) INTO current_count
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF current_count IS NULL THEN
    INSERT INTO public.profiles (id, trial_count)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (id) DO UPDATE SET trial_count = COALESCE(public.profiles.trial_count, 0) + 1;
    RETURN NEW;
  END IF;

  IF current_count >= 2 THEN
    RAISE EXCEPTION 'Trial limit reached (max 2 per account).';
  END IF;

  UPDATE public.profiles
  SET trial_count = trial_count + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;
