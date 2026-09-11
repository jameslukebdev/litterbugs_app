begin;
insert into auth.users(id,email,is_anonymous) values('93000000-0000-4000-8000-000000000001','apple-storage@example.invalid',false);
set local role authenticated;
do $$ begin
 begin
  perform public.save_apple_authorization('93000000-0000-4000-8000-000000000001','qa-client',repeat('encrypted',10));
  raise exception 'Member could write Apple tokens';
 exception when insufficient_privilege then null; end;
 begin
  perform public.claim_apple_revocation(null);
  raise exception 'Member could read Apple tokens';
 exception when insufficient_privilege then null; end;
end; $$;
reset role;
set local role service_role;
select public.save_apple_authorization('93000000-0000-4000-8000-000000000001','qa-client',repeat('encrypted',10));
do $$ begin
 if public.claim_apple_revocation(null) is not null then raise exception 'Active authorization was queued'; end if;
end; $$;
reset role;
delete from auth.users where id='93000000-0000-4000-8000-000000000001';
set local role service_role;
do $$ declare item jsonb; begin
 item:=public.claim_apple_revocation('93000000-0000-4000-8000-000000000001');
 if item->>'client_id' is distinct from 'qa-client' then raise exception 'Deletion lost revocation token'; end if;
 if public.claim_apple_revocation('93000000-0000-4000-8000-000000000001') is not null then raise exception 'Revocation lease did not hold'; end if;
end; $$;
select public.finish_apple_revocation('93000000-0000-4000-8000-000000000001','qa-client',false);
reset role;
do $$ begin
 if not exists(select 1 from private.apple_authorization_tokens where owner_id='93000000-0000-4000-8000-000000000001'
  and last_error='apple_revocation_pending' and next_attempt_at>now() and encrypted_token is not null) then
  raise exception 'Failed revocation was not retained for retry'; end if;
end; $$;
set local role service_role;
select public.finish_apple_revocation('93000000-0000-4000-8000-000000000001','qa-client',true);
reset role;
do $$ begin
 if exists(select 1 from private.apple_authorization_tokens where owner_id='93000000-0000-4000-8000-000000000001') then
  raise exception 'Successful revocation retained credential'; end if;
end; $$;
rollback;
