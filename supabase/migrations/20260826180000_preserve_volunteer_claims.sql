create or replace function public.claim_cleanup(target_report_id uuid)
returns public.cleanup_attempts
language plpgsql
security definer
set search_path = ''
as $$
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
    case when reward_cents > 0 and first_paid then 'pending' else 'not_required' end,
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
$$;

revoke all on function public.claim_cleanup(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_cleanup(uuid) to authenticated;
