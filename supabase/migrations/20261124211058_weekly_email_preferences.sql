-- Prepared only: do not apply until the website/backend release is authorized.
-- A default subscription records eligibility, not affirmative marketing consent.
-- No sending service, queue, cron, or email delivery is enabled here.
create table private.weekly_email_preferences (
  address_hash text primary key check (address_hash ~ '^[0-9a-f]{64}$'),
  subscribed boolean not null default true,
  source text not null check (source in ('existing_default','signup_default','email_change','account_preference','public_unsubscribe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table private.weekly_email_preference_events (
  id bigint generated always as identity primary key,
  address_hash text not null references private.weekly_email_preferences(address_hash),
  subscribed boolean not null,
  source text not null,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index weekly_email_events_address_idx on private.weekly_email_preference_events(address_hash, created_at);
create table private.weekly_email_unsubscribe_limits (
  request_key text primary key check (request_key ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  attempts integer not null default 1
);
alter table private.weekly_email_preferences enable row level security;
alter table private.weekly_email_preference_events enable row level security;
alter table private.weekly_email_unsubscribe_limits enable row level security;
revoke all on private.weekly_email_preferences, private.weekly_email_preference_events, private.weekly_email_unsubscribe_limits from public, anon, authenticated, service_role;

create function private.weekly_email_hash(address text) returns text
language sql immutable strict set search_path = ''
as $$ select encode(extensions.digest(lower(btrim(address)), 'sha256'), 'hex') $$;
revoke all on function private.weekly_email_hash(text) from public, anon, authenticated, service_role;

create function private.log_weekly_email_preference() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'INSERT' or old.subscribed is distinct from new.subscribed then
    insert into private.weekly_email_preference_events(address_hash, subscribed, source, actor_id)
    values (new.address_hash, new.subscribed, new.source, auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function private.log_weekly_email_preference() from public, anon, authenticated, service_role;
create trigger log_weekly_email_preference after insert or update on private.weekly_email_preferences
for each row execute function private.log_weekly_email_preference();

insert into private.weekly_email_preferences(address_hash, source)
select distinct private.weekly_email_hash(u.email), 'existing_default' from auth.users u
where not coalesce(u.is_anonymous,false) and nullif(btrim(u.email),'') is not null
on conflict do nothing;

create function private.initialize_weekly_email_preference() returns trigger
language plpgsql security definer set search_path = '' as $$
declare wants_email boolean := true;
begin
  if coalesce(new.is_anonymous,false) or nullif(btrim(new.email),'') is null then return new; end if;
  if TG_OP = 'UPDATE' then
    select coalesce((select p.subscribed from private.weekly_email_preferences p
      where p.address_hash = private.weekly_email_hash(old.email)),true) into wants_email;
  end if;
  insert into private.weekly_email_preferences(address_hash, subscribed, source)
  values (private.weekly_email_hash(new.email), wants_email, case when wants_email then 'signup_default' else 'email_change' end)
  on conflict(address_hash) do update set subscribed=false, source='email_change', updated_at=now()
    where not wants_email and private.weekly_email_preferences.subscribed;
  return new;
end;
$$;
revoke all on function private.initialize_weekly_email_preference() from public, anon, authenticated, service_role;
create trigger initialize_weekly_email_preference after insert or update of email, is_anonymous on auth.users
for each row execute function private.initialize_weekly_email_preference();

create function private.my_weekly_email_preferences() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare address text; result jsonb;
begin
  select lower(btrim(u.email)) into address from auth.users u
    where u.id=auth.uid() and not coalesce(u.is_anonymous,false) and u.deleted_at is null;
  if nullif(address,'') is null then raise exception 'Sign in with an email account.' using errcode='42501'; end if;
  select jsonb_build_object('email',address,'subscribed',coalesce(p.subscribed,true),
    'source',coalesce(p.source,'signup_default'),'updated_at',p.updated_at) into result
    from (select 1) seed left join private.weekly_email_preferences p on p.address_hash=private.weekly_email_hash(address);
  return result;
end;
$$;
create function private.set_my_weekly_email_preference(target_subscribed boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare address text;
begin
  if target_subscribed is null then raise exception 'Choose on or off.' using errcode='22023'; end if;
  select lower(btrim(u.email)) into address from auth.users u
    where u.id=auth.uid() and not coalesce(u.is_anonymous,false) and u.deleted_at is null for update;
  if nullif(address,'') is null then raise exception 'Sign in with an email account.' using errcode='42501'; end if;
  insert into private.weekly_email_preferences(address_hash,subscribed,source)
    values(private.weekly_email_hash(address),target_subscribed,'account_preference')
  on conflict(address_hash) do update set subscribed=excluded.subscribed,source=excluded.source,updated_at=now()
    where private.weekly_email_preferences.subscribed is distinct from excluded.subscribed;
  return private.my_weekly_email_preferences();
end;
$$;
create function private.admin_weekly_email_recipients() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_cleanup_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('email',lower(btrim(u.email)),
    'name',coalesce(p.display_name,''),'subscribed',coalesce(pref.subscribed,true),
    'source',coalesce(pref.source,'signup_default'),'updated_at',pref.updated_at) order by lower(u.email))
    from auth.users u left join public.profiles p on p.id=u.id
    left join private.weekly_email_preferences pref on pref.address_hash=private.weekly_email_hash(u.email)
    where not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null and u.deleted_at is null
      and nullif(btrim(u.email),'') is not null and (u.banned_until is null or u.banned_until<=now())
      and coalesce(u.raw_app_meta_data->>'review_account','false') <> 'true'),'[]'::jsonb);
end;
$$;
-- Only the same-origin website POST endpoint, using its server secret, can call this.
-- An email address alone can unsubscribe; it can never subscribe or enumerate users.
create function private.unsubscribe_weekly_email(target_email text, target_request_key text) returns void
language plpgsql security definer set search_path = '' as $$
declare tries integer; address text := lower(btrim(target_email));
begin
  if address is null or length(address)>254 or address !~ '^[^[:space:]@,;<>"\x00-\x1f]+@[a-z0-9.-]+\.[a-z]{2,63}$'
    or target_request_key is null or target_request_key !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid unsubscribe request.' using errcode='22023';
  end if;
  delete from private.weekly_email_unsubscribe_limits where window_started_at < now()-interval '2 days';
  insert into private.weekly_email_unsubscribe_limits(request_key) values(target_request_key)
  on conflict(request_key) do update set
    attempts=case when private.weekly_email_unsubscribe_limits.window_started_at<now()-interval '1 hour' then 1 else private.weekly_email_unsubscribe_limits.attempts+1 end,
    window_started_at=case when private.weekly_email_unsubscribe_limits.window_started_at<now()-interval '1 hour' then now() else private.weekly_email_unsubscribe_limits.window_started_at end
  returning attempts into tries;
  if tries>30 then raise exception 'Please try again later.' using errcode='P0001'; end if;
  insert into private.weekly_email_preferences(address_hash,subscribed,source)
    values(private.weekly_email_hash(address),false,'public_unsubscribe')
  on conflict(address_hash) do update set subscribed=false,source=excluded.source,updated_at=now()
    where private.weekly_email_preferences.subscribed;
end;
$$;

-- The exposed functions are invokers; privileged bodies stay in the unexposed schema.
create function public.get_weekly_email_preferences() returns jsonb language sql security invoker set search_path=''
  as $$ select private.my_weekly_email_preferences() $$;
create function public.set_weekly_email_preference(target_subscribed boolean) returns jsonb language sql security invoker set search_path=''
  as $$ select private.set_my_weekly_email_preference(target_subscribed) $$;
create function public.admin_weekly_email_recipients() returns jsonb language sql security invoker set search_path=''
  as $$ select private.admin_weekly_email_recipients() $$;
create function public.unsubscribe_weekly_email(target_email text,target_request_key text) returns void language sql security invoker set search_path=''
  as $$ select private.unsubscribe_weekly_email(target_email,target_request_key) $$;
revoke all on function private.my_weekly_email_preferences(),private.set_my_weekly_email_preference(boolean),private.admin_weekly_email_recipients(),private.unsubscribe_weekly_email(text,text),
  public.get_weekly_email_preferences(),public.set_weekly_email_preference(boolean),public.admin_weekly_email_recipients(),public.unsubscribe_weekly_email(text,text)
  from public,anon,authenticated,service_role;
grant usage on schema private to authenticated,service_role;
grant execute on function private.my_weekly_email_preferences(),private.set_my_weekly_email_preference(boolean),private.admin_weekly_email_recipients(),
  public.get_weekly_email_preferences(),public.set_weekly_email_preference(boolean),public.admin_weekly_email_recipients() to authenticated;
grant execute on function private.unsubscribe_weekly_email(text,text),public.unsubscribe_weekly_email(text,text) to service_role;
comment on table private.weekly_email_preferences is 'Address-hash suppression survives account recreation; defaults are not affirmative consent. No email delivery is enabled.';

notify pgrst, 'reload schema';
