-- User-selected images enter a private, owner-scoped quarantine bucket. Only
-- the server-side media processor (service role) can write sanitized output to
-- the application-facing buckets.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'media_quarantine',
  'media_quarantine',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.media_scan_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quarantine_path text not null,
  media_kind text not null check (media_kind in ('report', 'cleanup', 'avatar')),
  outcome text not null default 'pending' check (
    outcome in ('pending', 'clean', 'infected', 'invalid', 'unavailable', 'storage_error')
  ),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, quarantine_path)
);

create index if not exists media_scan_attempts_user_created_idx
  on public.media_scan_attempts (user_id, created_at desc);

create or replace function public.enforce_media_scan_hourly_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serialize each user's admissions so concurrent requests cannot race past
  -- the provider quota check performed by the application route.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 0)
  );

  if (
    select count(*)
    from public.media_scan_attempts
    where user_id = new.user_id
      and created_at >= pg_catalog.now() - interval '1 hour'
  ) >= 30 then
    raise sqlstate 'P0001' using message = 'media scan hourly limit reached';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_media_scan_hourly_limit() from public;
revoke all on function public.enforce_media_scan_hourly_limit() from anon, authenticated;

drop trigger if exists enforce_media_scan_hourly_limit
  on public.media_scan_attempts;
create trigger enforce_media_scan_hourly_limit
before insert on public.media_scan_attempts
for each row execute function public.enforce_media_scan_hourly_limit();

alter table public.media_scan_attempts enable row level security;
revoke all on table public.media_scan_attempts from anon, authenticated;
grant select, insert, update, delete on table public.media_scan_attempts to service_role;

comment on table public.media_scan_attempts is
  'Server-only bounded audit and replay/rate-limit state; never stores image bytes or provider findings.';

drop policy if exists "Users can upload quarantined media" on storage.objects;
create policy "Users can upload quarantined media"
  on storage.objects
  for insert
  to authenticated
  with check (
    (select public.is_permanent_user())
    and bucket_id = 'media_quarantine'
    and cardinality(storage.foldername(name)) = 2
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and (storage.foldername(name))[2] in ('report', 'cleanup', 'avatar')
    and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpe?g|png|webp|heic|heif)$'
  );

drop policy if exists "Users can delete their quarantined media" on storage.objects;
create policy "Users can delete their quarantined media"
  on storage.objects
  for delete
  to authenticated
  using (
    (select public.is_permanent_user())
    and bucket_id = 'media_quarantine'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Raw report photos are no longer broadly readable merely because their path
-- is known. Public reads are limited to sanitized photos attached to a live,
-- non-sample report. Server/admin service-role access is unaffected.
drop policy if exists "Allow public read access to report_photos 1l8xwbw_0"
  on storage.objects;
drop policy if exists "Published report photos are readable"
  on storage.objects;
create policy "Published report photos are readable"
  on storage.objects
  for select
  to public
  using (
    bucket_id = 'report_photos'
    and exists (
      select 1
      from public.reports
      where name = any (reports.photo_paths)
        and not reports.is_sample
        and (
          (
            coalesce(reports.status, 'active') = 'active'
            and reports.expires_at > now()
          )
          or reports.cleanup_state = 'completed'
        )
    )
  );

comment on policy "Users can upload quarantined media" on storage.objects is
  'Permanent users may upload bounded image candidates only to their private quarantine prefix.';
comment on policy "Published report photos are readable" on storage.objects is
  'Only server-processed photos attached to a current report or completed cleanup story may be read.';
