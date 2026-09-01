create table public.rank_point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  points smallint not null,
  created_at timestamptz not null default now(),
  constraint rank_point_events_source_key unique (source_type, source_id),
  constraint rank_point_events_source_points_check check (
    (source_type = 'report_created' and points = 1)
    or (source_type = 'cleanup_completed' and points = 3)
  )
);

create index rank_point_events_user_created_idx
  on public.rank_point_events (user_id, created_at desc);

alter table public.rank_point_events enable row level security;

revoke all on table public.rank_point_events
  from public, anon, authenticated, service_role;

comment on table public.rank_point_events is
  'Immutable source-of-truth ledger for server-awarded ranking points.';
comment on column public.rank_point_events.source_type is
  'Server-controlled qualifying event type. Clients cannot submit event types or points.';
comment on column public.rank_point_events.source_id is
  'Report or cleanup-attempt identifier. The source key prevents duplicate awards.';

create or replace function private.award_rank_point_event(
  target_user_id uuid,
  target_source_type text,
  target_source_id uuid,
  target_created_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  awarded_points smallint;
begin
  if target_user_id is null or target_source_id is null then
    return;
  end if;

  if not exists (
    select 1
    from auth.users
    where id = target_user_id
      and coalesce(is_anonymous, false) is false
  ) then
    return;
  end if;

  case target_source_type
    when 'report_created' then
      awarded_points := 1;
      if not exists (
        select 1
        from public.reports
        where id = target_source_id
          and user_id = target_user_id
      ) then
        raise check_violation using message = 'rank_report_source_invalid';
      end if;
    when 'cleanup_completed' then
      awarded_points := 3;
      if not exists (
        select 1
        from public.cleanup_attempts
        where id = target_source_id
          and cleaner_id = target_user_id
          and status = 'completed'
      ) then
        raise check_violation using message = 'rank_cleanup_source_invalid';
      end if;
    else
      raise check_violation using message = 'rank_source_type_invalid';
  end case;

  insert into public.rank_point_events (
    user_id,
    source_type,
    source_id,
    points,
    created_at
  ) values (
    target_user_id,
    target_source_type,
    target_source_id,
    awarded_points,
    coalesce(target_created_at, now())
  )
  on conflict (source_type, source_id) do nothing;
end;
$$;

revoke all on function private.award_rank_point_event(
  uuid,
  text,
  uuid,
  timestamptz
) from public, anon, authenticated, service_role;

create or replace function private.award_report_created_rank_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.award_rank_point_event(
    new.user_id,
    'report_created',
    new.id,
    new.created_at
  );
  return new;
end;
$$;

revoke all on function private.award_report_created_rank_points()
  from public, anon, authenticated, service_role;

drop trigger if exists reports_award_rank_points on public.reports;
create trigger reports_award_rank_points
  after insert on public.reports
  for each row execute function private.award_report_created_rank_points();

create or replace function private.award_cleanup_completed_rank_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.award_rank_point_event(
    new.cleaner_id,
    'cleanup_completed',
    new.id,
    new.completed_at
  );
  return new;
end;
$$;

revoke all on function private.award_cleanup_completed_rank_points()
  from public, anon, authenticated, service_role;

drop trigger if exists cleanup_attempts_award_rank_points_on_insert
  on public.cleanup_attempts;
create trigger cleanup_attempts_award_rank_points_on_insert
  after insert on public.cleanup_attempts
  for each row
  when (new.status = 'completed')
  execute function private.award_cleanup_completed_rank_points();

drop trigger if exists cleanup_attempts_award_rank_points_on_completion
  on public.cleanup_attempts;
create trigger cleanup_attempts_award_rank_points_on_completion
  after update of status on public.cleanup_attempts
  for each row
  when (
    new.status = 'completed'
    and old.status is distinct from new.status
  )
  execute function private.award_cleanup_completed_rank_points();

create or replace function private.backfill_rank_point_events()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.rank_point_events (
    user_id,
    source_type,
    source_id,
    points,
    created_at
  )
  select
    reports.user_id,
    'report_created',
    reports.id,
    1,
    reports.created_at
  from public.reports as reports
  join auth.users as users on users.id = reports.user_id
  where reports.user_id is not null
    and coalesce(users.is_anonymous, false) is false
  on conflict (source_type, source_id) do nothing;

  insert into public.rank_point_events (
    user_id,
    source_type,
    source_id,
    points,
    created_at
  )
  select
    attempts.cleaner_id,
    'cleanup_completed',
    attempts.id,
    3,
    coalesce(
      attempts.completed_at,
      attempts.last_activity_at,
      attempts.claimed_at
    )
  from public.cleanup_attempts as attempts
  join auth.users as users on users.id = attempts.cleaner_id
  where attempts.cleaner_id is not null
    and attempts.status = 'completed'
    and coalesce(users.is_anonymous, false) is false
  on conflict (source_type, source_id) do nothing;
end;
$$;

revoke all on function private.backfill_rank_point_events()
  from public, anon, authenticated, service_role;

create or replace function public.get_rank_points(target_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(points), 0)::integer
  from public.rank_point_events
  where user_id = target_user_id;
$$;

revoke all on function public.get_rank_points(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_rank_points(uuid)
  to anon, authenticated;

comment on function public.get_rank_points(uuid) is
  'Returns only the aggregate rank-point total; raw ledger events remain private.';

select private.backfill_rank_point_events();
