-- Version 2 was never activated and has no production reservations. Keep the
-- existing wire version accepted by released iOS/Android apps; version 1 is immutable.
-- Fail closed if this precondition changes before rollout.
do $$ begin
  if exists (select 1 from public.cleanup_contributions where pricing_version = 2) then
    raise exception 'Version 2 already has reservations; do not reprice them';
  end if;
end $$;
alter table public.cleanup_contributions drop constraint cleanup_contributions_fee_check;
alter table public.cleanup_contributions add constraint cleanup_contributions_fee_check check (
  platform_fee_cents = case pricing_version when 2 then
    ((principal_amount_cents + 2) / 5) + case when principal_amount_cents < 500 then 50 else 0 end
    else ((principal_amount_cents + 5) / 10) end
  and total_amount_cents = principal_amount_cents + platform_fee_cents
);

create or replace function public.reserve_cleanup_contribution(
  target_report_id uuid, target_contributor_id uuid, target_client_request_id uuid,
  principal_cents bigint, expected_pricing_version integer, receipt_email text default null
) returns public.cleanup_contributions
language plpgsql security invoker set search_path = '' as $$
declare
  report_record public.reports%rowtype;
  contribution_record public.cleanup_contributions%rowtype;
  active_version integer;
  fee_cents bigint;
begin
  if target_report_id is null or target_contributor_id is null or target_client_request_id is null
    or principal_cents is null or principal_cents not between 100 and 100000 then
    raise check_violation using message = 'cleanup_contribution_invalid';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_contributor_id::text || target_client_request_id::text, 0));
  select * into contribution_record from public.cleanup_contributions
    where contributor_id = target_contributor_id and client_request_id = target_client_request_id;
  if found then
    if contribution_record.report_id <> target_report_id or contribution_record.principal_amount_cents <> principal_cents then
      raise check_violation using message = 'cleanup_contribution_idempotency_mismatch';
    end if;
    return contribution_record;
  end if;
  -- Lock against an activation/rollback until this reservation commits.
  active_version := private.lock_cleanup_pricing_version();
  if expected_pricing_version is distinct from active_version then
    raise check_violation using message = 'cleanup_pricing_changed';
  end if;
  if not exists (select 1 from public.cleanup_feature_flags where name = 'payments_enabled' and enabled) then
    raise check_violation using message = 'payments_disabled';
  end if;
  if not exists (select 1 from public.cleanup_feature_flags where name = 'gemini_financial_review_enabled' and enabled) then
    raise check_violation using message = 'financial_review_disabled';
  end if;
  select * into report_record from public.reports where id = target_report_id for update;
  if not found then raise no_data_found using message = 'cleanup_report_not_found'; end if;
  if report_record.cleanup_state <> 'available' or report_record.funding_eligibility <> 'eligible'
    or report_record.funding_frozen_at is not null or report_record.renewal_status <> 'active'
    or report_record.expired_at is not null or report_record.cancelled_at is not null
    or report_record.expires_at <= now() or coalesce(cardinality(report_record.photo_paths), 0) = 0 then
    raise check_violation using message = 'report_not_open_for_funding';
  end if;
  fee_cents := case active_version when 2 then ((principal_cents + 2) / 5) + case when principal_cents < 500 then 50 else 0 end else ((principal_cents + 5) / 10) end;
  insert into public.cleanup_contributions (
    report_id, contributor_id, client_request_id, principal_amount_cents,
    platform_fee_cents, total_amount_cents, pricing_version, stripe_receipt_email
  ) values (target_report_id, target_contributor_id, target_client_request_id, principal_cents,
    fee_cents, principal_cents + fee_cents, active_version, receipt_email)
  returning * into contribution_record;
  return contribution_record;
end;
$$;

