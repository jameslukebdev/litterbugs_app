-- Lets a cleaner record how long the cleanup took alongside the optional weight.
-- Additive: cleanup_submissions.duration_minutes already exists (1 to 1440), and
-- submit_cleanup_with_weight stays in place for installed app versions.
create or replace function public.submit_cleanup_with_details(
  target_cleanup_id uuid,
  target_submission_id uuid,
  cleanup_description text,
  cleanup_photo_paths text[],
  cleanup_bags_or_items_removed integer default null,
  cleanup_weight_pounds numeric default null,
  cleanup_duration_minutes integer default null
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

  if cleanup_duration_minutes is not null
    and cleanup_duration_minutes not between 1 and 1440 then
    raise check_violation using message = 'cleanup_duration_minutes_invalid';
  end if;

  select * into submission_record
  from public.submit_cleanup(
    target_cleanup_id,
    target_submission_id,
    cleanup_description,
    cleanup_photo_paths,
    cleanup_bags_or_items_removed,
    cleanup_duration_minutes
  );

  update public.cleanup_submissions set
    weight_pounds = cleanup_weight_pounds
  where id = submission_record.id
  returning * into submission_record;

  return submission_record;
end;
$$;

comment on function public.submit_cleanup_with_details(uuid, uuid, text, text[], integer, numeric, integer) is
  'Creates secured cleanup evidence and records optional estimated weight and time spent without accepting client-controlled identity or timestamps.';

revoke all on function public.submit_cleanup_with_details(uuid, uuid, text, text[], integer, numeric, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_cleanup_with_details(uuid, uuid, text, text[], integer, numeric, integer)
  to authenticated;
