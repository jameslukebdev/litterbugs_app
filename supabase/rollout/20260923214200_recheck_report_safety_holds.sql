-- Owner-authorized re-evaluation under the more permissive September 23 policy.
-- Preserve previous AI decisions and do not override any human review action.
begin;
set local lock_timeout = '2s';
create temporary table policy_recheck_reports on commit drop as
select r.id from public.reports r
where r.id in (
 'dbbf4d21-2dc2-48ca-8c1c-7176975f6791',
 '1a1cd5fa-7ad9-4d11-bad7-5529811582b2',
 '62fbcc67-1f15-429f-bb12-46058c6cfdf6'
) and r.funding_eligibility='safety_hold' and r.is_published
and r.moderated_at is null and r.funding_locked_at is null
and r.cleanup_state='available' and r.cancelled_at is null
and cardinality(r.photo_paths)>0
and not exists(select 1 from public.cleanup_admin_cases c
 join public.cleanup_admin_actions a on a.case_id=c.id
 where c.report_id=r.id and c.case_type='report_safety')
and not exists(select 1 from public.cleanup_ai_checks a where a.report_id=r.id
 and a.check_kind='report' and (a.status in ('queued','running')
 or a.raw_result->>'recheck_policy'='presume-eligible-2026-09-23'
 or a.raw_result->>'policy_version'='presume-eligible-2026-09-23'));

with superseded as (
 update public.cleanup_admin_cases set status='resolved',resolved_at=now(),updated_at=now()
 where case_type='report_safety' and status='open' and report_id in(select id from policy_recheck_reports)
 returning id
)
insert into public.cleanup_admin_actions(case_id,action,reason)
select id,'superseded','Owner requested a fresh AI review under the September 23 default-pass policy. The prior AI result is retained; no human decision is overridden.' from superseded;

update public.reports set funding_eligibility='pending',funding_hold_reason=null,original_photo_reviewed_at=null
where id in(select id from policy_recheck_reports);
insert into public.cleanup_ai_checks(report_id,check_kind,status,attempt_number,prompt_version,raw_result)
select id,'report','queued',1,'report-funding-v1',jsonb_build_object('recheck_policy','presume-eligible-2026-09-23')
from policy_recheck_reports;
select count(*) as reports_queued from policy_recheck_reports;
commit;
