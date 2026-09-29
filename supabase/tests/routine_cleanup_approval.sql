-- Run against the migrated schema. Every fixture and side effect rolls back.
begin;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at)
values
  ('a1000000-0000-4000-8000-000000000001', 'routine-owner@example.com', false, '{}', now()),
  ('a1000000-0000-4000-8000-000000000002', 'routine-cleaner@example.com', false, '{}', now()),
  ('a1000000-0000-4000-8000-000000000003', 'routine-funder@example.com', false, '{}', now()),
  ('a1000000-0000-4000-8000-000000000004', 'routine-refunded@example.com', false, '{}', now());

-- Synthetic device tokens and all outgoing queue work roll back with fixtures.
insert into public.push_devices(user_id,installation_id,expo_push_token,platform)
select uid,gen_random_uuid(),'ExponentPushToken[routine-'||uid::text||']','ios'
from (values ('a1000000-0000-4000-8000-000000000001'::uuid),
 ('a1000000-0000-4000-8000-000000000003'::uuid)) fixture(uid);

-- A private draft cannot send rejection or approval notices, even if a result
-- arrives before publication. An actual reviewed, published result still can.
insert into public.reports (id,user_id,title,latitude,longitude,photo_paths,is_published)
values ('a2000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001','Draft notification regression',35,-78,'{}',false);

do $$ begin
  if exists (select 1 from public.cleanup_notifications where report_id='a2000000-0000-4000-8000-000000000001') then
    raise exception 'An empty private draft sent a notification';
  end if;
end $$;

update public.reports set funding_eligibility='pending'
where id='a2000000-0000-4000-8000-000000000001';
update public.reports set funding_eligibility='eligible',original_photo_reviewed_at=now()
where id='a2000000-0000-4000-8000-000000000001';
do $$ begin
  if exists (select 1 from public.cleanup_notifications where report_id='a2000000-0000-4000-8000-000000000001') then
    raise exception 'An unpublished result sent a notification';
  end if;
end $$;

insert into storage.objects (bucket_id,name) values ('report_photos',
  'a1000000-0000-4000-8000-000000000001/a2000000-0000-4000-8000-000000000001/before.jpg');
update public.reports set is_published=true,
  photo_paths=array['a1000000-0000-4000-8000-000000000001/a2000000-0000-4000-8000-000000000001/before.jpg']
where id='a2000000-0000-4000-8000-000000000001';
update public.reports set funding_eligibility='ineligible'
where id='a2000000-0000-4000-8000-000000000001';
do $$ begin
  if exists (select 1 from public.cleanup_notifications where report_id='a2000000-0000-4000-8000-000000000001') then
    raise exception 'An unreviewed published transition sent a rejection';
  end if;
end $$;
update public.reports set funding_eligibility='pending' where id='a2000000-0000-4000-8000-000000000001';
update public.reports set funding_eligibility='eligible',original_photo_reviewed_at=now()
where id='a2000000-0000-4000-8000-000000000001';
update public.reports set funding_eligibility='safety_hold' where id='a2000000-0000-4000-8000-000000000001';
update public.reports set funding_eligibility='ineligible',original_photo_reviewed_at=now()
where id='a2000000-0000-4000-8000-000000000001';
do $$ begin
  if (select count(*) from public.cleanup_notifications where report_id='a2000000-0000-4000-8000-000000000001'
      and event_type in ('report_funding_approved','report_funding_rejected')) <> 2 then
    raise exception 'Genuine reviewed funding decisions were suppressed';
  end if;
end $$;

-- A new first paid claim retains that fact without a routine administrator hold.
update public.reports set funding_eligibility='eligible',original_photo_reviewed_at=now()
where id='a2000000-0000-4000-8000-000000000001';
insert into public.cleaner_payout_accounts (user_id,stripe_account_id,onboarding_status,payouts_enabled,country,age_18_confirmed_at)
values ('a1000000-0000-4000-8000-000000000002','acct_routine_regression','enabled',true,'US',now());
insert into public.cleanup_contributions (report_id,contributor_id,client_request_id,
  principal_amount_cents,platform_fee_cents,total_amount_cents,status,stripe_payment_intent_id,
  stripe_charge_id,succeeded_at,auto_refund_due_at)
values ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000001',500,50,550,'succeeded','pi_routine_regression',
  'ch_routine_regression',now(),now()+interval '23 months');

-- Repeated contributions get one completion notice; refunded contributions
-- and the cleaner's own contribution must not add duplicate/incorrect notices.
insert into public.cleanup_contributions(report_id,contributor_id,client_request_id,
 principal_amount_cents,platform_fee_cents,total_amount_cents,status,succeeded_at,auto_refund_due_at,refunded_at)
select 'a2000000-0000-4000-8000-000000000001',uid,gen_random_uuid(),500,50,550,status,
 now(),now()+interval '23 months',case when status='refunded' then now() else null end
