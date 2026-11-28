-- Local website review decisions. No worker or real payment operation is performed here.
alter table public.cleanup_issues
 add column review_outcome text check(review_outcome in ('hold','ready','closed')),
 add column review_reason text check(char_length(review_reason) between 3 and 1000),
 add column reviewed_by uuid references auth.users(id) on delete set null,
 add column reviewed_at timestamptz;

create function private.decide_cleanup_issue(target_issue_id uuid,expected_version integer,decision_id uuid,decision text,reason text)
 returns public.cleanup_issues language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=private.require_permanent_cleanup_user();
 i public.cleanup_issues; a public.cleanup_attempts; r public.reports;
 normalized text:=btrim(coalesce(reason,'')); message_text text;
begin
 if not public.is_cleanup_admin() then raise insufficient_privilege using message='cleanup_admin_required'; end if;
 if decision_id is null or decision not in ('hold','ready','closed') or decision is null or char_length(normalized) not between 3 and 1000 then
  raise check_violation using message='issue_review_reason_required'; end if;
 message_text:=case decision when 'hold' then 'Litterbugs review: site remains paused.' when 'ready' then 'Litterbugs review: site is ready to clean.' else 'Litterbugs review: report closed.' end||E'\n'||normalized;
 select report_id into r.id from public.cleanup_issues where id=target_issue_id;
 select * into r from public.reports where id=r.id for update;
 select * into a from public.cleanup_attempts where id=(select cleanup_attempt_id from public.cleanup_issues where id=target_issue_id) for update;
 select * into i from public.cleanup_issues where id=target_issue_id for update;
 if i.id is null then raise no_data_found using message='issue_not_found'; end if;
 if exists(select 1 from public.cleanup_issue_messages where id=decision_id and issue_id=i.id and author_id=actor and body=message_text) then return i; end if;
 if i.version<>expected_version or i.status='resolved' or not i.requires_team_review or r.cancelled_at is not null then
  raise check_violation using message='issue_changed_refresh'; end if;
 if a.status not in ('claimed','released') then raise check_violation using message='issue_claim_changed'; end if;
 insert into public.cleanup_issue_messages(id,issue_id,author_id,body) values(decision_id,i.id,actor,message_text);
 if decision='closed' then
  -- Release retained claims without rewarding them, detach succeeded contributions,
  -- then use the existing full-refund queue. A closed site is never a completed cleanup.
  if a.status='claimed' then
   update public.cleanup_attempts set issue_paused_at=null,status='released',released_at=now(),last_activity_at=now() where id=a.id;
   perform private.reopen_cleanup_pool(a.id,now());
  end if;
  perform private.close_expired_report(r.id,now(),actor,'admin');
  update public.reports set cleanup_issue_hold=false where id=r.id;
 end if;
 update public.cleanup_issues set
  review_outcome=decision,review_reason=normalized,reviewed_by=actor,reviewed_at=now(),
  requires_team_review=(decision='hold'),
  status=case decision when 'hold' then 'team_review' when 'ready' then 'awaiting_cleaner' else 'resolved' end,
  resolved_at=case when decision='closed' then now() else resolved_at end,
  resolved_by=case when decision='closed' then actor else resolved_by end,
  version=version+1,updated_at=now() where id=i.id returning * into i;
 if decision<>'hold' then
  update public.cleanup_admin_cases set status='resolved',resolved_by=actor,resolved_at=now(),updated_at=now()
   where context->>'cleanup_issue_id'=i.id::text and status='open';
 end if;
 perform private.notify_cleanup_issue(i.id,decision_id,i.cleaner_id,case when decision='closed' then 'cleanup_issue_resolved' else 'cleanup_issue_replied' end);
 perform private.notify_cleanup_issue(i.id,decision_id,i.reporter_id,case when decision='closed' then 'cleanup_issue_resolved' else 'cleanup_issue_replied' end);
 return i;
end $$;
revoke all on function private.decide_cleanup_issue(uuid,integer,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function private.decide_cleanup_issue(uuid,integer,uuid,text,text) to authenticated;
create function public.decide_cleanup_issue(target_issue_id uuid,expected_version integer,decision_id uuid,decision text,reason text)
 returns public.cleanup_issues language sql security invoker set search_path='' as $$
 select private.decide_cleanup_issue(target_issue_id,expected_version,decision_id,decision,reason);
$$;
revoke all on function public.decide_cleanup_issue(uuid,integer,uuid,text,text) from public,anon,service_role;
grant execute on function public.decide_cleanup_issue(uuid,integer,uuid,text,text) to authenticated;
-- Retire the earlier local-only approval shortcut: every staff decision needs a reason.
revoke execute on function public.review_cleanup_issue(uuid,integer) from authenticated;
revoke execute on function private.review_cleanup_issue(uuid,integer) from authenticated;
