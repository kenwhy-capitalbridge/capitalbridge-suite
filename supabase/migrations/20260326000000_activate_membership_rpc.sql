-- FIX: drop existing function(s) to avoid return type conflict
DROP FUNCTION IF EXISTS public.activate_membership(text, text, text);
DROP FUNCTION IF EXISTS public.activate_membership(text, text);

-- Manual / ops: log payment, then activate membership by email + plan slug.
-- payments row is inserted first (membership_id NULL), then linked after membership is created.

DO $$
BEGIN
IF EXISTS (
SELECT 1 FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'membership_id'
AND is_nullable = 'NO'
) THEN
ALTER TABLE public.payments ALTER COLUMN membership_id DROP NOT NULL;
END IF;
END $$;

CREATE OR REPLACE FUNCTION public.activate_membership(
user_email text,
plan_slug text,
p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
uid uuid;
plan_id_val text;
price_cents_val int;
dur_days int;
is_tr boolean;
exp_ts timestamptz;
new_membership_id uuid;
new_payment_id uuid;
n_expired int;
BEGIN
IF user_email IS NULL OR btrim(user_email) = '' THEN
RETURN jsonb_build_object('ok', false, 'error', 'invalid_email');
END IF;
IF plan_slug IS NULL OR btrim(plan_slug) = '' THEN
RETURN jsonb_build_object('ok', false, 'error', 'invalid_plan_slug');
END IF;

SELECT id INTO uid
FROM auth.users
WHERE lower(btrim(email)) = lower(btrim(user_email))
LIMIT 1;

IF uid IS NULL THEN
RETURN jsonb_build_object('ok', false, 'error', 'user_not_found', 'email', user_email);
END IF;

SELECT p.id, p.duration_days, COALESCE(p.is_trial, false), COALESCE(p.price_cents, 0)
INTO plan_id_val, dur_days, is_tr, price_cents_val
FROM public.plans p
WHERE lower(btrim(p.slug)) = lower(btrim(plan_slug))
LIMIT 1;

IF plan_id_val IS NULL THEN
RETURN jsonb_build_object('ok', false, 'error', 'plan_not_found', 'slug', plan_slug);
END IF;

IF dur_days IS NULL OR dur_days < 1 THEN
dur_days := CASE WHEN is_tr THEN 7 ELSE 30 END;
END IF;

exp_ts := now() + (dur_days::text || ' days')::interval;

-- 1) Payment logging (before membership exists)
INSERT INTO public.payments (
membership_id,
status,
amount_cents,
paid_at,
payment_provider,
payment_currency,
payment_amount,
payment_confirmed_at,
raw_webhook
)
VALUES (
NULL,
'paid',
NULLIF(price_cents_val, 0),
now(),
'manual_admin',
'MYR',
CASE WHEN price_cents_val > 0 THEN (price_cents_val::numeric / 100) ELSE NULL END,
now(),
jsonb_build_object(
'source', 'activate_membership',
'user_email', user_email,
'plan_slug', lower(btrim(plan_slug)),
'user_id', uid,
'plan_id', plan_id_val,
'note', p_note
)
)
RETURNING id INTO new_payment_id;

-- 2) Expire any current active membership for this user
UPDATE public.memberships m
SET
status = 'expired',
expires_at = now(),
end_date = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
cancelled_at = COALESCE(m.cancelled_at, now())
WHERE m.user_id = uid AND m.status = 'active';

GET DIAGNOSTICS n_expired = ROW_COUNT;

-- 3) New active membership
INSERT INTO public.memberships (
user_id,
plan_id,
status,
start_date,
end_date,
started_at,
expires_at
)
VALUES (
uid,
plan_id_val,
'active',
to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
to_char(exp_ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
now(),
exp_ts
)
RETURNING id INTO new_membership_id;

-- 4) Link payment to membership
UPDATE public.payments
SET membership_id = new_membership_id
WHERE id = new_payment_id;

INSERT INTO public.profiles (id)
VALUES (uid)
ON CONFLICT (id) DO NOTHING;

RETURN jsonb_build_object(
'ok', true,
'user_id', uid,
'payment_id', new_payment_id,
'membership_id', new_membership_id,
'plan_slug', lower(btrim(plan_slug)),
'amount_cents', price_cents_val,
'expires_at', exp_ts,
'previous_active_expired', n_expired
);
EXCEPTION
WHEN OTHERS THEN
RETURN jsonb_build_object(
'ok', false,
'error', 'activate_membership_failed',
'detail', SQLERRM
);
END;
$$;

-- Two-arg wrapper (optional note)
CREATE OR REPLACE FUNCTION public.activate_membership(user_email text, plan_slug text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT public.activate_membership(user_email, plan_slug, NULL::text);
$$;

REVOKE ALL ON FUNCTION public.activate_membership(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_membership(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_membership(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_membership(text, text) TO service_role;

COMMENT ON FUNCTION public.activate_membership(text, text, text) IS
'Admin: insert paid payment row, then activate plan for user by email. Call with service_role or SQL editor.';
