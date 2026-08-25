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
  report_owner_id uuid;
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

  select reports.user_id
  into report_owner_id
  from public.reports
  where reports.id = attempt_report_id
  for update;

  select *
  into attempt_record
  from public.cleanup_attempts
  where cleanup_attempts.id = target_cleanup_id
  for update;

  if attempt_record.reporter_id is distinct from actor_id
    or report_owner_id is distinct from actor_id then
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
  'Records the original report owner''s structured review of the current cleanup submission.';

revoke all on function public.review_cleanup(uuid, uuid, text, text[], text)
  from public, anon, authenticated, service_role;
grant execute on function public.review_cleanup(uuid, uuid, text, text[], text)
  to authenticated;
