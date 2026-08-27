alter table public.cleanup_contributions
  add column refund_attempts integer not null default 0,
  add column refund_processing_started_at timestamptz;

alter table public.cleanup_contributions
  drop constraint cleanup_contributions_status_check,
  drop constraint cleanup_contributions_success_fields_check,
  drop constraint cleanup_contributions_refund_fields_check,
  add constraint cleanup_contributions_status_check check (
    status = any (array[
      'payment_pending',
      'succeeded',
      'refund_pending',
      'refund_processing',
      'refunded',
      'failed',
      'paid_out'
    ])
  ),
  add constraint cleanup_contributions_success_fields_check check (
    status in ('payment_pending', 'failed')
    or (
      succeeded_at is not null
      and auto_refund_due_at = succeeded_at + interval '23 months'
    )
  ),
  add constraint cleanup_contributions_refund_fields_check check (
    (status <> 'refunded' or refunded_at is not null)
    and (
      status not in ('refund_pending', 'refund_processing')
      or refund_requested_at is not null
    )
    and (
      (status = 'refund_processing' and refund_processing_started_at is not null)
      or (status <> 'refund_processing' and refund_processing_started_at is null)
    )
  ),
  add constraint cleanup_contributions_refund_attempts_check check (
    refund_attempts >= 0
  );

create index cleanup_contributions_refund_processing_idx
  on public.cleanup_contributions (refund_processing_started_at)
  where status = 'refund_processing';

alter table public.cleanup_attempts
  add column payout_attempts integer not null default 0,
  add constraint cleanup_attempts_payout_attempts_check check (
    payout_attempts >= 0
  );

create or replace function public.claim_cleanup_refund_operation()
returns public.cleanup_contributions
language plpgsql
security definer
set search_path = ''
as $$
declare
  contribution_record public.cleanup_contributions%rowtype;
  transition_at timestamptz := now();
begin
  select * into contribution_record
  from public.cleanup_contributions
  where status = 'refund_processing'
    and refund_processing_started_at < transition_at - interval '5 minutes'
  order by refund_processing_started_at
  for update skip locked
  limit 1;

  if found then
    update public.cleanup_contributions set
      refund_processing_started_at = transition_at,
      updated_at = transition_at
    where id = contribution_record.id
    returning * into contribution_record;
    return contribution_record;
  end if;

  select * into contribution_record
  from public.cleanup_contributions
  where status = 'refund_pending'
    and failure_code is null
  order by refund_requested_at
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.cleanup_contributions set
    status = 'refund_processing',
    refund_attempts = refund_attempts + 1,
    refund_processing_started_at = transition_at,
    updated_at = transition_at
  where id = contribution_record.id
  returning * into contribution_record;

  return contribution_record;
end;
$$;

revoke all on function public.claim_cleanup_refund_operation()
  from public, anon, authenticated, service_role;
grant execute on function public.claim_cleanup_refund_operation()
  to service_role;

create or replace function public.claim_cleanup_payout_operation()
returns public.cleanup_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record public.cleanup_attempts%rowtype;
  transition_at timestamptz := now();
begin
  select * into attempt_record
  from public.cleanup_attempts
  where payout_status = 'processing'
    and last_activity_at < transition_at - interval '5 minutes'
  order by last_activity_at
  for update skip locked
  limit 1;

  if found then
    update public.cleanup_attempts set
      last_activity_at = transition_at
    where id = attempt_record.id
    returning * into attempt_record;
    return attempt_record;
  end if;

  select * into attempt_record
  from public.cleanup_attempts
  where payout_status = 'pending'
  order by completed_at
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.cleanup_attempts set
    payout_status = 'processing',
    payout_attempts = payout_attempts + 1,
    last_activity_at = transition_at
  where id = attempt_record.id
  returning * into attempt_record;

  return attempt_record;
end;
$$;

revoke all on function public.claim_cleanup_payout_operation()
  from public, anon, authenticated, service_role;
grant execute on function public.claim_cleanup_payout_operation()
  to service_role;

create or replace function public.mark_cleanup_refund_processing(
  target_contribution_id uuid,
  target_refund_id text
)
returns public.cleanup_contributions
language plpgsql
security definer
set search_path = ''
as $$
declare
  contribution_record public.cleanup_contributions%rowtype;
