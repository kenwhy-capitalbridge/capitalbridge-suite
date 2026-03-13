-- =============================================================================
-- Fix Security Advisor: Recreate public.active_memberships as SECURITY INVOKER
-- Aligns with app schema: active_memberships has user_id, plan, start_date, end_date
-- (login app + platform use this view; memberships table is the source)
-- =============================================================================

DO $$
DECLARE
  v_def text;
BEGIN
  -- Get current view definition (SELECT part only) from existing view
  v_def := pg_get_viewdef('public.active_memberships'::regclass, true);

  -- Drop the view so we can recreate it without SECURITY DEFINER
  DROP VIEW IF EXISTS public.active_memberships;

  -- Recreate with security_invoker = true (uses caller's permissions/RLS, not view owner)
  EXECUTE format(
    'CREATE VIEW public.active_memberships WITH (security_invoker = true) AS %s',
    v_def
  );
END $$;

-- Ensure app roles can SELECT (matches typical Supabase RLS usage)
GRANT SELECT ON public.active_memberships TO authenticated;
GRANT SELECT ON public.active_memberships TO anon;
