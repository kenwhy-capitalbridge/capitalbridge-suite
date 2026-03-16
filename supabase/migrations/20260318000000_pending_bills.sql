-- =============================================================================
-- Pending bills: create Billplz bill before any Supabase user exists.
-- After payment, webhook creates user + profile + membership + payment.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pending_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  plan_id text NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  name text,
  billplz_bill_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pending_bills') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pending_bills' AND column_name = 'email') THEN
      ALTER TABLE public.pending_bills ADD COLUMN email text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pending_bills' AND column_name = 'plan_id') THEN
      ALTER TABLE public.pending_bills ADD COLUMN plan_id text REFERENCES public.plans(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pending_bills' AND column_name = 'name') THEN
      ALTER TABLE public.pending_bills ADD COLUMimage.pngN name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pending_bills' AND column_name = 'billplz_bill_id') THEN
      ALTER TABLE public.pending_bills ADD COLUMN billplz_bill_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pending_bills' AND column_name = 'created_at') THEN
      ALTER TABLE public.pending_bills ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
    END IF;
  END IF;
END $$;

COMMENT ON TABLE public.pending_bills IS 'Billplz bills created before signup; user is created in webhook after payment.';

CREATE INDEX IF NOT EXISTS idx_pending_bills_billplz_bill_id ON public.pending_bills(billplz_bill_id) WHERE billplz_bill_id IS NOT NULL;

ALTER TABLE public.pending_bills ENABLE ROW LEVEL SECURITY;

-- Only service_role writes; no anon/authenticated access (API uses service_role).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pending_bills' AND policyname = 'pending_bills_service_only'
  ) THEN
    CREATE POLICY "pending_bills_service_only"
      ON public.pending_bills
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
