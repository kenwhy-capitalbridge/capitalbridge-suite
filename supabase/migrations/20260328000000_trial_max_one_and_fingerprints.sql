-- Max 1 trial per account (profiles.trial_count); enforce on memberships (payment-first flow).
-- Optional IP/device fingerprints to reduce multi-account trial abuse.
-- Legacy subscriptions trigger aligned to the same limit.

-- -----------------------------------------------------------------------------
-- 1. Trial fingerprints (IP hash + optional device id from checkout cookie)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trial_consumption_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  ip_hash text,
  device_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trial_fp_need_signal CHECK (
    ip_hash IS NOT NULL OR (device_id IS NOT NULL AND btrim(device_id) <> '')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS trial_fp_ip_unique
  ON public.trial_consumption_fingerprints (ip_hash)
  WHERE ip_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS trial_fp_device_unique
  ON public.trial_consumption_fingerprints (device_id)
  WHERE device_id IS NOT NULL AND btrim(device_id) <> '';

COMMENT ON TABLE public.trial_consumption_fingerprints IS
  'Records trial activations by hashed checkout IP and/or browser device id to limit repeat trials across accounts.';

ALTER TABLE public.trial_consumption_fingerprints ENABLE ROW LEVEL SECURITY;

-- No client access; service_role only (via API).
REVOKE ALL ON public.trial_consumption_fingerprints FROM PUBLIC;
GRANT SELECT, INSERT, DELETE ON public.trial_consumption_fingerprints TO service_role;

-- -----------------------------------------------------------------------------
-- 2. billing_sessions: store signals captured at checkout (payment-first)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_sessions') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'billing_sessions' AND column_name = 'checkout_ip_hash'
    ) THEN
      ALTER TABLE public.billing_sessions ADD COLUMN checkout_ip_hash text;
      COMMENT ON COLUMN public.billing_sessions.checkout_ip_hash IS 'SHA-256 hex of client IP + server pepper at checkout; used for trial abuse prevention.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'billing_sessions' AND column_name = 'checkout_device_id'
    ) THEN
      ALTER TABLE public.billing_sessions ADD COLUMN checkout_device_id text;
      COMMENT ON COLUMN public.billing_sessions.checkout_device_id IS 'Opaque device id from first-party cookie at trial checkout.';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. BEFORE INSERT on memberships: trial_count max 1 (trial plans only)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_membership_trial_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_tr boolean := false;
  current_count int;
BEGIN
  SELECT COALESCE(p.is_trial, false) INTO is_tr
  FROM public.plans p
  WHERE p.id = NEW.plan_id
  LIMIT 1;

  IF NOT COALESCE(is_tr, false) THEN
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

  IF current_count >= 1 THEN
    RAISE EXCEPTION 'Trial limit reached (max 1 per account).';
  END IF;

  UPDATE public.profiles
  SET trial_count = trial_count + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_membership_trial_limit ON public.memberships;
CREATE TRIGGER enforce_membership_trial_limit
  BEFORE INSERT ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.check_membership_trial_limit();

-- -----------------------------------------------------------------------------
-- 4. Legacy subscriptions: max 1 trial (was 2)
-- -----------------------------------------------------------------------------
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

  IF current_count >= 1 THEN
    RAISE EXCEPTION 'Trial limit reached (max 1 per account).';
  END IF;

  UPDATE public.profiles
  SET trial_count = trial_count + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;
