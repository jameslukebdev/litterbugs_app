-- Run only against a disposable Supabase database after loading the committed
-- baseline and migrations. The transaction rolls back every test fixture.
\set ON_ERROR_STOP on

begin;

-- Members: alert member (due now), a member whose 5 pm has not come yet, a member with nothing
-- nearby, a reporter, a blocked reporter, and a guest.
insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at) values
  ('a1111111-1111-4111-8111-111111111111', 'nearby-member@example.com', false, '{"full_name":"Nearby Member"}', now()),
  ('a2222222-2222-4222-8222-222222222222', 'nearby-later@example.com', false, '{"full_name":"Nearby Later"}', now()),
  ('a3333333-3333-4333-8333-333333333333', 'nearby-quiet@example.com', false, '{"full_name":"Nearby Quiet"}', now()),
  ('b1111111-1111-4111-8111-111111111111', 'nearby-reporter@example.com', false, '{"full_name":"Nearby Reporter"}', now()),
  ('c1111111-1111-4111-8111-111111111111', 'nearby-blocked@example.com', false, '{"full_name":"Nearby Blocked"}', now()),
  ('d1111111-1111-4111-8111-111111111111', null, true, '{}', now());

-- Time zones where it is after 5 pm right now, and where it is not yet.
create temporary table nearby_zones on commit drop as
select
  (select name from pg_catalog.pg_timezone_names
    where name like '%/%' and (now() at time zone name)::time >= time '17:30'
    order by name limit 1) as due_zone,
  (select name from pg_catalog.pg_timezone_names
    where name like '%/%' and (now() at time zone name)::time between time '00:30' and time '16:30'
    order by name limit 1) as later_zone;
grant select on nearby_zones to authenticated;

-- ===== Turning the alert on and off (as each member) =====

-- A guest cannot turn it on.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"d1111111-1111-4111-8111-111111111111","is_anonymous":true}', true);
do $$
begin
  begin
    perform public.set_nearby_report_alerts(true, 36.2168, -81.6746, 'America/New_York');
    raise exception 'A guest turned on nearby report alerts';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- The alert member turns it on near Boone; the spot is rounded and the time zone kept.
select set_config('request.jwt.claim.sub', 'a1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","is_anonymous":false}', true);
do $$
declare
  result record;
  zone text := (select due_zone from nearby_zones);
begin
  select * into result from public.set_nearby_report_alerts(true, 36.21679, -81.67456, zone);
  if not result.alerts_enabled or not result.has_area then
    raise exception 'Turning on the alert did not report it on with an area';
  end if;
  perform 1 from public.nearby_report_alerts
  where user_id = 'a1111111-1111-4111-8111-111111111111'
    and enabled and latitude = 36.22 and longitude = -81.67 and time_zone = zone;
  if not found then
    raise exception 'The alert area was not rounded, or the time zone was not kept';
  end if;

  -- Bad input is refused.
  begin
    perform public.set_nearby_report_alerts(true, 36.2, null, zone);
    raise exception 'An area with only a latitude was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.set_nearby_report_alerts(true, 36.2, -81.6, 'Not/A_Zone');
    raise exception 'An unknown time zone was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.set_nearby_report_alerts(true, 136.2, -81.6, zone);
    raise exception 'An impossible latitude was accepted';
  exception when invalid_parameter_value then null;
  end;

  -- Members cannot write the table directly.
  begin
    update public.nearby_report_alerts set enabled = false;
    raise exception 'A member wrote the alert table directly';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select public.register_push_device(
  '20000000-0000-4000-8000-000000000001',
  'ExponentPushToken[nearby-member-test]',
  'ios'
);

-- Turning it off and on again: off clears the area, on without a spot keeps nothing to restore.
do $$
declare
  result record;
begin
  select * into result from public.set_nearby_report_alerts(false);
  if result.alerts_enabled or result.has_area then
    raise exception 'Turning the alert off kept it on or kept the area';
  end if;
  perform 1 from public.nearby_report_alerts
  where user_id = 'a1111111-1111-4111-8111-111111111111' and latitude is null and location_updated_at is null;
  if not found then
    raise exception 'The area was kept after the alert was turned off';
  end if;
  select * into result from public.set_nearby_report_alerts(true, 36.2168, -81.6746, null);
  if not result.alerts_enabled or not result.has_area then
    raise exception 'The alert did not turn back on with the new area';
  end if;
  if (select time_zone from public.nearby_report_alerts where user_id = 'a1111111-1111-4111-8111-111111111111')
    <> (select due_zone from nearby_zones) then
    raise exception 'Turning the alert back on without a time zone lost the saved one';
  end if;
end;
$$;

-- The member whose 5 pm has not come yet, and the member with nothing nearby (far away).
select set_config('request.jwt.claim.sub', 'a2222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"a2222222-2222-4222-8222-222222222222","is_anonymous":false}', true);
select public.set_nearby_report_alerts(true, 36.2168, -81.6746, (select later_zone from nearby_zones));

select set_config('request.jwt.claim.sub', 'a3333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claims', '{"sub":"a3333333-3333-4333-8333-333333333333","is_anonymous":false}', true);
select public.set_nearby_report_alerts(true, 45.5, -122.6, (select due_zone from nearby_zones));

