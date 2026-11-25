-- Minimal isolated schema for the actual recurrence and existing publication SQL.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema private;
create schema storage;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function public.is_permanent_user() returns boolean language sql stable as $$select auth.uid() is not null and coalesce(current_setting('request.jwt.claim.anonymous',true),'false') <> 'true'$$;
create table storage.objects(bucket_id text,name text);
create table public.reports(
 id uuid primary key default gen_random_uuid(), user_id uuid, title text, latitude float8,longitude float8,
 litter_types text[],types text,severity text,notes_presets text[],notes_other text,
 created_at timestamptz default now(), expires_at timestamptz default now()+interval '30 days',
 cleanup_state text not null default 'available', is_published boolean not null default true,
 is_sample boolean not null default false, moderated_at timestamptz, cancelled_at timestamptz,expired_at timestamptz,
 photo_paths text[] default '{}', renewal_status text default 'active',funded_amount_cents int default 0,
 funding_eligibility text default 'pending',funding_locked_at timestamptz
);
alter table public.reports enable row level security;
create policy public_reports on public.reports for select using(moderated_at is null and (is_published or user_id=auth.uid()));
create policy owner_insert on public.reports for insert to authenticated with check(user_id=auth.uid() and public.is_permanent_user());
create policy owner_update on public.reports for update to authenticated using(user_id=auth.uid() and public.is_permanent_user());
grant usage on schema auth,private to anon,authenticated;
grant select on public.reports to anon,authenticated;
grant insert(id,user_id,title,latitude,longitude,litter_types,types,severity,notes_presets,notes_other,is_published,photo_paths),update(title,is_published,photo_paths) on public.reports to authenticated;
create table public.cleanup_contributions(id uuid primary key,report_id uuid references public.reports(id),amount_cents int,show_name boolean);
create table public.reporter_rewards(id uuid primary key,report_id uuid references public.reports(id),user_id uuid,amount_cents int);
create table public.cleanup_attempts(id uuid primary key,report_id uuid references public.reports(id),cleaner_id uuid,status text,reward_amount_cents int);
insert into public.reports(id,user_id,title,latitude,longitude,cleanup_state,funded_amount_cents,funding_eligibility,photo_paths) values
 ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Greenway Trail',36.2185,-81.655,'completed',3500,'eligible',array['old/photo.jpg']);
insert into public.cleanup_contributions values('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',3500,false);
insert into public.reporter_rewards values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',100);
insert into public.cleanup_attempts values('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','completed',3500);
