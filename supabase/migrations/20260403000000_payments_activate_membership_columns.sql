-- Align public.payments with activate_membership RPC (20260326000000) and app types.
-- Some environments created payments before status / lifecycle columns existed.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'status'
    ) THEN
      ALTER TABLE public.payments ADD COLUMN status text;
      COMMENT ON COLUMN public.payments.status IS 'pending | paid | failed';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'amount_cents'
    ) THEN
      ALTER TABLE public.payments ADD COLUMN amount_cents integer;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'paid_at'
    ) THEN
      ALTER TABLE public.payments ADD COLUMN paid_at timestamptz;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'raw_webhook'
    ) THEN
      ALTER TABLE public.payments ADD COLUMN raw_webhook jsonb;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_provider'
    ) THEN
      ALTER TABLE public.payments ADD COLUMN payment_provider text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_currency'
    ) THEN
      ALTER TABLE public.payments ADD COLUMN payment_currency text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_amount'
    ) THEN
      ALTER TABLE public.payments ADD COLUMN payment_amount numeric;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_confirmed_at'
    ) THEN
      ALTER TABLE public.payments ADD COLUMN payment_confirmed_at timestamptz;
    END IF;
  END IF;
END $$;
