-- Secure Phase 2 cleanup mutations. Clients keep read-only access to the
-- transactional tables and can mutate workflow state only through these
-- narrowly scoped, authenticated RPCs.

create function private.require_permanent_cleanup_user()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null
    or coalesce(
      (select (auth.jwt() ->> 'is_anonymous')::boolean),
      true
    ) then
    raise insufficient_privilege using
      message = 'cleanup_requires_permanent_account';
  end if;

  if not exists (
    select 1
    from public.profiles
    where profiles.id = actor_id
  ) then
    raise insufficient_privilege using
      message = 'cleanup_profile_required';
  end if;

  return actor_id;
end;
$$;

revoke all on function private.require_permanent_cleanup_user()
  from public, anon, authenticated, service_role;

create function private.expire_cleanup_claim(
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
  end if;

  return attempt_record;
end;
$$;

revoke all on function private.expire_cleanup_claim(uuid, timestamptz)
  from public, anon, authenticated, service_role;

create function private.auto_approve_cleanup(
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
  latest_submission_id uuid;
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

  if attempt_record.status <> 'completion_submitted'
    or attempt_record.review_due_at is null
    or attempt_record.review_due_at > transition_at then
    return attempt_record;
  end if;

  select cleanup_submissions.id
  into latest_submission_id
  from public.cleanup_submissions
  where cleanup_submissions.cleanup_attempt_id = target_cleanup_id
  order by cleanup_submissions.submission_number desc
  limit 1;

  if latest_submission_id is null then
    raise check_violation using
      message = 'cleanup_submission_required';
  end if;

  insert into public.cleanup_reviews (
    cleanup_attempt_id,
    submission_id,
    reviewer_id,
    decision,
    reason_codes,
    note,
    created_at
  ) values (
    target_cleanup_id,
    latest_submission_id,
    null,
    'auto_approved',
    null,
    null,
    attempt_record.review_due_at
  );

  update public.cleanup_attempts
  set
    status = 'completed',
    completed_at = attempt_record.review_due_at,
    last_activity_at = transition_at,
    final_submission_id = latest_submission_id,
    final_reviewer_id = null,
    approval_method = 'auto_approved'
  where cleanup_attempts.id = target_cleanup_id
  returning * into attempt_record;

  update public.reports
  set
    cleanup_state = 'completed',
    expired_at = null,
    cancelled_at = null
  where reports.id = attempt_report_id;

  return attempt_record;
end;
$$;

revoke all on function private.auto_approve_cleanup(uuid, timestamptz)
  from public, anon, authenticated, service_role;

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
  attempt_record public.cleanup_attempts%rowtype;
  expired_attempt_id uuid;
begin
  actor_id := private.require_permanent_cleanup_user();

  select cleanup_waiver_versions.version
  into active_waiver_version
  from public.cleanup_waiver_versions
  where cleanup_waiver_versions.is_active
    and cleanup_waiver_versions.retired_at is null
  for share;

  if active_waiver_version is null then
    raise check_violation using
      message = 'cleanup_waiver_unavailable';
  end if;

  if not exists (
    select 1
    from public.cleanup_waiver_acceptances
    where cleanup_waiver_acceptances.user_id = actor_id
      and cleanup_waiver_acceptances.waiver_version = active_waiver_version
  ) then
    raise check_violation using
      message = 'cleanup_waiver_required';
  end if;

  select *
  into report_record
  from public.reports
  where reports.id = target_report_id
  for update;

  if not found then
    raise no_data_found using
      message = 'cleanup_report_not_found';
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
    raise unique_violation using
      message = 'This cleanup was just claimed';
  end if;

  if report_record.cleanup_state <> 'available'
    or report_record.expired_at is not null
    or report_record.cancelled_at is not null
    or (
      report_record.expires_at is not null
      and report_record.expires_at <= transition_at
    ) then
    raise check_violation using
      message = 'cleanup_report_not_available';
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
    raise unique_violation using
      message = 'This cleanup was just claimed';
  end if;

  insert into public.cleanup_attempts (
    report_id,
    cleaner_id,
    reporter_id,
    waiver_version,
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
    'claimed',
    report_record.user_id = actor_id,
    transition_at,
    transition_at + interval '24 hours',
    transition_at
  )
  returning * into attempt_record;

  update public.reports
  set cleanup_state = 'claimed'
  where reports.id = target_report_id;

  return attempt_record;
exception
  when unique_violation then
    raise unique_violation using
      message = 'This cleanup was just claimed';
end;
$$;

comment on function public.claim_cleanup(uuid) is
  'Atomically claims an available report for the authenticated permanent user after verifying the active waiver.';

revoke all on function public.claim_cleanup(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_cleanup(uuid) to authenticated;

create or replace function public.release_cleanup(target_cleanup_id uuid)
returns public.cleanup_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  transition_at timestamptz := now();
  attempt_report_id uuid;
  attempt_record public.cleanup_attempts%rowtype;
begin
  actor_id := private.require_permanent_cleanup_user();

  select cleanup_attempts.report_id
  into attempt_report_id
  from public.cleanup_attempts
  where cleanup_attempts.id = target_cleanup_id;

  if attempt_report_id is null then
    raise no_data_found using
      message = 'cleanup_not_found';
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
    raise insufficient_privilege using
      message = 'cleanup_release_not_allowed';
  end if;

  if attempt_record.status <> 'claimed' then
    raise check_violation using
      message = 'cleanup_release_invalid_state';
  end if;

  if attempt_record.claim_expires_at <= transition_at then
    select *
    into attempt_record
    from private.expire_cleanup_claim(target_cleanup_id, transition_at);
    return attempt_record;
  end if;

  update public.cleanup_attempts
  set
    status = 'released',
    released_at = transition_at,
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

  return attempt_record;
end;
$$;

comment on function public.release_cleanup(uuid) is
  'Releases the authenticated cleaner''s unsubmitted active claim and retains the attempt history.';

revoke all on function public.release_cleanup(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.release_cleanup(uuid) to authenticated;

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
    raise check_violation using
      message = 'cleanup_submission_id_required';
  end if;

  if cleanup_description is null
    or char_length(btrim(cleanup_description)) not between 1 and 500 then
    raise check_violation using
      message = 'cleanup_description_invalid';
  end if;

  if cleanup_photo_paths is null
    or cardinality(cleanup_photo_paths) not between 1 and 3
    or array_position(cleanup_photo_paths, null) is not null then
    raise check_violation using
      message = 'cleanup_photos_invalid';
  end if;

  select count(distinct photo_path)
  into distinct_photo_count
  from unnest(cleanup_photo_paths) as photo_path;

  if distinct_photo_count <> cardinality(cleanup_photo_paths) then
    raise check_violation using
      message = 'cleanup_photos_must_be_unique';
  end if;

  select cleanup_attempts.report_id
  into attempt_report_id
  from public.cleanup_attempts
  where cleanup_attempts.id = target_cleanup_id;

  if attempt_report_id is null then
    raise no_data_found using
      message = 'cleanup_not_found';
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
    raise insufficient_privilege using
      message = 'cleanup_submission_not_allowed';
  end if;

  if attempt_record.status <> all (array['claimed', 'changes_requested']) then
    raise check_violation using
      message = 'cleanup_submission_invalid_state';
  end if;

  if attempt_record.status = 'claimed'
    and attempt_record.claim_expires_at <= transition_at then
    raise check_violation using
      message = 'cleanup_claim_expired';
  end if;

  foreach candidate_path in array cleanup_photo_paths
  loop
    path_folders := storage.foldername(candidate_path);

    if cardinality(path_folders) <> 3
      or path_folders[1] <> actor_id::text
      or path_folders[2] <> target_cleanup_id::text
      or path_folders[3] <> target_submission_id::text then
      raise check_violation using
        message = 'cleanup_photo_path_invalid';
    end if;

    if not exists (
      select 1
      from storage.objects
      where objects.bucket_id = 'cleanup_photos'
        and objects.name = candidate_path
        and objects.owner_id = actor_id::text
    ) then
      raise check_violation using
        message = 'cleanup_photo_upload_missing';
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
    review_due_at = transition_at + interval '48 hours',
    last_activity_at = transition_at
  where cleanup_attempts.id = target_cleanup_id;

  update public.reports
  set cleanup_state = 'completion_submitted'
  where reports.id = attempt_report_id;

  return submission_record;
end;
$$;

comment on function public.submit_cleanup(uuid, uuid, text, text[], integer, integer) is
  'Creates an immutable evidence revision for the authenticated cleaner using already-uploaded private Storage objects.';

revoke all on function public.submit_cleanup(uuid, uuid, text, text[], integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_cleanup(uuid, uuid, text, text[], integer, integer)
  to authenticated;

create or replace function public.review_cleanup(
  target_cleanup_id uuid,
  target_submission_id uuid,
  review_decision text,
  request_change_reasons text[] default null,
  reviewer_note text default null
)
returns public.cleanup_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  transition_at timestamptz := now();
  attempt_report_id uuid;
  attempt_record public.cleanup_attempts%rowtype;
  latest_submission_id uuid;
  normalized_note text := nullif(btrim(reviewer_note), '');
begin
  actor_id := private.require_permanent_cleanup_user();

  select cleanup_attempts.report_id
  into attempt_report_id
  from public.cleanup_attempts
  where cleanup_attempts.id = target_cleanup_id;

  if attempt_report_id is null then
    raise no_data_found using
      message = 'cleanup_not_found';
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

  if attempt_record.reporter_id is distinct from actor_id then
    raise insufficient_privilege using
      message = 'cleanup_review_not_allowed';
  end if;

  if attempt_record.status <> 'completion_submitted' then
    raise check_violation using
      message = 'cleanup_review_invalid_state';
  end if;

  if attempt_record.review_due_at <= transition_at then
    select *
    into attempt_record
    from private.auto_approve_cleanup(target_cleanup_id, transition_at);
    return attempt_record;
  end if;

  select cleanup_submissions.id
  into latest_submission_id
  from public.cleanup_submissions
  where cleanup_submissions.cleanup_attempt_id = target_cleanup_id
  order by cleanup_submissions.submission_number desc
  limit 1;

  if latest_submission_id is distinct from target_submission_id then
    raise check_violation using
      message = 'cleanup_review_submission_is_not_current';
  end if;

  if normalized_note is not null
    and char_length(normalized_note) > 500 then
    raise check_violation using
      message = 'cleanup_review_note_invalid';
  end if;

  if review_decision = 'changes_requested' then
    insert into public.cleanup_reviews (
      cleanup_attempt_id,
      submission_id,
      reviewer_id,
      decision,
      reason_codes,
      note,
      created_at
    ) values (
      target_cleanup_id,
      target_submission_id,
      actor_id,
      'changes_requested',
      request_change_reasons,
      normalized_note,
      transition_at
    );

    update public.cleanup_attempts
    set
      status = 'changes_requested',
      review_due_at = null,
      last_activity_at = transition_at
    where cleanup_attempts.id = target_cleanup_id
    returning * into attempt_record;

    update public.reports
    set cleanup_state = 'changes_requested'
    where reports.id = attempt_report_id;

    return attempt_record;
  end if;

  if review_decision <> 'approved'
    or coalesce(cardinality(request_change_reasons), 0) <> 0 then
    raise check_violation using
      message = 'cleanup_review_decision_invalid';
  end if;

  insert into public.cleanup_reviews (
    cleanup_attempt_id,
    submission_id,
    reviewer_id,
    decision,
    reason_codes,
    note,
    created_at
  ) values (
    target_cleanup_id,
    target_submission_id,
    actor_id,
    'approved',
    null,
    normalized_note,
    transition_at
  );

  update public.cleanup_attempts
  set
    status = 'completed',
    completed_at = transition_at,
    last_activity_at = transition_at,
    final_submission_id = target_submission_id,
    final_reviewer_id = actor_id,
    approval_method = case
      when is_self_cleanup then 'self_approved'
      else 'reporter_approved'
    end
  where cleanup_attempts.id = target_cleanup_id
  returning * into attempt_record;

  update public.reports
  set
    cleanup_state = 'completed',
    expired_at = null,
    cancelled_at = null
  where reports.id = attempt_report_id;

  return attempt_record;
end;
$$;

comment on function public.review_cleanup(uuid, uuid, text, text[], text) is
  'Records the authenticated original reporter''s structured review of the current submission.';

revoke all on function public.review_cleanup(uuid, uuid, text, text[], text)
  from public, anon, authenticated, service_role;
grant execute on function public.review_cleanup(uuid, uuid, text, text[], text)
  to authenticated;

create or replace function private.run_cleanup_maintenance()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  maintenance_at timestamptz := now();
  due_cleanup record;
begin
  for due_cleanup in
    select cleanup_attempts.id
    from public.cleanup_attempts
    where cleanup_attempts.status = 'claimed'
      and cleanup_attempts.claim_expires_at <= maintenance_at
    order by cleanup_attempts.claim_expires_at
  loop
    perform private.expire_cleanup_claim(due_cleanup.id, maintenance_at);
  end loop;

  for due_cleanup in
    select cleanup_attempts.id
    from public.cleanup_attempts
    where cleanup_attempts.status = 'completion_submitted'
      and cleanup_attempts.review_due_at <= maintenance_at
    order by cleanup_attempts.review_due_at
  loop
    perform private.auto_approve_cleanup(due_cleanup.id, maintenance_at);
  end loop;

  update public.reports
  set expired_at = expires_at
  where expires_at < maintenance_at
    and expired_at is null
    and cancelled_at is null
    and cleanup_state = 'available';
end;
$$;

revoke all on function private.run_cleanup_maintenance()
  from public, anon, authenticated, service_role;
