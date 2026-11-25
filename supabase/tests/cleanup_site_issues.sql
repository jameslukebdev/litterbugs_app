-- Complete migrated local schema only. Fixtures, notifications and media rows roll back.
begin;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$ begin
 if not coalesce(ok,false) then raise exception 'FAILED: %',label; end if; end $$;
create function pg_temp.expect_error(statement text, expected text) returns void language plpgsql as $$ begin
 begin execute statement; exception when others then
  if position(expected in sqlerrm)>0 then return; end if; raise exception 'Unexpected error: % (wanted %)',sqlerrm,expected;
 end; raise exception 'Expected failure: %',expected; end $$;
insert into auth.users(id,email,is_anonymous,raw_user_meta_data,created_at) values
 ('bc100000-0000-4000-8000-000000000001','issue-reporter@example.test',false,'{}',now()),
 ('bc100000-0000-4000-8000-000000000002','issue-cleaner@example.test',false,'{}',now()),
 ('bc100000-0000-4000-8000-000000000003','issue-outsider@example.test',false,'{}',now()),
 ('bc100000-0000-4000-8000-000000000004','issue-admin@example.test',false,'{}',now());
insert into storage.objects(bucket_id,name) values('report_photos','bc100000-0000-4000-8000-000000000001/bc200000-0000-4000-8000-000000000001/original.jpg'),
 ('report_photos','bc100000-0000-4000-8000-000000000001/bc200000-0000-4000-8000-000000000001/replacement.jpg');
insert into public.reports(id,user_id,title,latitude,longitude,photo_paths,notes_other,is_published)
 values('bc200000-0000-4000-8000-000000000001','bc100000-0000-4000-8000-000000000001','Issue test report',36,-81,
 array['bc100000-0000-4000-8000-000000000001/bc200000-0000-4000-8000-000000000001/original.jpg'],'Original description',true);
update public.reports set funding_eligibility='eligible',funding_locked_at=now(),funded_amount_cents=3500,original_photo_reviewed_at=now() where id='bc200000-0000-4000-8000-000000000001';
insert into public.cleaner_payout_accounts(user_id,stripe_account_id,onboarding_status,payouts_enabled,country,age_18_confirmed_at)
 values('bc100000-0000-4000-8000-000000000002','acct_issue_fixture','enabled',true,'US',now()),
 ('bc100000-0000-4000-8000-000000000003','acct_issue_outsider_fixture','enabled',true,'US',now());
insert into public.cleanup_contributions(report_id,contributor_id,client_request_id,principal_amount_cents,platform_fee_cents,total_amount_cents,status,succeeded_at,auto_refund_due_at,show_contributor_name)
 values('bc200000-0000-4000-8000-000000000001','bc100000-0000-4000-8000-000000000003',gen_random_uuid(),3500,350,3850,'succeeded',now(),now()+interval '23 months',false);
insert into public.cleanup_waiver_acceptances(user_id,waiver_version,guidelines_version)
 select u,waiver_version,guidelines_version from public.cleanup_waiver_versions cross join (values('bc100000-0000-4000-8000-000000000002'::uuid),('bc100000-0000-4000-8000-000000000003'::uuid)) users(u)
 where is_active and retired_at is null on conflict do nothing;
insert into public.cleanup_admin_memberships(user_id,active) values('bc100000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims','{"sub":"bc100000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false,"aal":"aal1"}',true);
set local role authenticated;
select (public.claim_cleanup('bc200000-0000-4000-8000-000000000001')).id;
select (public.open_cleanup_issue((select id from public.cleanup_attempts where report_id='bc200000-0000-4000-8000-000000000001'),
 'bc300000-0000-4000-8000-000000000001','access','Private gate request',true)).id;
select pg_temp.assert_true((select cleanup_issue_hold from public.reports where id='bc200000-0000-4000-8000-000000000001'),'neutral report hold');
select pg_temp.assert_true((select count(*)=1 from public.cleanup_issue_messages),'one initial private message');
select (public.open_cleanup_issue((select id from public.cleanup_attempts where report_id='bc200000-0000-4000-8000-000000000001'),
 'bc300000-0000-4000-8000-000000000001','access','Private gate request',true)).id;
