-- =============================================================================
-- Fix Security Advisor warnings: Function Search Path Mutable
-- Sets search_path = public on public.increment_trial_count and public.has_active_membership
-- so function behavior cannot be changed by caller's search_path (no schema hijacking).
-- Aligns with app: these functions are used for trial/membership logic; behavior unchanged.
-- =============================================================================

DO $$
DECLARE
  r record;
  sig text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('increment_trial_count', 'has_active_membership')
  LOOP
    sig := pg_get_function_identity_arguments(r.oid);
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public',
      r.proname,
      sig
    );
  END LOOP;
END $$;
