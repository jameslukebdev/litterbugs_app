create or replace function public.withdraw_own_report(target_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_permanent_cleanup_user();
  report_record public.reports%rowtype;
  transition_at timestamptz := now();
begin
  select * into report_record
  from public.reports
  where id = target_report_id
  for update;

  if not found then
    raise no_data_found using message = 'report_not_found';
  end if;
  if report_record.user_id is distinct from actor_id then
    raise insufficient_privilege using message = 'report_withdrawal_not_owned';
  end if;
  if report_record.cleanup_state <> 'available'
    or report_record.expired_at is not null
    or report_record.cancelled_at is not null then
    raise check_violation using message = 'report_withdrawal_not_allowed';
  end if;
  if exists (
    select 1 from public.cleanup_attempts
    where report_id = target_report_id
  ) then
    raise check_violation using message = 'cleanup_activity_started';
  end if;
  if exists (
    select 1 from public.cleanup_contributions
    where report_id = target_report_id
  ) then
    raise check_violation using message = 'report_has_funding_activity';
  end if;

  update public.reports set
    cancelled_at = transition_at,
    expired_at = null,
    renewal_status = 'closed',
    renewal_decision_due_at = null,
    funding_frozen_at = transition_at
  where id = target_report_id;

  with resolved_cases as (
    update public.cleanup_admin_cases set
      status = 'resolved',
      resolved_by = null,
      resolved_at = transition_at,
      updated_at = transition_at,
      context = context || jsonb_build_object(
        'resolution_source', 'owner_withdrawal',
        'withdrawn_at', transition_at
      )
    where report_id = target_report_id
      and status = 'open'
    returning id
  )
  insert into public.cleanup_admin_actions (
    case_id, admin_id, action, reason, metadata, created_at
  )
  select
    id,
    null,
    'owner_withdrew_report',
    'Report withdrawn by its owner before cleanup or funding activity began.',
    jsonb_build_object('owner_id', actor_id),
    transition_at
  from resolved_cases;

  return jsonb_build_object(
    'id', target_report_id,
    'status', 'withdrawn',
    'cancelledAt', transition_at
  );
end;
$$;

revoke all on function public.withdraw_own_report(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.withdraw_own_report(uuid) to authenticated;

comment on function public.withdraw_own_report(uuid) is
  'Soft-withdraws an active owner report only when no cleanup attempt or contribution history exists, preserving internal review audit records.';

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
  actor_id uuid := private.require_permanent_cleanup_user();
  transition_at timestamptz := now();
  attempt_record public.cleanup_attempts%rowtype;
  report_owner_id uuid;
  latest_submission_id uuid;
  normalized_note text := nullif(btrim(reviewer_note), '');
begin
  select * into attempt_record
  from public.cleanup_attempts
  where id = target_cleanup_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_not_found';
  end if;

  select user_id into report_owner_id
  from public.reports
  where id = attempt_record.report_id
  for update;

  if attempt_record.reporter_id is distinct from actor_id
    or report_owner_id is distinct from actor_id then
    raise insufficient_privilege using message = 'cleanup_review_not_allowed';
  end if;
  if attempt_record.status <> 'completion_submitted' then
    raise check_violation using message = 'cleanup_review_invalid_state';
  end if;
  if attempt_record.review_due_at <= transition_at then
    return private.auto_approve_cleanup(target_cleanup_id, transition_at);
  end if;

  select id into latest_submission_id
  from public.cleanup_submissions
  where cleanup_attempt_id = target_cleanup_id
  order by submission_number desc limit 1;
  if latest_submission_id is distinct from target_submission_id then
    raise check_violation using message = 'cleanup_review_submission_is_not_current';
  end if;
  if normalized_note is not null and char_length(normalized_note) > 500 then
    raise check_violation using message = 'cleanup_review_note_invalid';
  end if;

  if attempt_record.is_paid then
    if review_decision <> 'approved'
      or coalesce(cardinality(request_change_reasons), 0) <> 0 then
      raise check_violation using message = 'paid_cleanup_approval_or_dispute_required';
    end if;
    if attempt_record.financial_review_status <> 'passed'
      or attempt_record.review_due_at is null
      or attempt_record.dispute_status = 'open'
      or attempt_record.first_paid_admin_status = 'pending' then
      raise check_violation using message = 'paid_cleanup_review_not_ready';
    end if;

    insert into public.cleanup_reviews (
      cleanup_attempt_id, submission_id, reviewer_id, decision,
      reason_codes, note, created_at
    ) values (
      target_cleanup_id, target_submission_id, actor_id, 'approved',
      null, normalized_note, transition_at
    );

    update public.cleanup_attempts set
      status = 'completed',
      completed_at = transition_at,
      last_activity_at = transition_at,
      final_submission_id = target_submission_id,
      final_reviewer_id = actor_id,
      approval_method = case when is_self_cleanup then 'self_approved' else 'reporter_approved' end,
      payout_status = 'pending'
    where id = target_cleanup_id
    returning * into attempt_record;

    update public.reports set
      cleanup_state = 'completed',
      expired_at = null,
      cancelled_at = null
    where id = attempt_record.report_id;

    return attempt_record;
  end if;

  if review_decision = 'changes_requested' then
    insert into public.cleanup_reviews (
      cleanup_attempt_id, submission_id, reviewer_id, decision,
      reason_codes, note, created_at
    ) values (
      target_cleanup_id, target_submission_id, actor_id, 'changes_requested',
      request_change_reasons, normalized_note, transition_at
    );
    update public.cleanup_attempts set
      status = 'changes_requested', review_due_at = null, last_activity_at = transition_at
    where id = target_cleanup_id returning * into attempt_record;
    update public.reports set cleanup_state = 'changes_requested'
    where id = attempt_record.report_id;
    return attempt_record;
  end if;

  if review_decision <> 'approved'
    or coalesce(cardinality(request_change_reasons), 0) <> 0 then
    raise check_violation using message = 'cleanup_review_decision_invalid';
  end if;

  insert into public.cleanup_reviews (
    cleanup_attempt_id, submission_id, reviewer_id, decision,
    reason_codes, note, created_at
  ) values (
    target_cleanup_id, target_submission_id, actor_id, 'approved',
    null, normalized_note, transition_at
  );
  update public.cleanup_attempts set
    status = 'completed',
    completed_at = transition_at,
    last_activity_at = transition_at,
    final_submission_id = target_submission_id,
    final_reviewer_id = actor_id,
    approval_method = case when is_self_cleanup then 'self_approved' else 'reporter_approved' end
  where id = target_cleanup_id returning * into attempt_record;
  update public.reports set
    cleanup_state = 'completed', expired_at = null, cancelled_at = null
  where id = attempt_record.report_id;
  return attempt_record;
end;
$$;

revoke all on function public.review_cleanup(uuid, uuid, text, text[], text)
  from public, anon, authenticated, service_role;
grant execute on function public.review_cleanup(uuid, uuid, text, text[], text)
  to authenticated;

comment on function public.review_cleanup(uuid, uuid, text, text[], text) is
  'Allows the original reporter to approve volunteer cleanups and financially cleared paid cleanups; paid disputes remain administrator-reviewed.';
