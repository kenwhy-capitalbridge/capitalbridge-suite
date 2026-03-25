-- Shared model data hub (per-user) for cross-app interoperability.
-- Source-of-truth alignment:
-- - auth.users: identity
-- - memberships: access checks in app layer
-- - billing_sessions: payment source (unchanged)

CREATE TABLE IF NOT EXISTS public.model_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_key text NOT NULL CHECK (
    model_key IN (
      'forever-income-model',
      'income-engineering-model',
      'capital-health-model',
      'capital-stress-model'
    )
  ),
  source_app text NOT NULL DEFAULT 'advisoryplatform',
  status text NOT NULL DEFAULT 'completed' CHECK (
    status IN ('draft', 'completed', 'failed')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_runs_user_model_created_at
  ON public.model_runs (user_id, model_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.model_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.model_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_inputs_user_created_at
  ON public.model_inputs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.model_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.model_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_outputs_user_created_at
  ON public.model_outputs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.model_shared_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact_key text NOT NULL,
  fact_value jsonb NOT NULL DEFAULT 'null'::jsonb,
  source_model_key text NOT NULL CHECK (
    source_model_key IN (
      'forever-income-model',
      'income-engineering-model',
      'capital-health-model',
      'capital-stress-model'
    )
  ),
  run_id uuid REFERENCES public.model_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fact_key)
);

CREATE INDEX IF NOT EXISTS idx_model_shared_facts_user_key
  ON public.model_shared_facts (user_id, fact_key);

ALTER TABLE public.model_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_shared_facts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'model_runs' AND policyname = 'model_runs_owner_rw'
  ) THEN
    CREATE POLICY model_runs_owner_rw
      ON public.model_runs
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'model_inputs' AND policyname = 'model_inputs_owner_rw'
  ) THEN
    CREATE POLICY model_inputs_owner_rw
      ON public.model_inputs
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'model_outputs' AND policyname = 'model_outputs_owner_rw'
  ) THEN
    CREATE POLICY model_outputs_owner_rw
      ON public.model_outputs
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'model_shared_facts' AND policyname = 'model_shared_facts_owner_rw'
  ) THEN
    CREATE POLICY model_shared_facts_owner_rw
      ON public.model_shared_facts
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_inputs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_outputs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_shared_facts TO authenticated;