from (values
 ('a1000000-0000-4000-8000-000000000003'::uuid,'succeeded'),
 ('a1000000-0000-4000-8000-000000000003'::uuid,'succeeded'),
 ('a1000000-0000-4000-8000-000000000002'::uuid,'succeeded'),
 ('a1000000-0000-4000-8000-000000000004'::uuid,'refunded')
) fixtures(uid,status);

set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","is_anonymous":false,"aal":"aal1"}',true);
select public.accept_cleanup_waiver(
 (select waiver_version from public.cleanup_waiver_versions where is_active and retired_at is null limit 1),
 (select guidelines_version from public.cleanup_waiver_versions where is_active and retired_at is null limit 1));
select public.claim_cleanup('a2000000-0000-4000-8000-000000000001');
reset role;

do $$ begin
  if not exists (select 1 from public.cleanup_attempts
      where report_id='a2000000-0000-4000-8000-000000000001'
      and first_paid_cleanup and first_paid_admin_status='not_required' and is_paid) then
    raise exception 'New first paid claim created an administrator hold';
  end if;
end $$;

-- Submit actual owned evidence through the existing RPC and pass photo review.
insert into storage.objects (bucket_id,name)
select 'cleanup_photos', 'a1000000-0000-4000-8000-000000000002/' || id::text ||
  '/a4000000-0000-4000-8000-000000000001/after.jpg'
from public.cleanup_attempts where report_id='a2000000-0000-4000-8000-000000000001';
set local role authenticated;
select public.submit_cleanup(
 (select id from public.cleanup_attempts where report_id='a2000000-0000-4000-8000-000000000001'),
 'a4000000-0000-4000-8000-000000000001','Removed the litter.',
 array[(select 'a1000000-0000-4000-8000-000000000002/' || id::text ||
 '/a4000000-0000-4000-8000-000000000001/after.jpg' from public.cleanup_attempts
 where report_id='a2000000-0000-4000-8000-000000000001')],1);
reset role;
select public.record_cleanup_ai_result(
 (select id from public.cleanup_ai_checks where submission_id='a4000000-0000-4000-8000-000000000001'),
 'passed','fixture',array['unique-cleanup-hash'],'The litter has been removed.','{}','{}');
do $$ begin
  if exists (select 1 from public.cleanup_admin_cases
      where report_id='a2000000-0000-4000-8000-000000000001' and case_type='first_paid_cleanup') then
    raise exception 'Passing first-paid evidence created a routine review case';
  end if;
end $$;

do $$ begin
  if exists(select 1 from public.cleanup_notifications where event_type='funded_cleanup_completed'
    and report_id='a2000000-0000-4000-8000-000000000001') then
    raise exception 'Contributor was notified before approval';
  end if;
end $$;

-- Test the legacy pending flag, which must not block an otherwise valid review.
update public.cleanup_attempts set first_paid_admin_status='pending'
where report_id='a2000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal1"}',true);
select public.review_cleanup(
 (select id from public.cleanup_attempts where report_id='a2000000-0000-4000-8000-000000000001'),
 'a4000000-0000-4000-8000-000000000001','approved',null,null);
reset role;
do $$ begin
  if not exists (select 1 from public.cleanup_attempts
      where report_id='a2000000-0000-4000-8000-000000000001'
      and status='completed' and payout_status='pending') then
    raise exception 'First paid reporter approval did not queue payout';
  end if;
end $$;

-- Reporter/funder and distinct contributor get a notice; cleaner already
-- has the existing approval notice. Repeated status writes do not send again.
update public.cleanup_attempts set status=status where report_id='a2000000-0000-4000-8000-000000000001';
do $$ begin
  if (select count(*) from public.cleanup_notifications where event_type='funded_cleanup_completed'
      and report_id='a2000000-0000-4000-8000-000000000001') <> 2 then
    raise exception 'Contributor completion recipient count incorrect';
  end if;
  if exists(select 1 from public.cleanup_notifications where event_type='funded_cleanup_completed'
    and user_id in ('a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000004')) then
    raise exception 'Cleaner or refunded-only user received contributor notice';
  end if;
end $$;

-- Respect admin membership and the existing alert preference. Routine first
-- cleanups and resolved cases never generate exception alerts.
insert into public.cleanup_admin_memberships(user_id,active,moderation_alerts_enabled) values
 ('a1000000-0000-4000-8000-000000000001',true,true),
 ('a1000000-0000-4000-8000-000000000002',true,false),
 ('a1000000-0000-4000-8000-000000000003',false,true);
