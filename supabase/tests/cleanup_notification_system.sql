-- Run only against a disposable Supabase database after loading the committed
-- baseline and migrations. The transaction rolls back every test fixture.
\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at)
values
  (
    '88888888-8888-4888-8888-888888888888',
    'notification-reporter@example.com',
    false,
    '{"full_name":"Notification Reporter"}',
    now()
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    'notification-cleaner@example.com',
    false,
    '{"full_name":"Notification Cleaner"}',
    now()
  ),
  (
    '77777777-7777-4777-8777-777777777770',
    null,
    true,
    '{}',
    now()
  );

insert into public.reports (
  id,
  user_id,
  title,
  latitude,
  longitude,
  expires_at
) values (
  'ffffffff-ffff-4fff-8fff-fffffffffff1',
  '88888888-8888-4888-8888-888888888888',
  'Notification system report',
  35,
  -78,
  now() + interval '30 days'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '88888888-8888-4888-8888-888888888888',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"88888888-8888-4888-8888-888888888888","is_anonymous":false}',
  true
);

select public.register_push_device(
  '10000000-0000-4000-8000-000000000001',
  'ExponentPushToken[notification-reporter-test]',
  'ios'
);

select public.register_push_device(
  '10000000-0000-4000-8000-000000000003',
  'ExponentPushToken[notification-reporter-test]',
  'ios'
);

do $$
begin
  begin
    perform 1 from public.push_devices;
    raise exception 'Authenticated user read private push tokens';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

do $$
begin
  if (
    select count(*)
    from public.push_devices
    where expo_push_token = 'ExponentPushToken[notification-reporter-test]'
  ) <> 1 or not exists (
    select 1
    from public.push_devices
    where installation_id = '10000000-0000-4000-8000-000000000003'
  ) then
    raise exception 'Push token reassignment was not serialized';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '99999999-9999-4999-8999-999999999999',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-9999-4999-8999-999999999999","is_anonymous":false}',
  true
);

select public.accept_cleanup_waiver(
  'cleanup-waiver-development-v1',
  'cleanup-guidelines-development-v1'
);
select public.claim_cleanup('ffffffff-ffff-4fff-8fff-fffffffffff1');

reset role;

do $$
begin
  if to_regclass(
    'public.cleanup_notification_deliveries_push_device_idx'
  ) is null then
    raise exception 'Push delivery device index is missing';
  end if;

  if not exists (
    select 1
    from public.cleanup_notifications
    where user_id = '88888888-8888-4888-8888-888888888888'
      and report_id = 'ffffffff-ffff-4fff-8fff-fffffffffff1'
      and event_type = 'report_claimed'
  ) then
    raise exception 'Claim transition did not persist a reporter notification';
  end if;

  if not exists (
    select 1
    from public.cleanup_notification_deliveries
    join public.cleanup_notifications
      on cleanup_notifications.id = cleanup_notification_deliveries.notification_id
    where cleanup_notifications.report_id = 'ffffffff-ffff-4fff-8fff-fffffffffff1'
      and cleanup_notification_deliveries.status = 'pending'
  ) then
    raise exception 'Notification did not seed a private push delivery';
  end if;
end;
$$;

set local role service_role;
select set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  true
);

do $$
declare
  delivery_record record;
begin
  select * into delivery_record
  from public.claim_cleanup_push_deliveries(null, 100)
  limit 1;

  if delivery_record.delivery_id is null
    or delivery_record.expo_push_token <>
      'ExponentPushToken[notification-reporter-test]' then
    raise exception 'Push worker could not claim the private delivery';
  end if;

  perform public.complete_cleanup_push_delivery(
    delivery_record.delivery_id,
    'accepted',
    'expo-ticket-test',
    null,
    null
  );
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1
    from public.cleanup_notification_deliveries
    where status = 'accepted'
      and expo_ticket_id = 'expo-ticket-test'
  ) then
    raise exception 'Accepted Expo push ticket was not persisted';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '88888888-8888-4888-8888-888888888888',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"88888888-8888-4888-8888-888888888888","is_anonymous":false}',
  true
);

select public.unregister_push_device(
  '10000000-0000-4000-8000-000000000003'
);

reset role;

do $$
begin
  if not exists (
    select 1
    from public.push_devices
    where user_id = '88888888-8888-4888-8888-888888888888'
      and disabled_at is not null
  ) then
    raise exception 'Push device was not disabled on sign out';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '77777777-7777-4777-8777-777777777770',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777770","is_anonymous":true}',
  true
);

do $$
begin
  begin
    perform public.register_push_device(
      '10000000-0000-4000-8000-000000000002',
      'ExponentPushToken[anonymous-device-test]',
      'ios'
    );
    raise exception 'Anonymous user registered a push device';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
