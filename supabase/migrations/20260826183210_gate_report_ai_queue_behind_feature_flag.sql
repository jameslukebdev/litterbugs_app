-- Do not build a dormant Gemini backlog while the funded-cleanup feature is
-- dark. Enabling the flag affects only reports created or photo-updated from
-- that point forward, so existing test reports never become financial records
-- merely because production review is activated.
do $$
begin
  if not exists (
    select 1 from public.cleanup_feature_flags
    where name = 'gemini_financial_review_enabled' and enabled
  ) then
    update public.cleanup_ai_checks set
      status = 'superseded',
      completed_at = now(),
      provider_started_at = null,
      user_summary = 'Financial photo review was not enabled for this report.'
    where check_kind = 'report'
      and status in ('queued', 'running');
  end if;
end;
$$;

create or replace function private.queue_report_ai_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.funding_locked_at is not null then
    return new;
  end if;

  with superseded_cases as (
    update public.cleanup_admin_cases set
      status = 'resolved',
      resolved_at = now(),
      updated_at = now()
    where report_id = new.id
      and case_type = 'report_safety'
      and status = 'open'
    returning id
  )
  insert into public.cleanup_admin_actions (case_id, action, reason)
  select id, 'superseded', 'A newer report photo set replaced this review.'
  from superseded_cases;

  update public.cleanup_ai_checks set
    status = 'superseded',
    completed_at = now(),
    provider_started_at = null,
    user_summary = 'A newer report photo set replaced this review.'
  where report_id = new.id
    and check_kind = 'report'
    and status in ('queued', 'running');

  update public.reports set
    funding_eligibility = case
      when coalesce(cardinality(new.photo_paths), 0) > 0 then 'pending'
      else 'ineligible'
    end,
    funding_hold_reason = case
      when coalesce(cardinality(new.photo_paths), 0) > 0 then null
      else 'A usable original photo is required before this report can be funded.'
    end,
    original_photo_reviewed_at = null
  where id = new.id;

  if not exists (
    select 1 from public.cleanup_feature_flags
    where name = 'gemini_financial_review_enabled' and enabled
  ) then
    return new;
  end if;

  if coalesce(cardinality(new.photo_paths), 0) > 0 then
    insert into public.cleanup_ai_checks (
      report_id, check_kind, status, attempt_number, prompt_version
    ) values (
      new.id, 'report', 'queued', 1, 'report-funding-v1'
    );
  end if;
  return new;
end;
$$;

revoke all on function private.queue_report_ai_check()
  from public, anon, authenticated, service_role;