-- Members read only their own row.
do $$
begin
  if (select count(*) from public.nearby_report_alerts) <> 1 then
    raise exception 'A member could read another member''s alert';
  end if;
end;
$$;

reset role;

-- ===== Reports around Boone =====
insert into public.user_blocks (blocker_id, blocked_id)
values ('a1111111-1111-4111-8111-111111111111', 'c1111111-1111-4111-8111-111111111111');

insert into public.reports (id, user_id, title, latitude, longitude, expires_at, created_at, is_sample, cleanup_state) values
  ('e0000000-0000-4000-8000-000000000001', 'b1111111-1111-4111-8111-111111111111', 'New nearby litter', 36.30, -81.60, now() + interval '30 days', now() - interval '2 hours', false, 'available'),
  ('e0000000-0000-4000-8000-000000000002', 'a1111111-1111-4111-8111-111111111111', 'My own report', 36.21, -81.67, now() + interval '30 days', now() - interval '2 hours', false, 'available'),
  ('e0000000-0000-4000-8000-000000000003', 'c1111111-1111-4111-8111-111111111111', 'Blocked member report', 36.22, -81.66, now() + interval '30 days', now() - interval '2 hours', false, 'available'),
  ('e0000000-0000-4000-8000-000000000004', 'b1111111-1111-4111-8111-111111111111', 'Too far away', 37.40, -81.67, now() + interval '30 days', now() - interval '2 hours', false, 'available'),
  ('e0000000-0000-4000-8000-000000000005', 'b1111111-1111-4111-8111-111111111111', 'Hidden by the member', 36.20, -81.70, now() + interval '30 days', now() - interval '2 hours', false, 'available'),
  ('e0000000-0000-4000-8000-000000000006', 'b1111111-1111-4111-8111-111111111111', 'Two days old', 36.20, -81.70, now() + interval '30 days', now() - interval '2 days', false, 'available'),
  ('e0000000-0000-4000-8000-000000000007', 'b1111111-1111-4111-8111-111111111111', 'Sample report', 36.20, -81.70, now() + interval '30 days', now() - interval '2 hours', true, 'available');

insert into public.report_preferences (user_id, report_id, kind, enabled)
values ('a1111111-1111-4111-8111-111111111111', 'e0000000-0000-4000-8000-000000000005', 'hidden', true);

do $$
begin
  if private.miles_between(36.2168, -81.6746, 37.40, -81.67) <= 50 then
    raise exception 'Distance check: 82 miles was treated as within 50';
  end if;
  if private.count_new_nearby_reports('a1111111-1111-4111-8111-111111111111', 36.22, -81.67, now() - interval '24 hours') <> 1 then
    raise exception 'Only the new, nearby, visible report from someone else should count (got %)',
      private.count_new_nearby_reports('a1111111-1111-4111-8111-111111111111', 36.22, -81.67, now() - interval '24 hours');
  end if;
end;
$$;

-- ===== The 5 pm check =====
do $$
declare
  sent integer;
begin
  sent := private.send_nearby_report_alerts();
  if sent <> 1 then
    raise exception 'Expected one alert (the due member with new litter nearby), got %', sent;
  end if;

  perform 1 from public.cleanup_notifications
  where user_id = 'a1111111-1111-4111-8111-111111111111'
    and event_type = 'nearby_reports_daily' and report_id is null and cleanup_attempt_id is null;
  if not found then
    raise exception 'The alert was not added to the member''s updates';
  end if;

  perform 1 from public.cleanup_notification_deliveries delivery
  join public.cleanup_notifications notice on notice.id = delivery.notification_id
  where notice.user_id = 'a1111111-1111-4111-8111-111111111111' and notice.event_type = 'nearby_reports_daily';
  if not found then
    raise exception 'The alert was not queued for the member''s phone';
  end if;

  if exists (select 1 from public.cleanup_notifications where user_id in (
    'a2222222-2222-4222-8222-222222222222', 'a3333333-3333-4333-8333-333333333333')) then
    raise exception 'A member got an alert before 5 pm or with nothing nearby';
  end if;

  -- The member with nothing nearby is checked for today; the later member is not checked yet.
  perform 1 from public.nearby_report_alerts
  where user_id = 'a3333333-3333-4333-8333-333333333333' and last_checked_on is not null and last_sent_at is null;
  if not found then
    raise exception 'The member with nothing nearby was not marked as checked';
  end if;
  perform 1 from public.nearby_report_alerts
  where user_id = 'a2222222-2222-4222-8222-222222222222' and last_checked_on is null;
  if not found then
    raise exception 'The member whose 5 pm has not come was checked early';
  end if;

  -- Once a day: running again sends nothing more.
  sent := private.send_nearby_report_alerts();
  if sent <> 0 or (select count(*) from public.cleanup_notifications where event_type = 'nearby_reports_daily') <> 1 then
    raise exception 'The alert was sent more than once in a day';
  end if;
end;
$$;

-- Deleting the account removes the alert and its area.
delete from auth.users where id = 'a3333333-3333-4333-8333-333333333333';
do $$
begin
  if exists (select 1 from public.nearby_report_alerts where user_id = 'a3333333-3333-4333-8333-333333333333') then
    raise exception 'The alert area outlived the account';
  end if;
end;
$$;

rollback;
