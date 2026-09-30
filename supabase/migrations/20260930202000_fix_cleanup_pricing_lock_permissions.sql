-- Row locks require UPDATE privilege even for SELECT FOR SHARE. Keep the
-- service role read-only and acquire the pricing lock through a narrow helper.
create function private.lock_cleanup_pricing_version()
returns integer language plpgsql security definer set search_path = '' as $$
declare active_version integer;
begin
  select pricing_version into strict active_version
    from public.cleanup_pricing_config where id for share;
  return active_version;
end;
$$;
revoke all on function private.lock_cleanup_pricing_version() from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.lock_cleanup_pricing_version() to service_role;

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