-- One earned reward per verified cleanup. Reporting itself needs no Stripe account.
-- Existing test contributions (version 1) are not retroactively rewarded.
create table public.reporter_rewards (
  cleanup_attempt_id uuid primary key references public.cleanup_attempts(id) on delete restrict,
  report_id uuid not null references public.reports(id) on delete restrict,
  reporter_id uuid references auth.users(id) on delete set null,
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending','processing','transferred','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payout_attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  attempt_started_at timestamptz,
  stripe_destination_id text,
  stripe_transfer_id text unique,
  last_error text,
  retry_blocked boolean not null default false
);
create index reporter_rewards_owner_idx on public.reporter_rewards (reporter_id, created_at desc);
create index reporter_rewards_queue_idx on public.reporter_rewards (status, updated_at) where status in ('pending','processing');
alter table public.reporter_rewards enable row level security;
revoke all on public.reporter_rewards from public, anon, authenticated;
grant select on public.reporter_rewards to authenticated;
grant all on public.reporter_rewards to service_role;
create policy "Reporters can read their earnings" on public.reporter_rewards
  for select to authenticated using ((select public.is_permanent_user()) and reporter_id = (select auth.uid()));

create function private.earn_reporter_reward() returns trigger
language plpgsql security definer set search_path = '' as $$
declare reward_cents bigint;
begin
  if new.status = 'completed' and old.status <> 'completed' and new.is_paid and new.reporter_id is not null then
    -- Sum before rounding so splitting a contribution cannot increase the reward.
    select floor((coalesce(sum(principal_amount_cents), 0) + 10) / 20)::bigint into reward_cents
      from public.cleanup_contributions
      where cleanup_attempt_id = new.id and pricing_version = 2 and status = 'succeeded';
    if reward_cents > 0 then
      insert into public.reporter_rewards (cleanup_attempt_id, report_id, reporter_id, amount_cents)
        values (new.id, new.report_id, new.reporter_id, reward_cents) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
revoke all on function private.earn_reporter_reward() from public, anon, authenticated;
create trigger earn_reporter_reward after update of status on public.cleanup_attempts
  for each row execute function private.earn_reporter_reward();

create function public.claim_reporter_payout_operation() returns public.reporter_rewards
language plpgsql security invoker set search_path = '' as $$
declare reward public.reporter_rewards%rowtype; destination text;
begin
  -- Recover interrupted requests using the same attempt and idempotency key.
  select * into reward from public.reporter_rewards
    where status = 'processing' and updated_at < now() - interval '5 minutes'
    order by updated_at for update skip locked limit 1;
  if found then
    update public.reporter_rewards set updated_at = now() where cleanup_attempt_id = reward.cleanup_attempt_id returning * into reward;
    return reward;
  end if;
  select r.* into reward from public.reporter_rewards r
    join public.cleanup_attempts a on a.id = r.cleanup_attempt_id
    join public.cleaner_payout_accounts p on p.user_id = r.reporter_id
    where r.status = 'pending' and r.next_attempt_at <= now() and a.status = 'completed' and a.payout_status = 'transferred'
      and p.payouts_enabled and p.country = 'US' and p.age_18_confirmed_at is not null
    order by r.created_at for update of r skip locked limit 1;
  if not found then return null; end if;
  select stripe_account_id into destination from public.cleaner_payout_accounts where user_id = reward.reporter_id;
  update public.reporter_rewards set status = 'processing', payout_attempts = payout_attempts + 1,
    attempt_started_at = now(), updated_at = now(), stripe_destination_id = destination, last_error = null
    where cleanup_attempt_id = reward.cleanup_attempt_id returning * into reward;
  return reward;
end $$;
revoke all on function public.claim_reporter_payout_operation() from public, anon, authenticated;
grant execute on function public.claim_reporter_payout_operation() to service_role;

