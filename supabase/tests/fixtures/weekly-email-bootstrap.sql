create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema private;
create table auth.users(id uuid primary key,email text,is_anonymous boolean default false,raw_app_meta_data jsonb default '{}',email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade, display_name text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function private.require_cleanup_admin() returns uuid language plpgsql stable security definer set search_path='' as $$ begin
 if auth.uid() <> '00000000-0000-4000-8000-000000000001'::uuid or auth.uid() is null or current_setting('request.jwt.claim.aal',true) <> 'aal2' then raise exception 'cleanup_admin_mfa_required' using errcode='42501'; end if;
 return auth.uid(); end; $$;
grant usage on schema auth to authenticated,service_role;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000001','admin@example.com',now()),
 ('00000000-0000-4000-8000-000000000002','alex@example.com',now());
insert into public.profiles values ('00000000-0000-4000-8000-000000000002','Alex');
