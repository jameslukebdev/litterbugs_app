-- Transaction-only tests against the owner-authorized unpaid reward. Never run without BEGIN/ROLLBACK.
begin;
do $$ declare a public.cleanup_attempts; r jsonb; notices int; cases int;
begin
  -- Isolate claims within this rolled-back transaction; cron cannot see these changes.
  update public.cleanup_attempts set payout_status='blocked' where payout_status in ('pending','processing');
  select * into a from public.cleanup_attempts where id='c89b35f2-df7b-4d24-8d57-932badce3416';
  assert a.id is not null, 'controlled approved cleanup exists';
  assert a.status='completed' and a.stripe_transfer_id is null, 'controlled reward remains unpaid';
  update public.cleanup_attempts set payout_status='pending',payout_attempts=0,
    payout_next_attempt_at=null,payout_attempt_started_at=null where id=a.id;
  select count(*) into notices from public.cleanup_notifications;
  select count(*) into cases from public.cleanup_admin_cases;
  r := public.claim_cleanup_payout_operation_v2();
  assert (r->>'id')::uuid=a.id and (r->>'payout_attempts')::int=1 and not (r->>'recovering')::boolean, 'fresh claim';
  assert public.claim_cleanup_payout_operation_v2() is null, 'no concurrent duplicate claim';
  perform public.defer_cleanup_payout_for_funds(a.id,1);
  assert (select payout_status='pending' and payout_next_attempt_at>now() and payout_attempt_started_at is null from public.cleanup_attempts where id=a.id), 'automatic waiting';
  assert public.claim_cleanup_payout_operation_v2() is null, 'cooldown respected';
  assert (select count(*) from public.cleanup_notifications)=notices, 'no failure notification';
  assert (select count(*) from public.cleanup_admin_cases)=cases, 'no urgent failure case';
  update public.cleanup_attempts set payout_next_attempt_at=now()-interval '1 second' where id=a.id;
  r := public.claim_cleanup_payout_operation_v2();
  assert (r->>'payout_attempts')::int=2 and not (r->>'recovering')::boolean, 'definite no-transfer retry gets new key';
  update public.cleanup_attempts set last_activity_at=now()-interval '6 minutes' where id=a.id;
  r := public.claim_cleanup_payout_operation_v2();
  assert (r->>'payout_attempts')::int=2 and (r->>'recovering')::boolean, 'uncertain recovery keeps key';
  begin
    perform public.defer_cleanup_payout_for_funds(a.id,1);
    raise exception 'stale worker changed a newer attempt';
  exception when check_violation then assert sqlerrm='cleanup_payout_wait_invalid_state'; end;
  update public.cleanup_attempts set payout_status='transferred',stripe_transfer_id='tr_fixture' where id=a.id;
  begin
    perform public.defer_cleanup_payout_for_funds(a.id,2);
    raise exception 'paid reward requeued';
  exception when check_violation then assert sqlerrm='cleanup_payout_wait_invalid_state'; end;
  update public.cleanup_attempts set payout_status='pending' where id=a.id;
  assert public.claim_cleanup_payout_operation_v2() is null, 'existing transfer cannot pay twice';
  update public.cleanup_attempts set stripe_transfer_id=null,financial_review_status='admin_review' where id=a.id;
  assert public.claim_cleanup_payout_operation_v2() is null, 'review hold retained';
  update public.cleanup_attempts set financial_review_status='passed',dispute_status='open',disputed_at=now(),dispute_reason='Fixture dispute' where id=a.id;
  assert public.claim_cleanup_payout_operation_v2() is null, 'disputed reward held';
  assert not has_function_privilege('authenticated','public.claim_cleanup_payout_operation_v2()','execute');
  assert not has_function_privilege('anon','public.defer_cleanup_payout_for_funds(uuid,integer)','execute');
  assert has_function_privilege('service_role','public.claim_cleanup_payout_operation_v2()','execute');
end $$;

rollback;
