-- Authoritative single-session marker for app (not auth.sessions).
-- Application updates this row after successful password login.

CREATE TABLE IF NOT EXISTS public.user_active_session (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_active_session_updated_at ON public.user_active_session (updated_at DESC);

COMMENT ON TABLE public.user_active_session IS 'Single active app session id per user; compared to JWT session_id claim on platform.';

ALTER TABLE public.user_active_session ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_active_session' AND policyname = 'user_active_session_select_own'
  ) THEN
    CREATE POLICY "user_active_session_select_own"
      ON public.user_active_session
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Writes use service role from server routes (bypasses RLS).
