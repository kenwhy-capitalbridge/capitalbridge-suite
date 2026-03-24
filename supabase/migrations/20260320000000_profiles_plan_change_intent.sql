-- Foundation: user intent for plan change / refund (manual handling only; no auto-processing).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'plan_change_intent'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN plan_change_intent text;
      COMMENT ON COLUMN public.profiles.plan_change_intent IS 'Optional flag e.g. user_requested_change — admin/manual only.';
    END IF;
  END IF;
END $$;
