-- Encrypted Apple credentials are never exposed to application clients.
-- A deletion queues revocation instead of cascading away the only usable token.
create table private.apple_authorization_tokens (
 owner_id uuid not null,
 client_id text not null,
 encrypted_token text not null,
 revocation_requested_at timestamptz,
 next_attempt_at timestamptz not null default now(),
 attempts integer not null default 0,
 last_error text,
 updated_at timestamptz not null default now(),
 primary key(owner_id,client_id)
);
alter table private.apple_authorization_tokens enable row level security;
revoke all on private.apple_authorization_tokens from public,anon,authenticated,service_role;

create function private.save_apple_authorization(target_owner uuid,target_client text,target_token text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from auth.users where id=target_owner for update;
 if not found then raise exception 'apple_account_unavailable'; end if;
 if target_client is null or length(target_client) not between 1 and 255 or target_token is null or length(target_token) not between 32 and 16000 then
  raise check_violation using message='apple_token_invalid'; end if;
 insert into private.apple_authorization_tokens(owner_id,client_id,encrypted_token)
 values(target_owner,target_client,target_token)
 on conflict(owner_id,client_id) do update set encrypted_token=excluded.encrypted_token,updated_at=now()
 where private.apple_authorization_tokens.revocation_requested_at is null;
 if not found then raise exception 'apple_revocation_already_requested'; end if;
end; $$;
create function public.save_apple_authorization(target_owner uuid,target_client text,target_token text)
returns void language sql security invoker set search_path='' as $$
 select private.save_apple_authorization(target_owner,target_client,target_token);
$$;

create function private.request_apple_revocation(target_owner uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare total integer;
begin
 update private.apple_authorization_tokens set revocation_requested_at=coalesce(revocation_requested_at,now()),next_attempt_at=now()
 where owner_id=target_owner;
 get diagnostics total=row_count;
 return total;
end; $$;
create function public.request_apple_revocation(target_owner uuid)
returns integer language sql security invoker set search_path='' as $$
 select private.request_apple_revocation(target_owner);
$$;
create function private.queue_deleted_apple_authorization()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.request_apple_revocation(old.id);
 return old;
end; $$;
create trigger queue_deleted_apple_authorization before delete on auth.users
 for each row execute function private.queue_deleted_apple_authorization();

-- A lease permits bounded retries if a worker stops after contacting Apple.
create function private.claim_apple_revocation(target_owner uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item private.apple_authorization_tokens%rowtype;
begin
 select * into item from private.apple_authorization_tokens
 where revocation_requested_at is not null and next_attempt_at<=now()
 and (target_owner is null or owner_id=target_owner)
 order by next_attempt_at for update skip locked limit 1;
 if not found then return null; end if;
 update private.apple_authorization_tokens set next_attempt_at=now()+interval '5 minutes',attempts=attempts+1
 where owner_id=item.owner_id and client_id=item.client_id;
 return to_jsonb(item);
end; $$;
create function public.claim_apple_revocation(target_owner uuid default null)
returns jsonb language sql security invoker set search_path='' as $$
 select private.claim_apple_revocation(target_owner);
$$;
create function private.finish_apple_revocation(target_owner uuid,target_client text,succeeded boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if succeeded then
  delete from private.apple_authorization_tokens where owner_id=target_owner and client_id=target_client and revocation_requested_at is not null;
 else
  update private.apple_authorization_tokens set last_error='apple_revocation_pending',
   next_attempt_at=now()+make_interval(secs=>least(86400,300*power(2,least(attempts,8)))::double precision)
  where owner_id=target_owner and client_id=target_client and revocation_requested_at is not null;
 end if;
end; $$;
create function public.finish_apple_revocation(target_owner uuid,target_client text,succeeded boolean)
returns void language sql security invoker set search_path='' as $$
 select private.finish_apple_revocation(target_owner,target_client,succeeded);
$$;

revoke all on function private.queue_deleted_apple_authorization() from public,anon,authenticated,service_role;
revoke all on function private.save_apple_authorization(uuid,text,text), private.request_apple_revocation(uuid),
 private.claim_apple_revocation(uuid),private.finish_apple_revocation(uuid,text,boolean),
 public.save_apple_authorization(uuid,text,text),public.request_apple_revocation(uuid),
 public.claim_apple_revocation(uuid),public.finish_apple_revocation(uuid,text,boolean)
 from public,anon,authenticated,service_role;
grant usage on schema private to service_role;
grant execute on function private.save_apple_authorization(uuid,text,text), private.request_apple_revocation(uuid),
 private.claim_apple_revocation(uuid),private.finish_apple_revocation(uuid,text,boolean),
 public.save_apple_authorization(uuid,text,text),public.request_apple_revocation(uuid),
 public.claim_apple_revocation(uuid),public.finish_apple_revocation(uuid,text,boolean) to service_role;
