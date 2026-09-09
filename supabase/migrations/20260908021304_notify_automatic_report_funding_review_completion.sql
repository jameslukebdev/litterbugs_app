-- Notify report owners when either automated photo review or administrator
-- review reaches a final funding decision.
create or replace function private.notify_report_funding_resolution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.funding_eligibility not in ('pending', 'safety_hold')
    or new.funding_eligibility not in ('eligible', 'ineligible')
    or new.user_id is null then
    return new;
  end if;

  insert into public.cleanup_notifications (
    user_id,
    cleanup_attempt_id,
    report_id,
    event_type,
    created_at
  ) values (
    new.user_id,
    null,
    new.id,
    case new.funding_eligibility
      when 'eligible' then 'report_funding_approved'
      else 'report_funding_rejected'
    end,
    coalesce(new.original_photo_reviewed_at, now())
  );

  return new;
end;
$$;

revoke all on function private.notify_report_funding_resolution()
  from public, anon, authenticated, service_role;

comment on function private.notify_report_funding_resolution() is
  'Creates one report-owner notification when automated or administrator review reaches a final funding decision.';
;
