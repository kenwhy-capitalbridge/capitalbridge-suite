-- Checkout collects first + last name; store on profiles for CRM / display.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'first_name'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN first_name text;
      COMMENT ON COLUMN public.profiles.first_name IS 'Given name from checkout (optional).';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_name'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN last_name text;
      COMMENT ON COLUMN public.profiles.last_name IS 'Family name from checkout (optional).';
    END IF;
  END IF;
END $$;
