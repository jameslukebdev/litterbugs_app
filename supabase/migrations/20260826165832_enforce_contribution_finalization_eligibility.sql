create or replace function public.finalize_cleanup_contribution(
  payment_intent_id text,
  charge_id text,
  payment_succeeded boolean,
  payment_failure_code text default null
)
returns public.cleanup_contributions
language plpgsql
security definer
set search_path = ''
as $$
declare
  contribution_record public.cleanup_contributions%rowtype;
  report_record public.reports%rowtype;
  transition_at timestamptz := now();
begin
  select * into contribution_record
  from public.cleanup_contributions
  where stripe_payment_intent_id = payment_intent_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_contribution_not_found';
  end if;

  if contribution_record.status in ('succeeded', 'refund_pending', 'refund_processing', 'refunded', 'paid_out') then
    return contribution_record;
  end if;

  if not payment_succeeded then
    update public.cleanup_contributions
    set status = 'failed', failure_code = payment_failure_code, updated_at = transition_at
    where id = contribution_record.id
    returning * into contribution_record;
    return contribution_record;
  end if;

  select * into report_record
  from public.reports
  where id = contribution_record.report_id
  for update;

  if report_record.cleanup_state <> 'available'
    or report_record.funding_eligibility <> 'eligible'
    or report_record.funding_frozen_at is not null
    or report_record.renewal_status <> 'active'
    or report_record.expired_at is not null
    or report_record.cancelled_at is not null
    or report_record.expires_at <= transition_at
    or not exists (
      select 1 from public.cleanup_feature_flags
      where name = 'payments_enabled' and enabled
    )
    or not exists (
      select 1 from public.cleanup_feature_flags
      where name = 'gemini_financial_review_enabled' and enabled
    ) then
    update public.cleanup_contributions
    set
      status = 'refund_pending',
      stripe_charge_id = charge_id,
      succeeded_at = transition_at,
      auto_refund_due_at = transition_at + interval '23 months',
      refund_requested_at = transition_at,
      updated_at = transition_at
    where id = contribution_record.id
    returning * into contribution_record;
    return contribution_record;
  end if;

  update public.cleanup_contributions
  set
    status = 'succeeded',
    stripe_charge_id = charge_id,
    succeeded_at = transition_at,
    auto_refund_due_at = transition_at + interval '23 months',
    failure_code = null,
    updated_at = transition_at
  where id = contribution_record.id
  returning * into contribution_record;

  update public.reports
  set
    funded_amount_cents = funded_amount_cents + contribution_record.principal_amount_cents,
    funding_locked_at = coalesce(funding_locked_at, transition_at)
  where id = contribution_record.report_id;

  insert into public.cleanup_financial_audit (
    actor_id, actor_kind, action, report_id, contribution_id, metadata
  ) values (
    contribution_record.contributor_id,
    'stripe',
    'contribution_succeeded',
    contribution_record.report_id,
    contribution_record.id,
    jsonb_build_object(
      'principal_amount_cents', contribution_record.principal_amount_cents
    )
  );

  if report_record.user_id is not null then
    insert into public.cleanup_notifications (
      user_id, cleanup_attempt_id, report_id, contribution_id, event_type, created_at
    ) values (
      report_record.user_id, null, contribution_record.report_id,
      contribution_record.id, 'cleanup_fund_increased', transition_at
    );
  end if;

  return contribution_record;
end;
$$;

revoke all on function public.finalize_cleanup_contribution(text, text, boolean, text)
  from public, anon, authenticated, service_role;
grant execute on function public.finalize_cleanup_contribution(text, text, boolean, text)
  to service_role;
