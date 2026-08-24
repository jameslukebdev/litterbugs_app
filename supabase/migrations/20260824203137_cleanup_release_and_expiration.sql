create or replace function private.cleanup_claim_duration()
returns interval
language sql
immutable
security invoker
set search_path = ''
as $$
  select interval '24 hours';
$$;

create or replace function private.cleanup_review_duration()
returns interval
language sql
immutable
security invoker
set search_path = ''
as $$
  select interval '48 hours';
$$;

revoke all on function private.cleanup_claim_duration()
  from public, anon, authenticated, service_role;
revoke all on function private.cleanup_review_duration()
  from public, anon, authenticated, service_role;

comment on function private.cleanup_claim_duration() is
  'Single production source of truth for the 24-hour cleanup claim window.';
comment on function private.cleanup_review_duration() is
  'Single production source of truth for the 48-hour cleanup review window.';

alter table public.cleanup_attempts
  drop constraint cleanup_attempts_claim_window_check,
  drop constraint cleanup_attempts_review_window_check;

alter table public.cleanup_attempts
  add constraint cleanup_attempts_claim_window_check check (
    claim_expires_at = claimed_at + private.cleanup_claim_duration()
  ),
  add constraint cleanup_attempts_review_window_check check (
    status <> 'completion_submitted'
    or (
      latest_submitted_at is not null
      and review_due_at =
        latest_submitted_at + private.cleanup_review_duration()
    )
  );

create table public.cleanup_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cleanup_attempt_id uuid not null
    references public.cleanup_attempts(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint cleanup_notifications_event_type_check check (
    event_type = 'claim_expired'
  ),
  constraint cleanup_notifications_attempt_event_key unique (
    cleanup_attempt_id,
    event_type
  )
);

create index cleanup_notifications_user_read_idx
  on public.cleanup_notifications (user_id, read_at, created_at desc);

create index cleanup_notifications_report_id_idx
  on public.cleanup_notifications (report_id);

alter table public.cleanup_notifications enable row level security;

revoke all on table public.cleanup_notifications from anon, authenticated;
grant select on table public.cleanup_notifications to authenticated;

create policy "Users can view their cleanup notifications"
  on public.cleanup_notifications
  for select
  to authenticated
  using (
    (select public.is_permanent_user())
    and user_id = (select auth.uid())
  );

comment on table public.cleanup_notifications is
  'Server-created cleanup workflow notices. Phase 5 uses claim_expired notices for one-time in-app delivery.';

create or replace function private.expire_cleanup_claim(
  target_cleanup_id uuid,
  effective_at timestamptz
)
returns public.cleanup_attempts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  attempt_report_id uuid;
  attempt_record public.cleanup_attempts%rowtype;
  transition_at timestamptz := coalesce(effective_at, now());
begin
  select cleanup_attempts.report_id
  into attempt_report_id
  from public.cleanup_attempts
  where cleanup_attempts.id = target_cleanup_id;

  if attempt_report_id is null then
    return null;
  end if;

  perform 1
  from public.reports
  where reports.id = attempt_report_id
  for update;

  select *
  into attempt_record
  from public.cleanup_attempts
  where cleanup_attempts.id = target_cleanup_id
  for update;

  if attempt_record.status = 'claimed'
    and attempt_record.claim_expires_at <= transition_at then
    update public.cleanup_attempts
    set
      status = 'expired',
      expired_at = claim_expires_at,
      last_activity_at = transition_at
    where cleanup_attempts.id = target_cleanup_id
    returning * into attempt_record;

    update public.reports
    set
      cleanup_state = 'available',
      expired_at = case
        when reports.expires_at is not null
          and reports.expires_at <= transition_at
          then reports.expires_at
        else reports.expired_at
      end
    where reports.id = attempt_report_id;

    if attempt_record.cleaner_id is not null then
      insert into public.cleanup_notifications (
        user_id,
        cleanup_attempt_id,
        report_id,
        event_type,
        created_at
      ) values (
        attempt_record.cleaner_id,
        attempt_record.id,
        attempt_record.report_id,
        'claim_expired',
        attempt_record.claim_expires_at
      )
      on conflict (cleanup_attempt_id, event_type) do nothing;
    end if;
  end if;

  return attempt_record;
end;
$$;

revoke all on function private.expire_cleanup_claim(uuid, timestamptz)
  from public, anon, authenticated, service_role;

create or replace function public.acknowledge_cleanup_notifications(
  target_notification_ids uuid[]
)
returns setof public.cleanup_notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  acknowledged_at timestamptz := now();
begin
  actor_id := private.require_permanent_cleanup_user();

  if target_notification_ids is null
    or cardinality(target_notification_ids) = 0 then
    return;
  end if;

  return query
  update public.cleanup_notifications
  set read_at = coalesce(read_at, acknowledged_at)
  where cleanup_notifications.user_id = actor_id
    and cleanup_notifications.id = any (target_notification_ids)
  returning cleanup_notifications.*;
