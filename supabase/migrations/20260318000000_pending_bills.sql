-- =============================================================================
-- Pending bills: create Billplz bill before any Supabase user exists.
-- After payment, webhook creates user + profile + membership + payment.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pending_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  name text,
  billplz_bill_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pending_bills IS 'Billplz bills created before signup; user is created in webhook after payment.';

CREATE INDEX IF NOT EXISTS idx_pending_bills_billplz_bill_id ON public.pending_bills(billplz_bill_id) WHERE billplz_bill_id IS NOT NULL;

ALTER TABLE public.pending_bills ENABLE ROW LEVEL SECURITY;

-- Only service_role writes; no anon/authenticated access (API uses service_role).
CREATE POLICY "pending_bills_service_only"
  ON public.pending_bills
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
