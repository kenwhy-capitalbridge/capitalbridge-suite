-- Run in Supabase SQL Editor (production: use read-only role if you have one).
-- strategic_interest.report_id is text; advisory_reports.id is uuid — compare via ::text.

-- ---------------------------------------------------------------------------
-- 1) All strategic interest rows with profile + linked report (when report_id matches)
-- ---------------------------------------------------------------------------
SELECT
  si.id AS strategic_interest_id,
  si.user_id,
  si.report_id,
  si.country,
  si.interest_type,
  si.subscriber_message,
  si.contact_phone,
  si.status,
  si.notes,
  si.last_contacted_at,
  si.created_at AS interest_created_at,
  p.email AS profile_email,
  p.first_name,
  p.last_name,
  ar.id AS linked_advisory_report_id,
  ar.model_type AS linked_model_type,
  ar.created_at AS linked_report_saved_at
FROM public.strategic_interest si
LEFT JOIN public.profiles p ON p.id = si.user_id
LEFT JOIN advisory_v2.advisory_reports ar
  ON ar.id::text = si.report_id
ORDER BY si.created_at DESC;

-- ---------------------------------------------------------------------------
-- 2) Latest saved report per user, per model (for a fixed list of user UUIDs)
--    Replace the UUIDs inside the ARRAY (or use IN (...)).
-- ---------------------------------------------------------------------------
SELECT DISTINCT ON (user_id, model_type)
  user_id,
  model_type,
  id AS report_id,
  session_id,
  created_at,
  inputs,
  results
FROM advisory_v2.advisory_reports
WHERE user_id = ANY (
  ARRAY[
    '00000000-0000-0000-0000-000000000001'::uuid
    -- add more: ,'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid
  ]
)
ORDER BY user_id, model_type, created_at DESC;

-- ---------------------------------------------------------------------------
-- 3) Optional: staff-only insert to record interest tied to a specific report
--    (use service role / SQL as admin; RLS may block anon/authenticated.)
-- ---------------------------------------------------------------------------
-- INSERT INTO public.strategic_interest (
--   user_id,
--   report_id,
--   country,
--   status,
--   subscriber_message
-- )
-- VALUES (
--   'USER_UUID'::uuid,
--   'ADVISORY_REPORT_UUID',  -- text, must equal advisory_v2.advisory_reports.id::text
--   'MY',
--   'new',
--   'Note for ops: correlate with report snapshot.'
-- );
