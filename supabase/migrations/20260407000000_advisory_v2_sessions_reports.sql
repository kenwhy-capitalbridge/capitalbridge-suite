-- advisory_v2: Forever / advisory model snapshots (sessions + reports).
--
-- REQUIRED after this migration (hosted Supabase): Dashboard → Project Settings → Data API
-- → "Exposed schemas" → add `advisory_v2`. Without that, PostgREST returns
-- "Invalid schema: advisory_v2" and Forever Save / list will fail.
-- Docs: https://supabase.com/docs/guides/api/using-custom-schemas

CREATE SCHEMA IF NOT EXISTS advisory_v2;

CREATE TABLE IF NOT EXISTS advisory_v2.advisory_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS advisory_v2.advisory_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES advisory_v2.advisory_sessions (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  model_type text NOT NULL CHECK (
    model_type IN (
      'forever-income',
      'income-engineering',
      'capital-health',
      'capital-stress'
    )
  ),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisory_reports_user_model_created
  ON advisory_v2.advisory_reports (user_id, model_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_advisory_sessions_user_created
  ON advisory_v2.advisory_sessions (user_id, created_at DESC);

GRANT USAGE ON SCHEMA advisory_v2 TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA advisory_v2 TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA advisory_v2 TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA advisory_v2
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA advisory_v2
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER TABLE advisory_v2.advisory_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisory_v2.advisory_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advisory_sessions_own ON advisory_v2.advisory_sessions;
CREATE POLICY advisory_sessions_own ON advisory_v2.advisory_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS advisory_reports_own ON advisory_v2.advisory_reports;
CREATE POLICY advisory_reports_own ON advisory_v2.advisory_reports
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
