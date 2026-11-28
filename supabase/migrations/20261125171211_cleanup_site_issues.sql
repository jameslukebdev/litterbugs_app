-- Private site problems, paused claim time and versioned public report corrections.
-- Prepared and tested locally; do not apply to hosted without release approval.
begin;
alter table public.reports add column cleanup_issue_hold boolean not null default false,
  add column content_revision integer not null default 1 check(content_revision>0),
  add column additional_information text check(char_length(additional_information)<=3000);
alter table public.cleanup_attempts add column issue_paused_at timestamptz,
  add column issue_pause_total interval not null default interval '0' check(issue_pause_total>=interval '0'),
  add column report_content_revision integer not null default 1;
alter table public.cleanup_attempts drop constraint cleanup_attempts_claim_window_check;
alter table public.cleanup_attempts add constraint cleanup_attempts_claim_window_check
  check(claim_expires_at=claimed_at+private.cleanup_claim_duration()+issue_pause_total);
alter table public.cleanup_contributions add column report_content_revision integer not null default 1;

create table public.cleanup_issues (
 id uuid primary key, report_id uuid not null references public.reports(id) on delete cascade,
 cleanup_attempt_id uuid not null references public.cleanup_attempts(id),
 reporter_id uuid references auth.users(id) on delete set null, cleaner_id uuid references auth.users(id) on delete set null,
 reason text not null check(reason in ('access','information','unsafe','moved','missing','other')),
 status text not null default 'awaiting_reporter' check(status in ('awaiting_reporter','awaiting_cleaner','team_review','resolved')),
 requires_team_review boolean not null default false, keeps_claim boolean not null,
 version integer not null default 1 check(version>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 resolved_at timestamptz, resolved_by uuid references auth.users(id) on delete set null,
 check((status='resolved')=(resolved_at is not null))
);
create unique index cleanup_one_open_issue on public.cleanup_issues(report_id) where status<>'resolved';
create index cleanup_issues_reporter on public.cleanup_issues(reporter_id,updated_at desc);
create index cleanup_issues_cleaner on public.cleanup_issues(cleaner_id,updated_at desc);
create table public.cleanup_issue_messages (
 id uuid primary key, issue_id uuid not null references public.cleanup_issues(id) on delete cascade,
 author_id uuid references auth.users(id) on delete set null, body text not null check(char_length(btrim(body)) between 1 and 2000),
 photo_paths text[] not null default '{}' check(cardinality(photo_paths)<=3 and array_position(photo_paths,null) is null),
 created_at timestamptz not null default now()
);
create index cleanup_issue_messages_thread on public.cleanup_issue_messages(issue_id,created_at,id);
create table public.report_content_revisions (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.reports(id) on delete cascade,
 revision integer not null, author_id uuid references auth.users(id) on delete set null,
 notes_other text, additional_information text, photo_paths text[] not null,
 title text, litter_types text[], severity text, latitude double precision, longitude double precision,
 created_at timestamptz not null default now(), unique(report_id,revision)
);
create index report_revision_photo_paths on public.report_content_revisions using gin(photo_paths);
alter table public.cleanup_notifications add column issue_id uuid references public.cleanup_issues(id) on delete cascade,
 add column issue_message_id uuid references public.cleanup_issue_messages(id) on delete cascade;
create unique index cleanup_issue_notification_once on public.cleanup_notifications(user_id,event_type,issue_message_id)
 where issue_message_id is not null;
-- Keep all prior event types and accept only these additional operational events.
do $$ declare definition text; begin
 select pg_get_constraintdef(oid) into definition from pg_constraint where conrelid='public.cleanup_notifications'::regclass and conname='cleanup_notifications_event_type_check';
 alter table public.cleanup_notifications drop constraint cleanup_notifications_event_type_check;
 execute 'alter table public.cleanup_notifications add constraint cleanup_notifications_event_type_check check ('||substring(definition from 7)||' or event_type in (''cleanup_issue_requested'',''cleanup_issue_replied'',''cleanup_issue_report_updated'',''cleanup_issue_resolved''))';
end $$;

alter table public.cleanup_issues enable row level security;
alter table public.cleanup_issue_messages enable row level security;
alter table public.report_content_revisions enable row level security;
revoke all on public.cleanup_issues,public.cleanup_issue_messages,public.report_content_revisions from anon,authenticated;
grant select on public.cleanup_issues,public.cleanup_issue_messages,public.report_content_revisions to authenticated;
grant select on public.report_content_revisions to anon;
grant all on public.cleanup_issues,public.cleanup_issue_messages,public.report_content_revisions to service_role;
create policy issue_participants_read on public.cleanup_issues for select to authenticated
 using((select public.is_permanent_user()) and (reporter_id=(select auth.uid()) or cleaner_id=(select auth.uid()) or (select public.is_cleanup_admin())));
create policy issue_messages_participants_read on public.cleanup_issue_messages for select to authenticated
 using(exists(select 1 from public.cleanup_issues i where i.id=issue_id));
create policy public_report_revision_read on public.report_content_revisions for select to anon,authenticated
 using(exists(select 1 from public.reports r where r.id=report_id and r.is_published and not r.is_sample and r.moderated_at is null));
create policy owner_report_revision_read on public.report_content_revisions for select to authenticated
 using(author_id=(select auth.uid()) or (select public.is_cleanup_admin()));

-- No direct client may manufacture a hold, revision or paused clock.
create function private.protect_cleanup_issue_fields() returns trigger language plpgsql set search_path='' as $$ begin
 if current_user in ('anon','authenticated') then
  if tg_table_name='reports' then
   if new.cleanup_issue_hold is distinct from old.cleanup_issue_hold or new.content_revision is distinct from old.content_revision
      or new.additional_information is distinct from old.additional_information then
    raise insufficient_privilege using message='report_content_requires_revision'; end if;
   if new.notes_other is distinct from old.notes_other or new.photo_paths is distinct from old.photo_paths then
    -- Existing apps still edit an available, unfunded report directly. Advance
    -- its version so a future claim snapshots the new content; old evidence stays.
    if auth.uid()=old.user_id and old.cleanup_state='available' and new.cleanup_state=old.cleanup_state
       and old.funding_locked_at is null and coalesce(old.funded_amount_cents,0)=0
       and old.cancelled_at is null and old.expired_at is null then
     new.content_revision:=old.content_revision+1;
    elsif exists(select 1 from public.report_content_revisions where report_id=old.id) then
     raise check_violation using message='report_content_requires_revision';
    end if;
   end if;
  elsif new.issue_paused_at is distinct from old.issue_paused_at or new.issue_pause_total is distinct from old.issue_pause_total
    or new.report_content_revision is distinct from old.report_content_revision then
   raise insufficient_privilege using message='cleanup_pause_is_server_managed';
  end if;
 end if;
 if tg_table_name='cleanup_attempts' then
  if old.issue_paused_at is not null and new.issue_paused_at is not null and new.status is distinct from old.status then
   raise check_violation using message='cleanup_paused_for_issue';
  end if;
 end if;
 return new;
end $$;
create function private.guard_report_issue_defaults() returns trigger language plpgsql set search_path='' as $$ begin
 if current_user in ('anon','authenticated') and (new.cleanup_issue_hold or new.content_revision<>1 or new.additional_information is not null) then raise insufficient_privilege using message='report_issue_fields_are_server_managed'; end if;
 return new;
end $$;
create trigger reports_guard_issue_defaults before insert on public.reports for each row execute function private.guard_report_issue_defaults();
create trigger reports_protect_issue_fields before update on public.reports for each row execute function private.protect_cleanup_issue_fields();
create trigger attempts_protect_issue_fields before update on public.cleanup_attempts for each row execute function private.protect_cleanup_issue_fields();

create function private.snapshot_report_content(target_report_id uuid) returns void language sql security definer set search_path='' as $$
 insert into public.report_content_revisions(report_id,revision,author_id,notes_other,additional_information,photo_paths,title,litter_types,severity,latitude,longitude,created_at)
 select id,content_revision,user_id,notes_other,additional_information,coalesce(photo_paths,'{}'),title,litter_types,severity,latitude,longitude,now()
 from public.reports where id=target_report_id on conflict(report_id,revision) do nothing;
$$;
create function private.guard_cleanup_issue_entry() returns trigger language plpgsql security definer set search_path='' as $$
 declare r public.reports; begin
 select * into r from public.reports where id=new.report_id for update;
 if r.cleanup_issue_hold then raise check_violation using message='report_paused_for_issue'; end if;
 perform private.snapshot_report_content(new.report_id);
 new.report_content_revision:=r.content_revision;
 return new;
end $$;
create trigger cleanup_issues_guard_claim before insert on public.cleanup_attempts for each row execute function private.guard_cleanup_issue_entry();
create trigger cleanup_issues_guard_contribution before insert on public.cleanup_contributions for each row execute function private.guard_cleanup_issue_entry();
-- Existing claims/financial records must retain the original report content.
insert into public.report_content_revisions(report_id,revision,author_id,notes_other,additional_information,photo_paths,title,litter_types,severity,latitude,longitude,created_at)
 select r.id,r.content_revision,r.user_id,r.notes_other,r.additional_information,coalesce(r.photo_paths,'{}'),r.title,r.litter_types,r.severity,r.latitude,r.longitude,r.created_at
 from public.reports r where r.funding_locked_at is not null or exists(select 1 from public.cleanup_attempts a where a.report_id=r.id)
 on conflict do nothing;

-- All existing callers, including older clients and maintenance, use this same guard.
CREATE OR REPLACE FUNCTION private.expire_cleanup_claim(target_cleanup_id uuid, effective_at timestamp with time zone)
 RETURNS cleanup_attempts
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  attempt_record public.cleanup_attempts%rowtype;
  transition_at timestamptz := coalesce(effective_at, now());
begin
  select * into attempt_record
  from public.cleanup_attempts
  where id = target_cleanup_id
  for update;

  if not found then
    return null;
  end if;

  perform 1 from public.reports
  where id = attempt_record.report_id
  for update;

  if attempt_record.status = 'claimed'
    and attempt_record.issue_paused_at is null
    and attempt_record.claim_expires_at <= transition_at then
    update public.cleanup_attempts set
      status = 'expired',
      expired_at = claim_expires_at,
      last_activity_at = transition_at
    where id = target_cleanup_id
    returning * into attempt_record;

    perform private.reopen_cleanup_pool(target_cleanup_id, transition_at);

    if attempt_record.cleaner_id is not null then
      insert into public.cleanup_notifications (
        user_id, cleanup_attempt_id, report_id, event_type, created_at
      ) values (
        attempt_record.cleaner_id,
        attempt_record.id,
        attempt_record.report_id,
        'claim_expired',
        attempt_record.claim_expires_at
      ) on conflict do nothing;
    end if;
  end if;

  return attempt_record;
end;
$function$;



create function private.validate_issue_photos(paths text[], actor uuid, attempt uuid) returns void language plpgsql security definer set search_path='' as $$
 declare path text; begin
 if paths is null or cardinality(paths)>3 or array_position(paths,null) is not null then raise check_violation using message='issue_photos_invalid'; end if;
 foreach path in array paths loop
  if path not like actor::text||'/'||attempt::text||'/%' or not exists(select 1 from storage.objects where bucket_id='cleanup_issue_photos' and name=path) then
   raise check_violation using message='issue_photo_upload_missing'; end if;
 end loop;
end $$;
create function private.notify_cleanup_issue(target_issue uuid, target_message uuid, recipient uuid, event_name text) returns void language sql security definer set search_path='' as $$
 insert into public.cleanup_notifications(user_id,cleanup_attempt_id,report_id,event_type,issue_id,issue_message_id)
 select recipient,i.cleanup_attempt_id,i.report_id,event_name,i.id,target_message from public.cleanup_issues i where i.id=target_issue and recipient is not null
 on conflict do nothing;
$$;
create function private.open_cleanup_issue(target_cleanup_id uuid, request_id uuid, issue_reason text, message_body text, keeps_claim boolean, message_photos text[] default '{}')
 returns public.cleanup_issues language plpgsql security definer set search_path='' as $$
 declare actor uuid:=private.require_permanent_cleanup_user(); a public.cleanup_attempts; i public.cleanup_issues; r public.reports; case_id uuid; begin
 select * into i from public.cleanup_issues where id=request_id;
 if found then
  if i.cleaner_id=actor and i.cleanup_attempt_id=target_cleanup_id and i.reason=issue_reason and i.keeps_claim=keeps_claim
    and exists(select 1 from public.cleanup_issue_messages m where m.id=request_id and m.body=btrim(message_body) and m.photo_paths=message_photos) then return i; end if;
  raise insufficient_privilege using message='issue_request_conflict';
 end if;
 if request_id is null or issue_reason not in ('access','information','unsafe','moved','missing','other') or keeps_claim is null
  or length(btrim(coalesce(message_body,''))) not between 1 and 2000 then raise check_violation using message='issue_request_invalid'; end if;
 select * into a from public.cleanup_attempts where id=target_cleanup_id;
 if not found or a.cleaner_id is distinct from actor or a.reporter_id=actor then raise insufficient_privilege using message='issue_request_not_allowed'; end if;
 select * into r from public.reports where id=a.report_id for update;
 select * into a from public.cleanup_attempts where id=target_cleanup_id for update;
 if a.status<>'claimed' or a.claim_expires_at<=now() or a.issue_paused_at is not null or r.cleanup_issue_hold or r.cancelled_at is not null or r.moderated_at is not null then
  raise check_violation using message='issue_cleanup_unavailable'; end if;
 perform private.validate_issue_photos(message_photos,actor,a.id);
 if keeps_claim then update public.cleanup_attempts set issue_paused_at=now() where id=a.id;
 else perform public.release_cleanup(a.id); end if;
 insert into public.cleanup_issues(id,report_id,cleanup_attempt_id,reporter_id,cleaner_id,reason,keeps_claim,requires_team_review)
 values(request_id,a.report_id,a.id,a.reporter_id,actor,issue_reason,keeps_claim,(issue_reason in ('unsafe','moved','missing') or a.reporter_id is null)) returning * into i;
 insert into public.cleanup_issue_messages(id,issue_id,author_id,body,photo_paths) values(request_id,i.id,actor,btrim(message_body),message_photos);
 update public.reports set cleanup_issue_hold=true where id=a.report_id;
 perform private.notify_cleanup_issue(i.id,request_id,i.reporter_id,'cleanup_issue_requested');
 if i.requires_team_review then
  insert into public.cleanup_admin_cases(case_type,report_id,cleanup_attempt_id,title,summary,context)
  values('report_safety',i.report_id,i.cleanup_attempt_id,'Cleanup site needs review','A cleaner reported a site problem.',jsonb_build_object('cleanup_issue_id',i.id,'reason',i.reason)) returning id into case_id;
 end if;
 return i;
end $$;
create function private.reply_cleanup_issue(target_issue_id uuid, message_id uuid, expected_version integer, message_body text, message_photos text[] default '{}')
 returns public.cleanup_issues language plpgsql security definer set search_path='' as $$
 declare actor uuid:=private.require_permanent_cleanup_user(); i public.cleanup_issues; recipient uuid; r uuid; begin
 select report_id into r from public.cleanup_issues where id=target_issue_id;
 perform 1 from public.reports where id=r for update;
 select * into i from public.cleanup_issues where id=target_issue_id for update;
 if not found or (actor is distinct from i.cleaner_id and actor is distinct from i.reporter_id) then raise insufficient_privilege using message='issue_reply_not_allowed'; end if;
 if exists(select 1 from public.cleanup_issue_messages m where m.id=message_id and m.issue_id=i.id and m.author_id=actor and m.body=btrim(message_body) and m.photo_paths=message_photos) then return i; end if;
 if i.status='resolved' or i.version<>expected_version then raise check_violation using message='issue_changed_refresh'; end if;
 if message_id is null or length(btrim(coalesce(message_body,''))) not between 1 and 2000 then raise check_violation using message='issue_reply_invalid'; end if;
 perform private.validate_issue_photos(message_photos,actor,i.cleanup_attempt_id);
 insert into public.cleanup_issue_messages(id,issue_id,author_id,body,photo_paths) values(message_id,i.id,actor,btrim(message_body),message_photos);
 update public.cleanup_issues set status=case when actor=cleaner_id then 'awaiting_reporter' when requires_team_review then 'team_review' else 'awaiting_cleaner' end,
 version=version+1,updated_at=now() where id=i.id returning * into i;
 recipient:=case when actor=i.cleaner_id then i.reporter_id else i.cleaner_id end;
 perform private.notify_cleanup_issue(i.id,message_id,recipient,case when actor=i.cleaner_id then 'cleanup_issue_requested' else 'cleanup_issue_replied' end);
 return i;
end $$;
create function private.resolve_cleanup_issue(target_issue_id uuid, expected_version integer)
 returns public.cleanup_issues language plpgsql security definer set search_path='' as $$
 declare actor uuid:=private.require_permanent_cleanup_user(); i public.cleanup_issues; a public.cleanup_attempts; report_uuid uuid; begin
 select report_id into report_uuid from public.cleanup_issues where id=target_issue_id;
 perform 1 from public.reports where id=report_uuid for update;
 select * into i from public.cleanup_issues where id=target_issue_id for update;
 if not found or actor is distinct from i.cleaner_id then raise insufficient_privilege using message='issue_resume_not_allowed'; end if;
 if i.status='resolved' then return i; end if;
 if i.version<>expected_version or i.status<>'awaiting_cleaner' or i.requires_team_review then raise check_violation using message='issue_not_ready_to_resume'; end if;
 if exists(select 1 from public.reports where id=i.report_id and (cancelled_at is not null or moderated_at is not null or renewal_status='closed')) then raise check_violation using message='issue_report_unavailable'; end if;
 select * into a from public.cleanup_attempts where id=i.cleanup_attempt_id for update;
 if i.keeps_claim then
  if a.status<>'claimed' or a.issue_paused_at is null then raise check_violation using message='issue_claim_changed'; end if;
  update public.cleanup_attempts set claim_expires_at=claim_expires_at+(now()-issue_paused_at),
    issue_pause_total=issue_pause_total+(now()-issue_paused_at),issue_paused_at=null,last_activity_at=now() where id=a.id;
 end if;
 update public.cleanup_issues set status='resolved',resolved_at=now(),resolved_by=actor,updated_at=now(),version=version+1 where id=i.id returning * into i;
 update public.reports set cleanup_issue_hold=false where id=i.report_id;
 perform private.notify_cleanup_issue(i.id,null,i.reporter_id,'cleanup_issue_resolved');
 return i;
end $$;
create function private.review_cleanup_issue(target_issue_id uuid, expected_version integer)
 returns public.cleanup_issues language plpgsql security definer set search_path='' as $$
 declare actor uuid:=private.require_permanent_cleanup_user(); i public.cleanup_issues; report_uuid uuid; begin
 if not public.is_cleanup_admin() then raise insufficient_privilege using message='cleanup_admin_required'; end if;
 select report_id into report_uuid from public.cleanup_issues where id=target_issue_id;
 perform 1 from public.reports where id=report_uuid for update;
 select * into i from public.cleanup_issues where id=target_issue_id for update;
 if i.id is null or i.version<>expected_version or i.status='resolved' then raise check_violation using message='issue_changed_refresh'; end if;
 update public.cleanup_issues set requires_team_review=false,status='awaiting_cleaner',version=version+1,updated_at=now() where id=i.id returning * into i;
 update public.cleanup_admin_cases set status='resolved',resolved_by=actor,resolved_at=now(),updated_at=now()
 where context->>'cleanup_issue_id'=i.id::text and status='open';
 perform private.notify_cleanup_issue(i.id,null,i.cleaner_id,'cleanup_issue_replied');
 return i;
end $$;

create function private.update_report_content(target_report_id uuid, expected_revision integer, update_id uuid, new_description text, new_information text, new_photo_paths text[])
 returns public.reports language plpgsql security definer set search_path='' as $$
 declare actor uuid:=private.require_permanent_cleanup_user(); r public.reports; i public.cleanup_issues; path text; begin
 select * into r from public.reports where id=target_report_id for update;
 if not found or r.user_id is distinct from actor then raise insufficient_privilege using message='report_edit_not_allowed'; end if;
 if exists(select 1 from public.report_content_revisions where id=update_id and report_id=r.id and author_id=actor and notes_other=btrim(coalesce(new_description,'')) and coalesce(additional_information,'')=btrim(coalesce(new_information,'')) and photo_paths=new_photo_paths) then return r; end if;
 if update_id is null or r.content_revision<>expected_revision then raise check_violation using message='report_changed_refresh'; end if;
 if r.cancelled_at is not null or r.moderated_at is not null or r.cleanup_state not in ('available','claimed') or r.renewal_status<>'active' or not r.is_published then raise check_violation using message='report_edit_unavailable'; end if;
 if char_length(coalesce(new_description,''))>3000 or char_length(coalesce(new_information,''))>3000
  or new_photo_paths is null or cardinality(new_photo_paths) not between 1 and 3 or array_position(new_photo_paths,null) is not null then raise check_violation using message='report_content_invalid'; end if;
 foreach path in array new_photo_paths loop
  if path not like actor::text||'/'||r.id::text||'/%' or not exists(select 1 from storage.objects where bucket_id='report_photos' and name=path) then
   raise check_violation using message='report_photo_upload_missing'; end if;
 end loop;
 perform private.snapshot_report_content(r.id);
 update public.reports set notes_other=btrim(coalesce(new_description,'')),additional_information=nullif(btrim(coalesce(new_information,'')),''),
 photo_paths=new_photo_paths,content_revision=content_revision+1 where id=r.id returning * into r;
 insert into public.report_content_revisions(id,report_id,revision,author_id,notes_other,additional_information,photo_paths,title,litter_types,severity,latitude,longitude)
 values(update_id,r.id,r.content_revision,actor,r.notes_other,r.additional_information,r.photo_paths,r.title,r.litter_types,r.severity,r.latitude,r.longitude);
 select * into i from public.cleanup_issues where report_id=r.id and status<>'resolved' for update;
 if found then
  update public.cleanup_issues set status=case when requires_team_review then 'team_review' else 'awaiting_cleaner' end,version=version+1,updated_at=now() where id=i.id;
  perform private.notify_cleanup_issue(i.id,null,i.cleaner_id,'cleanup_issue_report_updated');
 end if;
 return r;
end $$;

-- Retained public evidence cannot be removed by a subsequent browser edit.
create function private.report_photo_is_retained(path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.report_content_revisions where path=any(photo_paths));
$$;
revoke all on function private.report_photo_is_retained(text) from public,anon,authenticated,service_role;
grant execute on function private.report_photo_is_retained(text) to authenticated;
create policy retained_report_photos_cannot_be_deleted on storage.objects as restrictive for delete to authenticated
 using(bucket_id<>'report_photos' or not private.report_photo_is_retained(name));
create policy retained_report_photos_readable on storage.objects for select to anon,authenticated
 using(bucket_id='report_photos' and exists(select 1 from public.report_content_revisions v where name=any(v.photo_paths)));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('cleanup_issue_photos','cleanup_issue_photos',false,5242880,array['image/jpeg']) on conflict(id) do nothing;
create policy private_issue_photos_read on storage.objects for select to authenticated
 using(bucket_id='cleanup_issue_photos' and ((storage.foldername(name))[1]=(select auth.uid())::text
 or exists(select 1 from public.cleanup_issue_messages m where name=any(m.photo_paths))));
-- Processed destinations are service-only; quarantine keeps the existing safe processor flow.
create policy issue_quarantine_upload on storage.objects for insert to authenticated with check(
 bucket_id='media_quarantine' and (select public.is_permanent_user()) and cardinality(storage.foldername(name))=2
 and (storage.foldername(name))[1]=(select auth.uid())::text and (storage.foldername(name))[2]='issue'
 and storage.filename(name)~*'^[0-9a-f-]{36}\.(jpe?g|png|webp|heic|heif)$');
do $$ declare definition text; begin
 select pg_get_constraintdef(oid) into definition from pg_constraint where conrelid='public.media_scan_attempts'::regclass and conname='media_scan_attempts_media_kind_check';
 if definition is not null then
  alter table public.media_scan_attempts drop constraint media_scan_attempts_media_kind_check;
  execute 'alter table public.media_scan_attempts add constraint media_scan_attempts_media_kind_check check ('||substring(definition from 7)||' or media_kind=''issue'')';
 end if;
end $$;

revoke all on function private.open_cleanup_issue(uuid,uuid,text,text,boolean,text[]) from public,anon,authenticated,service_role;
grant execute on function private.open_cleanup_issue(uuid,uuid,text,text,boolean,text[]) to authenticated;
create function public.open_cleanup_issue(target_cleanup_id uuid, request_id uuid, issue_reason text, message_body text, keeps_claim boolean, message_photos text[] default '{}') returns public.cleanup_issues language sql security invoker set search_path='' as $$ select private.open_cleanup_issue(target_cleanup_id,request_id,issue_reason,message_body,keeps_claim,message_photos); $$;
revoke all on function public.open_cleanup_issue(uuid,uuid,text,text,boolean,text[]) from public,anon,service_role;
grant execute on function public.open_cleanup_issue(uuid,uuid,text,text,boolean,text[]) to authenticated;

revoke all on function private.reply_cleanup_issue(uuid,uuid,integer,text,text[]) from public,anon,authenticated,service_role;
grant execute on function private.reply_cleanup_issue(uuid,uuid,integer,text,text[]) to authenticated;
create function public.reply_cleanup_issue(target_issue_id uuid, message_id uuid, expected_version integer, message_body text, message_photos text[] default '{}') returns public.cleanup_issues language sql security invoker set search_path='' as $$ select private.reply_cleanup_issue(target_issue_id,message_id,expected_version,message_body,message_photos); $$;
revoke all on function public.reply_cleanup_issue(uuid,uuid,integer,text,text[]) from public,anon,service_role;
grant execute on function public.reply_cleanup_issue(uuid,uuid,integer,text,text[]) to authenticated;

revoke all on function private.resolve_cleanup_issue(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function private.resolve_cleanup_issue(uuid,integer) to authenticated;
create function public.resolve_cleanup_issue(target_issue_id uuid, expected_version integer) returns public.cleanup_issues language sql security invoker set search_path='' as $$ select private.resolve_cleanup_issue(target_issue_id,expected_version); $$;
revoke all on function public.resolve_cleanup_issue(uuid,integer) from public,anon,service_role;
grant execute on function public.resolve_cleanup_issue(uuid,integer) to authenticated;

revoke all on function private.review_cleanup_issue(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function private.review_cleanup_issue(uuid,integer) to authenticated;
create function public.review_cleanup_issue(target_issue_id uuid, expected_version integer) returns public.cleanup_issues language sql security invoker set search_path='' as $$ select private.review_cleanup_issue(target_issue_id,expected_version); $$;
revoke all on function public.review_cleanup_issue(uuid,integer) from public,anon,service_role;
grant execute on function public.review_cleanup_issue(uuid,integer) to authenticated;

revoke all on function private.update_report_content(uuid,integer,uuid,text,text,text[]) from public,anon,authenticated,service_role;
grant execute on function private.update_report_content(uuid,integer,uuid,text,text,text[]) to authenticated;
create function public.update_report_content(target_report_id uuid, expected_revision integer, update_id uuid, new_description text, new_information text, new_photo_paths text[]) returns public.reports language sql security invoker set search_path='' as $$ select private.update_report_content(target_report_id,expected_revision,update_id,new_description,new_information,new_photo_paths); $$;
revoke all on function public.update_report_content(uuid,integer,uuid,text,text,text[]) from public,anon,service_role;
grant execute on function public.update_report_content(uuid,integer,uuid,text,text,text[]) to authenticated;

revoke all on function private.guard_report_issue_defaults() from public,anon,authenticated,service_role;
revoke all on function private.protect_cleanup_issue_fields() from public,anon,authenticated,service_role;
revoke all on function private.snapshot_report_content(uuid) from public,anon,authenticated,service_role;
revoke all on function private.guard_cleanup_issue_entry() from public,anon,authenticated,service_role;
revoke all on function private.validate_issue_photos(text[],uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function private.notify_cleanup_issue(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
