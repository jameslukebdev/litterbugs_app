-- Extend the existing MFA-protected review inbox.
alter table public.cleanup_admin_memberships add column moderation_alerts_enabled boolean not null default false;
alter table public.cleanup_admin_cases drop constraint cleanup_admin_cases_type_check;
alter table public.cleanup_admin_cases add constraint cleanup_admin_cases_type_check
  check(case_type in ('report_safety','gemini_review','first_paid_cleanup','dispute','refund_failure','payout_failure','user_moderation'));
alter table public.cleanup_admin_cases add column moderation_report_id uuid
  references public.user_moderation_reports(id) on delete set null;
create unique index cleanup_admin_cases_moderation_unique
  on public.cleanup_admin_cases(moderation_report_id) where moderation_report_id is not null;

alter table public.reports add column moderated_at timestamptz;
-- Independent of publication: an owner cannot republish removed content.
create policy "Removed content is not publicly readable" on public.reports
  as restrictive for select to anon, authenticated using (moderated_at is null);
create policy "Removed content cannot be edited" on public.reports
  as restrictive for update to anon, authenticated
  using (moderated_at is null) with check (moderated_at is null);

alter table public.cleanup_notifications alter column report_id drop not null;
alter table public.cleanup_notifications add column admin_case_id uuid
  references public.cleanup_admin_cases(id) on delete cascade;
alter table public.cleanup_notifications add constraint cleanup_notifications_report_or_admin_check
  check ((event_type='admin_moderation_needed' and admin_case_id is not null)
    or (event_type<>'admin_moderation_needed' and report_id is not null and admin_case_id is null));
alter table public.cleanup_notifications
  drop constraint cleanup_notifications_event_type_check,
  drop constraint cleanup_notifications_target_check,
  add constraint cleanup_notifications_event_type_check check (
    event_type = any (array[
      'report_claimed',
      'claim_expiring_soon',
      'claim_expired',
      'completion_submitted',
      'changes_requested',
      'cleanup_approved',
      'cleanup_auto_approved',
      'correction_expired',
      'paid_review_started',
      'paid_cleanup_disputed',
      'cleanup_reward_sent',
      'cleanup_payout_failed',
      'cleanup_fund_increased',
      'cleanup_contribution_refunded',
      'report_renewal_due',
      'report_renewed',
      'report_funding_photos_needed',
      'report_funding_review_required',
      'report_funding_approved',
      'report_funding_rejected',
        'admin_moderation_needed'
    ])
  ),
  add constraint cleanup_notifications_target_check check (
    (event_type <> all (array['changes_requested', 'cleanup_approved', 'cleanup_auto_approved']) or review_id is not null)
    and (event_type <> all (array['completion_submitted', 'paid_review_started']) or submission_id is not null)
    and (
      event_type <> all (array[
        'report_renewal_due',
        'report_renewed',
        'cleanup_fund_increased',
        'cleanup_contribution_refunded',
        'report_funding_photos_needed',
        'report_funding_review_required',
        'report_funding_approved',
        'report_funding_rejected',
        'admin_moderation_needed'
      ])
      or cleanup_attempt_id is null
    )
    and (
      event_type = any (array[
        'report_renewal_due',
        'report_renewed',
        'cleanup_fund_increased',
        'cleanup_contribution_refunded',
        'report_funding_photos_needed',
        'report_funding_review_required',
        'report_funding_approved',
        'report_funding_rejected',
        'admin_moderation_needed'
      ])
      or cleanup_attempt_id is not null
    )
    and (event_type <> 'cleanup_contribution_refunded' or contribution_id is not null)
  );


create or replace function private.queue_moderation_admin_case()
returns trigger language plpgsql security definer set search_path='' as $$
declare
  new_case_id uuid;
  target_profile jsonb;
begin
  select jsonb_build_object('id',id,'display_name',display_name,'username',username,
    'bio',bio,'avatar_path',avatar_path,'provider_avatar_url',provider_avatar_url)
    into target_profile from public.profiles where id=new.reported_user_id;
  insert into public.cleanup_admin_cases(case_type,moderation_report_id,report_id,title,summary,priority,context)
    values('user_moderation',new.id,new.source_report_id,'Community report',
      replace(new.reason,'_',' '),case when new.reason in ('safety_concern','harassment_or_hate') then 1 else 2 end,
      jsonb_build_object('details',new.details,'reported_profile',target_profile))
    returning id into new_case_id;
  insert into public.cleanup_notifications(user_id,report_id,event_type,admin_case_id)
    select user_id,new.source_report_id,'admin_moderation_needed',new_case_id
    from public.cleanup_admin_memberships where active and moderation_alerts_enabled;
  return new;
end;
$$;
revoke all on function private.queue_moderation_admin_case() from public,anon,authenticated,service_role;
create trigger user_moderation_admin_intake after insert on public.user_moderation_reports
  for each row execute function private.queue_moderation_admin_case();

