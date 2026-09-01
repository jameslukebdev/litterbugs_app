create or replace function private.enforce_rank_celebration_progress()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if auth.uid() is distinct from old.id
      or not coalesce(public.is_permanent_user(), false) then
      raise insufficient_privilege using
        message = 'rank_celebration_progress_forbidden';
    end if;

    new.rank_celebrated_through_points := greatest(
      old.rank_celebrated_through_points,
      public.get_rank_points(old.id)
    );
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_rank_celebration_progress()
  from public, anon, authenticated, service_role;

drop trigger if exists profiles_enforce_rank_celebration_progress
  on public.profiles;
create trigger profiles_enforce_rank_celebration_progress
  before update of rank_celebrated_through_points on public.profiles
  for each row
  execute function private.enforce_rank_celebration_progress();

grant update (rank_celebrated_through_points)
  on table public.profiles to authenticated;

create or replace function public.acknowledge_current_rank()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  acknowledged_points integer;
begin
  if actor_id is null or not coalesce(public.is_permanent_user(), false) then
    raise exception using
      errcode = '42501',
      message = 'permanent_authentication_required';
  end if;

  update public.profiles
  set rank_celebrated_through_points = rank_celebrated_through_points
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
  'Acknowledges the calling permanent user current authoritative rank-point total through an RLS-protected profile update.';
