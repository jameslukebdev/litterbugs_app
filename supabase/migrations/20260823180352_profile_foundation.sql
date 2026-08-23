-- Version 2 mobile profile foundation, applied to the hosted project.
-- Profiles remain public identity records while authentication and private
-- account data continue to live in Supabase Auth.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.profiles
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists location text,
  add column if not exists provider_avatar_url text,
  add column if not exists avatar_path text,
  add column if not exists profile_completed_at timestamptz,
  add column if not exists reports_created_count integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

-- Normalize any pre-existing placeholder rows before constraints are applied.
update public.profiles
set
  display_name = nullif(left(btrim(display_name), 60), ''),
  username = nullif(lower(left(btrim(username), 30)), ''),
  bio = nullif(left(btrim(bio), 160), ''),
  location = nullif(left(btrim(location), 80), ''),
  avatar_path = nullif(btrim(avatar_path), ''),
  profile_completed_at = case
    when nullif(left(btrim(display_name), 60), '') is not null
      then coalesce(profile_completed_at, created_at)
    else null
  end;

alter table public.profiles
  drop constraint if exists profiles_id_fkey,
  add constraint profiles_id_fkey
    foreign key (id) references auth.users(id) on delete cascade,
  drop constraint if exists profiles_display_name_length_check,
  add constraint profiles_display_name_length_check check (
    display_name is null
    or (display_name = btrim(display_name) and char_length(display_name) between 1 and 60)
  ),
  drop constraint if exists profiles_username_format_check,
  add constraint profiles_username_format_check check (
    username is null
    or (
      username = lower(btrim(username))
      and char_length(username) between 3 and 30
      and username ~ '^[a-z0-9][a-z0-9._]*[a-z0-9]$'
    )
  ),
  drop constraint if exists profiles_username_reserved_check,
  add constraint profiles_username_reserved_check check (
    username is null
    or username <> all (array[
      'admin', 'administrator', 'litterbugs', 'moderator', 'official', 'support'
    ])
  ),
  drop constraint if exists profiles_bio_length_check,
  add constraint profiles_bio_length_check check (
    bio is null
    or (bio = btrim(bio) and char_length(bio) between 1 and 160)
  ),
  drop constraint if exists profiles_location_length_check,
  add constraint profiles_location_length_check check (
    location is null
    or (location = btrim(location) and char_length(location) between 1 and 80)
  ),
  drop constraint if exists profiles_avatar_path_check,
  add constraint profiles_avatar_path_check check (
    avatar_path is null or avatar_path = id::text || '/avatar'
  ),
  drop constraint if exists profiles_reports_created_count_check,
  add constraint profiles_reports_created_count_check check (reports_created_count >= 0);

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

create or replace function private.normalize_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.display_name := nullif(left(btrim(new.display_name), 60), '');
  new.username := nullif(lower(left(btrim(new.username), 30)), '');
  new.bio := nullif(left(btrim(new.bio), 160), '');
  new.location := nullif(left(btrim(new.location), 80), '');
  new.avatar_path := nullif(btrim(new.avatar_path), '');

  if old.profile_completed_at is not null and new.display_name is null then
    raise exception using
      errcode = '23514',
      message = 'display_name_required';
  end if;

  if new.profile_completed_at is null and new.display_name is not null then
    new.profile_completed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.normalize_profile_update() from public, anon, authenticated;

drop trigger if exists profiles_normalize_update on public.profiles;
create trigger profiles_normalize_update
  before update on public.profiles
  for each row execute function private.normalize_profile_update();

create or replace function private.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  seeded_name text;
  seeded_avatar text;
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;

  seeded_name := left(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'nickname'), '')
  ), 60);
  seeded_avatar := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'picture'), '')
  );

  insert into public.profiles (
    id,
    display_name,
    provider_avatar_url,
    profile_completed_at,
    created_at,
    updated_at
  ) values (
    new.id,
    seeded_name,
    seeded_avatar,
    case when seeded_name is not null then now() else null end,
    new.created_at,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_profile() from public, anon, authenticated;

drop trigger if exists profiles_on_auth_user_created on auth.users;
create trigger profiles_on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_profile();

-- Backfill permanent Auth users while preserving any profile data that may
-- already have been entered through an earlier client.
insert into public.profiles (
  id,
  display_name,
  provider_avatar_url,
  profile_completed_at,
  created_at,
  updated_at
)
select
  users.id,
  left(coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(users.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(users.raw_user_meta_data ->> 'nickname'), '')
  ), 60),
  coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(btrim(users.raw_user_meta_data ->> 'picture'), '')
  ),
  case
    when coalesce(
      nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(users.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(users.raw_user_meta_data ->> 'nickname'), '')
    ) is not null then users.created_at
    else null
  end,
  users.created_at,
  now()
from auth.users as users
where coalesce(users.is_anonymous, false) is false
on conflict (id) do update
set
  display_name = coalesce(public.profiles.display_name, excluded.display_name),
  provider_avatar_url = coalesce(
    public.profiles.provider_avatar_url,
    excluded.provider_avatar_url
  ),
  profile_completed_at = coalesce(
    public.profiles.profile_completed_at,
    case
      when coalesce(public.profiles.display_name, excluded.display_name) is not null
        then excluded.created_at
      else null
    end
  ),
  created_at = least(public.profiles.created_at, excluded.created_at);

-- Legacy anonymous ownership becomes deliberately unattributed. The report
-- itself and its public cleanup information remain available.
update public.reports as reports
set user_id = null
from auth.users as users
where reports.user_id = users.id
  and coalesce(users.is_anonymous, false);

alter table public.reports
  drop constraint if exists reports_user_id_fkey,
  add constraint reports_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete set null;

