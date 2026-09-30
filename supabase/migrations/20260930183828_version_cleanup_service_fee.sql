-- Compatibility first: activation is a separate, reversible configuration change.
create table public.cleanup_pricing_config (
  id boolean primary key default true check (id),
  pricing_version smallint not null default 1 check (pricing_version in (1, 2))
);
insert into public.cleanup_pricing_config (id) values (true);
alter table public.cleanup_pricing_config enable row level security;
revoke all on public.cleanup_pricing_config from public, anon, authenticated;
grant select on public.cleanup_pricing_config to service_role;

alter table public.cleanup_contributions
  add column pricing_version smallint not null default 1 check (pricing_version in (1, 2)),
  add column stripe_receipt_email text;
alter table public.cleanup_contributions drop constraint cleanup_contributions_fee_check;
alter table public.cleanup_contributions add constraint cleanup_contributions_fee_check check (
  platform_fee_cents = ((principal_amount_cents + 5) / 10) + case pricing_version when 2 then 50 else 0 end
  and total_amount_cents = principal_amount_cents + platform_fee_cents
);

-- Service-only reservation: persist the quote BEFORE contacting Stripe. Serializing
-- by request identity prevents duplicate taps from reserving different prices.
create function public.reserve_cleanup_contribution(
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
  select pricing_version into active_version from public.cleanup_pricing_config where id for share;
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
  fee_cents := ((principal_cents + 5) / 10) + case active_version when 2 then 50 else 0 end;
  insert into public.cleanup_contributions (
    report_id, contributor_id, client_request_id, principal_amount_cents,
    platform_fee_cents, total_amount_cents, pricing_version, stripe_receipt_email
  ) values (target_report_id, target_contributor_id, target_client_request_id, principal_cents,
    fee_cents, principal_cents + fee_cents, active_version, receipt_email)
  returning * into contribution_record;
  return contribution_record;
end;
$$;
revoke all on function public.reserve_cleanup_contribution(uuid, uuid, uuid, bigint, integer, text) from public, anon, authenticated;
grant execute on function public.reserve_cleanup_contribution(uuid, uuid, uuid, bigint, integer, text) to service_role;

create function public.attach_cleanup_payment_intent(target_contribution_id uuid, payment_intent_id text)
returns public.cleanup_contributions language plpgsql security invoker set search_path = '' as $$
declare contribution_record public.cleanup_contributions%rowtype;
begin
  if payment_intent_id is null or payment_intent_id not like 'pi_%' then
    raise check_violation using message = 'cleanup_contribution_invalid';
  end if;
  select * into strict contribution_record from public.cleanup_contributions where id = target_contribution_id for update;
  if contribution_record.stripe_payment_intent_id is not null
    and contribution_record.stripe_payment_intent_id <> payment_intent_id then
    raise check_violation using message = 'cleanup_contribution_idempotency_mismatch';
  end if;
  update public.cleanup_contributions set stripe_payment_intent_id = payment_intent_id, updated_at = now()
    where id = target_contribution_id returning * into contribution_record;
  return contribution_record;
end;
$$;
revoke all on function public.attach_cleanup_payment_intent(uuid, text) from public, anon, authenticated;
grant execute on function public.attach_cleanup_payment_intent(uuid, text) to service_role;

-- Keep the legacy API compatible during staging, but prevent legacy NEW prices
-- after activation, including if an older Edge Function is accidentally restored.
create or replace function public.create_cleanup_contribution_intent(
  target_report_id uuid, target_contributor_id uuid, target_client_request_id uuid,
  principal_cents bigint, payment_intent_id text
) returns public.cleanup_contributions language plpgsql security invoker set search_path = '' as $$
declare contribution_record public.cleanup_contributions%rowtype;
begin
  if payment_intent_id is null then raise check_violation using message = 'cleanup_contribution_invalid'; end if;
  contribution_record := public.reserve_cleanup_contribution(target_report_id, target_contributor_id,
    target_client_request_id, principal_cents, 1);
  if contribution_record.pricing_version <> 1 then
    raise check_violation using message = 'cleanup_pricing_changed';
  end if;
  return public.attach_cleanup_payment_intent(contribution_record.id, payment_intent_id);
end;
$$;

-- Accounting amounts cannot be repriced by later status changes or rollback.
create function public.protect_cleanup_contribution_pricing() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.principal_amount_cents, new.platform_fee_cents, new.total_amount_cents, new.pricing_version,
      new.report_id, new.client_request_id, new.stripe_receipt_email)
    is distinct from
     (old.principal_amount_cents, old.platform_fee_cents, old.total_amount_cents, old.pricing_version,
      old.report_id, old.client_request_id, old.stripe_receipt_email) then
    raise check_violation using message = 'cleanup_contribution_pricing_immutable';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_cleanup_contribution_pricing() from public, anon, authenticated;
create trigger protect_cleanup_contribution_pricing before update on public.cleanup_contributions
for each row execute function public.protect_cleanup_contribution_pricing();