end;
$$;

comment on function public.acknowledge_cleanup_notifications(uuid[]) is
  'Marks only the authenticated permanent user''s cleanup notices as read.';

revoke all on function public.acknowledge_cleanup_notifications(uuid[])
  from public, anon, authenticated, service_role;
grant execute on function public.acknowledge_cleanup_notifications(uuid[])
  to authenticated;

create or replace function public.claim_cleanup(target_report_id uuid)
returns public.cleanup_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  transition_at timestamptz := now();
  report_record public.reports%rowtype;
  active_waiver_version text;
  active_guidelines_version text;
  attempt_record public.cleanup_attempts%rowtype;
  expired_attempt_id uuid;
begin
  actor_id := private.require_permanent_cleanup_user();

  select
    cleanup_waiver_versions.waiver_version,
    cleanup_waiver_versions.guidelines_version
  into
    active_waiver_version,
    active_guidelines_version
  from public.cleanup_waiver_versions
  where cleanup_waiver_versions.is_active
    and cleanup_waiver_versions.retired_at is null
  for share;

  if active_waiver_version is null then
    raise check_violation using message = 'cleanup_waiver_unavailable';
  end if;

  if not exists (
    select 1
    from public.cleanup_waiver_acceptances
    where cleanup_waiver_acceptances.user_id = actor_id
      and cleanup_waiver_acceptances.waiver_version = active_waiver_version
      and cleanup_waiver_acceptances.guidelines_version =
        active_guidelines_version
  ) then
    raise check_violation using message = 'cleanup_waiver_required';
  end if;

  select *
  into report_record
  from public.reports
  where reports.id = target_report_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_report_not_found';
  end if;

  for expired_attempt_id in
    select cleanup_attempts.id
    from public.cleanup_attempts
    where cleanup_attempts.report_id = target_report_id
      and cleanup_attempts.status = 'claimed'
      and cleanup_attempts.claim_expires_at <= transition_at
  loop
    perform private.expire_cleanup_claim(expired_attempt_id, transition_at);
  end loop;

  select *
  into report_record
  from public.reports
  where reports.id = target_report_id;

  if report_record.cleanup_state = 'claimed' then
    raise unique_violation using message = 'This cleanup was just claimed';
  end if;

  if report_record.cleanup_state <> 'available'
    or report_record.expired_at is not null
    or report_record.cancelled_at is not null
    or (
      report_record.expires_at is not null
      and report_record.expires_at <= transition_at
    ) then
    raise check_violation using message = 'cleanup_report_not_available';
  end if;

  if exists (
    select 1
    from public.cleanup_attempts
    where cleanup_attempts.report_id = target_report_id
      and cleanup_attempts.status = any (array[
        'claimed',
        'completion_submitted',
        'changes_requested'
      ])
  ) then
    raise unique_violation using message = 'This cleanup was just claimed';
  end if;

  insert into public.cleanup_attempts (
    report_id,
    cleaner_id,
    reporter_id,
    waiver_version,
    guidelines_version,
    status,
    is_self_cleanup,
    claimed_at,
    claim_expires_at,
    last_activity_at
  ) values (
    target_report_id,
    actor_id,
    report_record.user_id,
    active_waiver_version,
    active_guidelines_version,
    'claimed',
    report_record.user_id = actor_id,
    transition_at,
    transition_at + private.cleanup_claim_duration(),
    transition_at
  )
  returning * into attempt_record;

  update public.reports
  set cleanup_state = 'claimed'
  where reports.id = target_report_id;

  return attempt_record;
exception
  when unique_violation then
    raise unique_violation using message = 'This cleanup was just claimed';
end;
$$;

