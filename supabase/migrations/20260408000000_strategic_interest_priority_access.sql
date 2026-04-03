CREATE TABLE IF NOT EXISTS public.strategic_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id text,
  country text NOT NULL,
  interest_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS strategic_interest_user_created_idx
  ON public.strategic_interest (user_id, created_at DESC);

ALTER TABLE public.strategic_interest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS strategic_interest_own_select ON public.strategic_interest;
CREATE POLICY strategic_interest_own_select ON public.strategic_interest
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS strategic_interest_own_insert ON public.strategic_interest;
CREATE POLICY strategic_interest_own_insert ON public.strategic_interest
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