update public.profiles as profiles
set reports_created_count = counts.report_count
from (
  select reports.user_id, count(*)::integer as report_count
  from public.reports as reports
  where reports.user_id is not null
  group by reports.user_id
) as counts
where profiles.id = counts.user_id;

create or replace function private.increment_profile_report_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    update public.profiles
    set reports_created_count = reports_created_count + 1
    where id = new.user_id;
  end if;
  return new;
end;
$$;

revoke all on function private.increment_profile_report_count()
  from public, anon, authenticated;

drop trigger if exists reports_increment_profile_count on public.reports;
create trigger reports_increment_profile_count
  after insert on public.reports
  for each row execute function private.increment_profile_report_count();

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_pkey primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self_check check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_id_idx
  on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "Users can view their blocks" on public.user_blocks;
create policy "Users can view their blocks"
  on public.user_blocks
  for select
  to authenticated
  using (
    (select public.is_permanent_user())
    and blocker_id = (select auth.uid())
  );

drop policy if exists "Users can create their blocks" on public.user_blocks;
create policy "Users can create their blocks"
  on public.user_blocks
  for insert
  to authenticated
  with check (
    (select public.is_permanent_user())
    and blocker_id = (select auth.uid())
    and blocked_id <> (select auth.uid())
  );

drop policy if exists "Users can remove their blocks" on public.user_blocks;
create policy "Users can remove their blocks"
  on public.user_blocks
  for delete
  to authenticated
  using (
    (select public.is_permanent_user())
    and blocker_id = (select auth.uid())
  );

create table if not exists public.user_moderation_reports (
  id uuid not null default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  source_report_id uuid references public.reports(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  resolution text,
  constraint user_moderation_reports_pkey primary key (id),
  constraint user_moderation_reports_not_self_check check (
    reporter_id <> reported_user_id
  ),
  constraint user_moderation_reports_reason_check check (
    reason = any (array[
      'spam_or_misleading',
      'harassment_or_hate',
      'inappropriate_content',
      'impersonation',
      'safety_concern',
      'other'
    ])
  ),
  constraint user_moderation_reports_details_check check (
    (details is null or char_length(btrim(details)) between 1 and 500)
    and (reason <> 'other' or nullif(btrim(details), '') is not null)
  ),
  constraint user_moderation_reports_status_check check (
    status = any (array['pending', 'reviewed', 'actioned', 'dismissed'])
  )
);

create index if not exists user_moderation_reports_queue_idx
  on public.user_moderation_reports (status, created_at);
create index if not exists user_moderation_reports_reported_user_idx
  on public.user_moderation_reports (reported_user_id, created_at desc);

alter table public.user_moderation_reports enable row level security;

drop policy if exists "Users can submit moderation reports"
  on public.user_moderation_reports;
create policy "Users can submit moderation reports"
  on public.user_moderation_reports
  for insert
  to authenticated
  with check (
    (select public.is_permanent_user())
    and reporter_id = (select auth.uid())
    and reported_user_id <> (select auth.uid())
    and (
      source_report_id is null
      or exists (
        select 1
        from public.reports
        where reports.id = source_report_id
          and reports.user_id = reported_user_id
      )
    )
  );

-- Public profile reads and narrowly scoped owner updates. Profile creation,
-- deletion, system fields, and moderation state remain server-managed.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant update (display_name, username, bio, location, avatar_path)
  on table public.profiles to authenticated;

drop policy if exists "Public profiles are viewable" on public.profiles;
create policy "Public profiles are viewable"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles
  for update
  to authenticated
  using (
    (select public.is_permanent_user())
    and id = (select auth.uid())
  )
  with check (
    (select public.is_permanent_user())
    and id = (select auth.uid())
  );

revoke all on table public.user_blocks from anon, authenticated;
grant select, insert, delete on table public.user_blocks to authenticated;

revoke all on table public.user_moderation_reports from anon, authenticated;
grant insert (reporter_id, reported_user_id, source_report_id, reason, details)
  on table public.user_moderation_reports to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'profile_avatars',
  'profile_avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile avatars are publicly readable" on storage.objects;
create policy "Profile avatars are publicly readable"
  on storage.objects
  for select
  to public
  using (bucket_id = 'profile_avatars');

drop policy if exists "Users can upload their profile avatar" on storage.objects;
create policy "Users can upload their profile avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    (select public.is_permanent_user())
    and bucket_id = 'profile_avatars'
    and name = (select auth.uid()::text) || '/avatar'
  );

drop policy if exists "Users can replace their profile avatar" on storage.objects;
create policy "Users can replace their profile avatar"
  on storage.objects
  for update
  to authenticated
  using (
    (select public.is_permanent_user())
    and bucket_id = 'profile_avatars'
    and name = (select auth.uid()::text) || '/avatar'
  )
  with check (
    (select public.is_permanent_user())
    and bucket_id = 'profile_avatars'
    and name = (select auth.uid()::text) || '/avatar'
  );

drop policy if exists "Users can delete their profile avatar" on storage.objects;
create policy "Users can delete their profile avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    (select public.is_permanent_user())
    and bucket_id = 'profile_avatars'
    and name = (select auth.uid()::text) || '/avatar'
  );

comment on table public.profiles is
  'Public, cross-client identity for permanent Litterbugs accounts.';
comment on column public.profiles.reports_created_count is
  'Lifetime reports submitted, seeded from retained reports at migration time and incremented on insert.';
comment on table public.user_blocks is
  'One-way signed-in content filters managed by the blocking user.';
comment on table public.user_moderation_reports is
  'Private moderation intake queue. Clients can submit but cannot read or resolve rows.';
