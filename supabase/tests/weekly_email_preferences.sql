-- Run against a disposable database after the prepared migration. Rolls back all fixtures.
begin;
create function pg_temp.expect_denied(command text) returns void language plpgsql as $$
begin
  begin execute command; exception when insufficient_privilege then return; end;
  raise exception 'Expected permission denied: %',command;
end; $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claim.aal','aal1',true);
set local role authenticated;
do $$ begin
  assert (public.get_weekly_email_preferences()->>'subscribed')::boolean, 'existing default';
  assert not (public.set_weekly_email_preference(false)->>'subscribed')::boolean, 'save off';
  assert not (public.get_weekly_email_preferences()->>'subscribed')::boolean, 'persist off';
  perform pg_temp.expect_denied('select * from private.weekly_email_preferences');
  perform pg_temp.expect_denied('select public.admin_weekly_email_recipients()');
  perform pg_temp.expect_denied($q$select public.unsubscribe_weekly_email('other@example.com',repeat('a',64))$q$);
end $$;
reset role;
do $$ declare events bigint; begin
 select count(*) into events from private.weekly_email_preference_events;
 perform public.set_weekly_email_preference(false);
 assert (select count(*) from private.weekly_email_preference_events)=events,'idempotent preference';
end $$;
-- Changing the account email must preserve withdrawal.
update auth.users set email='changed@example.com' where id='00000000-0000-4000-8000-000000000002';
do $$ begin assert not (public.get_weekly_email_preferences()->>'subscribed')::boolean,'email change cannot re-enroll'; end $$;
select set_config('request.jwt.claim.sub','',true);
set local role service_role;
select public.unsubscribe_weekly_email(' FUTURE@EXAMPLE.COM ',repeat('a',64));
select public.unsubscribe_weekly_email('unknown@example.com',repeat('a',64));
reset role;
insert into auth.users(id,email,is_anonymous,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000003','future@example.com',false,now()),
 ('00000000-0000-4000-8000-000000000004','new@example.com',false,now()),
 ('00000000-0000-4000-8000-000000000005',null,true,null),
 ('00000000-0000-4000-8000-000000000006','unconfirmed@example.com',false,null);
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values
 ('00000000-0000-4000-8000-000000000007','review@example.com',now(),'{"review_account":true}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
set local role authenticated;
do $$ begin assert not (public.get_weekly_email_preferences()->>'subscribed')::boolean,'prior suppression survives signup'; end $$;
reset role;
delete from auth.users where id='00000000-0000-4000-8000-000000000003';
insert into auth.users(id,email,email_confirmed_at) values ('00000000-0000-4000-8000-000000000003','future@example.com',now());
do $$ begin assert not (public.get_weekly_email_preferences()->>'subscribed')::boolean,'account recreation preserves withdrawal'; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',true);
set local role authenticated;
do $$ begin assert (public.get_weekly_email_preferences()->>'subscribed')::boolean,'new account defaults on'; end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',true);
set local role authenticated;
select pg_temp.expect_denied('select public.get_weekly_email_preferences()');
select pg_temp.expect_denied('select public.set_weekly_email_preference(true)');
reset role;
insert into auth.users(id,email,email_confirmed_at,banned_until,deleted_at) values
 ('00000000-0000-4000-8000-000000000008','suspended@example.com',now(),now()+interval '1 day',null),
 ('00000000-0000-4000-8000-000000000009','deleted@example.com',now(),null,now());
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.expect_denied('select public.admin_weekly_email_recipients()');
select set_config('request.jwt.claim.aal','aal2',true);
do $$ declare audience jsonb; begin
 audience:=public.admin_weekly_email_recipients();
 assert jsonb_array_length(audience)=4,'exclude anonymous, review, unconfirmed, suspended and deleted users';
 assert not exists(select 1 from jsonb_array_elements(audience) r where r->>'email'='unknown@example.com'),'no enumeration of unknown suppression';
 assert exists(select 1 from jsonb_array_elements(audience) r where r->>'email'='new@example.com' and (r->>'subscribed')::boolean),'new account eligible';
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role service_role;
do $$ begin
 for n in 1..30 loop perform public.unsubscribe_weekly_email('ratelimit@example.com',repeat('b',64)); end loop;
 begin
   perform public.unsubscribe_weekly_email('ratelimit@example.com',repeat('b',64));
   raise exception 'rate limit failed' using errcode='XX000';
 exception when sqlstate 'P0001' then null; end;
end $$;
reset role;
set local role anon;
select pg_temp.expect_denied('select public.get_weekly_email_preferences()');
select pg_temp.expect_denied('select public.admin_weekly_email_recipients()');
select pg_temp.expect_denied($q$select public.unsubscribe_weekly_email('a@example.com',repeat('a',64))$q$);
reset role;
rollback;
