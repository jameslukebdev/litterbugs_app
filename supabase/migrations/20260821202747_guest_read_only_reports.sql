create or replace function public.is_permanent_user()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and coalesce(
      (select (auth.jwt() ->> 'is_anonymous')::boolean),
      true
    ) is false;
$$;

comment on function public.is_permanent_user() is
  'Returns true only for a signed-in Supabase user whose JWT is not anonymous.';

revoke all on function public.is_permanent_user() from public;
grant execute on function public.is_permanent_user() to authenticated;

revoke insert, update, delete, truncate, references, trigger
  on table public.reports from anon;
grant select on table public.reports to anon, authenticated;

drop policy if exists "Users Can Insert Their Own Reports"
  on public.reports;
drop policy if exists "Users Can Update Their Own Reports"
  on public.reports;
drop policy if exists "Users Can Delete Their Own Reports"
  on public.reports;

create policy "Users Can Insert Their Own Reports"
  on public.reports
  for insert
  to authenticated
  with check (
    (select public.is_permanent_user())
    and (select auth.uid()) = user_id
  );

create policy "Users Can Update Their Own Reports"
  on public.reports
  for update
  to authenticated
  using (
    (select public.is_permanent_user())
    and (select auth.uid()) = user_id
  )
  with check (
    (select public.is_permanent_user())
    and (select auth.uid()) = user_id
  );

create policy "Users Can Delete Their Own Reports"
  on public.reports
  for delete
  to authenticated
  using (
    (select public.is_permanent_user())
    and (select auth.uid()) = user_id
  );

drop policy if exists "Owners can upload report photos"
  on storage.objects;
drop policy if exists "Owners can delete report photos"
  on storage.objects;

create policy "Owners can upload report photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    (select public.is_permanent_user())
    and bucket_id = 'report_photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Owners can delete report photos"
  on storage.objects
  for delete
  to authenticated
  using (
    (select public.is_permanent_user())
    and bucket_id = 'report_photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
