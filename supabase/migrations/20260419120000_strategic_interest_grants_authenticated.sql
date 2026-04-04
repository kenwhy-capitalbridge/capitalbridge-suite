-- API route uses the logged-in session (authenticated role) to insert; RLS policies
-- strategic_interest_own_insert / own_select must be paired with table grants.
GRANT SELECT, INSERT ON TABLE public.strategic_interest TO authenticated;
