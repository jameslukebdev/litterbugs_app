-- Financial integration assertions; every fixture and outgoing queue entry rolls back.
begin;
insert into auth.users (id,email,is_anonymous,raw_user_meta_data,created_at) values
 ('b1000000-0000-4000-8000-000000000001','reporter-reward@example.com',false,'{}',now()),
 ('b1000000-0000-4000-8000-000000000002','cleaner-reward@example.com',false,'{}',now());
insert into public.cleaner_payout_accounts (user_id,stripe_account_id,onboarding_status,payouts_enabled,country,age_18_confirmed_at)
 values ('b1000000-0000-4000-8000-000000000002','acct_reporter_test_cleaner','enabled',true,'US',now());
do $$
declare rid uuid; aid uuid; sid uuid; i int; owner_id uuid; result public.cleanup_attempts;
begin
  for i in 1..5 loop
    rid := ('b2000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    aid := ('b3000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
    sid := gen_random_uuid();
    owner_id := case when i=2 then 'b1000000-0000-4000-8000-000000000002'::uuid else 'b1000000-0000-4000-8000-000000000001'::uuid end;
    insert into public.reports(id,user_id,title,latitude,longitude,photo_paths,cleanup_state,funding_locked_at)
      values(rid,owner_id,'Reporter reward regression',35,-78,array['fixture.jpg'],'completion_submitted',now());
    insert into public.cleanup_attempts(id,report_id,cleaner_id,reporter_id,waiver_version,guidelines_version,
      status,is_self_cleanup,claimed_at,claim_expires_at,first_submitted_at,latest_submitted_at,review_due_at,
      is_paid,reward_amount_cents,financial_review_status,dispute_status,disputed_at,dispute_reason,payout_status)
    select aid,rid,'b1000000-0000-4000-8000-000000000002',owner_id,waiver_version,guidelines_version,
      'completion_submitted',i=2,now()-interval '3 days',now()-interval '2 days',now()-interval '49 hours',now()-interval '49 hours',
      case when i=4 then null else now()-interval '1 hour' end,
      true,500,case when i=4 then 'admin_review' else 'passed' end,case when i=3 then 'open' else 'none' end,
      case when i=3 then now() else null end,case when i=3 then 'Litter remains' else null end,'blocked'
    from public.cleanup_waiver_versions where is_active and retired_at is null limit 1;
    insert into public.cleanup_submissions(id,cleanup_attempt_id,submission_number,submitted_by,description)
      values(sid,aid,1,'b1000000-0000-4000-8000-000000000002','Cleanup evidence');
    insert into public.cleanup_submission_photos(submission_id,storage_path,display_order) values(sid,'fixture/'||sid||'.jpg',1);
    -- $5 eligible total split over two contributions; reward rounds once to 25c.
    insert into public.cleanup_contributions(report_id,cleanup_attempt_id,contributor_id,client_request_id,
      principal_amount_cents,platform_fee_cents,total_amount_cents,pricing_version,status,succeeded_at,auto_refund_due_at)
    select rid,aid,owner_id,gen_random_uuid(),250,case when i=5 then 25 else 100 end,
      case when i=5 then 275 else 350 end,case when i=5 then 1 else 2 end,'succeeded',now(),now()+interval '23 months'
    from generate_series(1,2);
    -- Failed or refunded contributions must not inflate the earned amount.
    insert into public.cleanup_contributions(report_id,cleanup_attempt_id,contributor_id,client_request_id,
      principal_amount_cents,platform_fee_cents,total_amount_cents,pricing_version,status,succeeded_at,auto_refund_due_at,refunded_at)
      values(rid,aid,owner_id,gen_random_uuid(),10000,2000,12000,2,'refunded',now(),now()+interval '23 months',now());
    result := private.auto_approve_cleanup(aid,now());
    if i in (1,2) then
      assert result.status='completed' and result.reward_amount_cents=500, 'cleaner retains full principal';
      assert (select amount_cents=25 and status='pending' from public.reporter_rewards where cleanup_attempt_id=aid), '5 percent, aggregate rounding';
      perform private.auto_approve_cleanup(aid,now());
      update public.cleanup_attempts set status=status where id=aid;
      assert (select count(*)=1 from public.reporter_rewards where cleanup_attempt_id=aid), 'no duplicate rewards';
    else
      assert not exists(select 1 from public.reporter_rewards where cleanup_attempt_id=aid), 'no reward for held or legacy funding';
    end if;
  end loop;
end $$;
-- Read and write privileges, including service-only queue operations.
set local role authenticated;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","is_anonymous":false}',true);
do $$ begin
  assert (select count(*)=1 from public.reporter_rewards), 'earnings private to owner';
  assert not has_table_privilege('authenticated','public.reporter_rewards','update'), 'clients cannot change rewards';
  assert not has_function_privilege('authenticated','public.claim_reporter_payout_operation()','execute');
  assert not has_function_privilege('anon','public.mark_reporter_payout_result(uuid,text,text,text,boolean)','execute');
end $$;
reset role;
set local role service_role;
do $$ declare r public.reporter_rewards;
begin
  r := public.claim_reporter_payout_operation(); assert r.cleanup_attempt_id is null, 'wait for cleaner transfer';
  perform public.mark_cleanup_payout_result('b3000000-0000-4000-8000-000000000001',true,'tr_cleaner_test1',null);
  r := public.claim_reporter_payout_operation(); assert r.cleanup_attempt_id is null, 'missing reporter account does not block cleaner';
  perform public.mark_cleanup_payout_result('b3000000-0000-4000-8000-000000000002',true,'tr_cleaner_test2',null);
  r := public.claim_reporter_payout_operation();
  assert r.cleanup_attempt_id='b3000000-0000-4000-8000-000000000002' and r.payout_attempts=1, 'self reporter uses same account';
  assert r.stripe_destination_id='acct_reporter_test_cleaner';
  r := public.claim_reporter_payout_operation(); assert r.cleanup_attempt_id is null, 'concurrent workers cannot claim twice';
  update public.reporter_rewards set updated_at=now()-interval '6 minutes' where cleanup_attempt_id='b3000000-0000-4000-8000-000000000002';
  r := public.claim_reporter_payout_operation(); assert r.payout_attempts=1, 'stale recovery keeps same idempotency key';
  perform public.mark_reporter_payout_result(r.cleanup_attempt_id,'transferred','tr_reporter_test2');
  perform public.mark_reporter_payout_result(r.cleanup_attempt_id,'transferred','tr_reporter_test2');
  assert (select count(*)=1 from public.cleanup_financial_audit where cleanup_attempt_id=r.cleanup_attempt_id and action='reporter_reward_transferred');
  perform public.mark_reporter_payout_result(r.cleanup_attempt_id,'reversed','tr_reporter_test2','Stripe transfer reversed; investigate.');
  perform public.mark_reporter_payout_result(r.cleanup_attempt_id,'transferred','tr_reporter_test2');
  assert (select status='failed' and retry_blocked from public.reporter_rewards where cleanup_attempt_id=r.cleanup_attempt_id), 'late events cannot undo reversal';
end $$;
reset role;
insert into public.cleaner_payout_accounts(user_id,stripe_account_id,onboarding_status,payouts_enabled,country,age_18_confirmed_at)
 values('b1000000-0000-4000-8000-000000000001','acct_reporter_test_owner','enabled',true,'US',now());
set local role service_role;
do $$ declare r public.reporter_rewards;
begin
  r := public.claim_reporter_payout_operation(); assert r.cleanup_attempt_id='b3000000-0000-4000-8000-000000000001', 'onboarding unlocks waiting reward';
  perform public.mark_reporter_payout_result(r.cleanup_attempt_id,'failed',null,'Insufficient funds');
end $$;
reset role;
insert into public.cleanup_admin_memberships(user_id,active) values('b1000000-0000-4000-8000-000000000001',true);
select set_config('test.reporter_case_id',(select id::text from public.cleanup_admin_cases where cleanup_attempt_id='b3000000-0000-4000-8000-000000000001' and case_type='payout_failure'),true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal2"}',true);
select public.resolve_cleanup_admin_case(current_setting('test.reporter_case_id')::uuid,'retry_payout','Balance replenished after review');
reset role;
set local role service_role;
do $$ declare r public.reporter_rewards;
begin
  r := public.claim_reporter_payout_operation(); assert r.payout_attempts=2, 'definite failure retry uses new key';
  assert (select payout_status='transferred' from public.cleanup_attempts where id=r.cleanup_attempt_id), 'retry never repays cleaner';
  begin
    perform public.prepare_funded_cleanup_account_deletion('b1000000-0000-4000-8000-000000000001');
    raise exception 'Unpaid reporter earnings were erased';
  exception when check_violation then assert sqlerrm='cleanup_payout_must_finish_before_account_deletion'; end;
  perform public.mark_reporter_payout_result(r.cleanup_attempt_id,'waiting_funds');
  r := public.claim_reporter_payout_operation(); assert r.cleanup_attempt_id is null, 'unsettled funds wait instead of tight retry';
  update public.reporter_rewards set next_attempt_at=now()-interval '1 second' where cleanup_attempt_id='b3000000-0000-4000-8000-000000000001';
  r := public.claim_reporter_payout_operation(); assert r.payout_attempts=3, 'available funds can be retried with fresh key';
end $$;
reset role;
rollback;
