-- =============================================================================
-- User sessions: one active session per user; cookie/IP/User-Agent matching
-- Trial limit: max 3 trial subscriptions per user (enforced on subscriptions insert)
-- Secure session replacement; token reuse protection via session_token validation
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 Table: public.user_sessions
-- One row per user; stores the single allowed active session.
-- user_id references profiles(id). Only one row per user (enforced by PK).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_sessions (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_sessions IS 'One active session per user; replaced on each login. Validated by matching session_token to current access token and optionally IP/User-Agent.';

-- Ensure last_activity_at exists (table may have been created without it)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_sessions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_sessions' AND column_name = 'last_activity_at') THEN
      ALTER TABLE public.user_sessions ADD COLUMN last_activity_at timestamptz NOT NULL DEFAULT now();
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(last_activity_at);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own session"
  ON public.user_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 1.2 Update profiles table
-- Add last_login_at, last_login_ip (text) for audit and security review.
-- Ensure trial_count exists (integer default 0).
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_login_at') THEN
      ALTER TABLE public.profiles ADD COLUMN last_login_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_login_ip') THEN
      ALTER TABLE public.profiles ADD COLUMN last_login_ip text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'trial_count') THEN
      ALTER TABLE public.profiles ADD COLUMN trial_count integer NOT NULL DEFAULT 0;
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1.3 Trial limit enforcement
-- Trigger: enforce_trial_limit BEFORE INSERT ON public.subscriptions
-- When plan_id = 'trial' (or plan = 'trial' if table has "plan" column), enforce max 3.
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

  IF current_count >= 3 THEN
    RAISE EXCEPTION 'Trial limit reached (max 3 per account).';
  END IF;

  UPDATE public.profiles
  SET trial_count = trial_count + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- Create trigger: fire on every insert; function returns early when not trial
DROP TRIGGER IF EXISTS enforce_trial_limit ON public.subscriptions;
CREATE TRIGGER enforce_trial_limit
  BEFORE INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_trial_limit();

-- -----------------------------------------------------------------------------
-- 2. Secure session replacement function
-- replace_user_session(p_session_token, p_ip_address, p_user_agent)
-- Deletes existing session for user, inserts new row, updates profiles last_login_*
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.replace_user_session(
  p_session_token text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.user_sessions WHERE user_id = v_user_id;

  INSERT INTO public.user_sessions (user_id, session_token, ip_address, user_agent)
  VALUES (v_user_id, p_session_token, p_ip_address, p_user_agent);

  UPDATE public.profiles
  SET last_login_at = now(),
      last_login_ip = p_ip_address
  WHERE id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_user_session(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_user_session(text, text, text) TO service_role;
