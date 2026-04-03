-- Internal pipeline fields for strategic_interest (no new FKs or relationships).

ALTER TABLE public.strategic_interest
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;

ALTER TABLE public.strategic_interest
  DROP CONSTRAINT IF EXISTS strategic_interest_status_check;

ALTER TABLE public.strategic_interest
  ADD CONSTRAINT strategic_interest_status_check
  CHECK (status IN ('new', 'contacted', 'qualified', 'matched', 'onboarded'));

COMMENT ON COLUMN public.strategic_interest.status IS 'Pipeline stage: new | contacted | qualified | matched | onboarded';
