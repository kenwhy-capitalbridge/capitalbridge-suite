-- Repair user_active_session: one row per user + PK on user_id (required for PostgREST upserts and maybeSingle).
-- Safe if already correct.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_active_session'
  ) THEN
    RETURN;
  END IF;

  DELETE FROM public.user_active_session u
  WHERE u.ctid NOT IN (
    SELECT DISTINCT ON (user_id) ctid
    FROM public.user_active_session
    ORDER BY user_id, updated_at DESC NULLS LAST
  );

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'user_active_session'
      AND c.contype = 'p'
  ) THEN
    ALTER TABLE public.user_active_session
      ADD CONSTRAINT user_active_session_pkey PRIMARY KEY (user_id);
  END IF;
END $$;
