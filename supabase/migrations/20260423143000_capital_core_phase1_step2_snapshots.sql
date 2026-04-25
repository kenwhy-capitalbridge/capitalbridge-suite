-- Capital Core Phase 1 (Step 2)
-- Deterministic, version-anchored snapshot baseline.

CREATE SCHEMA IF NOT EXISTS advisory_v2;

-- Anchor child rows to graph version used during write.
ALTER TABLE advisory_v2.capital_assets
  ADD COLUMN IF NOT EXISTS capital_graph_version integer NOT NULL DEFAULT 1 CHECK (capital_graph_version >= 1);

ALTER TABLE advisory_v2.capital_liabilities
  ADD COLUMN IF NOT EXISTS capital_graph_version integer NOT NULL DEFAULT 1 CHECK (capital_graph_version >= 1);

ALTER TABLE advisory_v2.capital_income_streams
  ADD COLUMN IF NOT EXISTS capital_graph_version integer NOT NULL DEFAULT 1 CHECK (capital_graph_version >= 1);

ALTER TABLE advisory_v2.capital_obligations
  ADD COLUMN IF NOT EXISTS capital_graph_version integer NOT NULL DEFAULT 1 CHECK (capital_graph_version >= 1);

UPDATE advisory_v2.capital_assets a
SET capital_graph_version = g.version
FROM advisory_v2.capital_graphs g
WHERE a.capital_graph_id = g.id;

UPDATE advisory_v2.capital_liabilities l
SET capital_graph_version = g.version
FROM advisory_v2.capital_graphs g
WHERE l.capital_graph_id = g.id;

UPDATE advisory_v2.capital_income_streams i
SET capital_graph_version = g.version
FROM advisory_v2.capital_graphs g
WHERE i.capital_graph_id = g.id;

UPDATE advisory_v2.capital_obligations o
SET capital_graph_version = g.version
FROM advisory_v2.capital_graphs g
WHERE o.capital_graph_id = g.id;

CREATE INDEX IF NOT EXISTS idx_capital_assets_graph_version
  ON advisory_v2.capital_assets (capital_graph_id, capital_graph_version);

CREATE INDEX IF NOT EXISTS idx_capital_liabilities_graph_version
  ON advisory_v2.capital_liabilities (capital_graph_id, capital_graph_version);

CREATE INDEX IF NOT EXISTS idx_capital_income_streams_graph_version
  ON advisory_v2.capital_income_streams (capital_graph_id, capital_graph_version);

CREATE INDEX IF NOT EXISTS idx_capital_obligations_graph_version
  ON advisory_v2.capital_obligations (capital_graph_id, capital_graph_version);

-- Replace Step 1 function so new child rows are written with explicit graph version anchor.
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

  DELETE FROM advisory_v2.capital_assets WHERE capital_graph_id = v_graph_id;
  DELETE FROM advisory_v2.capital_liabilities WHERE capital_graph_id = v_graph_id;
  DELETE FROM advisory_v2.capital_income_streams WHERE capital_graph_id = v_graph_id;
  DELETE FROM advisory_v2.capital_obligations WHERE capital_graph_id = v_graph_id;

  INSERT INTO advisory_v2.capital_assets (
    capital_graph_id,
    capital_graph_version,
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
    v_version,
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
    capital_graph_version,
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
    v_version,
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
    capital_graph_version,
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
    v_version,
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
    capital_graph_version,
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
    v_version,
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

-- Deterministic snapshot baseline table.
CREATE TABLE IF NOT EXISTS advisory_v2.capital_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capital_graph_id uuid NOT NULL REFERENCES advisory_v2.capital_graphs (id) ON DELETE CASCADE,
  capital_graph_version integer NOT NULL CHECK (capital_graph_version >= 1),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  snapshot_at timestamptz NOT NULL,
  base_currency text NOT NULL,
  total_assets numeric(20, 6) NOT NULL,
  total_liabilities numeric(20, 6) NOT NULL,
  net_worth numeric(20, 6) NOT NULL,
  monthly_income_total numeric(20, 6) NOT NULL,
  monthly_obligations_total numeric(20, 6) NOT NULL,
  monthly_surplus numeric(20, 6) NOT NULL,
  liquidity_buffer_months numeric(20, 6) NOT NULL,
  computed_from_record_count integer NOT NULL,
  computed_from jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (capital_graph_id, capital_graph_version)
);

CREATE INDEX IF NOT EXISTS idx_capital_snapshots_user
  ON advisory_v2.capital_snapshots (user_id);

CREATE INDEX IF NOT EXISTS idx_capital_snapshots_graph_version
  ON advisory_v2.capital_snapshots (capital_graph_id, capital_graph_version);

