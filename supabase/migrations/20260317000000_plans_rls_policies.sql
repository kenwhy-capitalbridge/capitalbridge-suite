-- =============================================================================
-- RLS policies for public.plans (Security Advisor: RLS on but no policies)
-- App usage: API reads plans via service_role (billing/create, billplz-webhook).
-- Plans are catalog/reference data; no owner_id. Allow public read, backend-only write.
-- =============================================================================

-- Allow anyone (anon + authenticated) to read plans (public pricing catalog).
-- INSERT/UPDATE/DELETE have no policy for anon/authenticated → only service_role can write.
DROP POLICY IF EXISTS "plans_allow_public_select" ON public.plans;
CREATE POLICY "plans_allow_public_select"
  ON public.plans
  FOR SELECT
  TO public
  USING (true);
