-- =============================================================================
-- Payment-first: billing_sessions with email, user created only after payment.
-- Supports unauthenticated flow: email + plan → bill → pay → then create user.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. billing_sessions: add email, make user_id nullable (payment-first has no user until paid)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_sessions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'billing_sessions' AND column_name = 'email') THEN
      ALTER TABLE public.billing_sessions ADD COLUMN email text;
      COMMENT ON COLUMN public.billing_sessions.email IS 'For payment-first flow: user email; user_id is set after payment in webhook.';
    END IF;
    -- Allow user_id to be null for payment-first sessions
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'billing_sessions' AND column_name = 'user_id') THEN
      ALTER TABLE public.billing_sessions ALTER COLUMN user_id DROP NOT NULL;
    END IF;
    -- Analytics on session (optional; also on payments)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'billing_sessions' AND column_name = 'payment_provider') THEN
      ALTER TABLE public.billing_sessions ADD COLUMN payment_provider text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'billing_sessions' AND column_name = 'payment_currency') THEN
      ALTER TABLE public.billing_sessions ADD COLUMN payment_currency text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'billing_sessions' AND column_name = 'payment_amount') THEN
      ALTER TABLE public.billing_sessions ADD COLUMN payment_amount numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'billing_sessions' AND column_name = 'payment_confirmed_at') THEN
      ALTER TABLE public.billing_sessions ADD COLUMN payment_confirmed_at timestamptz;
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. memberships: add billing_session_id for payment-first linkage
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'memberships') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'billing_session_id') THEN
      ALTER TABLE public.memberships ADD COLUMN billing_session_id uuid REFERENCES public.billing_sessions(id) ON DELETE SET NULL;
      COMMENT ON COLUMN public.memberships.billing_session_id IS 'Links membership to billing session (payment-first flow).';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. payment_events: audit log for payment lifecycle (Section 10)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_session_id uuid REFERENCES public.billing_sessions(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_events IS 'Payment lifecycle events (e.g. payment_confirmed) for debugging and auditing.';

CREATE INDEX IF NOT EXISTS idx_payment_events_billing_session ON public.payment_events(billing_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON public.payment_events(created_at DESC);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_events_service_only"
  ON public.payment_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 4. profiles: optional email for display (payment-first sets from session)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
      ALTER TABLE public.profiles ADD COLUMN email text;
    END IF;
  END IF;
END $$;
