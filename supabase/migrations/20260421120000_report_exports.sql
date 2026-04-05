-- Per-download PDF export log. id = exportId (new each download). report_id = base traceability reference.
create table public.report_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  report_id text not null,
  tier text,
  lion_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.report_exports is 'Forever v6+ PDF: one row per export; re-download uses same export id to reproduce lion selection etc.';
comment on column public.report_exports.id is 'exportId — new UUID each download.';
comment on column public.report_exports.report_id is 'Base report reference (e.g. CB-FOREVER-…), stable traceability id.';
comment on column public.report_exports.lion_config is 'JSON: selected headline/guidance indices or verbatim keys for anti-repeat and reproduction.';

create index report_exports_user_id_created_at_idx on public.report_exports (user_id, created_at desc);
create index report_exports_report_id_idx on public.report_exports (report_id);

alter table public.report_exports enable row level security;

create policy "report_exports_select_own"
  on public.report_exports
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "report_exports_insert_own"
  on public.report_exports
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
