-- =============================================================================
-- Fix "record NEW has no field starts_at" on memberships trigger.
-- Add starts_at so trigger functions that reference NEW.starts_at work.
-- Backfill from started_at, start_date, or created_at.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'memberships') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'starts_at') THEN
      ALTER TABLE public.memberships ADD COLUMN starts_at timestamptz;
      COMMENT ON COLUMN public.memberships.starts_at IS 'Start time for membership; used by trigger. Synced from started_at/start_date/created_at.';
    END IF;
  END IF;
END $$;

-- Backfill: started_at -> starts_at, else start_date, else now()
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'starts_at') THEN
    UPDATE public.memberships
    SET starts_at = COALESCE(starts_at, started_at, start_date::timestamptz, now())
    WHERE starts_at IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memberships' AND column_name = 'starts_at') THEN
    ALTER TABLE public.memberships ALTER COLUMN starts_at SET DEFAULT now();
  END IF;
END $$;