ALTER TABLE advisory_v2.capital_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS capital_snapshots_own ON advisory_v2.capital_snapshots;
CREATE POLICY capital_snapshots_own ON advisory_v2.capital_snapshots
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION advisory_v2.generate_capital_snapshot(
  p_user_id uuid,
  p_capital_graph_id uuid,
  p_capital_graph_version integer
)
RETURNS TABLE (
  snapshot_id uuid,
  capital_graph_id uuid,
  capital_graph_version integer,
  total_assets numeric,
  total_liabilities numeric,
  net_worth numeric,
  monthly_income_total numeric,
  monthly_obligations_total numeric,
  monthly_surplus numeric,
  liquidity_buffer_months numeric,
  computed_from_record_count integer,
  computed_from jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = advisory_v2, public
AS $$
DECLARE
  v_graph advisory_v2.capital_graphs%ROWTYPE;
  v_existing advisory_v2.capital_snapshots%ROWTYPE;
  v_total_assets numeric(20, 6);
  v_total_liabilities numeric(20, 6);
  v_net_worth numeric(20, 6);
  v_monthly_income_total numeric(20, 6);
  v_monthly_obligations_total numeric(20, 6);
  v_monthly_surplus numeric(20, 6);
  v_liquid_assets numeric(20, 6);
  v_liquidity_buffer_months numeric(20, 6);
  v_assets_count integer;
  v_liabilities_count integer;
  v_income_streams_count integer;
  v_obligations_count integer;
  v_record_count integer;
  v_computed_from jsonb;
BEGIN
  IF p_user_id IS NULL OR p_capital_graph_id IS NULL OR p_capital_graph_version IS NULL THEN
    RAISE EXCEPTION 'p_user_id, p_capital_graph_id, p_capital_graph_version are required';
  END IF;

  SELECT *
  INTO v_graph
  FROM advisory_v2.capital_graphs g
  WHERE g.id = p_capital_graph_id
    AND g.user_id = p_user_id
    AND g.deleted_at IS NULL
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'capital_graph_not_found';
  END IF;

  IF v_graph.version <> p_capital_graph_version THEN
    RAISE EXCEPTION 'capital_graph_version_mismatch';
  END IF;

  SELECT
    COALESCE(SUM(a.market_value), 0)::numeric(20, 6),
    COALESCE(SUM(CASE WHEN a.liquidity_days <= 30 THEN a.market_value ELSE 0 END), 0)::numeric(20, 6),
    COUNT(*)::integer
  INTO v_total_assets, v_liquid_assets, v_assets_count
  FROM advisory_v2.capital_assets a
  WHERE a.capital_graph_id = p_capital_graph_id
    AND a.capital_graph_version = p_capital_graph_version
    AND a.deleted_at IS NULL
    AND a.as_of <= v_graph.as_of;

  SELECT
    COALESCE(SUM(l.outstanding_balance), 0)::numeric(20, 6),
    COUNT(*)::integer
  INTO v_total_liabilities, v_liabilities_count
  FROM advisory_v2.capital_liabilities l
  WHERE l.capital_graph_id = p_capital_graph_id
    AND l.capital_graph_version = p_capital_graph_version
    AND l.deleted_at IS NULL
    AND l.as_of <= v_graph.as_of;

  SELECT
    COALESCE(SUM(i.gross_amount_monthly), 0)::numeric(20, 6),
    COUNT(*)::integer
  INTO v_monthly_income_total, v_income_streams_count
  FROM advisory_v2.capital_income_streams i
  WHERE i.capital_graph_id = p_capital_graph_id
    AND i.capital_graph_version = p_capital_graph_version
    AND i.deleted_at IS NULL
    AND i.as_of <= v_graph.as_of;

  SELECT
    COALESCE(SUM(o.amount_monthly), 0)::numeric(20, 6),
    COUNT(*)::integer
  INTO v_monthly_obligations_total, v_obligations_count
  FROM advisory_v2.capital_obligations o
  WHERE o.capital_graph_id = p_capital_graph_id
    AND o.capital_graph_version = p_capital_graph_version
    AND o.deleted_at IS NULL
    AND o.as_of <= v_graph.as_of;

  IF v_total_assets IS NULL OR v_total_liabilities IS NULL OR v_monthly_income_total IS NULL OR v_monthly_obligations_total IS NULL THEN
    RAISE EXCEPTION 'snapshot_null_aggregation';
  END IF;

  v_net_worth := (v_total_assets - v_total_liabilities)::numeric(20, 6);
  v_monthly_surplus := (v_monthly_income_total - v_monthly_obligations_total)::numeric(20, 6);
  v_liquidity_buffer_months := CASE
    WHEN v_monthly_obligations_total > 0 THEN (v_liquid_assets / v_monthly_obligations_total)::numeric(20, 6)
    ELSE 0::numeric(20, 6)
  END;
  v_record_count := v_assets_count + v_liabilities_count + v_income_streams_count + v_obligations_count;
  v_computed_from := jsonb_build_object(
    'assets_count', v_assets_count,
    'liabilities_count', v_liabilities_count,
    'income_streams_count', v_income_streams_count,
    'obligations_count', v_obligations_count
  );

  IF v_net_worth <> (v_total_assets - v_total_liabilities)::numeric(20, 6) THEN
    RAISE EXCEPTION 'snapshot_invariant_net_worth_mismatch';
  END IF;

  IF v_monthly_surplus <> (v_monthly_income_total - v_monthly_obligations_total)::numeric(20, 6) THEN
    RAISE EXCEPTION 'snapshot_invariant_monthly_surplus_mismatch';
  END IF;

  SELECT *
  INTO v_existing
  FROM advisory_v2.capital_snapshots s
  WHERE s.capital_graph_id = p_capital_graph_id
    AND s.capital_graph_version = p_capital_graph_version
  FOR UPDATE;

  IF FOUND THEN
    IF
      v_existing.total_assets <> v_total_assets OR
      v_existing.total_liabilities <> v_total_liabilities OR
      v_existing.net_worth <> (v_total_assets - v_total_liabilities) OR
      v_existing.monthly_income_total <> v_monthly_income_total OR
      v_existing.monthly_obligations_total <> v_monthly_obligations_total OR
      v_existing.monthly_surplus <> v_monthly_surplus OR
      v_existing.liquidity_buffer_months <> v_liquidity_buffer_months OR
      v_existing.computed_from_record_count <> v_record_count OR
      v_existing.computed_from <> v_computed_from
    THEN
      RAISE EXCEPTION 'snapshot_validation_mismatch_existing';
    END IF;

    RETURN QUERY
    SELECT
      v_existing.id,
      v_existing.capital_graph_id,
      v_existing.capital_graph_version,
      v_existing.total_assets,
      v_existing.total_liabilities,
      v_existing.net_worth,
      v_existing.monthly_income_total,
      v_existing.monthly_obligations_total,
      v_existing.monthly_surplus,
      v_existing.liquidity_buffer_months,
      v_existing.computed_from_record_count,
      v_existing.computed_from,
      v_existing.created_at;
    RETURN;
  END IF;

  INSERT INTO advisory_v2.capital_snapshots (
    capital_graph_id,
    capital_graph_version,
    user_id,
    snapshot_at,
    base_currency,
    total_assets,
    total_liabilities,
    net_worth,
    monthly_income_total,
    monthly_obligations_total,
    monthly_surplus,
    liquidity_buffer_months,
    computed_from_record_count,
    computed_from
  )
  VALUES (
    p_capital_graph_id,
    p_capital_graph_version,
    p_user_id,
    v_graph.as_of,
    v_graph.base_currency,
    v_total_assets,
    v_total_liabilities,
    v_net_worth,
    v_monthly_income_total,
    v_monthly_obligations_total,
    v_monthly_surplus,
    v_liquidity_buffer_months,
    v_record_count,
    v_computed_from
  )
  ON CONFLICT (capital_graph_id, capital_graph_version) DO NOTHING
  RETURNING
    id,
    capital_graph_id,
    capital_graph_version,
    total_assets,
    total_liabilities,
    net_worth,
    monthly_income_total,
    monthly_obligations_total,
    monthly_surplus,
    liquidity_buffer_months,
    computed_from_record_count,
    computed_from,
    created_at
  INTO
    snapshot_id,
    capital_graph_id,
    capital_graph_version,
    total_assets,
    total_liabilities,
    net_worth,
    monthly_income_total,
    monthly_obligations_total,
    monthly_surplus,
    liquidity_buffer_months,
    computed_from_record_count,
    computed_from,
    created_at;

  IF snapshot_id IS NULL THEN
    SELECT *
    INTO v_existing
    FROM advisory_v2.capital_snapshots s
    WHERE s.capital_graph_id = p_capital_graph_id
      AND s.capital_graph_version = p_capital_graph_version
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'snapshot_conflict_no_existing';
    END IF;

    IF
      v_existing.total_assets <> v_total_assets OR
      v_existing.total_liabilities <> v_total_liabilities OR
      v_existing.net_worth <> v_net_worth OR
      v_existing.monthly_income_total <> v_monthly_income_total OR
      v_existing.monthly_obligations_total <> v_monthly_obligations_total OR
      v_existing.monthly_surplus <> v_monthly_surplus OR
      v_existing.liquidity_buffer_months <> v_liquidity_buffer_months OR
      v_existing.computed_from_record_count <> v_record_count OR
      v_existing.computed_from <> v_computed_from
    THEN
      RAISE EXCEPTION 'snapshot_validation_mismatch_existing';
    END IF;

    RETURN QUERY
    SELECT
      v_existing.id,
      v_existing.capital_graph_id,
      v_existing.capital_graph_version,
      v_existing.total_assets,
      v_existing.total_liabilities,
      v_existing.net_worth,
      v_existing.monthly_income_total,
      v_existing.monthly_obligations_total,
      v_existing.monthly_surplus,
      v_existing.liquidity_buffer_months,
      v_existing.computed_from_record_count,
      v_existing.computed_from,
      v_existing.created_at;
    RETURN;
  END IF;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION advisory_v2.generate_capital_snapshot(uuid, uuid, integer)
  TO authenticated, service_role;
