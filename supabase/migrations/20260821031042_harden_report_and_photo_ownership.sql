-- Keep the mobile-facing report behavior identical while making policy checks
-- stable per statement and preventing cross-user Storage writes.

alter function public.set_report_expiration() set search_path = '';
alter function public.delete_expired_reports() set search_path = '';

create or replace function public.delete_expired_reports()
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.reports
  where expires_at < now();
end;
$$;

drop policy if exists "Users Can Delete Their Own Reports"
  on public.reports;
create policy "Users Can Delete Their Own Reports"
  on public.reports
  for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "Users Can Insert Their Own Reports"
  on public.reports;
create policy "Users Can Insert Their Own Reports"
  on public.reports
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users Can Update Their Own Reports"
  on public.reports;
create policy "Users Can Update Their Own Reports"
  on public.reports
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Mobile and web already write uid/report-id/file. Preserve that contract and
-- restrict authenticated users to the folder for their own Supabase user ID.
drop policy if exists "Allow authenticated uploads to report_photos 1l8xwbw_0"
  on storage.objects;
drop policy if exists "Owners can upload report photos"
  on storage.objects;
drop policy if exists "Owners can delete report photos"
  on storage.objects;

create policy "Owners can upload report photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'report_photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Owners can delete report photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'report_photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