do $$
declare cid uuid; kind text;
begin
  foreach kind in array array['report_safety','gemini_review','dispute','refund_failure','payout_failure','first_paid_cleanup'] loop
    cid := gen_random_uuid();
    insert into public.cleanup_admin_cases(id,case_type,title) values(cid,kind,'Notification regression');
    update public.cleanup_admin_cases set status=status where id=cid;
    if (select count(*) from public.cleanup_notifications where admin_case_id=cid
      and event_type='admin_cleanup_needed' and user_id='a1000000-0000-4000-8000-000000000001')
      <> (case when kind='first_paid_cleanup' then 0 else 1 end) then
      raise exception 'Admin notice missing or duplicated for %',kind;
    end if;
    if exists(select 1 from public.cleanup_notifications where admin_case_id=cid
      and user_id in ('a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000003')) then
      raise exception 'Opted-out or inactive admin received alert';
    end if;
  end loop;
  cid := gen_random_uuid();
  insert into public.cleanup_admin_cases(id,case_type,status,title,resolved_at)
    values(cid,'payout_failure','resolved','Already handled',now());
  if exists(select 1 from public.cleanup_notifications where admin_case_id=cid) then
    raise exception 'Resolved case sent an alert';
  end if;
end $$;

-- Separate completion fixtures test expired-window holds without calling Stripe.
do $$
declare aid uuid; rid uuid; sid uuid; i integer; result public.cleanup_attempts;
begin
  for i in 1..4 loop
    rid := gen_random_uuid(); aid := gen_random_uuid(); sid := gen_random_uuid();
    insert into public.reports (id,user_id,title,latitude,longitude,photo_paths,cleanup_state,funding_locked_at)
    values (rid,'a1000000-0000-4000-8000-000000000001','Deadline regression',35,-78,array['fixture.jpg'],'completion_submitted',now());
    insert into public.cleanup_attempts (id,report_id,cleaner_id,reporter_id,waiver_version,guidelines_version,
      status,claimed_at,claim_expires_at,first_submitted_at,latest_submitted_at,review_due_at,
      is_paid,reward_amount_cents,first_paid_cleanup,first_paid_admin_status,financial_review_status,dispute_status,disputed_at,dispute_reason,payout_status)
    select aid,rid,'a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001',waiver_version,guidelines_version,
      'completion_submitted',now()-interval '3 days',now()-interval '2 days',now()-interval '49 hours',now()-interval '49 hours',
      case when i=3 then null else now()-interval '1 hour' end,
      true,500,true,case when i=4 then 'rejected' else 'pending' end,
      case when i=3 then 'admin_review' else 'passed' end,case when i=2 then 'open' else 'none' end,
      case when i=2 then now()-interval '2 hours' else null end,case when i=2 then 'Substantial litter remains.' else null end,'blocked'
    from public.cleanup_waiver_versions where is_active and retired_at is null limit 1;
    insert into public.cleanup_submissions (id,cleanup_attempt_id,submission_number,submitted_by,description)
    values (sid,aid,1,'a1000000-0000-4000-8000-000000000002','Cleanup evidence.');
    insert into public.cleanup_submission_photos (submission_id,storage_path,display_order)
    values (sid,'fixture/'||sid::text||'.jpg',1);
    if i=1 then
      insert into public.cleanup_contributions(report_id,cleanup_attempt_id,contributor_id,client_request_id,
        principal_amount_cents,platform_fee_cents,total_amount_cents,status,succeeded_at,auto_refund_due_at)
      values(rid,aid,'a1000000-0000-4000-8000-000000000003',gen_random_uuid(),500,50,550,'succeeded',now(),now()+interval '23 months');
    end if;
    if i=1 then
      result := private.auto_approve_cleanup(aid,now());
      if result.status <> 'completed' or result.payout_status <> 'pending' then
        raise exception 'Routine first-paid auto-approval failed';
      end if;
      perform private.auto_approve_cleanup(aid,now());
      if (select count(*) from public.cleanup_notifications where cleanup_attempt_id=aid and event_type='funded_cleanup_completed') <> 1 then
        raise exception 'Automatic approval did not send exactly one contributor notice';
      end if;
      if (select count(*) from public.cleanup_reviews where cleanup_attempt_id=aid) <> 1 then
        raise exception 'Repeated automatic approval duplicated the decision';
      end if;
    else
      result := private.auto_approve_cleanup(aid,now());
      if result.status <> 'completion_submitted' or result.payout_status <> 'blocked' then
        raise exception 'A real review/dispute/rejection hold was bypassed';
      end if;
      begin
        perform public.review_cleanup(aid,sid,'approved',null,null);
        raise exception 'Blocked review returned a misleading successful response';
      exception when check_violation then
        if sqlerrm <> 'paid_cleanup_review_not_ready' then raise; end if;
      end;
    end if;
  end loop;
end $$;

do $$ begin
  if exists (
    select 1 from public.cleanup_notifications n
    where n.event_type in ('funded_cleanup_completed','admin_cleanup_needed')
      and n.user_id in ('a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003')
      and not exists(select 1 from public.cleanup_notification_deliveries d
        join public.push_devices p on p.id=d.push_device_id
        where d.notification_id=n.id and p.user_id=n.user_id and d.status='pending')
  ) then raise exception 'New notice failed to enter the existing device-delivery queue'; end if;
end $$;

rollback;
