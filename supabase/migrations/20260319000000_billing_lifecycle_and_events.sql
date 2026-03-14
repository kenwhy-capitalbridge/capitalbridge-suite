-- =============================================================================
-- Billing lifecycle, safety constraints, and event log
-- Sections 10–14, 16: tables, lifecycle fields, constraints, billing_events
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Membership lifecycle columns (started_at, expires_at, cancelled_at, renewed_at)
-- Keep start_date/end_date for backward compatibility; add new columns.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'memberships') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'started_at') THEN
      ALTER TABLE public.memberships ADD COLUMN started_at timestamptz;
      COMMENT ON COLUMN public.memberships.started_at IS 'When membership became active; used with plan.duration_days for expires_at.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'expires_at') THEN
      ALTER TABLE public.memberships ADD COLUMN expires_at timestamptz;
      COMMENT ON COLUMN public.memberships.expires_at IS 'started_at + plan.duration_days; used for access control.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'cancelled_at') THEN
      ALTER TABLE public.memberships ADD COLUMN cancelled_at timestamptz;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'renewed_at') THEN
      ALTER TABLE public.memberships ADD COLUMN renewed_at timestamptz;
    END IF;
    -- Backfill from start_date/end_date
    UPDATE public.memberships SET started_at = start_date::timestamptz WHERE started_at IS NULL AND start_date IS NOT NULL;
    UPDATE public.memberships SET expires_at = end_date::timestamptz WHERE expires_at IS NULL AND end_date IS NOT NULL;
  END IF;
END $$;

-- Allow status 'cancelled' (if enum or check constraint exists, extend it; otherwise app uses text)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'memberships') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'status') THEN
      -- If status is an enum, we'd alter type; if it's text/varchar, no change needed for 'cancelled'
      NULL;
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Payment safety: unique billplz_bill_id
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'payments' AND indexname = 'payments_billplz_bill_id_key'
    ) AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'billplz_bill_id') THEN
      CREATE UNIQUE INDEX payments_billplz_bill_id_key ON public.payments (billplz_bill_id) WHERE billplz_bill_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. One active membership per user (partial unique index)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'memberships') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'memberships' AND indexname = 'memberships_one_active_per_user'
    ) THEN
      CREATE UNIQUE INDEX memberships_one_active_per_user ON public.memberships (user_id)
        WHERE status = 'active';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Billing event log (Section 16)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  membership_id uuid REFERENCES public.memberships(id) ON DELETE SET NULL,
  payment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

COMMENT ON TABLE public.billing_events IS 'Audit log for billing: membership_created, membership_activated, membership_expired, payment_created, payment_succeeded, payment_failed, payment_refunded, webhook_received.';

CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON public.billing_events(created_at);
CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON public.billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON public.billing_events(event_type);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_events_service_only"
  ON public.billing_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
