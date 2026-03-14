-- =============================================================================
-- Payment diagnostics (Section 3) and billing analytics (Section 4).
-- billing_sessions: payment_attempt_count, last_payment_error
-- payments: payment_provider, payment_currency, payment_amount, payment_confirmed_at
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Billing sessions: payment diagnostics
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_sessions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'billing_sessions' AND column_name = 'payment_attempt_count') THEN
      ALTER TABLE public.billing_sessions ADD COLUMN payment_attempt_count integer NOT NULL DEFAULT 0;
      COMMENT ON COLUMN public.billing_sessions.payment_attempt_count IS 'Number of times the user attempted to pay for this session (retries, refresh).';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'billing_sessions' AND column_name = 'last_payment_error') THEN
      ALTER TABLE public.billing_sessions ADD COLUMN last_payment_error text;
      COMMENT ON COLUMN public.billing_sessions.last_payment_error IS 'Most recent payment failure reason (e.g. payment_expired, payment_cancelled, network_error, invalid_bill, user_abandoned).';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Payments: analytics for revenue and auditing
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_provider') THEN
      ALTER TABLE public.payments ADD COLUMN payment_provider text;
      COMMENT ON COLUMN public.payments.payment_provider IS 'Gateway that processed the transaction (e.g. billplz).';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_currency') THEN
      ALTER TABLE public.payments ADD COLUMN payment_currency text;
      COMMENT ON COLUMN public.payments.payment_currency IS 'Currency code for the transaction (e.g. MYR).';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_amount') THEN
      ALTER TABLE public.payments ADD COLUMN payment_amount numeric;
      COMMENT ON COLUMN public.payments.payment_amount IS 'Exact amount processed (for revenue tracking).';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'payment_confirmed_at') THEN
      ALTER TABLE public.payments ADD COLUMN payment_confirmed_at timestamptz;
      COMMENT ON COLUMN public.payments.payment_confirmed_at IS 'When the payment was confirmed by the webhook.';
    END IF;
  END IF;
END $$;
