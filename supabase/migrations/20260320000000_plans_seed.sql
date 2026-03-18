-- =============================================================================
-- Ensure public.plans has slug column and rows for trial, monthly, quarterly, strategic.
-- Fixes "invalid_plan" when /api/bill/create looks up by slug.
-- Safe when plans already exists with different columns: adds missing columns then seeds.
-- =============================================================================

-- Add slug and other columns if the table exists but has different schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'slug') THEN
      ALTER TABLE public.plans ADD COLUMN slug text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'name') THEN
      ALTER TABLE public.plans ADD COLUMN name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'price_cents') THEN
      ALTER TABLE public.plans ADD COLUMN price_cents integer NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'duration_days') THEN
      ALTER TABLE public.plans ADD COLUMN duration_days integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'is_trial') THEN
      ALTER TABLE public.plans ADD COLUMN is_trial boolean NOT NULL DEFAULT false;
    END IF;
  END IF;
END $$;

-- Create table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text,
  price_cents integer NOT NULL DEFAULT 0,
  duration_days integer,
  is_trial boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enforce one row per slug (multiple NULLs allowed if old rows have no slug)
CREATE UNIQUE INDEX IF NOT EXISTS plans_slug_key ON public.plans (slug);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plans' AND policyname = 'plans_allow_public_select') THEN
    CREATE POLICY "plans_allow_public_select"
      ON public.plans
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- Seed rows: insert only if slug not already present. id is TEXT; table also has NOT NULL price (numeric).
INSERT INTO public.plans (id, slug, name, price, price_cents, duration_days, is_trial)
SELECT row.id, row.slug, row.name, row.price, row.price_cents, row.duration_days, row.is_trial
FROM (
  SELECT gen_random_uuid()::text AS id, 'trial'::text AS slug, 'Trial Access (7 days)' AS name, 1 AS price, 100 AS price_cents, 7 AS duration_days, true AS is_trial
  UNION ALL SELECT gen_random_uuid()::text, 'monthly', 'Monthly Access (30 days)', 1399, 139900, 30, false
  UNION ALL SELECT gen_random_uuid()::text, 'quarterly', 'Quarterly Access (90 days)', 3900, 390000, 90, false
  UNION ALL SELECT gen_random_uuid()::text, 'strategic', 'Strategic Advisory & Execution', 4999, 499900, 365, false
) AS row
WHERE NOT EXISTS (SELECT 1 FROM public.plans p WHERE p.slug = row.slug);

COMMENT ON TABLE public.plans IS 'Subscription plan catalog; slug used by /api/bill/create and frontend.';
