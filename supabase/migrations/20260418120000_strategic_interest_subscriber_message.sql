-- Free-text note from the subscriber (platform /solutions priority access form).
ALTER TABLE public.strategic_interest
  ADD COLUMN IF NOT EXISTS subscriber_message text;

COMMENT ON COLUMN public.strategic_interest.subscriber_message IS
  'Optional message from the subscriber with their strategic priority access request.';

-- Ensure service role can write (some projects restrict defaults).
GRANT ALL ON TABLE public.strategic_interest TO service_role;
