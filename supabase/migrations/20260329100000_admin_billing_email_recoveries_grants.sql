-- Audit table: explicit privileges — only service_role (API server); not exposed via PostgREST to anon/authenticated.
REVOKE ALL ON TABLE public.admin_billing_email_recoveries FROM PUBLIC;
GRANT ALL ON TABLE public.admin_billing_email_recoveries TO service_role;
