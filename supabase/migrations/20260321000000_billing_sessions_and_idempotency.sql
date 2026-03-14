-- =============================================================================
-- Billing sessions + idempotency: one session = at most one charge, one membership.
-- PART 1 (session), PART 3 (DB constraints), PART 8 (audit via billing_events).
-- Run this migration before deploying the updated API billing/create and webhook.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Billing sessions table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'bill_created', 'paid')),
  bill_id text,
  payment_url text,
  membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.billing_sessions IS 'One session = at most one Billplz bill and one successful payment. Idempotency key for billing lifecycle.';

CREATE UNIQUE INDEX IF NOT EXISTS billing_sessions_bill_id_key
  ON public.billing_sessions (bill_id) WHERE bill_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_sessions_user_plan_status
  ON public.billing_sessions (user_id, plan_id, status);

CREATE INDEX IF NOT EXISTS idx_billing_sessions_created_at
  ON public.billing_sessions (created_at DESC);

ALTER TABLE public.billing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_sessions_service_only"
  ON public.billing_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 2. One active membership per (user_id, plan_id) — prevents duplicate subscriptions
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'memberships') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'memberships' AND indexname = 'memberships_one_active_per_user_plan'
    ) THEN
      CREATE UNIQUE INDEX memberships_one_active_per_user_plan
        ON public.memberships (user_id, plan_id)
        WHERE status = 'active';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Optional: link payments to billing_session for audit (add column if missing)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'billing_session_id') THEN
      ALTER TABLE public.payments ADD COLUMN billing_session_id uuid REFERENCES public.billing_sessions(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. billing_events: allow billing_session_id in metadata (no schema change; use metadata.billing_session_id)
-- -----------------------------------------------------------------------------
COMMENT ON TABLE public.billing_events IS 'Audit log: session_created, bill_created, payment_succeeded, membership_activated, webhook_received. metadata can include billing_session_id, bill_id, plan, status_transitions.';
