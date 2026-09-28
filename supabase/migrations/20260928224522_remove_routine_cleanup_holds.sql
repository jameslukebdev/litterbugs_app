-- Ordinary first paid cleanups use the existing photo/dispute approval path.
-- Keep historical first-paid facts and decisions, but stop creating routine holds.
-- CREATE OR REPLACE preserves existing function ownership and execute grants.

CREATE OR REPLACE FUNCTION public.claim_cleanup(target_report_id uuid)
 RETURNS cleanup_attempts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor_id uuid := private.require_permanent_cleanup_user();
  transition_at timestamptz := now();
  report_record public.reports%rowtype;
  active_waiver_version text;
  active_guidelines_version text;
  attempt_record public.cleanup_attempts%rowtype;
  expired_attempt_id uuid;
  reward_cents bigint;
  first_paid boolean;
begin
  select waiver_version, guidelines_version
  into active_waiver_version, active_guidelines_version
  from public.cleanup_waiver_versions
  where is_active and retired_at is null
  for share;

  if active_waiver_version is null then
    raise check_violation using message = 'cleanup_waiver_unavailable';
  end if;

  if not exists (
    select 1 from public.cleanup_waiver_acceptances
    where user_id = actor_id
      and waiver_version = active_waiver_version
      and guidelines_version = active_guidelines_version
  ) then
    raise check_violation using message = 'cleanup_waiver_required';
  end if;

  select * into report_record
  from public.reports
  where id = target_report_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_report_not_found';
  end if;

  for expired_attempt_id in
    select id from public.cleanup_attempts
    where report_id = target_report_id
      and status = 'claimed'
      and claim_expires_at <= transition_at
  loop
    perform private.expire_cleanup_claim(expired_attempt_id, transition_at);
  end loop;

  select * into report_record
  from public.reports
  where id = target_report_id;

  if report_record.cleanup_state = 'claimed' then
    raise unique_violation using message = 'This cleanup was just claimed';
  end if;

  if report_record.cleanup_state <> 'available'
    or report_record.renewal_status <> 'active'
    or report_record.expired_at is not null
    or report_record.cancelled_at is not null
    or report_record.expires_at <= transition_at then
    raise check_violation using message = 'cleanup_report_not_available';
  end if;

  if exists (
    select 1 from public.cleanup_attempts
    where report_id = target_report_id
      and status = any (array['claimed', 'completion_submitted', 'changes_requested'])
  ) then
    raise unique_violation using message = 'This cleanup was just claimed';
  end if;

  select coalesce(sum(principal_amount_cents), 0)
  into reward_cents
  from public.cleanup_contributions
  where report_id = target_report_id
    and status = 'succeeded'
    and cleanup_attempt_id is null;

  if reward_cents > 0 then
    if report_record.funding_eligibility <> 'eligible'
      or not exists (
        select 1 from public.cleaner_payout_accounts
        where user_id = actor_id
          and onboarding_status = 'enabled'
          and payouts_enabled
          and country = 'US'
          and age_18_confirmed_at is not null
      ) then
      raise check_violation using message = 'cleaner_payout_onboarding_required';
    end if;

    if exists (
      select 1 from public.cleanup_contributions
      where report_id = target_report_id
        and status = 'succeeded'
        and cleanup_attempt_id is null
        and auto_refund_due_at <= transition_at + interval '7 days'
    ) then
      raise check_violation using message = 'cleanup_fund_maintenance_pending';
    end if;
  end if;

  select not exists (
    select 1 from public.cleanup_attempts
    where cleaner_id = actor_id
      and is_paid
      and payout_status = 'transferred'
  ) into first_paid;

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
    last_activity_at,
    reward_amount_cents,
    is_paid,
    first_paid_cleanup,
    financial_review_status,
    first_paid_admin_status,
    payout_status
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
    transition_at,
    reward_cents,
    reward_cents > 0,
    reward_cents > 0 and first_paid,
    case when reward_cents > 0 then 'queued' else 'not_required' end,
    'not_required',
    case when reward_cents > 0 then 'blocked' else 'not_applicable' end
  ) returning * into attempt_record;

  if reward_cents > 0 then
    update public.cleanup_contributions set
      cleanup_attempt_id = attempt_record.id,
      updated_at = transition_at
    where report_id = target_report_id
      and status = 'succeeded'
      and cleanup_attempt_id is null;
  end if;

  update public.reports set
    cleanup_state = 'claimed',
    funded_amount_cents = reward_cents,
    funding_frozen_at = case when reward_cents > 0 then transition_at else null end
  where id = target_report_id;

  return attempt_record;
