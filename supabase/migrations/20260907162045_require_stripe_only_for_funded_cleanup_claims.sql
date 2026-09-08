create or replace function private.require_cleanup_claim_payout_ready()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'claimed'
    and exists (
      select 1
      from public.reports as report
      where report.id = new.report_id
        and coalesce(report.funded_amount_cents, 0) > 0
    )
    and not exists (
      select 1
      from public.cleaner_payout_accounts
      where user_id = new.cleaner_id
        and onboarding_status = 'enabled'
        and payouts_enabled
        and country = 'US'
        and age_18_confirmed_at is not null
    )
  then
    raise check_violation using message = 'cleaner_payout_onboarding_required';
  end if;

  return new;
end;
$$;

revoke all on function private.require_cleanup_claim_payout_ready()
  from public, anon, authenticated, service_role;

drop trigger if exists cleanup_claim_requires_payout_ready
  on public.cleanup_attempts;

create trigger cleanup_claim_requires_payout_ready
before insert on public.cleanup_attempts
for each row
execute function private.require_cleanup_claim_payout_ready();
