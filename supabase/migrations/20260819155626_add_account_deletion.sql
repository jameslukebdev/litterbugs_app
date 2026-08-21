alter table public.reports
  alter column user_id drop not null;

alter table public.reports
  drop constraint if exists reports_user_id_fkey;

alter table public.reports
  add constraint reports_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete set null;

create or replace function public.anonymize_user_reports(target_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  anonymized_count integer;
begin
  update public.reports
  set
    user_id = null,
    photo_paths = null,
    title = null,
    types = null,
    notes_presets = null,
    notes_other = null
  where user_id = target_user_id;

  get diagnostics anonymized_count = row_count;

  delete from public.profiles
  where id = target_user_id;

  return anonymized_count;
end;
$$;

revoke all on function public.anonymize_user_reports(uuid) from public;
revoke all on function public.anonymize_user_reports(uuid) from anon;
revoke all on function public.anonymize_user_reports(uuid) from authenticated;
grant execute on function public.anonymize_user_reports(uuid) to service_role;