revoke all on function public.claim_cleanup(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_cleanup(uuid) to authenticated;

create or replace function public.submit_cleanup(
  target_cleanup_id uuid,
  target_submission_id uuid,
  cleanup_description text,
  cleanup_photo_paths text[],
  cleanup_bags_or_items_removed integer default null,
  cleanup_duration_minutes integer default null
)
returns public.cleanup_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  transition_at timestamptz := now();
  attempt_report_id uuid;
  attempt_record public.cleanup_attempts%rowtype;
  submission_record public.cleanup_submissions%rowtype;
  next_submission_number smallint;
  candidate_path text;
  path_folders text[];
  distinct_photo_count integer;
begin
  actor_id := private.require_permanent_cleanup_user();

  if target_submission_id is null then
    raise check_violation using message = 'cleanup_submission_id_required';
  end if;

  if cleanup_description is null
    or char_length(btrim(cleanup_description)) not between 1 and 500 then
    raise check_violation using message = 'cleanup_description_invalid';
  end if;

  if cleanup_photo_paths is null
    or cardinality(cleanup_photo_paths) not between 1 and 3
    or array_position(cleanup_photo_paths, null) is not null then
    raise check_violation using message = 'cleanup_photos_invalid';
  end if;

  select count(distinct photo_path)
  into distinct_photo_count
  from unnest(cleanup_photo_paths) as photo_path;

  if distinct_photo_count <> cardinality(cleanup_photo_paths) then
    raise check_violation using message = 'cleanup_photos_must_be_unique';
  end if;

  select cleanup_attempts.report_id
  into attempt_report_id
  from public.cleanup_attempts
  where cleanup_attempts.id = target_cleanup_id;

  if attempt_report_id is null then
    raise no_data_found using message = 'cleanup_not_found';
  end if;

  perform 1
  from public.reports
  where reports.id = attempt_report_id
  for update;

  select *
  into attempt_record
  from public.cleanup_attempts
  where cleanup_attempts.id = target_cleanup_id
  for update;

  if attempt_record.cleaner_id is distinct from actor_id then
    raise insufficient_privilege using message = 'cleanup_submission_not_allowed';
  end if;

  if attempt_record.status <> all (array['claimed', 'changes_requested']) then
    raise check_violation using message = 'cleanup_submission_invalid_state';
  end if;

  if attempt_record.status = 'claimed'
    and attempt_record.claim_expires_at <= transition_at then
    raise check_violation using message = 'cleanup_claim_expired';
  end if;

  foreach candidate_path in array cleanup_photo_paths
  loop
    path_folders := storage.foldername(candidate_path);

    if cardinality(path_folders) <> 3
      or path_folders[1] <> actor_id::text
      or path_folders[2] <> target_cleanup_id::text
      or path_folders[3] <> target_submission_id::text then
      raise check_violation using message = 'cleanup_photo_path_invalid';
    end if;

    if not exists (
      select 1
      from storage.objects
      where objects.bucket_id = 'cleanup_photos'
        and objects.name = candidate_path
        and objects.owner_id = actor_id::text
    ) then
      raise check_violation using message = 'cleanup_photo_upload_missing';
    end if;
  end loop;

  select (coalesce(max(cleanup_submissions.submission_number), 0) + 1)::smallint
  into next_submission_number
  from public.cleanup_submissions
  where cleanup_submissions.cleanup_attempt_id = target_cleanup_id;

  insert into public.cleanup_submissions (
    id,
    cleanup_attempt_id,
    submission_number,
    submitted_by,
    description,
    bags_or_items_removed,
    duration_minutes,
    created_at
  ) values (
    target_submission_id,
    target_cleanup_id,
    next_submission_number,
    actor_id,
    btrim(cleanup_description),
    cleanup_bags_or_items_removed,
    cleanup_duration_minutes,
    transition_at
  )
  returning * into submission_record;

  insert into public.cleanup_submission_photos (
    submission_id,
    storage_path,
    display_order,
    uploaded_at
  )
  select
    target_submission_id,
    photo.storage_path,
    photo.display_order::smallint,
    stored_object.created_at
  from unnest(cleanup_photo_paths)
    with ordinality as photo(storage_path, display_order)
  join storage.objects as stored_object
    on stored_object.bucket_id = 'cleanup_photos'
    and stored_object.name = photo.storage_path
    and stored_object.owner_id = actor_id::text;

  perform private.assert_cleanup_submission_photo_count(target_submission_id);

  update public.cleanup_attempts
  set
    status = 'completion_submitted',
    first_submitted_at = coalesce(first_submitted_at, transition_at),
    latest_submitted_at = transition_at,
    review_due_at = transition_at + private.cleanup_review_duration(),
    last_activity_at = transition_at
  where cleanup_attempts.id = target_cleanup_id;

  update public.reports
  set cleanup_state = 'completion_submitted'
  where reports.id = attempt_report_id;

  return submission_record;
end;
$$;

revoke all on function public.submit_cleanup(uuid, uuid, text, text[], integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_cleanup(uuid, uuid, text, text[], integer, integer)
  to authenticated;

do $$
declare
  existing_job record;
begin
  if to_regclass('cron.job') is null then
    return;
  end if;

  for existing_job in
    select jobid
    from cron.job
    where jobname = 'litterbugs-workflow-maintenance'
      or command ilike '%run_cleanup_maintenance%'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'litterbugs-workflow-maintenance',
    '* * * * *',
    'select private.run_cleanup_maintenance();'
  );
end;
$$;
