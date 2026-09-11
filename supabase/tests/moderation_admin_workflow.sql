begin;
insert into auth.users(id,email,is_anonymous) values
 ('92000000-0000-4000-8000-000000000001','moderation-owner@example.invalid',false),
 ('92000000-0000-4000-8000-000000000002','moderation-reporter@example.invalid',false),
 ('92000000-0000-4000-8000-000000000003','moderation-admin@example.invalid',false);
insert into public.profiles(id,display_name,bio) values
 ('92000000-0000-4000-8000-000000000001','Profile for review','Harmless test bio'),
 ('92000000-0000-4000-8000-000000000002','Reporter',null),
 ('92000000-0000-4000-8000-000000000003','Reviewer',null) on conflict do nothing;
insert into public.cleanup_admin_memberships(user_id,moderation_alerts_enabled) values('92000000-0000-4000-8000-000000000003',true);
insert into public.reports(id,user_id,title,expires_at) values
 ('92000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000001','Harmless removal fixture',now()+interval '30 days');
insert into public.cleanup_feature_flags(name,enabled) values ('payments_enabled',true),('gemini_financial_review_enabled',true)
 on conflict(name) do update set enabled=true;
update public.reports set photo_paths=array['92000000-0000-4000-8000-000000000001/fixture.png'] where id='92000000-0000-4000-8000-000000000010';
update public.reports set funding_eligibility='eligible' where id='92000000-0000-4000-8000-000000000010';
select public.create_cleanup_contribution_intent('92000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000002',gen_random_uuid(),500,'qa_moderation_refund');
select public.finalize_cleanup_contribution('qa_moderation_refund','qa_moderation_charge',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','92000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"92000000-0000-4000-8000-000000000002","is_anonymous":false,"aal":"aal2"}',true);
insert into public.user_moderation_reports(id,reporter_id,reported_user_id,source_report_id,reason,details)
 values('92000000-0000-4000-8000-000000000020','92000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000010','inappropriate_content','Harmless concern fixture');
reset role;
do $$
declare case_id uuid;
begin
 select id into case_id from public.cleanup_admin_cases where moderation_report_id='92000000-0000-4000-8000-000000000020';
 if case_id is null then raise exception 'Intake did not reach existing inbox'; end if;
 perform set_config('test.moderation_case',case_id::text,true);
 if (select count(*) from public.cleanup_notifications where admin_case_id=case_id
   and user_id='92000000-0000-4000-8000-000000000003' and event_type='admin_moderation_needed')<>1 then
   raise exception 'Administrator alert missing';
 end if;
end;
$$;
set local role authenticated;
do $$ begin
 begin
  perform public.resolve_moderation_case(current_setting('test.moderation_case')::uuid,'remove_report','Test removal');
  raise exception 'Ordinary member removed content';
 exception when insufficient_privilege then null; end;
end; $$;
select set_config('request.jwt.claim.sub','92000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"92000000-0000-4000-8000-000000000003","is_anonymous":false,"aal":"aal1"}',true);
do $$ begin
 begin
  perform public.resolve_moderation_case(current_setting('test.moderation_case')::uuid,'remove_report','Test removal');
  raise exception 'Administrator bypassed MFA';
 exception when insufficient_privilege then null; end;
end; $$;
select set_config('request.jwt.claims','{"sub":"92000000-0000-4000-8000-000000000003","is_anonymous":false,"aal":"aal2"}',true);
select public.resolve_moderation_case(current_setting('test.moderation_case')::uuid,'remove_report','Harmless test content removed');
reset role;
do $$ begin
 if not exists(select 1 from public.reports where id='92000000-0000-4000-8000-000000000010' and moderated_at is not null) then
  raise exception 'Report was not removed'; end if;
 if not exists(select 1 from public.cleanup_contributions where stripe_payment_intent_id='qa_moderation_refund' and status='refund_pending') then
  raise exception 'Removed funded report did not queue eligible refund'; end if;
 if not exists(select 1 from public.cleanup_admin_actions where case_id=current_setting('test.moderation_case')::uuid and action='remove_report') then
  raise exception 'Decision audit missing'; end if;
