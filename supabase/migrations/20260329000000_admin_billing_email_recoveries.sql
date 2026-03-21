-- Audit trail for support/admin reassignment of paid checkout to a corrected email.
-- Application access: service role only (API). RLS enabled with no policies for anon/authenticated.

CREATE TABLE public.admin_billing_email_recoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id text NOT NULL,
  old_email text,
  new_email text NOT NULL,
  old_user_id uuid,
  new_user_id uuid,
  membership_id uuid,
  status text NOT NULL CHECK (status IN ('completed', 'denied')),
  error_code text,
  performed_by_actor text,
  client_ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_billing_email_recoveries_bill_id_idx
  ON public.admin_billing_email_recoveries (bill_id);

CREATE INDEX admin_billing_email_recoveries_created_at_idx
  ON public.admin_billing_email_recoveries (created_at DESC);

COMMENT ON TABLE public.admin_billing_email_recoveries IS
  'Support/admin tool: wrong-email recovery after payment. See POST /billing/admin/recover-email.';

ALTER TABLE public.admin_billing_email_recoveries ENABLE ROW LEVEL SECURITY;
