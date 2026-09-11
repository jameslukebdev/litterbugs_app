-- The contribution receipt already acknowledges the reporter's own payment.
-- Suppress the redundant notice before either polling or push can deliver it.
create or replace function private.suppress_self_funding_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_type = 'cleanup_fund_increased' and exists (
    select 1 from public.cleanup_contributions contribution
    where contribution.id = new.contribution_id
      and contribution.contributor_id = new.user_id
  ) then
    return null;
  end if;
  return new;
end;
$$;

revoke all on function private.suppress_self_funding_notification()
  from public, anon, authenticated, service_role;

create trigger suppress_self_funding_notification
before insert on public.cleanup_notifications
for each row execute function private.suppress_self_funding_notification();
