-- GITEX Asia 2026 — coupon table, profile flags, plan rows, analytics (isolated campaign; removable post-event).

-- -----------------------------------------------------------------------------
-- 1) Campaign coupons
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gitex_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('15', '25')),
  duration_days integer NOT NULL CHECK (duration_days IN (7, 14)),
  is_used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  used_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  expiry_date date NOT NULL DEFAULT '2026-04-30',
  campaign_tag text NOT NULL DEFAULT 'GITEX2026',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gitex_coupons_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS gitex_coupons_campaign_tag_idx ON public.gitex_coupons (campaign_tag);
CREATE INDEX IF NOT EXISTS gitex_coupons_is_used_idx ON public.gitex_coupons (is_used);

ALTER TABLE public.gitex_coupons ENABLE ROW LEVEL SECURITY;

-- No direct client access; service role bypasses RLS.
DROP POLICY IF EXISTS gitex_coupons_deny_all ON public.gitex_coupons;
DROP POLICY IF EXISTS gitex_coupons_deny_anon ON public.gitex_coupons;
CREATE POLICY gitex_coupons_deny_all ON public.gitex_coupons FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY gitex_coupons_deny_anon ON public.gitex_coupons FOR ALL TO anon USING (false) WITH CHECK (false);

COMMENT ON TABLE public.gitex_coupons IS 'GITEX 2026 printed coupon codes; validated only via server (service role).';

-- -----------------------------------------------------------------------------
-- 2) Profile campaign flags (guided / event trial)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'access_type') THEN
      ALTER TABLE public.profiles ADD COLUMN access_type text;
      COMMENT ON COLUMN public.profiles.access_type IS 'Optional access mode: e.g. gitex_trial for event guided access.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'campaign_source') THEN
      ALTER TABLE public.profiles ADD COLUMN campaign_source text;
      COMMENT ON COLUMN public.profiles.campaign_source IS 'Marketing / campaign tag (e.g. GITEX2026).';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'campaign_trial_ends_at') THEN
      ALTER TABLE public.profiles ADD COLUMN campaign_trial_ends_at timestamptz;
      COMMENT ON COLUMN public.profiles.campaign_trial_ends_at IS 'End of campaign trial window (redemption-based).';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'converted_from_gitex_at') THEN
      ALTER TABLE public.profiles ADD COLUMN converted_from_gitex_at timestamptz;
      COMMENT ON COLUMN public.profiles.converted_from_gitex_at IS 'When user upgraded from GITEX guided trial to paid (optional analytics).';
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3) Plan rows for activate_membership (7 / 14 day event passes)
-- -----------------------------------------------------------------------------
INSERT INTO public.plans (id, slug, name, price, price_cents, duration_days, is_trial)
SELECT gen_random_uuid()::text, 'gitex_7'::text, 'GITEX Guided Access (7 days)'::text, 0, 0, 7, true
WHERE NOT EXISTS (SELECT 1 FROM public.plans p WHERE lower(p.slug) = 'gitex_7');

INSERT INTO public.plans (id, slug, name, price, price_cents, duration_days, is_trial)
SELECT gen_random_uuid()::text, 'gitex_14'::text, 'GITEX Guided Access (14 days)'::text, 0, 0, 14, true
WHERE NOT EXISTS (SELECT 1 FROM public.plans p WHERE lower(p.slug) = 'gitex_14');

-- -----------------------------------------------------------------------------
-- 4) Lightweight analytics (append-only)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gitex_campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  coupon_id uuid REFERENCES public.gitex_coupons (id) ON DELETE SET NULL,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gitex_campaign_events_type_idx ON public.gitex_campaign_events (event_type);
CREATE INDEX IF NOT EXISTS gitex_campaign_events_created_idx ON public.gitex_campaign_events (created_at DESC);

ALTER TABLE public.gitex_campaign_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gitex_campaign_events_deny_all ON public.gitex_campaign_events;
DROP POLICY IF EXISTS gitex_campaign_events_deny_anon ON public.gitex_campaign_events;
CREATE POLICY gitex_campaign_events_deny_all ON public.gitex_campaign_events FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY gitex_campaign_events_deny_anon ON public.gitex_campaign_events FOR ALL TO anon USING (false) WITH CHECK (false);

COMMENT ON TABLE public.gitex_campaign_events IS 'GITEX redemption / conversion funnel (service role only).';
