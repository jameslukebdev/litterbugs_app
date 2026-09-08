-- Incomplete or failed Stripe attempts are not funded cleanup activity.
-- Preserve those rows for audit/idempotency, but do not permanently lock an
-- otherwise available report when no payment was collected.
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
      and status not in ('released', 'expired', 'cancelled')
  ) then
    raise check_violation using message = 'cleanup_activity_started';
  end if;
  if exists (
    select 1 from public.cleanup_contributions
    where report_id = target_report_id
      and status not in ('payment_pending', 'failed')
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
    'Report withdrawn by its owner while no active cleanup or collected funding exists.',
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
  'Soft-withdraws an available owner report when no active/completed cleanup or collected contribution exists; unsuccessful cleanup and payment-attempt history is preserved.';
