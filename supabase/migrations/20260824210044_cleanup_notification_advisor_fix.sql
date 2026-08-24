grant update (read_at)
  on table public.cleanup_notifications
  to authenticated;

create policy "Users can acknowledge their cleanup notifications"
  on public.cleanup_notifications
  for update
  to authenticated
  using (
    (select public.is_permanent_user())
    and user_id = (select auth.uid())
  )
  with check (
    (select public.is_permanent_user())
    and user_id = (select auth.uid())
    and read_at is not null
  );

create or replace function public.acknowledge_cleanup_notifications(
  target_notification_ids uuid[]
)
returns setof public.cleanup_notifications
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid;
  acknowledged_at timestamptz := now();
begin
  actor_id := auth.uid();

  if actor_id is null or not public.is_permanent_user() then
    raise insufficient_privilege using
      message = 'cleanup_requires_permanent_account';
  end if;

  if target_notification_ids is null
    or cardinality(target_notification_ids) = 0 then
    return;
  end if;

  return query
  update public.cleanup_notifications
  set read_at = coalesce(read_at, acknowledged_at)
  where cleanup_notifications.user_id = actor_id
    and cleanup_notifications.id = any (target_notification_ids)
  returning cleanup_notifications.*;
end;
$$;

revoke all on function public.acknowledge_cleanup_notifications(uuid[])
  from public, anon, authenticated, service_role;
grant execute on function public.acknowledge_cleanup_notifications(uuid[])
  to authenticated;
