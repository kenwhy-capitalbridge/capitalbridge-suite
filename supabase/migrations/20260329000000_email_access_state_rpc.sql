-- Smart /access flow: detect whether an email exists in auth.users and if it is confirmed.
-- Used for email-first login (anon RPC; same pattern as email_exists).

CREATE OR REPLACE FUNCTION public.email_access_state(p_email text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'exists', true,
        'email_confirmed', (u.email_confirmed_at IS NOT NULL)
      )
      FROM auth.users u
      WHERE lower(u.email) = lower(trim(p_email))
      LIMIT 1
    ),
    '{"exists": false, "email_confirmed": null}'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION public.email_access_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.email_access_state(text) TO anon, authenticated;

COMMENT ON FUNCTION public.email_access_state(text) IS
  'Returns { exists, email_confirmed } for smart login /access flow.';