exception
  when unique_violation then
    raise unique_violation using message = 'This cleanup was just claimed';
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_cleanup_ai_result(target_check_id uuid, result_status text, result_model text, result_image_hashes text[], result_summary text, result_reason_codes text[], result_raw jsonb)
 RETURNS cleanup_ai_checks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  check_record public.cleanup_ai_checks%rowtype;
  attempt_record public.cleanup_attempts%rowtype;
  latest_submission_id uuid;
  transition_at timestamptz := now();
begin
  if result_status <> all (array['passed', 'better_photos', 'admin_review', 'failed'])
    or result_summary is null
    or char_length(btrim(result_summary)) not between 1 and 1000 then
    raise check_violation using message = 'cleanup_ai_result_invalid';
  end if;

  select * into check_record
  from public.cleanup_ai_checks
  where id = target_check_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_ai_check_not_found';
  end if;
  if check_record.status not in ('queued', 'running') then
    return check_record;
  end if;

  update public.cleanup_ai_checks set
    status = result_status,
    model = result_model,
    image_hashes = coalesce(result_image_hashes, '{}'),
    user_summary = btrim(result_summary),
    reason_codes = coalesce(result_reason_codes, '{}'),
    raw_result = result_raw,
    completed_at = transition_at
  where id = target_check_id
  returning * into check_record;

  if check_record.check_kind = 'report' then
    update public.reports set
      funding_eligibility = case result_status
        when 'passed' then 'eligible'
        when 'better_photos' then 'better_photos'
        when 'admin_review' then 'safety_hold'
        else 'ineligible'
      end,
      funding_hold_reason = case
        when result_status = 'passed' then null
        else btrim(result_summary)
      end,
      original_photo_reviewed_at = transition_at
    where id = check_record.report_id;

    if result_status in ('admin_review', 'failed') then
      insert into public.cleanup_admin_cases (
        case_type, priority, report_id, title, summary, context
      ) values (
        'report_safety',
        case when result_status = 'failed' then 1 else 2 end,
        check_record.report_id,
        'Report funding eligibility review',
        btrim(result_summary),
        jsonb_build_object('ai_check_id', check_record.id, 'reason_codes', result_reason_codes)
      ) on conflict do nothing;
    end if;

    return check_record;
  end if;

  select * into attempt_record
  from public.cleanup_attempts
  where id = check_record.cleanup_attempt_id
  for update;

  select id into latest_submission_id
  from public.cleanup_submissions
  where cleanup_attempt_id = attempt_record.id
  order by submission_number desc
  limit 1;

  if attempt_record.status <> 'completion_submitted'
    or latest_submission_id is distinct from check_record.submission_id then
    raise check_violation using message = 'cleanup_ai_submission_is_not_current';
  end if;

  if result_status = 'passed' then
    update public.cleanup_attempts set
      financial_review_status = 'passed',
      financial_review_attempts = check_record.attempt_number,
      financial_review_summary = btrim(result_summary),
      review_due_at = transition_at + private.cleanup_review_duration(),
      last_activity_at = transition_at
    where id = attempt_record.id;

    if attempt_record.reporter_id is not null then
      insert into public.cleanup_notifications (
        user_id, cleanup_attempt_id, report_id, submission_id, event_type, created_at
      ) values (
        attempt_record.reporter_id,
        attempt_record.id,
        attempt_record.report_id,
        check_record.submission_id,
        'paid_review_started',
        transition_at
      ) on conflict do nothing;
    end if;


    return check_record;
  end if;

  if result_status = 'better_photos' and check_record.attempt_number < 3 then
    insert into public.cleanup_reviews (
      cleanup_attempt_id,
      submission_id,
      reviewer_id,
      decision,
      reason_codes,
      note,
      created_at
    ) values (
      attempt_record.id,
      check_record.submission_id,
      null,
      'changes_requested',
      array['additional_photo_needed'],
      btrim(result_summary),
      transition_at
    );

    update public.cleanup_attempts set
      status = 'changes_requested',
      financial_review_status = 'better_photos',
      financial_review_attempts = check_record.attempt_number,
      financial_review_summary = btrim(result_summary),
      review_due_at = null,
      last_activity_at = transition_at
    where id = attempt_record.id;

    update public.reports set cleanup_state = 'changes_requested'
    where id = attempt_record.report_id;
    return check_record;
  end if;

  update public.cleanup_attempts set
    financial_review_status = 'admin_review',
    financial_review_attempts = check_record.attempt_number,
    financial_review_summary = btrim(result_summary),
    review_due_at = null,
    last_activity_at = transition_at
  where id = attempt_record.id;

  insert into public.cleanup_admin_cases (
    case_type,
    priority,
    report_id,
    cleanup_attempt_id,
    title,
    summary,
    context
  ) values (
    'gemini_review',
    case when result_status = 'failed' then 1 else 2 end,
    attempt_record.report_id,
    attempt_record.id,
    'Funded cleanup evidence review',
    btrim(result_summary),
    jsonb_build_object('submission_id', check_record.submission_id, 'ai_check_id', check_record.id)
  ) on conflict do nothing;

  return check_record;
