-- Allow owners to patch lion_config (and related json) after the row is created on print load.
create policy "report_exports_update_own"
  on public.report_exports
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
