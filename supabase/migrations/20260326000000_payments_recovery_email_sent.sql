-- Idempotent recovery email: webhook retries must not spam users.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS recovery_email_sent boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.payments.recovery_email_sent IS 'True after post-payment recovery/set-password email was sent for this bill.';
