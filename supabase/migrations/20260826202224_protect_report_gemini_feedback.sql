grant select (
  id,
  report_id,
  check_kind,
  status,
  user_summary,
  reason_codes,
  created_at,
  completed_at
) on public.cleanup_ai_checks to authenticated;

drop policy if exists "Report owners can read funding photo feedback"
  on public.cleanup_ai_checks;

create policy "Report owners can read funding photo feedback"
  on public.cleanup_ai_checks
  for select
  to authenticated
  using (
    check_kind = 'report'
    and (select public.is_permanent_user())
    and exists (
      select 1
      from public.reports
      where reports.id = cleanup_ai_checks.report_id
        and reports.user_id = (select auth.uid())
    )
  );

create or replace function private.keep_report_funding_feedback_public_safe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.funding_hold_reason := case new.funding_eligibility
    when 'better_photos' then
      'Replace the original photos with clear, well-lit images that show the full cleanup area.'
    when 'safety_hold' then
      'This report needs an administrator safety review before it can accept contributions.'
    when 'ineligible' then
      'This report is not currently eligible for a funded cleanup.'
    else null
  end;
  return new;
end;
$$;

revoke all on function private.keep_report_funding_feedback_public_safe()
  from public, anon, authenticated, service_role;

drop trigger if exists reports_keep_funding_feedback_public_safe
  on public.reports;

create trigger reports_keep_funding_feedback_public_safe
before insert or update on public.reports
for each row
execute function private.keep_report_funding_feedback_public_safe();

update public.reports
set funding_hold_reason = funding_hold_reason;
