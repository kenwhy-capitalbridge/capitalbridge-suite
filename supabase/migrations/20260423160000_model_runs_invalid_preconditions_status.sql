-- Allow explicit model run state when domain preconditions are not met.

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT c.conname
  INTO v_constraint_name
  FROM pg_constraint c
  WHERE c.conrelid = 'public.model_runs'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.model_runs DROP CONSTRAINT %I', v_constraint_name);
  END IF;

  ALTER TABLE public.model_runs
    ADD CONSTRAINT model_runs_status_check
    CHECK (
      status IN ('draft', 'completed', 'failed', 'invalid_preconditions')
    );
END $$;
