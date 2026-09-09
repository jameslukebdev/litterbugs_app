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
  actor_id uuid := private.require_permanent_cleanup_user();
  transition_at timestamptz := now();
  attempt_record public.cleanup_attempts%rowtype;
  submission_record public.cleanup_submissions%rowtype;
  next_submission_number smallint;
  candidate_path text;
  path_folders text[];
  distinct_photo_count integer;
begin
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

  select count(distinct photo_path) into distinct_photo_count
  from unnest(cleanup_photo_paths) as photo_path;
  if distinct_photo_count <> cardinality(cleanup_photo_paths) then
    raise check_violation using message = 'cleanup_photos_must_be_unique';
  end if;

  select * into attempt_record
  from public.cleanup_attempts
  where id = target_cleanup_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_not_found';
  end if;

  perform 1 from public.reports
  where id = attempt_record.report_id
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
  if attempt_record.status = 'changes_requested'
    and attempt_record.correction_due_at <= transition_at then
    raise check_violation using message = 'cleanup_correction_expired';
  end if;

  foreach candidate_path in array cleanup_photo_paths loop
    path_folders := storage.foldername(candidate_path);
    if cardinality(path_folders) <> 3
      or path_folders[1] <> actor_id::text
      or path_folders[2] <> target_cleanup_id::text
      or path_folders[3] <> target_submission_id::text then
      raise check_violation using message = 'cleanup_photo_path_invalid';
    end if;
    if not exists (
      select 1 from storage.objects
      where bucket_id = 'cleanup_photos'
        and name = candidate_path
        and (owner_id = actor_id::text or owner_id is null)
    ) then
      raise check_violation using message = 'cleanup_photo_upload_missing';
    end if;
  end loop;

  select (coalesce(max(submission_number), 0) + 1)::smallint
  into next_submission_number
  from public.cleanup_submissions
  where cleanup_attempt_id = target_cleanup_id;

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
  ) returning * into submission_record;

  insert into public.cleanup_submission_photos (
    submission_id, storage_path, display_order, uploaded_at
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
    and (stored_object.owner_id = actor_id::text or stored_object.owner_id is null);

  perform private.assert_cleanup_submission_photo_count(target_submission_id);

  update public.cleanup_attempts set
    status = 'completion_submitted',
    first_submitted_at = coalesce(first_submitted_at, transition_at),
    latest_submitted_at = transition_at,
    review_due_at = case
      when is_paid then null
      else transition_at + private.cleanup_review_duration()
    end,
    correction_due_at = null,
    financial_review_status = case
      when is_paid then 'queued'
      else financial_review_status
    end,
    financial_review_summary = case
      when is_paid then null
      else financial_review_summary
    end,
    last_activity_at = transition_at
  where id = target_cleanup_id
  returning * into attempt_record;

  update public.reports
  set cleanup_state = 'completion_submitted'
  where id = attempt_record.report_id;

  if attempt_record.is_paid then
    insert into public.cleanup_ai_checks (
      report_id,
      cleanup_attempt_id,
      submission_id,
      check_kind,
      status,
      attempt_number,
      prompt_version
    ) values (
      attempt_record.report_id,
      attempt_record.id,
      target_submission_id,
      'paid_submission',
      'queued',
      least(attempt_record.financial_review_attempts + 1, 2),
      'funded-cleanup-v1'
    );
  end if;

  return submission_record;
end;
$$;

comment on function public.submit_cleanup(uuid, uuid, text, text[], integer, integer) is
  'Submits cleanup evidence after validating cleaner ownership, workflow state, exact object paths, and either user-owned or trusted server-processed Storage objects.';

revoke all on function public.submit_cleanup(uuid, uuid, text, text[], integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_cleanup(uuid, uuid, text, text[], integer, integer)
  to authenticated;
