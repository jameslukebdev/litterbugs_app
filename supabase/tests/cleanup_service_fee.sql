begin;
insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at)
values ('91000000-0000-4000-8000-000000000001', 'fee-test@example.com', false, '{}', now());
insert into public.profiles (id) values ('91000000-0000-4000-8000-000000000001') on conflict do nothing;
update public.cleanup_feature_flags set enabled = false;
insert into public.reports (id,user_id,title,latitude,longitude,photo_paths,expires_at)
values ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','Service fee test',35,-78,
array['91000000-0000-4000-8000-000000000001/report/test.jpg'],now()+interval '30 days');
update public.reports set funding_eligibility='eligible' where id='92000000-0000-4000-8000-000000000001';
update public.cleanup_feature_flags set enabled = true;
update public.cleanup_pricing_config set pricing_version=1;
do $$
declare c public.cleanup_contributions; d public.cleanup_contributions; cents bigint; expected_fee bigint;
begin
  c := public.create_cleanup_contribution_intent('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001',
    '93000000-0000-4000-8000-000000000001',500,'pi_legacy_fee_test');
  assert c.platform_fee_cents=50 and c.pricing_version=1 and c.total_amount_cents=550, 'legacy fee';
  update public.cleanup_pricing_config set pricing_version=2;
  d := public.reserve_cleanup_contribution(c.report_id,c.contributor_id,c.client_request_id,500,2);
  assert d.id=c.id and d.platform_fee_cents=50 and d.stripe_payment_intent_id='pi_legacy_fee_test', 'retry must retain legacy quote';
  begin
    perform public.reserve_cleanup_contribution(c.report_id,c.contributor_id,gen_random_uuid(),500,1);
    raise exception 'old client accepted';
  exception when check_violation then assert sqlerrm='cleanup_pricing_changed'; end;
  begin
    perform public.create_cleanup_contribution_intent(c.report_id,c.contributor_id,gen_random_uuid(),500,'pi_old_edge');
    raise exception 'old backend accepted';
  exception when check_violation then assert sqlerrm='cleanup_pricing_changed'; end;
  begin
    perform public.reserve_cleanup_contribution(c.report_id,c.contributor_id,c.client_request_id,1000,2);
    raise exception 'changed principal accepted';
  exception when check_violation then assert sqlerrm='cleanup_contribution_idempotency_mismatch'; end;
  foreach cents in array array[100,104,105,109,500,505,100000] loop
    expected_fee := case cents when 100 then 60 when 104 then 60 when 105 then 61 when 109 then 61 when 500 then 100 when 505 then 101 when 100000 then 10050 end;
    c := public.reserve_cleanup_contribution('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001',gen_random_uuid(),cents,2,'receipt@example.com');
    assert c.pricing_version=2 and c.platform_fee_cents=expected_fee and c.total_amount_cents=cents+expected_fee, 'v2 fee and total';
    assert c.stripe_payment_intent_id is null and c.stripe_receipt_email='receipt@example.com', 'reserve before Stripe';
    d := public.reserve_cleanup_contribution(c.report_id,c.contributor_id,c.client_request_id,cents,2);
    assert c.id=d.id, 'duplicate reservation';
    d := public.attach_cleanup_payment_intent(c.id,'pi_fee_'||c.id::text);
    assert d.stripe_payment_intent_id='pi_fee_'||c.id::text and d.stripe_receipt_email is null, 'email removed after attachment';
    begin
      perform public.attach_cleanup_payment_intent(c.id,'pi_different');
      raise exception 'different intent accepted';
    exception when check_violation then assert sqlerrm='cleanup_contribution_idempotency_mismatch'; end;
    begin
      update public.cleanup_contributions set platform_fee_cents=platform_fee_cents-50,total_amount_cents=total_amount_cents-50,pricing_version=1 where id=c.id;
      raise exception 'repricing accepted';
    exception when check_violation then assert sqlerrm='cleanup_contribution_pricing_immutable'; end;
  end loop;
  -- Finalization adds principal only; refund requests preserve the entire fee.
  perform public.finalize_cleanup_contribution('pi_fee_'||c.id::text,'ch_fee_test',true,null);
  assert (select funded_amount_cents=100000 from public.reports where id=c.report_id), 'cleaner gets full principal';
  assert (select total_amount_cents=110050 from public.cleanup_contributions where id=c.id), 'full refund amount';
  update public.cleanup_pricing_config set pricing_version=1;
  d := public.reserve_cleanup_contribution(c.report_id,c.contributor_id,c.client_request_id,c.principal_amount_cents,1);
  assert d.pricing_version=2 and d.total_amount_cents=c.total_amount_cents, 'rollback preserves existing charge';
  begin
    perform public.reserve_cleanup_contribution(c.report_id,c.contributor_id,gen_random_uuid(),100,2);
    raise exception 'stale v2 client accepted after rollback';
  exception when check_violation then assert sqlerrm='cleanup_pricing_changed'; end;
  foreach cents in array array[0,99,100001] loop
    begin
      perform public.reserve_cleanup_contribution(c.report_id,c.contributor_id,gen_random_uuid(),cents,1);
      raise exception 'invalid amount accepted';
    exception when check_violation then assert sqlerrm='cleanup_contribution_invalid'; end;
  end loop;
  perform private.close_expired_report(c.report_id, now(), null, 'system');
  assert (select status='refund_pending' and total_amount_cents=110050 from public.cleanup_contributions where id=c.id), 'refund includes combined service fee';
  perform public.mark_cleanup_refund_result(c.id,true,'re_fee_test',null);
  assert (select status='refunded' and platform_fee_cents=10050 from public.cleanup_contributions where id=c.id), 'refund retains fee ledger';
  assert not has_function_privilege('authenticated','public.reserve_cleanup_contribution(uuid,uuid,uuid,bigint,integer,text)','execute');
  assert not has_function_privilege('anon','public.attach_cleanup_payment_intent(uuid,text)','execute');
  assert not has_table_privilege('authenticated','public.cleanup_pricing_config','update');
  assert has_table_privilege('service_role','public.cleanup_pricing_config','select');
  assert not has_table_privilege('service_role','public.cleanup_pricing_config','update');
  assert not has_table_privilege('service_role','public.cleanup_pricing_config','delete');
end $$;
set local role service_role;
select id from public.reserve_cleanup_contribution('92000000-0000-4000-8000-000000000001',
 '91000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001',500,2);
reset role;
rollback;
