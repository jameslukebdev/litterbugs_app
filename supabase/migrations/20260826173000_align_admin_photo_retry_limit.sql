create or replace function public.resolve_cleanup_admin_case(
  target_case_id uuid,
  target_action text,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_cleanup_admin();
  case_record public.cleanup_admin_cases%rowtype;
  attempt_record public.cleanup_attempts%rowtype;
  latest_submission_id uuid;
  transition_at timestamptz := now();
  normalized_reason text := btrim(target_reason);
begin
  if normalized_reason is null or char_length(normalized_reason) not between 3 and 1000 then
    raise check_violation using message = 'cleanup_admin_reason_required';
  end if;

  select * into case_record
  from public.cleanup_admin_cases
  where id = target_case_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_admin_case_not_found';
  end if;
  if case_record.status <> 'open' then
    raise check_violation using message = 'cleanup_admin_case_already_resolved';
  end if;

  if case_record.case_type = 'report_safety' then
    if target_action = 'approve_funding' then
      update public.reports set
        funding_eligibility = 'eligible', funding_hold_reason = null,
        original_photo_reviewed_at = transition_at
      where id = case_record.report_id;
    elsif target_action = 'reject_funding' then
      update public.reports set
        funding_eligibility = 'ineligible', funding_hold_reason = normalized_reason,
        original_photo_reviewed_at = transition_at
      where id = case_record.report_id;
    elsif target_action = 'close_and_refund' then
      perform private.close_expired_report(
        case_record.report_id, transition_at, actor_id, 'admin'
      );
    else
      raise check_violation using message = 'cleanup_admin_action_invalid';
    end if;
  elsif case_record.case_type in ('gemini_review', 'first_paid_cleanup', 'dispute') then
    select * into attempt_record
    from public.cleanup_attempts
    where id = case_record.cleanup_attempt_id
    for update;

    if target_action in ('reject_cleanup', 'reject_and_close', 'uphold_dispute') then
      attempt_record := private.reject_paid_cleanup(
        case_record.cleanup_attempt_id, transition_at, normalized_reason
      );
      if case_record.case_type = 'dispute' then
        update public.cleanup_attempts set dispute_status = 'upheld'
        where id = case_record.cleanup_attempt_id;
      elsif case_record.case_type = 'first_paid_cleanup' then
        update public.cleanup_attempts set first_paid_admin_status = 'rejected'
        where id = case_record.cleanup_attempt_id;
      end if;
      if target_action = 'reject_and_close' then
        perform private.close_expired_report(
          case_record.report_id, transition_at, actor_id, 'admin'
        );
      end if;
    elsif case_record.case_type = 'first_paid_cleanup'
      and target_action = 'approve_cleanup' then
      update public.cleanup_attempts set first_paid_admin_status = 'approved'
      where id = case_record.cleanup_attempt_id returning * into attempt_record;
    elsif case_record.case_type = 'gemini_review'
      and target_action = 'approve_cleanup' then
      update public.cleanup_attempts set
        financial_review_status = 'passed',
        financial_review_summary = normalized_reason,
        review_due_at = transition_at + private.cleanup_review_duration(),
        last_activity_at = transition_at
      where id = case_record.cleanup_attempt_id returning * into attempt_record;
      if attempt_record.first_paid_cleanup then
        insert into public.cleanup_admin_cases (
          case_type, priority, report_id, cleanup_attempt_id,
          title, summary, context
        ) values (
          'first_paid_cleanup', 2, attempt_record.report_id, attempt_record.id,
          'First paid cleanup check', normalized_reason,
          jsonb_build_object('source_case_id', case_record.id)
        ) on conflict do nothing;
      end if;
    elsif case_record.case_type = 'gemini_review'
      and target_action = 'request_better_photos' then
      if attempt_record.financial_review_attempts >= 3 then
        raise check_violation using message = 'cleanup_photo_attempts_exhausted';
      end if;
      select id into latest_submission_id
      from public.cleanup_submissions
      where cleanup_attempt_id = attempt_record.id
      order by submission_number desc limit 1;
      insert into public.cleanup_reviews (
        cleanup_attempt_id, submission_id, reviewer_id, decision,
        reason_codes, note, created_at
      ) values (
        attempt_record.id, latest_submission_id, actor_id, 'changes_requested',
        array['additional_photo_needed'], normalized_reason, transition_at
      );
      update public.cleanup_attempts set
        status = 'changes_requested',
        financial_review_status = 'better_photos',
        review_due_at = null,
        last_activity_at = transition_at
      where id = attempt_record.id;
      update public.reports set cleanup_state = 'changes_requested'
      where id = attempt_record.report_id;
    elsif case_record.case_type = 'dispute'
      and target_action = 'deny_dispute' then
      update public.cleanup_attempts set dispute_status = 'denied'
      where id = case_record.cleanup_attempt_id returning * into attempt_record;
    else
      raise check_violation using message = 'cleanup_admin_action_invalid';
    end if;
  elsif case_record.case_type = 'payout_failure' and target_action = 'retry_payout' then
    update public.cleanup_attempts set payout_status = 'pending', payout_last_error = null
    where id = case_record.cleanup_attempt_id;
  elsif case_record.case_type = 'refund_failure' and target_action = 'retry_refund' then
    update public.cleanup_contributions set
      status = 'refund_pending', failure_code = null, updated_at = transition_at
    where id = case_record.contribution_id;
  else
    raise check_violation using message = 'cleanup_admin_action_invalid';
  end if;

  insert into public.cleanup_admin_actions (
    case_id, admin_id, action, reason, created_at
  ) values (
    target_case_id, actor_id, target_action, normalized_reason, transition_at
  );

  update public.cleanup_admin_cases set
    status = 'resolved',
    resolved_by = actor_id,
    resolved_at = transition_at,
    updated_at = transition_at
  where id = target_case_id;

  if attempt_record.id is not null
    and attempt_record.status = 'completion_submitted'
    and attempt_record.review_due_at <= transition_at then
    attempt_record := private.auto_approve_cleanup(attempt_record.id, transition_at);
  end if;

  return public.get_cleanup_admin_case(target_case_id);
end;
$$;

revoke all on function public.resolve_cleanup_admin_case(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.resolve_cleanup_admin_case(uuid, text, text)
  to authenticated;
