-- Billplz idempotency: payment row inserted first (unique billplz_bill_id), then membership via RPC.

DO $$
BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
IF NOT EXISTS (
SELECT 1 FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'user_id'
) THEN
ALTER TABLE public.payments ADD COLUMN user_id uuid;
COMMENT ON COLUMN public.payments.user_id IS 'Auth user at payment time (Billplz webhook).';
END IF;
IF NOT EXISTS (
SELECT 1 FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'plan_id'
) THEN
ALTER TABLE public.payments ADD COLUMN plan_id text;
COMMENT ON COLUMN public.payments.plan_id IS 'public.plans.id at payment time.';
END IF;
END IF;
END $$;

-- Enforce unique Billplz bill id when present (idempotent webhook retries)
DROP INDEX IF EXISTS public.payments_billplz_bill_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS payments_billplz_bill_id_unique
ON public.payments (billplz_bill_id)
WHERE billplz_bill_id IS NOT NULL AND btrim(billplz_bill_id) <> '';

CREATE OR REPLACE FUNCTION public.activate_membership_for_billplz(
p_billplz_bill_id text,
p_user_email text,
p_plan_slug text,
p_billing_session_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
pay record;
uid uuid;
plan_id_val text;
slug_norm text;
dur_days int;
is_tr boolean;
exp_ts timestamptz;
new_mid uuid;
n_exp int;
BEGIN
IF p_billplz_bill_id IS NULL OR btrim(p_billplz_bill_id) = '' THEN
RETURN jsonb_build_object('ok', false, 'error', 'bill_id_required');
END IF;
IF p_user_email IS NULL OR btrim(p_user_email) = '' THEN
RETURN jsonb_build_object('ok', false, 'error', 'email_required');
END IF;
IF p_plan_slug IS NULL OR btrim(p_plan_slug) = '' THEN
RETURN jsonb_build_object('ok', false, 'error', 'plan_slug_required');
END IF;

-- LOCK payment row (prevents race conditions / double execution)
SELECT id, membership_id, plan_id AS pay_plan_id
INTO pay
FROM public.payments
WHERE billplz_bill_id = btrim(p_billplz_bill_id)
FOR UPDATE;

IF pay.id IS NULL THEN
RETURN jsonb_build_object('ok', false, 'error', 'payment_not_found', 'billplz_bill_id', p_billplz_bill_id);
END IF;

-- Idempotent: already processed
IF pay.membership_id IS NOT NULL THEN
RETURN jsonb_build_object(
'ok', true,
'idempotent', true,
'membership_id', pay.membership_id,
'payment_id', pay.id
);
END IF;

SELECT au.id INTO uid
FROM auth.users au
WHERE lower(btrim(au.email)) = lower(btrim(p_user_email))
LIMIT 1;

IF uid IS NULL THEN
RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
END IF;

slug_norm := lower(btrim(p_plan_slug));

SELECT p.id, p.duration_days, COALESCE(p.is_trial, false)
INTO plan_id_val, dur_days, is_tr
FROM public.plans p
WHERE lower(btrim(p.slug)) = slug_norm
LIMIT 1;

IF plan_id_val IS NULL THEN
RETURN jsonb_build_object('ok', false, 'error', 'plan_not_found', 'slug', p_plan_slug);
END IF;

-- Safety: ensure payment plan matches expected plan
IF pay.pay_plan_id IS NOT NULL AND btrim(pay.pay_plan_id::text) <> btrim(plan_id_val::text) THEN
RETURN jsonb_build_object('ok', false, 'error', 'plan_mismatch_payment_vs_slug');
END IF;

IF dur_days IS NULL OR dur_days < 1 THEN
dur_days := CASE WHEN is_tr THEN 7 ELSE 30 END;
END IF;

exp_ts := now() + (dur_days::text || ' days')::interval;

-- Expire existing memberships
UPDATE public.memberships m
SET
status = 'expired',
expires_at = now(),
end_date = now(),
cancelled_at = COALESCE(m.cancelled_at, now())
WHERE m.user_id = uid AND m.status = 'active';

GET DIAGNOSTICS n_exp = ROW_COUNT;

-- Create new membership
INSERT INTO public.memberships (
user_id,
plan_id,
status,
billing_session_id,
start_date,
end_date,
started_at,
expires_at
)
VALUES (
uid,
plan_id_val,
'active',
p_billing_session_id,
now(),
exp_ts,
now(),
exp_ts
)
RETURNING id INTO new_mid;

-- Link payment → membership
UPDATE public.payments
SET membership_id = new_mid
WHERE id = pay.id;

INSERT INTO public.profiles (id, email)
VALUES (uid, lower(btrim(p_user_email)))
ON CONFLICT (id) DO NOTHING;

RETURN jsonb_build_object(
'ok', true,
'membership_id', new_mid,
'payment_id', pay.id,
'previous_active_expired', n_exp,
'is_trial', is_tr
);

EXCEPTION
WHEN OTHERS THEN
RETURN jsonb_build_object('ok', false, 'error', 'activate_failed', 'detail', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_membership_for_billplz(text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_membership_for_billplz(text, text, text, uuid) TO service_role;

-- 3-arg overload (no billing session)
CREATE OR REPLACE FUNCTION public.activate_membership_for_billplz(
p_billplz_bill_id text,
p_user_email text,
p_plan_slug text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT public.activate_membership_for_billplz(p_billplz_bill_id, p_user_email, p_plan_slug, NULL::uuid);
$$;

REVOKE ALL ON FUNCTION public.activate_membership_for_billplz(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_membership_for_billplz(text, text, text) TO service_role;

COMMENT ON FUNCTION public.activate_membership_for_billplz(text, text, text, uuid) IS
'After payments row exists for billplz_bill_id: create membership and link. Idempotent if membership_id already set.';
