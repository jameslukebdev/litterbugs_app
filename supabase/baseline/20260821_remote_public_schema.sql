-- Read-only baseline captured from Supabase project mvaygkflcjswtwchflrk.
-- This is a snapshot for review, not a migration to reapply to the hosted project.

create schema if not exists public;

create or replace function public.delete_expired_reports()
returns void
language plpgsql
as $$
begin
  delete from reports
  where expires_at < now();
end;
$$;

create or replace function public.set_report_expiration()
returns trigger
language plpgsql
as $$
begin
  if new.expires_at is null then
    new.expires_at := new.created_at + interval '30 days';
  end if;
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid default auth.uid() not null,
  display_name text,
  created_at timestamptz default now() not null,
  constraint profiles_pkey primary key (id)
);

create table if not exists public.reports (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid(),
  title text,
  litter_types text[],
  notes_presets text[],
  notes_other text,
  severity text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz default now(),
  status text,
  photo_paths text[],
  expires_at timestamptz,
  types text,
  constraint reports_pkey primary key (id),
  constraint reports_user_id_fkey foreign key (user_id)
    references auth.users(id) on delete set null
);

comment on table public.reports is 'litter reports';

create index if not exists reports_user_id_idx
  on public.reports using btree (user_id);

create or replace trigger reports_set_expiration
  before insert on public.reports
  for each row execute function public.set_report_expiration();

alter table public.profiles enable row level security;
alter table public.reports enable row level security;

create policy "Public Can Read Reports"
  on public.reports for select
  using (true);

create policy "Users Can Delete Their Own Reports"
  on public.reports for delete
  using (auth.uid() = user_id);

create policy "Users Can Insert Their Own Reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

create policy "Users Can Update Their Own Reports"
  on public.reports for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on table public.profiles to postgres, anon, authenticated, service_role;
grant all on table public.reports to postgres, anon, authenticated, service_role;
grant all on function public.delete_expired_reports() to anon, authenticated, service_role;
grant all on function public.set_report_expiration() to anon, authenticated, service_role;
