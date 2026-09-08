alter table public.cleanup_submissions
  add column if not exists weight_pounds numeric(8, 2);

alter table public.cleanup_submissions
  drop constraint if exists cleanup_submissions_weight_pounds_check;

alter table public.cleanup_submissions
  add constraint cleanup_submissions_weight_pounds_check check (
    weight_pounds is null
    or weight_pounds between 0.1 and 10000
  );

comment on column public.cleanup_submissions.weight_pounds is
  'Optional estimated pounds of litter removed. Historical duration_minutes values remain stored for prior submissions.';

create or replace function public.submit_cleanup_with_weight(
  target_cleanup_id uuid,
  target_submission_id uuid,
  cleanup_description text,
  cleanup_photo_paths text[],
  cleanup_bags_or_items_removed integer default null,
  cleanup_weight_pounds numeric default null
)
returns public.cleanup_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission_record public.cleanup_submissions%rowtype;
begin
  if cleanup_weight_pounds is not null
    and cleanup_weight_pounds not between 0.1 and 10000 then
    raise check_violation using message = 'cleanup_weight_pounds_invalid';
  end if;

  select * into submission_record
  from public.submit_cleanup(
    target_cleanup_id,
    target_submission_id,
    cleanup_description,
    cleanup_photo_paths,
    cleanup_bags_or_items_removed,
    null
  );

  update public.cleanup_submissions set
    weight_pounds = cleanup_weight_pounds
  where id = submission_record.id
  returning * into submission_record;

  return submission_record;
end;
$$;

comment on function public.submit_cleanup_with_weight(uuid, uuid, text, text[], integer, numeric) is
  'Creates secured cleanup evidence and records an optional estimated litter weight without accepting client-controlled identity or timestamps.';

revoke all on function public.submit_cleanup_with_weight(uuid, uuid, text, text[], integer, numeric)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_cleanup_with_weight(uuid, uuid, text, text[], integer, numeric)
  to authenticated;
