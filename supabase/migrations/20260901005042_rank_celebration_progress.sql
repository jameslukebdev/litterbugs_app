alter table public.profiles
  add column rank_celebrated_through_points integer not null default 0;

alter table public.profiles
  add constraint profiles_rank_celebrated_through_points_check
  check (rank_celebrated_through_points >= 0);

comment on column public.profiles.rank_celebrated_through_points is
  'Highest authoritative lifetime point total whose achieved rank the user acknowledged.';

create or replace function public.acknowledge_current_rank()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  current_points integer;
  acknowledged_points integer;
begin
  if actor_id is null or not coalesce(public.is_permanent_user(), false) then
    raise exception using
      errcode = '42501',
      message = 'permanent_authentication_required';
  end if;

  select coalesce(sum(rank_events.points), 0)::integer
  into current_points
  from public.rank_point_events as rank_events
  where rank_events.user_id = actor_id;

  update public.profiles
  set rank_celebrated_through_points = greatest(
    rank_celebrated_through_points,
    current_points
  )
  where id = actor_id
  returning rank_celebrated_through_points into acknowledged_points;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'profile_required';
  end if;

  return acknowledged_points;
end;
$$;

revoke all on function public.acknowledge_current_rank()
  from public, anon, authenticated, service_role;
grant execute on function public.acknowledge_current_rank()
  to authenticated;

comment on function public.acknowledge_current_rank() is
  'Monotonically acknowledges the calling permanent user current authoritative rank-point total.';