create or replace function private.resolve_moderation_case(target_case_id uuid,target_action text,target_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor_id uuid := private.require_cleanup_admin();
  item public.cleanup_admin_cases%rowtype;
  report_record public.reports%rowtype;
  reported_id uuid;
begin
  if target_reason is null or char_length(btrim(target_reason)) not between 3 and 1000 then
    raise check_violation using message='cleanup_admin_reason_required';
  end if;
  select * into item from public.cleanup_admin_cases where id=target_case_id for update;
  if not found or item.case_type<>'user_moderation' or item.status<>'open' then
    raise check_violation using message='moderation_case_not_open';
  end if;
  select reported_user_id into reported_id from public.user_moderation_reports
    where id=item.moderation_report_id for update;
  if target_action='remove_report' then
    select * into report_record from public.reports where id=item.report_id for update;
    if not found or report_record.user_id is distinct from reported_id then
      raise check_violation using message='moderation_report_not_owned_by_subject';
    end if;
    update public.reports set moderated_at=now(),funding_frozen_at=coalesce(funding_frozen_at,now())
      where id=item.report_id;
    if report_record.cleanup_state='available' then
      perform private.close_expired_report(item.report_id,now(),actor_id,'admin');
    else
      insert into public.cleanup_admin_cases(case_type,report_id,title,summary,priority)
        values('report_safety',item.report_id,'Removed report with cleanup activity',
          'Review the existing cleanup and any reward before taking further financial action.',1);
    end if;
  elsif target_action='clear_profile' then
    if reported_id is null then raise check_violation using message='moderation_subject_unavailable'; end if;
    update public.profiles set display_name='Community member',bio=null,username=null,location=null,
      avatar_path=null,provider_avatar_url=null where id=reported_id;
  elsif target_action<>'dismiss_report' then
    raise check_violation using message='cleanup_admin_action_invalid';
  end if;
  update public.user_moderation_reports set status=case when target_action='dismiss_report' then 'dismissed' else 'actioned' end,
    reviewed_at=now(),resolution=btrim(target_reason) where id=item.moderation_report_id;
  insert into public.cleanup_admin_actions(case_id,admin_id,action,reason)
    values(item.id,actor_id,target_action,btrim(target_reason));
  update public.cleanup_admin_cases set status='resolved',resolved_by=actor_id,resolved_at=now(),updated_at=now()
    where id=item.id;
  return public.get_cleanup_admin_case(item.id);
end;
$$;
revoke all on function private.resolve_moderation_case(uuid,text,text) from public,anon,authenticated,service_role;
-- The exposed wrapper has no elevated privileges; the private implementation
-- checks active administrator membership and MFA before reading or changing data.
grant usage on schema private to authenticated;
grant execute on function private.resolve_moderation_case(uuid,text,text) to authenticated;
create or replace function public.resolve_moderation_case(target_case_id uuid,target_action text,target_reason text)
returns jsonb language sql security invoker set search_path='' as $$
  select private.resolve_moderation_case(target_case_id,target_action,target_reason);
$$;
revoke all on function public.resolve_moderation_case(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.resolve_moderation_case(uuid,text,text) to authenticated;

-- Preserve access to evidence after public removal, including HEIC conversion.
create policy "Administrators can review report photo evidence" on storage.objects
  for select to authenticated
  using(bucket_id='report_photos' and (select public.is_cleanup_admin()));

-- Include concerns received before this workflow was installed.
insert into public.cleanup_admin_cases(case_type,moderation_report_id,report_id,title,summary,priority,context)
select 'user_moderation',m.id,m.source_report_id,'Community report',replace(m.reason,'_',' '),
  case when m.reason in ('safety_concern','harassment_or_hate') then 1 else 2 end,
  jsonb_build_object('details',m.details,'reported_profile',jsonb_build_object(
    'id',p.id,'display_name',p.display_name,'username',p.username,'bio',p.bio,
    'avatar_path',p.avatar_path,'provider_avatar_url',p.provider_avatar_url))
from public.user_moderation_reports m join public.profiles p on p.id=m.reported_user_id
where m.status='pending'
on conflict(moderation_report_id) where moderation_report_id is not null do nothing;
insert into public.cleanup_notifications(user_id,report_id,event_type,admin_case_id)
select members.user_id,c.report_id,'admin_moderation_needed',c.id
from public.cleanup_admin_cases c cross join public.cleanup_admin_memberships members
where c.case_type='user_moderation' and c.status='open' and members.active and members.moderation_alerts_enabled
  and not exists(select 1 from public.cleanup_notifications n where n.admin_case_id=c.id and n.user_id=members.user_id);

create or replace function private.moderation_alert_preferences(enabled boolean default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor_id uuid := private.require_cleanup_admin(); result boolean;
begin
 if enabled is not null then
  update public.cleanup_admin_memberships set moderation_alerts_enabled=enabled where user_id=actor_id;
 end if;
 select moderation_alerts_enabled into result from public.cleanup_admin_memberships where user_id=actor_id;
 return result;
end; $$;
revoke all on function private.moderation_alert_preferences(boolean) from public,anon,authenticated,service_role;
grant execute on function private.moderation_alert_preferences(boolean) to authenticated;
create or replace function public.moderation_alert_preferences(enabled boolean default null)
returns boolean language sql security invoker set search_path='' as $$
 select private.moderation_alert_preferences(enabled);
$$;
revoke all on function public.moderation_alert_preferences(boolean) from public,anon,authenticated,service_role;
grant execute on function public.moderation_alert_preferences(boolean) to authenticated;

create or replace function private.scrub_deleted_moderation_intake()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.cleanup_admin_cases set context='{}',summary='The original community report is no longer available.',
   status='resolved',resolved_at=coalesce(resolved_at,now()),updated_at=now()
 where moderation_report_id=old.id;
 return old;
end; $$;
revoke all on function private.scrub_deleted_moderation_intake() from public,anon,authenticated,service_role;
create trigger scrub_deleted_moderation_intake before delete on public.user_moderation_reports
 for each row execute function private.scrub_deleted_moderation_intake();
