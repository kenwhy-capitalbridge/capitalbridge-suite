-- Ensure user_id is unique for session slot (needed for PostgREST upserts elsewhere; fixes drift when PK is on another column).
-- No-op if PRIMARY KEY or UNIQUE on user_id already exists.

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

  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'user_active_session'
      AND c.contype IN ('p', 'u')
      AND pg_get_constraintdef(c.oid) LIKE '%user_id%'
  ) THEN
    RETURN;
  END IF;

  ALTER TABLE public.user_active_session
    ADD CONSTRAINT user_active_session_user_id_key UNIQUE (user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