create function public.mark_reporter_payout_result(
  target_cleanup_id uuid, target_status text, target_transfer_id text default null,
  target_error text default null, block_retry boolean default false
) returns public.reporter_rewards language plpgsql security invoker set search_path = '' as $$
declare reward public.reporter_rewards%rowtype;
begin
  select * into strict reward from public.reporter_rewards where cleanup_attempt_id = target_cleanup_id for update;
  if target_status not in ('transferred','failed','reversed','waiting_funds') then raise exception 'Invalid reporter payout result'; end if;
  if target_status = 'waiting_funds' then
    if reward.status <> 'processing' then return reward; end if;
    update public.reporter_rewards set status = 'pending', next_attempt_at = now() + interval '1 hour',
      updated_at = now(), last_error = 'Waiting for Stripe funds to become available'
      where cleanup_attempt_id = target_cleanup_id returning * into reward;
    return reward;
  end if;
  if target_status = 'transferred' then
    if target_transfer_id is null then raise exception 'Reporter transfer ID required'; end if;
    -- A delayed success event must never undo a reversal or overwrite another transfer.
    if (reward.retry_blocked and reward.stripe_transfer_id is not null) or (reward.stripe_transfer_id is not null and reward.stripe_transfer_id <> target_transfer_id) then return reward; end if;
    if reward.status = 'transferred' then return reward; end if;
    update public.reporter_rewards set status = 'transferred', stripe_transfer_id = target_transfer_id,
      updated_at = now(), last_error = null, retry_blocked = false where cleanup_attempt_id = target_cleanup_id returning * into reward;
    insert into public.cleanup_financial_audit (actor_kind,action,report_id,cleanup_attempt_id,metadata)
      values ('stripe','reporter_reward_transferred',reward.report_id,target_cleanup_id,
        jsonb_build_object('transfer_id',target_transfer_id,'amount_cents',reward.amount_cents));
  else
    if target_status = 'failed' and reward.status = 'transferred' then return reward; end if;
    if target_status = 'reversed' and reward.stripe_transfer_id is not null and reward.stripe_transfer_id <> target_transfer_id then return reward; end if;
    update public.reporter_rewards set status = 'failed', updated_at = now(),
      stripe_transfer_id = coalesce(target_transfer_id,stripe_transfer_id),
      last_error = left(coalesce(target_error,'Reporter reward transfer failed'),1000),
      retry_blocked = block_retry or target_status = 'reversed'
      where cleanup_attempt_id = target_cleanup_id returning * into reward;
    insert into public.cleanup_admin_cases (case_type,priority,report_id,cleanup_attempt_id,title,summary,context)
      values ('payout_failure',1,reward.report_id,target_cleanup_id,'Reporter reward transfer needs attention',reward.last_error,
        jsonb_build_object('reporter_reward',true)) on conflict do nothing;
  end if;
  return reward;
end $$;
revoke all on function public.mark_reporter_payout_result(uuid,text,text,text,boolean) from public, anon, authenticated;
grant execute on function public.mark_reporter_payout_result(uuid,text,text,text,boolean) to service_role;

-- Reuse the existing payout-failure admin action for either recipient.
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
    if coalesce((case_record.context->>'reporter_reward')::boolean, false) then
      if exists (select 1 from public.reporter_rewards where cleanup_attempt_id = case_record.cleanup_attempt_id and retry_blocked) then
        raise check_violation using message = 'Check the reporter transfer in Stripe before retrying; its outcome needs reconciliation.';
      end if;
      update public.reporter_rewards set status = 'pending', last_error = null, updated_at = now(), next_attempt_at = now()
        where cleanup_attempt_id = case_record.cleanup_attempt_id and status = 'failed';
    else
      update public.cleanup_attempts set payout_status = 'pending', payout_last_error = null
        where id = case_record.cleanup_attempt_id;
    end if;
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

-- Preserve earned money while an account deletion is being completed.
create or replace function public.prepare_funded_cleanup_account_deletion(
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_attempt record;
  funded_report record;
  transition_at timestamptz := now();
begin
  if exists (
    select 1 from public.cleanup_attempts
    where cleaner_id = target_user_id
      and is_paid
      and status = 'completed'
      and payout_status in ('pending', 'processing', 'failed')
  ) or exists (
    select 1 from public.reporter_rewards where reporter_id = target_user_id
      and status in ('pending','processing','failed')
  ) then
    raise check_violation using message = 'cleanup_payout_must_finish_before_account_deletion';
  end if;

  for active_attempt in
    select attempts.id
    from public.cleanup_attempts as attempts
    join public.reports as reports on reports.id = attempts.report_id
    where attempts.is_paid
      and attempts.status in ('claimed', 'completion_submitted', 'changes_requested')
      and (attempts.cleaner_id = target_user_id or reports.user_id = target_user_id)
    order by attempts.claimed_at
  loop
    perform private.reject_paid_cleanup(
      active_attempt.id,
      transition_at,
      'Account deletion ended this funded cleanup.'
    );
  end loop;

  for funded_report in
    select id from public.reports
    where user_id = target_user_id
      and funding_locked_at is not null
      and cleanup_state = 'available'
      and cancelled_at is null
  loop
    perform private.close_expired_report(
      funded_report.id, transition_at, target_user_id, 'system'
    );
  end loop;
end;
$$;
