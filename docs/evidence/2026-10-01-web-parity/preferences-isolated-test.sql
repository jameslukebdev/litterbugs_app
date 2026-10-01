-- Run only against the dedicated disposable fixture database, after the migration.
-- Bootstrap uses two synthetic auth users and one report, not production data.
\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$
declare result jsonb;
begin
 result := public.sync_report_preferences(auth.uid(), '[{"reportId":"11111111-1111-4111-8111-111111111111","kind":"favorites"}]', '[]');
 assert jsonb_array_length(result->'favorites') = 1, 'import missing';
 result := public.sync_report_preferences(auth.uid(), '[]', '[{"id":"44444444-4444-4444-8444-444444444444","reportId":"11111111-1111-4111-8111-111111111111","kind":"favorites","enabled":false}]');
 assert jsonb_array_length(result->'favorites') = 0, 'removal missing';
 result := public.sync_report_preferences(auth.uid(), '[{"reportId":"11111111-1111-4111-8111-111111111111","kind":"favorites"}]','[]');
 assert jsonb_array_length(result->'favorites') = 0, 'old import resurrected favorite';
 result := public.sync_report_preferences(auth.uid(), '[]', '[{"id":"55555555-5555-4555-8555-555555555555","reportId":"11111111-1111-4111-8111-111111111111","kind":"favorites","enabled":true}]');
 result := public.sync_report_preferences(auth.uid(), '[]', '[{"id":"44444444-4444-4444-8444-444444444444","reportId":"11111111-1111-4111-8111-111111111111","kind":"favorites","enabled":false}]');
 assert jsonb_array_length(result->'favorites') = 1, 'retry overwrote newer operation';
 begin
  perform public.sync_report_preferences(auth.uid(), '[]', '[{"id":"44444444-4444-4444-8444-444444444444","reportId":"11111111-1111-4111-8111-111111111111","kind":"favorites","enabled":true}]');
  raise exception 'operation mismatch allowed';
 exception when check_violation then null; end;
 begin
  perform public.sync_report_preferences('33333333-3333-4333-8333-333333333333','[]','[]');
  raise exception 'account switch allowed cross-account batch';
 exception when insufficient_privilege then null; end;
 begin
  update public.report_preferences set enabled=false;
  raise exception 'direct update allowed';
 exception when insufficient_privilege then null; end;
 assert not has_table_privilege('authenticated','private.report_preference_operations','SELECT'), 'ledger exposed';
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
do $$ begin
 assert (select count(*) from public.report_preferences) = 0, 'cross-user RLS leak';
 assert jsonb_array_length(public.sync_report_preferences(auth.uid(),'[]','[]')->'favorites') = 0, 'cross-user RPC leak';
end $$;
select set_config('request.jwt.claim.is_anonymous','true',false);
do $$ begin
 begin
  perform public.sync_report_preferences(auth.uid(),'[]','[]');
  raise exception 'anonymous mutation allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 assert not has_function_privilege('anon','public.sync_report_preferences(uuid,jsonb,jsonb)','execute'), 'anon function grant';
end $$;
delete from public.reports where id='11111111-1111-4111-8111-111111111111';
do $$ begin assert (select count(*) from public.report_preferences)=0, 'report delete not cascaded'; end $$;
delete from auth.users where id='22222222-2222-4222-8222-222222222222';
do $$ begin assert (select count(*) from private.report_preference_operations)=0, 'account delete ledger leak'; end $$;
select 'PREFERENCES_ISOLATED_SECURITY_AND_RETRY_PASS';
