begin;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at) values
  ('91000000-0000-4000-8000-000000000021', 'credit-a@example.test', false, '{}', now()),
  ('91000000-0000-4000-8000-000000000022', 'credit-b@example.test', false, '{}', now());
insert into public.profiles (id, display_name) values
  ('91000000-0000-4000-8000-000000000021', 'Named Contributor'),
  ('91000000-0000-4000-8000-000000000022', 'Private Contributor')
on conflict (id) do update set display_name = excluded.display_name;
insert into public.reports (id,user_id,title,latitude,longitude,photo_paths,expires_at)
values ('92000000-0000-4000-8000-000000000021','91000000-0000-4000-8000-000000000021','Contribution visibility',35,-78,
  array['91000000-0000-4000-8000-000000000021/report/photo.jpg'], now()+interval '30 days');
update public.reports set funding_eligibility='eligible' where id='92000000-0000-4000-8000-000000000021';
update public.cleanup_feature_flags set enabled = true where name in ('payments_enabled','gemini_financial_review_enabled');
update public.cleanup_pricing_config set pricing_version=2;

set local role service_role;
do $$
declare
  report constant uuid := '92000000-0000-4000-8000-000000000021';
  donor constant uuid := '91000000-0000-4000-8000-000000000021';
  other_donor constant uuid := '91000000-0000-4000-8000-000000000022';
  request constant uuid := '93000000-0000-4000-8000-000000000021';
  named public.cleanup_contributions;
  retried public.cleanup_contributions;
  private_gift public.cleanup_contributions;
  legacy public.cleanup_contributions;
begin
  named := public.reserve_named_cleanup_contribution(report,donor,request,500,2,null,true);
  retried := public.reserve_named_cleanup_contribution(report,donor,request,500,2,null,false);
  assert named.id = retried.id and retried.show_contributor_name, 'checkout retries keep the original choice';
  assert named.total_amount_cents = 600, 'checkout visibility does not change the total';
  private_gift := public.reserve_named_cleanup_contribution(report,other_donor,gen_random_uuid(),500,2,null,false);
  legacy := public.reserve_cleanup_contribution(report,other_donor,gen_random_uuid(),500,2);
  assert not private_gift.show_contributor_name and legacy.show_contributor_name is null;
  update public.cleanup_contributions set status='succeeded', succeeded_at=now(), auto_refund_due_at=now()+interval '23 months'
    where id in (named.id, private_gift.id, legacy.id);
  perform set_config('test.named_contribution', named.id::text, true);
end;
$$;
reset role;

set local role anon;
do $$
declare credit record;
begin
  select * into strict credit from public.cleanup_contributor_credits(array['92000000-0000-4000-8000-000000000021']::uuid[]);
  assert credit.names = array['Named Contributor', 'Private Contributor'] and credit.anonymous_count = 1, 'names are shown by default and explicit anonymity is honored';
  assert jsonb_array_length(credit.donations) = 3, 'each donation has its own entry';
  assert not exists (
    select 1 from jsonb_array_elements(credit.donations) gift
    where (gift->>'amountCents')::integer <> 500 or (gift->>'donatedAt')::timestamptz is null
  ), 'donations include the cleanup amount and payment confirmation time';
  assert exists (
    select 1 from jsonb_array_elements(credit.donations) gift where gift->>'name' is null
  ), 'anonymous gifts expose no donor name';
  assert not has_function_privilege('anon','public.set_cleanup_contributor_visibility(uuid,boolean)','execute');
  assert not has_table_privilege('anon','public.cleanup_contributions','select');
end;
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000022","role":"authenticated","is_anonymous":false}',true);
do $$ begin
  assert not public.set_cleanup_contributor_visibility(current_setting('test.named_contribution')::uuid,false), 'another donor cannot hide the name';
end $$;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000021","role":"authenticated","is_anonymous":false}',true);
do $$ begin
  assert public.set_cleanup_contributor_visibility(current_setting('test.named_contribution')::uuid,false), 'the donor can hide their name';
end $$;
reset role;

-- A donor may restore their name, including after payout. Neither guest accounts
-- nor non-final or refunded payments may use this mutation.
set local role authenticated;
do $$ begin
  assert public.set_cleanup_contributor_visibility(current_setting('test.named_contribution')::uuid,true), 'the donor can show their name again';
end $$;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000021","role":"authenticated","is_anonymous":true}',true);
do $$ begin
  assert not public.set_cleanup_contributor_visibility(current_setting('test.named_contribution')::uuid,false), 'a guest account cannot change a name';
end $$;
reset role;
update public.cleanup_contributions set status='payment_pending' where id=current_setting('test.named_contribution')::uuid;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000021","role":"authenticated","is_anonymous":false}',true);
do $$ begin
  assert not public.set_cleanup_contributor_visibility(current_setting('test.named_contribution')::uuid,false), 'a pending payment cannot change a name';
end $$;
reset role;
update public.cleanup_contributions set status='paid_out' where id=current_setting('test.named_contribution')::uuid;
set local role authenticated;
do $$ begin
  assert public.set_cleanup_contributor_visibility(current_setting('test.named_contribution')::uuid,false), 'a paid-out donor can hide their name';
  assert not public.set_cleanup_contributor_visibility(current_setting('test.named_contribution')::uuid,null), 'a missing choice is rejected';
end $$;
reset role;
update public.cleanup_contributions set status='refunded',refunded_at=now() where id=current_setting('test.named_contribution')::uuid;
set local role authenticated;
do $$ begin
  assert not public.set_cleanup_contributor_visibility(current_setting('test.named_contribution')::uuid,true), 'refunded donations cannot change visibility';
end $$;
reset role;
update public.cleanup_contributions set status='succeeded',refunded_at=null where id=current_setting('test.named_contribution')::uuid;

do $$
declare credit record;
begin
  select * into strict credit from public.cleanup_contributor_credits(array['92000000-0000-4000-8000-000000000021']::uuid[]);
  assert credit.names = array['Private Contributor'] and credit.anonymous_count = 2, 'the hidden name is removed';
  assert not exists (
    select 1 from jsonb_array_elements(credit.donations) gift where gift->>'name' = 'Named Contributor'
  ), 'hiding a name removes it from donation entries too';
  assert (select total_amount_cents=600 and status='succeeded' from public.cleanup_contributions where id=current_setting('test.named_contribution')::uuid), 'name visibility leaves the payment intact';
  update public.reports set cancelled_at=now() where id='92000000-0000-4000-8000-000000000021';
  assert not exists(select 1 from public.cleanup_contributor_credits(array['92000000-0000-4000-8000-000000000021']::uuid[])), 'unavailable reports do not expose credit';
end;
$$;

rollback;
