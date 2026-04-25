-- Capital Core Phase 1 (Step 1 only)
-- Scope constrained to:
-- - advisory_v2.capital_graphs
-- - advisory_v2.capital_assets
-- - advisory_v2.capital_liabilities
-- - advisory_v2.capital_income_streams
-- - advisory_v2.capital_obligations
-- - advisory_v2.upsert_capital_graph_snapshot(p_user_id, p_payload)

CREATE SCHEMA IF NOT EXISTS advisory_v2;

CREATE TABLE IF NOT EXISTS advisory_v2.capital_graphs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  base_currency text NOT NULL DEFAULT 'MYR',
  as_of timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_capital_graphs_user_unique
  ON advisory_v2.capital_graphs (user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_capital_graphs_user_id
  ON advisory_v2.capital_graphs (user_id);

CREATE TABLE IF NOT EXISTS advisory_v2.capital_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capital_graph_id uuid NOT NULL REFERENCES advisory_v2.capital_graphs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  asset_type text NOT NULL CHECK (
    asset_type IN ('cash', 'portfolio', 'property', 'insurance', 'private_asset', 'other')
  ),
  label text NOT NULL,
  market_value numeric(20, 6) NOT NULL DEFAULT 0,
  currency text NOT NULL,
  liquidity_days integer NOT NULL DEFAULT 0 CHECK (liquidity_days >= 0),
  source text NOT NULL DEFAULT 'user_manual' CHECK (
    source IN ('user_manual', 'user_confirmed', 'partner_feed', 'system_generated', 'model_derived')
  ),
  as_of timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_capital_assets_graph
  ON advisory_v2.capital_assets (capital_graph_id);

CREATE INDEX IF NOT EXISTS idx_capital_assets_user
  ON advisory_v2.capital_assets (user_id);

CREATE TABLE IF NOT EXISTS advisory_v2.capital_liabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capital_graph_id uuid NOT NULL REFERENCES advisory_v2.capital_graphs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  liability_type text NOT NULL CHECK (
    liability_type IN ('mortgage', 'term_loan', 'credit_facility', 'margin', 'other')
  ),
  label text NOT NULL,
  outstanding_balance numeric(20, 6) NOT NULL DEFAULT 0,
  currency text NOT NULL,
  minimum_monthly_payment numeric(20, 6) NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'user_manual' CHECK (
    source IN ('user_manual', 'user_confirmed', 'partner_feed', 'system_generated', 'model_derived')
  ),
  as_of timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_capital_liabilities_graph
  ON advisory_v2.capital_liabilities (capital_graph_id);

CREATE INDEX IF NOT EXISTS idx_capital_liabilities_user
  ON advisory_v2.capital_liabilities (user_id);

CREATE TABLE IF NOT EXISTS advisory_v2.capital_income_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capital_graph_id uuid NOT NULL REFERENCES advisory_v2.capital_graphs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  income_type text NOT NULL CHECK (
    income_type IN ('salary', 'dividend', 'coupon', 'rental', 'business', 'other')
  ),
  label text NOT NULL,
  gross_amount_monthly numeric(20, 6) NOT NULL DEFAULT 0,
  currency text NOT NULL,
  stability_score integer NOT NULL DEFAULT 50 CHECK (stability_score >= 0 AND stability_score <= 100),
  source text NOT NULL DEFAULT 'user_manual' CHECK (
    source IN ('user_manual', 'user_confirmed', 'partner_feed', 'system_generated', 'model_derived')
  ),
  as_of timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_capital_income_streams_graph
  ON advisory_v2.capital_income_streams (capital_graph_id);

CREATE INDEX IF NOT EXISTS idx_capital_income_streams_user
  ON advisory_v2.capital_income_streams (user_id);

CREATE TABLE IF NOT EXISTS advisory_v2.capital_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capital_graph_id uuid NOT NULL REFERENCES advisory_v2.capital_graphs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  obligation_type text NOT NULL CHECK (
    obligation_type IN ('living_expense', 'debt_service', 'insurance_premium', 'education', 'other')
  ),
  label text NOT NULL,
  amount_monthly numeric(20, 6) NOT NULL DEFAULT 0,
  currency text NOT NULL,
  is_discretionary boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'user_manual' CHECK (
    source IN ('user_manual', 'user_confirmed', 'partner_feed', 'system_generated', 'model_derived')
  ),
  as_of timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_capital_obligations_graph
  ON advisory_v2.capital_obligations (capital_graph_id);

CREATE INDEX IF NOT EXISTS idx_capital_obligations_user
  ON advisory_v2.capital_obligations (user_id);

GRANT USAGE ON SCHEMA advisory_v2 TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA advisory_v2 TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA advisory_v2 TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA advisory_v2
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA advisory_v2
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER TABLE advisory_v2.capital_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisory_v2.capital_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisory_v2.capital_liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisory_v2.capital_income_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisory_v2.capital_obligations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS capital_graphs_own ON advisory_v2.capital_graphs;
CREATE POLICY capital_graphs_own ON advisory_v2.capital_graphs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS capital_assets_own ON advisory_v2.capital_assets;
CREATE POLICY capital_assets_own ON advisory_v2.capital_assets
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM advisory_v2.capital_graphs g
      WHERE g.id = capital_graph_id
        AND g.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM advisory_v2.capital_graphs g
      WHERE g.id = capital_graph_id
        AND g.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS capital_liabilities_own ON advisory_v2.capital_liabilities;
CREATE POLICY capital_liabilities_own ON advisory_v2.capital_liabilities
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM advisory_v2.capital_graphs g
      WHERE g.id = capital_graph_id
        AND g.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM advisory_v2.capital_graphs g
      WHERE g.id = capital_graph_id
        AND g.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS capital_income_streams_own ON advisory_v2.capital_income_streams;
CREATE POLICY capital_income_streams_own ON advisory_v2.capital_income_streams
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM advisory_v2.capital_graphs g
      WHERE g.id = capital_graph_id
        AND g.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM advisory_v2.capital_graphs g
      WHERE g.id = capital_graph_id
        AND g.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS capital_obligations_own ON advisory_v2.capital_obligations;
CREATE POLICY capital_obligations_own ON advisory_v2.capital_obligations
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM advisory_v2.capital_graphs g
      WHERE g.id = capital_graph_id
        AND g.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM advisory_v2.capital_graphs g
      WHERE g.id = capital_graph_id
        AND g.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION advisory_v2.upsert_capital_graph_snapshot(
  p_user_id uuid,
  p_payload jsonb
)
RETURNS TABLE (
  capital_graph_id uuid,
  version integer,
  assets_count integer,
  liabilities_count integer,
  income_streams_count integer,
  obligations_count integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = advisory_v2, public
AS $$
DECLARE
  v_graph_id uuid;
  v_version integer;
  v_now timestamptz := now();
  v_as_of timestamptz;
  v_base_currency text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'p_payload must be a JSON object';
  END IF;

  v_base_currency := upper(COALESCE(NULLIF(p_payload->>'base_currency', ''), 'MYR'));
  v_as_of := COALESCE((p_payload->>'as_of')::timestamptz, v_now);

  SELECT g.id, g.version
  INTO v_graph_id, v_version
  FROM advisory_v2.capital_graphs g
  WHERE g.user_id = p_user_id
    AND g.deleted_at IS NULL
  FOR UPDATE;

  IF v_graph_id IS NULL THEN
    INSERT INTO advisory_v2.capital_graphs (
      user_id,
      base_currency,
      as_of,
      version,
      notes,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      v_base_currency,
      v_as_of,
      1,
      NULLIF(p_payload->>'notes', ''),
      v_now,
      v_now
    )
    RETURNING id, version INTO v_graph_id, v_version;
  ELSE
    UPDATE advisory_v2.capital_graphs
    SET
      base_currency = v_base_currency,
      as_of = v_as_of,
      version = version + 1,
      notes = NULLIF(p_payload->>'notes', ''),
      updated_at = v_now
    WHERE id = v_graph_id
    RETURNING version INTO v_version;
  END IF;

  -- Replace snapshot rows atomically inside this single function transaction.
  DELETE FROM advisory_v2.capital_assets WHERE capital_graph_id = v_graph_id;
  DELETE FROM advisory_v2.capital_liabilities WHERE capital_graph_id = v_graph_id;
  DELETE FROM advisory_v2.capital_income_streams WHERE capital_graph_id = v_graph_id;
  DELETE FROM advisory_v2.capital_obligations WHERE capital_graph_id = v_graph_id;

  INSERT INTO advisory_v2.capital_assets (
    capital_graph_id,
    user_id,
    entity_id,
    asset_type,
    label,
    market_value,
    currency,
    liquidity_days,
    source,
    as_of,
    created_at,
    updated_at
  )
  SELECT
    v_graph_id,
    p_user_id,
    COALESCE((x->>'entity_id')::uuid, p_user_id),
    COALESCE(NULLIF(x->>'asset_type', ''), 'other'),
    COALESCE(NULLIF(x->>'label', ''), 'Unnamed asset'),
    COALESCE(NULLIF(x->>'market_value', ''), '0')::numeric,
    upper(COALESCE(NULLIF(x->>'currency', ''), v_base_currency)),
    COALESCE(NULLIF(x->>'liquidity_days', '')::integer, 0),
    COALESCE(NULLIF(x->>'source', ''), 'user_manual'),
    COALESCE((x->>'as_of')::timestamptz, v_as_of),
    v_now,
    v_now
  FROM jsonb_array_elements(COALESCE(p_payload->'assets', '[]'::jsonb)) AS x
  WHERE jsonb_typeof(x) = 'object';

  INSERT INTO advisory_v2.capital_liabilities (
    capital_graph_id,
    user_id,
    entity_id,
    liability_type,
    label,
    outstanding_balance,
    currency,
    minimum_monthly_payment,
    source,
    as_of,
    created_at,
    updated_at
  )
  SELECT
    v_graph_id,
    p_user_id,
    COALESCE((x->>'entity_id')::uuid, p_user_id),
    COALESCE(NULLIF(x->>'liability_type', ''), 'other'),
    COALESCE(NULLIF(x->>'label', ''), 'Unnamed liability'),
    COALESCE(NULLIF(x->>'outstanding_balance', ''), '0')::numeric,
    upper(COALESCE(NULLIF(x->>'currency', ''), v_base_currency)),
    COALESCE(NULLIF(x->>'minimum_monthly_payment', ''), '0')::numeric,
    COALESCE(NULLIF(x->>'source', ''), 'user_manual'),
    COALESCE((x->>'as_of')::timestamptz, v_as_of),
    v_now,
    v_now
  FROM jsonb_array_elements(COALESCE(p_payload->'liabilities', '[]'::jsonb)) AS x
  WHERE jsonb_typeof(x) = 'object';

  INSERT INTO advisory_v2.capital_income_streams (
    capital_graph_id,
    user_id,
    entity_id,
    income_type,
    label,
    gross_amount_monthly,
    currency,
    stability_score,
    source,
    as_of,
    created_at,
    updated_at
  )
  SELECT
    v_graph_id,
    p_user_id,
    COALESCE((x->>'entity_id')::uuid, p_user_id),
    COALESCE(NULLIF(x->>'income_type', ''), 'other'),
    COALESCE(NULLIF(x->>'label', ''), 'Unnamed income stream'),
    COALESCE(NULLIF(x->>'gross_amount_monthly', ''), '0')::numeric,
    upper(COALESCE(NULLIF(x->>'currency', ''), v_base_currency)),
    COALESCE(NULLIF(x->>'stability_score', '')::integer, 50),
    COALESCE(NULLIF(x->>'source', ''), 'user_manual'),
    COALESCE((x->>'as_of')::timestamptz, v_as_of),
    v_now,
    v_now
  FROM jsonb_array_elements(COALESCE(p_payload->'income_streams', '[]'::jsonb)) AS x
  WHERE jsonb_typeof(x) = 'object';

  INSERT INTO advisory_v2.capital_obligations (
    capital_graph_id,
    user_id,
    entity_id,
    obligation_type,
    label,
    amount_monthly,
    currency,
    is_discretionary,
    source,
    as_of,
    created_at,
    updated_at
  )
  SELECT
    v_graph_id,
    p_user_id,
    COALESCE((x->>'entity_id')::uuid, p_user_id),
    COALESCE(NULLIF(x->>'obligation_type', ''), 'other'),
    COALESCE(NULLIF(x->>'label', ''), 'Unnamed obligation'),
    COALESCE(NULLIF(x->>'amount_monthly', ''), '0')::numeric,
    upper(COALESCE(NULLIF(x->>'currency', ''), v_base_currency)),
    COALESCE(NULLIF(x->>'is_discretionary', '')::boolean, false),
    COALESCE(NULLIF(x->>'source', ''), 'user_manual'),
    COALESCE((x->>'as_of')::timestamptz, v_as_of),
    v_now,
    v_now
  FROM jsonb_array_elements(COALESCE(p_payload->'obligations', '[]'::jsonb)) AS x
  WHERE jsonb_typeof(x) = 'object';

  RETURN QUERY
  SELECT
    v_graph_id,
    v_version,
    (SELECT COUNT(*)::integer FROM advisory_v2.capital_assets WHERE capital_graph_id = v_graph_id),
    (SELECT COUNT(*)::integer FROM advisory_v2.capital_liabilities WHERE capital_graph_id = v_graph_id),
    (SELECT COUNT(*)::integer FROM advisory_v2.capital_income_streams WHERE capital_graph_id = v_graph_id),
    (SELECT COUNT(*)::integer FROM advisory_v2.capital_obligations WHERE capital_graph_id = v_graph_id),
    v_now;
END;
$$;

GRANT EXECUTE ON FUNCTION advisory_v2.upsert_capital_graph_snapshot(uuid, jsonb)
  TO authenticated, service_role;