end;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_cleanup_admin_case(target_case_id uuid, target_action text, target_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.review_cleanup(target_cleanup_id uuid, target_submission_id uuid, review_decision text, request_change_reasons text[] DEFAULT NULL::text[], reviewer_note text DEFAULT NULL::text)
 RETURNS cleanup_attempts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    attempt_record := private.auto_approve_cleanup(target_cleanup_id, transition_at);
    if attempt_record.status <> 'completed' then
      raise check_violation using message = 'paid_cleanup_review_not_ready';
    end if;
    return attempt_record;
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
      or attempt_record.first_paid_admin_status = 'rejected' then
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
$function$;

CREATE OR REPLACE FUNCTION private.auto_approve_cleanup(target_cleanup_id uuid, effective_at timestamp with time zone)
 RETURNS cleanup_attempts
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  attempt_record public.cleanup_attempts%rowtype;
  latest_submission_id uuid;
  transition_at timestamptz := coalesce(effective_at, now());
begin
  select * into attempt_record
  from public.cleanup_attempts
  where id = target_cleanup_id
  for update;

  if not found then return null; end if;

  perform 1 from public.reports
  where id = attempt_record.report_id
  for update;

  if attempt_record.status <> 'completion_submitted'
    or attempt_record.review_due_at is null
    or attempt_record.review_due_at > transition_at then
    return attempt_record;
  end if;

  if attempt_record.is_paid and (
    attempt_record.financial_review_status <> 'passed'
    or attempt_record.dispute_status = 'open'
    or attempt_record.first_paid_admin_status = 'rejected'
  ) then
    return attempt_record;
  end if;

  select id into latest_submission_id
  from public.cleanup_submissions
  where cleanup_attempt_id = target_cleanup_id
  order by submission_number desc limit 1;
  if latest_submission_id is null then
    raise check_violation using message = 'cleanup_submission_required';
  end if;

  if exists (
    select 1 from public.cleanup_reviews
    where cleanup_attempt_id = target_cleanup_id
      and submission_id = latest_submission_id
      and reviewer_id is not null
  ) then
    return attempt_record;
  end if;

  insert into public.cleanup_reviews (
    cleanup_attempt_id, submission_id, reviewer_id, decision,
    reason_codes, note, created_at
  ) values (
    target_cleanup_id, latest_submission_id, null, 'auto_approved',
    null, null, transition_at
  ) on conflict do nothing;

  update public.cleanup_attempts set
    status = 'completed',
    completed_at = transition_at,
    last_activity_at = transition_at,
    final_submission_id = latest_submission_id,
    final_reviewer_id = null,
    approval_method = 'auto_approved',
    payout_status = case when is_paid then 'pending' else 'not_applicable' end
  where id = target_cleanup_id
  returning * into attempt_record;

  update public.reports set
    cleanup_state = 'completed',
    expired_at = null,
    cancelled_at = null
  where id = attempt_record.report_id;

  return attempt_record;
end;
$function$;

CREATE OR REPLACE FUNCTION private.run_cleanup_maintenance()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  maintenance_at timestamptz := now();
  due_cleanup record;
  due_report record;
begin
  insert into public.cleanup_notifications (
    user_id, cleanup_attempt_id, report_id, event_type, created_at
  )
  select cleaner_id, id, report_id, 'claim_expiring_soon', maintenance_at
  from public.cleanup_attempts
  where status = 'claimed'
    and cleaner_id is not null
    and claim_expires_at > maintenance_at
    and claim_expires_at <= maintenance_at + private.cleanup_claim_expiration_notice_lead()
  on conflict do nothing;

  for due_cleanup in
    select id from public.cleanup_attempts
    where status = 'claimed' and claim_expires_at <= maintenance_at
    order by claim_expires_at
  loop
    perform private.expire_cleanup_claim(due_cleanup.id, maintenance_at);
  end loop;

  for due_cleanup in
    select id from public.cleanup_attempts
    where status = 'completion_submitted'
      and review_due_at <= maintenance_at
      and (not is_paid or (
        financial_review_status = 'passed'
        and dispute_status <> 'open'
        and first_paid_admin_status <> 'rejected'
      ))
    order by review_due_at
  loop
    perform private.auto_approve_cleanup(due_cleanup.id, maintenance_at);
  end loop;

  for due_cleanup in
    select id from public.cleanup_attempts
    where status = 'changes_requested' and correction_due_at <= maintenance_at
    order by correction_due_at
  loop
    perform private.expire_cleanup_correction(due_cleanup.id, maintenance_at);
  end loop;

  with expired_reports as (
    update public.reports set
      expired_at = expires_at,
      renewal_status = 'decision_required',
      renewal_decision_due_at = maintenance_at + interval '7 days'
    where expires_at < maintenance_at
      and expired_at is null
      and cancelled_at is null
      and cleanup_state = 'available'
      and renewal_status = 'active'
    returning id, user_id
  )
  insert into public.cleanup_notifications (
    user_id, cleanup_attempt_id, report_id, event_type, created_at
  )
  select user_id, null, id, 'report_renewal_due', maintenance_at
  from expired_reports
  where user_id is not null;

  for due_report in
    select id from public.reports
    where renewal_status = 'decision_required'
      and renewal_decision_due_at <= maintenance_at
    order by renewal_decision_due_at
  loop
    perform private.close_expired_report(due_report.id, maintenance_at, null, 'system');
  end loop;

  with refund_due as (
    update public.cleanup_contributions set
      status = 'refund_pending',
      refund_requested_at = maintenance_at,
      updated_at = maintenance_at
    where status = 'succeeded'
      and cleanup_attempt_id is null
      and auto_refund_due_at <= maintenance_at
    returning report_id, principal_amount_cents
  ), refund_totals as (
    select report_id, sum(principal_amount_cents) as principal_amount_cents
    from refund_due
    group by report_id
  )
  update public.reports as reports set
    funded_amount_cents = greatest(
      0,
      reports.funded_amount_cents - refund_totals.principal_amount_cents
    )
  from refund_totals
  where reports.id = refund_totals.report_id;

  perform private.queue_cleanup_push_worker(null);
end;
$function$;

CREATE OR REPLACE FUNCTION private.notify_report_funding_resolution()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.funding_eligibility not in ('pending', 'safety_hold')
    or new.funding_eligibility not in ('eligible', 'ineligible')
    or new.user_id is null
    or not new.is_published
    or new.original_photo_reviewed_at is null then
    return new;
  end if;

  insert into public.cleanup_notifications (
    user_id,
    cleanup_attempt_id,
    report_id,
    event_type,
    created_at
  ) values (
    new.user_id,
    null,
    new.id,
    case new.funding_eligibility
      when 'eligible' then 'report_funding_approved'
      else 'report_funding_rejected'
    end,
    coalesce(new.original_photo_reviewed_at, now())
  );

  return new;
end;
$function$;

-- Retire unreviewed routine cases through the existing audit trail. No cleanup
-- is approved here; AI, disputes, deadlines, rejected decisions and payout state
-- remain unchanged. Cases with human actions are deliberately not rewritten.
with retired_cases as (
  update public.cleanup_admin_cases c set
    status = 'resolved', resolved_at = now(), updated_at = now()
  where c.case_type = 'first_paid_cleanup' and c.status = 'open'
    and not exists (select 1 from public.cleanup_admin_actions a where a.case_id = c.id)
    and exists (
      select 1 from public.cleanup_attempts a
      where a.id = c.cleanup_attempt_id and a.first_paid_admin_status = 'pending'
    )
  returning c.id, c.cleanup_attempt_id
), audit_actions as (
  insert into public.cleanup_admin_actions (case_id, action, reason)
  select id, 'routine_first_paid_hold_removed',
    'Owner policy: first paid status alone no longer requires administrator approval. Existing evidence, dispute and payment checks remain in force.'
  from retired_cases
  returning case_id
)
update public.cleanup_attempts a set first_paid_admin_status = 'not_required'
from retired_cases c
where a.id = c.cleanup_attempt_id;

-- Claims made before the rollout may not yet have a review case. Preserve
-- historical terminal attempts and human decisions; only retire the routine flag.
update public.cleanup_attempts a set first_paid_admin_status = 'not_required'
where a.first_paid_admin_status = 'pending'
  and a.status in ('claimed', 'completion_submitted', 'changes_requested')
  and not exists (
    select 1 from public.cleanup_admin_cases c
    where c.cleanup_attempt_id = a.id and c.case_type = 'first_paid_cleanup'
  );