select pg_temp.assert_true((select count(*)=1 from public.cleanup_issue_messages),'request retry idempotent');
select pg_temp.expect_error($q$select public.resolve_cleanup_issue('bc300000-0000-4000-8000-000000000001',1)$q$,'issue_not_ready_to_resume');
reset role;
-- Simulate five minutes spent paused without changing the claim's remaining time.
update public.cleanup_attempts set issue_paused_at=now()-interval '5 minutes' where report_id='bc200000-0000-4000-8000-000000000001';
select pg_temp.assert_true((private.expire_cleanup_claim((select id from public.cleanup_attempts where report_id='bc200000-0000-4000-8000-000000000001'),now()+interval '90 days')).status='claimed','maintenance cannot expire paused claim');
select set_config('request.jwt.claims','{"sub":"bc100000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false,"aal":"aal1"}',true);
set local role authenticated;
select pg_temp.assert_true((select count(*)=0 from public.cleanup_issues),'outsider cannot read issues');
select pg_temp.assert_true((select count(*)=0 from public.cleanup_issue_messages),'outsider cannot read messages');
select pg_temp.expect_error($q$select public.reply_cleanup_issue('bc300000-0000-4000-8000-000000000001','bc400000-0000-4000-8000-000000000001',1,'intrusion')$q$,'issue_reply_not_allowed');
select pg_temp.expect_error($q$select public.resolve_cleanup_issue('bc300000-0000-4000-8000-000000000001',1)$q$,'issue_resume_not_allowed');
reset role;
set local role anon;
select pg_temp.expect_error('select * from public.cleanup_issues','permission denied');
select pg_temp.expect_error('select * from public.cleanup_issue_messages','permission denied');
select pg_temp.assert_true((select notes_other='Original description' from public.reports where id='bc200000-0000-4000-8000-000000000001'),'public report unchanged by private message');
reset role;
select set_config('request.jwt.claims','{"sub":"bc100000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false,"aal":"aal1"}',true);
set local role authenticated;
select (public.reply_cleanup_issue('bc300000-0000-4000-8000-000000000001','bc400000-0000-4000-8000-000000000002',1,'Private answer: use east gate')).version;
select (public.reply_cleanup_issue('bc300000-0000-4000-8000-000000000001','bc400000-0000-4000-8000-000000000002',1,'Private answer: use east gate')).version;
select pg_temp.assert_true((select count(*)=2 from public.cleanup_issue_messages),'reply retry idempotent');
select pg_temp.expect_error($q$select public.reply_cleanup_issue('bc300000-0000-4000-8000-000000000001','bc400000-0000-4000-8000-000000000003',1,'Stale reply')$q$,'issue_changed_refresh');
select (public.update_report_content('bc200000-0000-4000-8000-000000000001',1,'bc500000-0000-4000-8000-000000000001','Corrected public description','Public access information',array['bc100000-0000-4000-8000-000000000001/bc200000-0000-4000-8000-000000000001/replacement.jpg'])).content_revision;
select pg_temp.assert_true((select count(*)=2 from public.report_content_revisions where report_id='bc200000-0000-4000-8000-000000000001'),'original and corrected content retained');
select pg_temp.assert_true((select photo_paths[1] like '%original.jpg' from public.report_content_revisions where report_id='bc200000-0000-4000-8000-000000000001' and revision=1),'claim original photo preserved');
select pg_temp.assert_true((select funded_amount_cents=3500 and funding_locked_at is not null from public.reports where id='bc200000-0000-4000-8000-000000000001'),'public correction preserves fund');
-- Match the Storage API session setting, while retaining authenticated RLS.
set local storage.allow_delete_query='true';
delete from storage.objects where bucket_id='report_photos' and name='bc100000-0000-4000-8000-000000000001/bc200000-0000-4000-8000-000000000001/original.jpg';
select pg_temp.assert_true(exists(select 1 from storage.objects where bucket_id='report_photos' and name='bc100000-0000-4000-8000-000000000001/bc200000-0000-4000-8000-000000000001/original.jpg'),'original photo deletion prevented');
reset role;
select set_config('request.jwt.claims','{"sub":"bc100000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false,"aal":"aal1"}',true);
set local role authenticated;
select (public.resolve_cleanup_issue('bc300000-0000-4000-8000-000000000001',3)).status;
select (public.resolve_cleanup_issue('bc300000-0000-4000-8000-000000000001',3)).status;
select pg_temp.assert_true((select not cleanup_issue_hold from public.reports where id='bc200000-0000-4000-8000-000000000001'),'explicit confirmation clears hold');
reset role;
select pg_temp.assert_true((select status='claimed' and issue_paused_at is null and issue_pause_total=interval '5 minutes' and claim_expires_at=claimed_at+private.cleanup_claim_duration()+interval '5 minutes' from public.cleanup_attempts where report_id='bc200000-0000-4000-8000-000000000001'),'resume preserves exactly five minutes');
select pg_temp.assert_true((select count(*)=1 and min(principal_amount_cents)=3500 and bool_and(not show_contributor_name) from public.cleanup_contributions where report_id='bc200000-0000-4000-8000-000000000001'),'donation principal and privacy preserved');
set local role authenticated;
-- A safety reply cannot be self-cleared.
select (public.open_cleanup_issue((select id from public.cleanup_attempts where report_id='bc200000-0000-4000-8000-000000000001'),'bc300000-0000-4000-8000-000000000002','unsafe','Needles reported',true)).id;
reset role;
select set_config('request.jwt.claims','{"sub":"bc100000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false,"aal":"aal1"}',true);
set local role authenticated;
select (public.reply_cleanup_issue('bc300000-0000-4000-8000-000000000002','bc400000-0000-4000-8000-000000000004',1,'Needles still present')).status;
reset role;
select set_config('request.jwt.claims','{"sub":"bc100000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false,"aal":"aal1"}',true);
set local role authenticated;
select pg_temp.expect_error($q$select public.resolve_cleanup_issue('bc300000-0000-4000-8000-000000000002',2)$q$,'issue_not_ready_to_resume');
reset role;
select set_config('request.jwt.claims','{"sub":"bc100000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":false,"aal":"aal2"}',true);
set local role authenticated;
select pg_temp.expect_error($q$select public.decide_cleanup_issue('bc300000-0000-4000-8000-000000000002',2,'bc700000-0000-4000-8000-000000000001','ready','')$q$,'issue_review_reason_required');
select (public.decide_cleanup_issue('bc300000-0000-4000-8000-000000000002',2,'bc700000-0000-4000-8000-000000000001','hold','Sharps still present.')).status;
select pg_temp.assert_true((select requires_team_review and status='team_review' from public.cleanup_issues where id='bc300000-0000-4000-8000-000000000002'),'staff can keep site held');
select pg_temp.expect_error($q$select public.decide_cleanup_issue('bc300000-0000-4000-8000-000000000002',2,'bc700000-0000-4000-8000-000000000002','ready','Stale review')$q$,'issue_changed_refresh');
select (public.decide_cleanup_issue('bc300000-0000-4000-8000-000000000002',3,'bc700000-0000-4000-8000-000000000002','ready','Hazards professionally removed; ordinary litter remains.')).status;
select pg_temp.assert_true((select cleanup_issue_hold from public.reports where id='bc200000-0000-4000-8000-000000000001'),'staff ready does not auto-resume claim');
reset role;
select set_config('request.jwt.claims','{"sub":"bc100000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false,"aal":"aal1"}',true);
set local role authenticated;
select (public.resolve_cleanup_issue('bc300000-0000-4000-8000-000000000002',4)).status;
select (public.open_cleanup_issue((select id from public.cleanup_attempts where report_id='bc200000-0000-4000-8000-000000000001'),'bc300000-0000-4000-8000-000000000003','access','Cannot return to site',false)).id;
select pg_temp.assert_true((select status='released' and issue_paused_at is null from public.cleanup_attempts where report_id='bc200000-0000-4000-8000-000000000001'),'give-back releases attempt');
reset role;
select set_config('request.jwt.claims','{"sub":"bc100000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false,"aal":"aal1"}',true);
set local role authenticated;
select pg_temp.expect_error($q$select public.claim_cleanup('bc200000-0000-4000-8000-000000000001')$q$,'report_paused_for_issue');
reset role;
set local role service_role;
select pg_temp.expect_error($q$select public.reserve_cleanup_contribution('bc200000-0000-4000-8000-000000000001','bc100000-0000-4000-8000-000000000003','bc600000-0000-4000-8000-000000000001',500,1,null)$q$,'report_paused_for_issue');
reset role;
select pg_temp.assert_true(not exists(select 1 from public.cleanup_submissions where cleanup_attempt_id in(select id from public.cleanup_attempts where report_id='bc200000-0000-4000-8000-000000000001')),'issues never create completion/payout');
-- Finish the released access issue, then test team closure of a retained claim.
select set_config('request.jwt.claims','{"sub":"bc100000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false,"aal":"aal1"}',true);
set local role authenticated;
select public.reply_cleanup_issue('bc300000-0000-4000-8000-000000000003','bc400000-0000-4000-8000-000000000005',1,'Entrance has reopened.');
reset role;
select set_config('request.jwt.claims','{"sub":"bc100000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false,"aal":"aal1"}',true);
set local role authenticated;
select public.resolve_cleanup_issue('bc300000-0000-4000-8000-000000000003',2);
select public.claim_cleanup('bc200000-0000-4000-8000-000000000001');
select public.open_cleanup_issue((select id from public.cleanup_attempts where report_id='bc200000-0000-4000-8000-000000000001' and status='claimed'),'bc300000-0000-4000-8000-000000000004','missing','Litter was already removed.',true);
select pg_temp.expect_error($q$select public.decide_cleanup_issue('bc300000-0000-4000-8000-000000000004',1,'bc700000-0000-4000-8000-000000000003','closed','Litter is gone.')$q$,'cleanup_admin_required');
reset role;
select set_config('request.jwt.claims','{"sub":"bc100000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":false,"aal":"aal1"}',true);
set local role authenticated;
select pg_temp.expect_error($q$select public.decide_cleanup_issue('bc300000-0000-4000-8000-000000000004',1,'bc700000-0000-4000-8000-000000000003','closed','Litter is gone.')$q$,'cleanup_admin_required');
reset role;
select set_config('request.jwt.claims','{"sub":"bc100000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":false,"aal":"aal2"}',true);
set local role authenticated;
select public.decide_cleanup_issue('bc300000-0000-4000-8000-000000000004',1,'bc700000-0000-4000-8000-000000000003','closed','Reporter confirmed the litter was already removed.');
select public.decide_cleanup_issue('bc300000-0000-4000-8000-000000000004',1,'bc700000-0000-4000-8000-000000000003','closed','Reporter confirmed the litter was already removed.');
reset role;
select pg_temp.assert_true((select status='resolved' and review_outcome='closed' from public.cleanup_issues where id='bc300000-0000-4000-8000-000000000004'),'closure is recorded privately');
select pg_temp.assert_true((select cancelled_at is not null and cleanup_state='available' and not cleanup_issue_hold and funded_amount_cents=0 from public.reports where id='bc200000-0000-4000-8000-000000000001'),'closed report is not a completed cleanup');
select pg_temp.assert_true((select bool_and(status='refund_pending' and cleanup_attempt_id is null and principal_amount_cents=3500 and total_amount_cents=3850) from public.cleanup_contributions where report_id='bc200000-0000-4000-8000-000000000001'),'closure queues full original contribution for refund');
select pg_temp.assert_true(not exists(select 1 from public.cleanup_attempts where report_id='bc200000-0000-4000-8000-000000000001' and (status='completed' or payout_status='paid')),'closure never creates reward');

-- The push worker alone may resolve a private issue destination; legacy queue return type stays unchanged.
select pg_temp.assert_true(not has_function_privilege('anon','public.cleanup_issue_push_context(uuid[])','EXECUTE'),'anonymous cannot read issue push destinations');
select pg_temp.assert_true(not has_function_privilege('authenticated','public.cleanup_issue_push_context(uuid[])','EXECUTE'),'members cannot read service push destinations');
select pg_temp.assert_true(has_function_privilege('service_role','public.cleanup_issue_push_context(uuid[])','EXECUTE'),'worker can resolve push destinations');
set local role service_role;
select pg_temp.assert_true((select count(*)>0 from public.cleanup_issue_push_context(array(select id from public.cleanup_notifications where report_id='bc200000-0000-4000-8000-000000000001'))),'worker can look up generated issue events');
select pg_temp.assert_true(not exists(select 1 from public.cleanup_issue_push_context(array(select id from public.cleanup_notifications where report_id='bc200000-0000-4000-8000-000000000001')) c join public.cleanup_notifications n on n.id=c.notification_id where c.issue_id is distinct from n.issue_id or n.event_type not like 'cleanup_issue_%'),'worker gets only the correct private issue identity');
reset role;
rollback;
