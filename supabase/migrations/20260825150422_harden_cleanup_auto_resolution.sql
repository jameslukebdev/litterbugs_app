create unique index cleanup_reviews_one_auto_approval_per_attempt_idx
  on public.cleanup_reviews (cleanup_attempt_id)
  where decision = 'auto_approved';

comment on column public.cleanup_attempts.review_due_at is
  'Server-generated deadline after which a completion submission may be automatically approved if the reporter has not reviewed it.';

create or replace function private.auto_approve_cleanup(
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

  if exists (
    select 1
    from public.cleanup_reviews
    where cleanup_reviews.cleanup_attempt_id = target_cleanup_id
      and cleanup_reviews.submission_id = latest_submission_id
      and cleanup_reviews.reviewer_id is not null
  ) then
    return attempt_record;
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
    transition_at
  );

  update public.cleanup_attempts
  set
    status = 'completed',
    completed_at = transition_at,
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

comment on function private.auto_approve_cleanup(uuid, timestamptz) is
  'Idempotently completes an overdue submission only when its reporter has not reviewed the current revision.';

revoke all on function private.auto_approve_cleanup(uuid, timestamptz)
  from public, anon, authenticated, service_role;