end; $$;
set local role anon;
do $$ begin
 if exists(select 1 from public.reports where id='92000000-0000-4000-8000-000000000010') then
  raise exception 'Removed report remained public'; end if;
end; $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','92000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"92000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal1"}',true);
do $$ declare affected integer; begin
 update public.reports set is_published=true where id='92000000-0000-4000-8000-000000000010';
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Owner could edit removed report'; end if;
end; $$;
reset role;
-- A completed profile must be cleared without deleting the member's account.
update public.profiles set display_name='Name to remove',bio='Bio to remove',
 username='moderationfixture',location='Fixture location',profile_completed_at=now()
 where id='92000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','92000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"92000000-0000-4000-8000-000000000003","is_anonymous":false,"aal":"aal2"}',true);
select public.moderation_alert_preferences(false);
reset role;
insert into public.user_moderation_reports(id,reporter_id,reported_user_id,reason,details)
 values('92000000-0000-4000-8000-000000000021','92000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','inappropriate_content','Profile-only fixture');
do $$ begin
 if exists(select 1 from public.cleanup_notifications n join public.cleanup_admin_cases c on c.id=n.admin_case_id
  where c.moderation_report_id='92000000-0000-4000-8000-000000000021') then
  raise exception 'Opted-out reviewer received alert'; end if;
end; $$;
select set_config('test.profile_case',(select id::text from public.cleanup_admin_cases where moderation_report_id='92000000-0000-4000-8000-000000000021'),true);
set local role authenticated;
select public.resolve_moderation_case(
 current_setting('test.profile_case')::uuid,
 'clear_profile','Harmless profile removal verification');
select public.moderation_alert_preferences(true);
reset role;
do $$ begin
 if not exists(select 1 from public.profiles where id='92000000-0000-4000-8000-000000000001'
  and display_name='Community member' and bio is null and username is null and location is null
  and avatar_path is null and provider_avatar_url is null and profile_completed_at is not null) then
  raise exception 'Profile content was not cleared'; end if;
 if not exists(select 1 from auth.users where id='92000000-0000-4000-8000-000000000001') then
  raise exception 'Profile moderation deleted account'; end if;
end; $$;
insert into public.user_moderation_reports(id,reporter_id,reported_user_id,reason,details)
 values('92000000-0000-4000-8000-000000000022','92000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','inappropriate_content','Dismissal fixture');
do $$ begin
 if (select count(*) from public.cleanup_notifications n join public.cleanup_admin_cases c on c.id=n.admin_case_id
  where c.moderation_report_id='92000000-0000-4000-8000-000000000022' and n.report_id is null)<>1 then
  raise exception 'Profile-only alert missing'; end if;
end; $$;
select set_config('test.profile_case',(select id::text from public.cleanup_admin_cases where moderation_report_id='92000000-0000-4000-8000-000000000022'),true);
set local role authenticated;
select public.resolve_moderation_case(
 current_setting('test.profile_case')::uuid,
 'dismiss_report','No violation in harmless fixture');
reset role;
do $$ begin
 if not exists(select 1 from public.user_moderation_reports where id='92000000-0000-4000-8000-000000000022' and status='dismissed') then
  raise exception 'Dismissal did not resolve intake'; end if;
end; $$;
select set_config('test.scrub_case',(select id::text from public.cleanup_admin_cases
 where moderation_report_id='92000000-0000-4000-8000-000000000022'),true);
delete from public.user_moderation_reports where id='92000000-0000-4000-8000-000000000022';
do $$ begin
 if not exists(select 1 from public.cleanup_admin_cases where id=current_setting('test.scrub_case')::uuid
  and context='{}'::jsonb and moderation_report_id is null and status='resolved') then
  raise exception 'Deleted intake retained copied profile content'; end if;
end; $$;
rollback;
