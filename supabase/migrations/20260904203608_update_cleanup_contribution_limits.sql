-- Keep mobile, Edge Function, and database contribution limits aligned.
alter table public.cleanup_contributions
  drop constraint if exists cleanup_contributions_principal_check;

alter table public.cleanup_contributions
  add constraint cleanup_contributions_principal_check check (
    principal_amount_cents between 100 and 100000
  );

create or replace function public.create_cleanup_contribution_intent(
  target_report_id uuid,
  target_contributor_id uuid,
  target_client_request_id uuid,
  principal_cents bigint,
  payment_intent_id text
)
returns public.cleanup_contributions
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_record public.reports%rowtype;
  contribution_record public.cleanup_contributions%rowtype;
  fee_cents bigint;
begin
  if not exists (
    select 1 from public.cleanup_feature_flags
    where name = 'payments_enabled' and enabled
  ) then
    raise check_violation using message = 'payments_disabled';
  end if;
  if not exists (
    select 1 from public.cleanup_feature_flags
    where name = 'gemini_financial_review_enabled' and enabled
  ) then
    raise check_violation using message = 'financial_review_disabled';
  end if;

  if target_contributor_id is null
    or target_client_request_id is null
    or payment_intent_id is null
    or principal_cents not between 100 and 100000 then
    raise check_violation using message = 'cleanup_contribution_invalid';
  end if;

  select * into report_record
  from public.reports
  where reports.id = target_report_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_report_not_found';
  end if;

  if report_record.cleanup_state <> 'available'
    or report_record.funding_eligibility <> 'eligible'
    or report_record.funding_frozen_at is not null
    or report_record.renewal_status <> 'active'
    or report_record.expired_at is not null
    or report_record.cancelled_at is not null
    or report_record.expires_at <= now()
    or coalesce(cardinality(report_record.photo_paths), 0) = 0 then
    raise check_violation using message = 'report_not_open_for_funding';
  end if;

  fee_cents := floor(principal_cents * 0.10 + 0.5)::bigint;

  insert into public.cleanup_contributions (
    report_id,
    contributor_id,
    client_request_id,
    principal_amount_cents,
    platform_fee_cents,
    total_amount_cents,
    stripe_payment_intent_id
  ) values (
    target_report_id,
    target_contributor_id,
    target_client_request_id,
    principal_cents,
    fee_cents,
    principal_cents + fee_cents,
    payment_intent_id
  )
  on conflict (contributor_id, client_request_id)
  do update set updated_at = now()
  returning * into contribution_record;

  if contribution_record.stripe_payment_intent_id <> payment_intent_id
    or contribution_record.principal_amount_cents <> principal_cents then
    raise check_violation using message = 'cleanup_contribution_idempotency_mismatch';
  end if;

  return contribution_record;
end;
$$;

revoke all on function public.create_cleanup_contribution_intent(uuid, uuid, uuid, bigint, text)
  from public, anon, authenticated, service_role;
grant execute on function public.create_cleanup_contribution_intent(uuid, uuid, uuid, bigint, text)
  to service_role;
