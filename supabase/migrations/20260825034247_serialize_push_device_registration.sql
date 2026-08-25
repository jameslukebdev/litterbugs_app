create or replace function public.register_push_device(
  target_installation_id uuid,
  target_expo_push_token text,
  target_platform text
)
returns public.push_devices
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  normalized_token text := btrim(target_expo_push_token);
  device_record public.push_devices%rowtype;
  transition_at timestamptz := now();
begin
  actor_id := private.require_permanent_cleanup_user();

  if target_installation_id is null
    or normalized_token is null
    or char_length(normalized_token) not between 20 and 512
    or normalized_token !~ '^Expo(nent)?PushToken\[[^]]+\]$'
    or target_platform <> all (array['ios', 'android']) then
    raise check_violation using
      message = 'push_device_invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('cleanup-push-device-registration', 0)
  );

  delete from public.push_devices
  where push_devices.expo_push_token = normalized_token
    and (
      push_devices.user_id is distinct from actor_id
      or push_devices.installation_id is distinct from target_installation_id
    );

  insert into public.push_devices (
    user_id,
    installation_id,
    expo_push_token,
    platform,
    created_at,
    updated_at,
    last_registered_at,
    disabled_at
  ) values (
    actor_id,
    target_installation_id,
    normalized_token,
    target_platform,
    transition_at,
    transition_at,
    transition_at,
    null
  )
  on conflict (user_id, installation_id) do update
  set
    expo_push_token = excluded.expo_push_token,
    platform = excluded.platform,
    updated_at = transition_at,
    last_registered_at = transition_at,
    disabled_at = null
  returning * into device_record;

  return device_record;
end;
$$;

revoke all on function public.register_push_device(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.register_push_device(uuid, text, text)
  to authenticated;

comment on function public.register_push_device(uuid, text, text) is
  'Registers one private Expo token per installation and serializes concurrent startup refreshes.';