begin
  select * into contribution_record
  from public.cleanup_contributions
  where id = target_contribution_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_contribution_not_found';
  end if;
  if contribution_record.status = 'refunded' then
    return contribution_record;
  end if;
  if contribution_record.status <> 'refund_processing' then
    raise check_violation using message = 'cleanup_refund_invalid_state';
  end if;

  update public.cleanup_contributions set
    stripe_refund_id = coalesce(target_refund_id, stripe_refund_id),
    failure_code = null,
    updated_at = now()
  where id = target_contribution_id
  returning * into contribution_record;

  return contribution_record;
end;
$$;

revoke all on function public.mark_cleanup_refund_processing(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.mark_cleanup_refund_processing(uuid, text)
  to service_role;

create or replace function public.mark_cleanup_refund_result(
  target_contribution_id uuid,
  refund_succeeded boolean,
  target_refund_id text default null,
  target_error text default null
)
returns public.cleanup_contributions
language plpgsql
security definer
set search_path = ''
as $$
declare
  contribution_record public.cleanup_contributions%rowtype;
  transition_at timestamptz := now();
begin
  select * into contribution_record
  from public.cleanup_contributions
  where id = target_contribution_id
  for update;
  if not found then
    raise no_data_found using message = 'cleanup_contribution_not_found';
  end if;
  if contribution_record.status = 'refunded' then
    return contribution_record;
  end if;
  if contribution_record.status not in ('refund_pending', 'refund_processing') then
    return contribution_record;
  end if;

  if refund_succeeded then
    if target_refund_id is null then
      raise check_violation using message = 'cleanup_refund_id_required';
    end if;
    update public.cleanup_contributions set
      status = 'refunded',
      stripe_refund_id = target_refund_id,
      refunded_at = transition_at,
      refund_processing_started_at = null,
      failure_code = null,
      updated_at = transition_at
    where id = target_contribution_id
    returning * into contribution_record;

    if contribution_record.contributor_id is not null then
      insert into public.cleanup_notifications (
        user_id, cleanup_attempt_id, report_id, contribution_id, event_type, created_at
      ) values (
        contribution_record.contributor_id, null, contribution_record.report_id,
        contribution_record.id, 'cleanup_contribution_refunded', transition_at
      ) on conflict do nothing;
    end if;
  else
    update public.cleanup_contributions set
      status = 'refund_pending',
      stripe_refund_id = coalesce(target_refund_id, stripe_refund_id),
      refund_processing_started_at = null,
      failure_code = left(coalesce(target_error, 'Refund failed'), 500),
      updated_at = transition_at
    where id = target_contribution_id
    returning * into contribution_record;

    insert into public.cleanup_admin_cases (
      case_type, priority, report_id, contribution_id, title, summary
    ) values (
      'refund_failure', 1, contribution_record.report_id, contribution_record.id,
      'Contribution refund failed', contribution_record.failure_code
    ) on conflict do nothing;
  end if;
  return contribution_record;
end;
$$;

revoke all on function public.mark_cleanup_refund_result(uuid, boolean, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.mark_cleanup_refund_result(uuid, boolean, text, text)
  to service_role;

create or replace function public.mark_cleanup_payout_result(
  target_cleanup_id uuid,
  transfer_succeeded boolean,
  target_transfer_id text default null,
  target_error text default null
)
returns public.cleanup_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record public.cleanup_attempts%rowtype;
  transition_at timestamptz := now();
begin
  select * into attempt_record
  from public.cleanup_attempts
  where id = target_cleanup_id
  for update;
  if not found then
    raise no_data_found using message = 'cleanup_not_found';
  end if;
  if not attempt_record.is_paid or attempt_record.status <> 'completed' then
    raise check_violation using message = 'cleanup_payout_invalid_state';
  end if;
  if attempt_record.payout_status = 'transferred' then
    return attempt_record;
  end if;
  if transfer_succeeded
    and attempt_record.payout_status = 'failed'
    and attempt_record.stripe_transfer_id = target_transfer_id
    and attempt_record.payout_last_error like 'Stripe transfer reversed%' then
    return attempt_record;
  end if;

  if transfer_succeeded then
    if target_transfer_id is null then
      raise check_violation using message = 'cleanup_transfer_id_required';
    end if;
    update public.cleanup_attempts set
      payout_status = 'transferred',
      stripe_transfer_id = target_transfer_id,
      payout_last_error = null,
      last_activity_at = transition_at
    where id = target_cleanup_id returning * into attempt_record;

    update public.cleanup_contributions set
      status = 'paid_out', updated_at = transition_at
    where cleanup_attempt_id = target_cleanup_id
      and status in ('succeeded', 'paid_out');

    update public.reports set
      funded_amount_cents = 0,
      funding_frozen_at = null
    where id = attempt_record.report_id;

    insert into public.cleanup_financial_audit (
      actor_kind, action, report_id, cleanup_attempt_id, metadata
    ) values (
      'stripe', 'cleanup_reward_transferred', attempt_record.report_id,
      attempt_record.id,
      jsonb_build_object(
        'transfer_id', target_transfer_id,
        'amount_cents', attempt_record.reward_amount_cents
      )
    );

    if attempt_record.cleaner_id is not null then
      insert into public.cleanup_notifications (
        user_id, cleanup_attempt_id, report_id, event_type, created_at
      ) values (
        attempt_record.cleaner_id, attempt_record.id, attempt_record.report_id,
        'cleanup_reward_sent', transition_at
      ) on conflict do nothing;
    end if;
  else
    update public.cleanup_attempts set
      payout_status = 'failed',
      payout_last_error = left(coalesce(target_error, 'Transfer failed'), 1000),
      last_activity_at = transition_at
    where id = target_cleanup_id returning * into attempt_record;

    insert into public.cleanup_admin_cases (
      case_type, priority, report_id, cleanup_attempt_id, title, summary
    ) values (
      'payout_failure', 1, attempt_record.report_id, attempt_record.id,
      'Cleanup reward transfer failed', attempt_record.payout_last_error
    ) on conflict do nothing;

    if attempt_record.cleaner_id is not null then
      insert into public.cleanup_notifications (
        user_id, cleanup_attempt_id, report_id, event_type, created_at
      ) values (
        attempt_record.cleaner_id, attempt_record.id, attempt_record.report_id,
        'cleanup_payout_failed', transition_at
      ) on conflict do nothing;
    end if;
  end if;
  return attempt_record;
end;
$$;

revoke all on function public.mark_cleanup_payout_result(uuid, boolean, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.mark_cleanup_payout_result(uuid, boolean, text, text)
  to service_role;

create or replace function public.mark_cleanup_transfer_reversed(
  target_cleanup_id uuid,
  target_transfer_id text,
  target_error text
)
returns public.cleanup_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record public.cleanup_attempts%rowtype;
  transition_at timestamptz := now();
begin
  select * into attempt_record
  from public.cleanup_attempts
  where id = target_cleanup_id
  for update;
  if not found then
    raise no_data_found using message = 'cleanup_not_found';
  end if;
  if not attempt_record.is_paid
    or attempt_record.status <> 'completed'
    or (
      attempt_record.stripe_transfer_id is not null
      and attempt_record.stripe_transfer_id is distinct from target_transfer_id
    ) then
    raise check_violation using message = 'cleanup_transfer_reversal_invalid';
  end if;
  if attempt_record.payout_status = 'failed'
    and attempt_record.payout_last_error = target_error then
    return attempt_record;
  end if;

  update public.cleanup_attempts set
    payout_status = 'failed',
    stripe_transfer_id = target_transfer_id,
    payout_last_error = left(coalesce(target_error, 'Stripe transfer reversed'), 1000),
    last_activity_at = transition_at
  where id = target_cleanup_id
  returning * into attempt_record;

  insert into public.cleanup_admin_cases (
    case_type, priority, report_id, cleanup_attempt_id, title, summary
  ) values (
    'payout_failure', 1, attempt_record.report_id, attempt_record.id,
    'Cleanup reward transfer was reversed', attempt_record.payout_last_error
  ) on conflict do nothing;

  insert into public.cleanup_financial_audit (
    actor_kind, action, report_id, cleanup_attempt_id, metadata
  ) values (
    'stripe', 'cleanup_reward_transfer_reversed', attempt_record.report_id,
    attempt_record.id, jsonb_build_object('transfer_id', target_transfer_id)
  );

  return attempt_record;
end;
$$;

revoke all on function public.mark_cleanup_transfer_reversed(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.mark_cleanup_transfer_reversed(uuid, text, text)
  to service_role;
