-- Optional contact number for strategic_interest (E.164-friendly text; not validated as strict E.164).
ALTER TABLE public.strategic_interest
  ADD COLUMN IF NOT EXISTS contact_phone text;

COMMENT ON COLUMN public.strategic_interest.contact_phone IS 'Optional subscriber phone; may include country code (+...)';
