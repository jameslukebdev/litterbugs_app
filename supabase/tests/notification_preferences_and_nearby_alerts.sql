-- Run only against a disposable Supabase database after loading the committed
-- baseline and migrations. The transaction rolls back every test fixture.
\set ON_ERROR_STOP on

begin;

-- Members: alert member (Boone, 5 pm has passed), a member whose 5 pm has not come yet, a member
-- far away, a reporter, a cleaner, a blocked reporter, a contributor, and a guest.
insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at) values
  ('a1111111-1111-4111-8111-111111111111', 'nearby-member@example.com', false, '{"full_name":"Nearby Member"}', now()),
  ('a2222222-2222-4222-8222-222222222222', 'nearby-later@example.com', false, '{"full_name":"Nearby Later"}', now()),
  ('a3333333-3333-4333-8333-333333333333', 'nearby-far@example.com', false, '{"full_name":"Nearby Far"}', now()),
  ('b1111111-1111-4111-8111-111111111111', 'nearby-reporter@example.com', false, '{"full_name":"Nearby Reporter"}', now()),
  ('b2222222-2222-4222-8222-222222222222', 'nearby-cleaner@example.com', false, '{"full_name":"Nearby Cleaner"}', now()),
  ('c1111111-1111-4111-8111-111111111111', 'nearby-blocked@example.com', false, '{"full_name":"Nearby Blocked"}', now()),
  ('c2222222-2222-4222-8222-222222222222', 'nearby-funder@example.com', false, '{"full_name":"Nearby Funder"}', now()),
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

-- ===== Changing preferences (as each member) =====
set local role authenticated;

-- A guest cannot change notification settings.
select set_config('request.jwt.claim.sub', 'd1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"d1111111-1111-4111-8111-111111111111","is_anonymous":true}', true);
do $$
begin
  begin
    perform public.set_notification_preferences(target_payments => false);
    raise exception 'A guest changed notification settings';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","is_anonymous":false}', true);
do $$
declare
  saved public.notification_preferences;
  zone text := (select due_zone from nearby_zones);
begin
  -- Nearby alerts need a location; nothing is saved without one.
  begin
    perform public.set_notification_preferences(target_new_litter_nearby => true);
    raise exception 'A nearby alert was turned on with no location';
  exception when invalid_parameter_value then null;
  end;

  -- Defaults: activity and payments on, nearby off, nothing decided yet.
  select * into saved from public.set_notification_preferences(target_payments => false);
  if not saved.reports_and_cleanups or saved.payments or saved.new_litter_nearby or saved.cleanups_nearby
    or saved.nearby_decided_at is not null or saved.latitude is not null then
    raise exception 'A new member did not start from the defaults (or payments did not switch off)';
  end if;

  -- Both nearby alerts on near Boone: the spot is rounded, the time zone kept, the choice recorded.
  select * into saved from public.set_notification_preferences(
    target_new_litter_nearby => true, target_cleanups_nearby => true,
    target_latitude => 36.21679, target_longitude => -81.67456, target_time_zone => zone);
  if not (saved.new_litter_nearby and saved.cleanups_nearby) or saved.latitude <> 36.22 or saved.longitude <> -81.67
    or saved.time_zone <> zone or saved.nearby_decided_at is null or saved.payments then
    raise exception 'Turning on the nearby alerts did not save a rounded area, the time zone and the choice';
  end if;

  -- Bad input is refused.
  begin
    perform public.set_notification_preferences(target_latitude => 36.2);
    raise exception 'An area with only a latitude was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.set_notification_preferences(target_time_zone => 'Not/A_Zone');
    raise exception 'An unknown time zone was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.set_notification_preferences(target_latitude => 136.2, target_longitude => -81.6);
    raise exception 'An impossible latitude was accepted';
  exception when invalid_parameter_value then null;
  end;

  -- Members cannot write the table directly.
  begin
    update public.notification_preferences set payments = true;
    raise exception 'A member wrote notification preferences directly';
  exception when insufficient_privilege then null;
  end;

  -- One alert off keeps the area for the other; both off clears it; on again needs a location.
  select * into saved from public.set_notification_preferences(target_new_litter_nearby => false);
  if saved.latitude is null then raise exception 'The area was cleared while an alert was still on'; end if;
  select * into saved from public.set_notification_preferences(target_cleanups_nearby => false);
  if saved.latitude is not null or saved.location_updated_at is not null then
    raise exception 'The area was kept after both nearby alerts were turned off';
  end if;
  select * into saved from public.set_notification_preferences(
    target_new_litter_nearby => true, target_cleanups_nearby => true,
    target_latitude => 36.2168, target_longitude => -81.6746);
  if saved.time_zone <> zone then raise exception 'Turning alerts back on without a time zone lost the saved one'; end if;
end;
$$;

select public.register_push_device(
  '20000000-0000-4000-8000-000000000001',
  'ExponentPushToken[nearby-member-test]',
  'ios'
);

-- The member whose 5 pm has not come yet, and a member far away (Portland), both with alerts on.
select set_config('request.jwt.claim.sub', 'a2222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"a2222222-2222-4222-8222-222222222222","is_anonymous":false}', true);
select public.set_notification_preferences(target_new_litter_nearby => true, target_cleanups_nearby => true,
  target_latitude => 36.2168, target_longitude => -81.6746, target_time_zone => (select later_zone from nearby_zones));

select set_config('request.jwt.claim.sub', 'a3333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claims', '{"sub":"a3333333-3333-4333-8333-333333333333","is_anonymous":false}', true);
select public.set_notification_preferences(target_new_litter_nearby => true, target_cleanups_nearby => true,
  target_latitude => 45.5, target_longitude => -122.6, target_time_zone => (select due_zone from nearby_zones));

-- The contributor has the completed-nearby alert on too (but funded this cleanup).
select set_config('request.jwt.claim.sub', 'c2222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"c2222222-2222-4222-8222-222222222222","is_anonymous":false}', true);
select public.set_notification_preferences(target_cleanups_nearby => true, target_latitude => 36.2, target_longitude => -81.7);

-- Members read only their own row.
do $$
begin
  if (select count(*) from public.notification_preferences) <> 1 then
    raise exception 'A member could read another member''s notification preferences';
  end if;
end;
$$;

reset role;

-- ===== Which notifications reach the phone =====
do $$
begin
  if private.notification_reaches_phone('a1111111-1111-4111-8111-111111111111', 'cleanup_reward_sent') then
    raise exception 'A payment notification reached the phone with payments switched off';
  end if;
  if not private.notification_reaches_phone('a1111111-1111-4111-8111-111111111111', 'report_claimed') then
    raise exception 'A report notification did not reach the phone with activity on';
  end if;
  if not private.notification_reaches_phone('b1111111-1111-4111-8111-111111111111', 'cleanup_reward_sent')
    or private.notification_reaches_phone('b1111111-1111-4111-8111-111111111111', 'nearby_reports_daily') then
    raise exception 'A member with no settings did not get the defaults (payments on, nearby off)';
  end if;
  if not private.notification_reaches_phone('a1111111-1111-4111-8111-111111111111', 'admin_cleanup_needed') then
    raise exception 'An admin notification was held back';
  end if;
end;
$$;

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

-- ===== The 5 pm new-litter check =====
do $$
declare
  sent integer;
begin
  sent := private.send_nearby_report_alerts();
  if sent <> 1 then
    raise exception 'Expected one new-litter alert (the due member with litter nearby), got %', sent;
  end if;

  perform 1 from public.cleanup_notifications
  where user_id = 'a1111111-1111-4111-8111-111111111111'
    and event_type = 'nearby_reports_daily' and report_id is null and cleanup_attempt_id is null;
  if not found then
    raise exception 'The new-litter alert was not added to the member''s updates';
  end if;

  perform 1 from public.cleanup_notification_deliveries delivery
  join public.cleanup_notifications notice on notice.id = delivery.notification_id
  where notice.user_id = 'a1111111-1111-4111-8111-111111111111' and notice.event_type = 'nearby_reports_daily';
  if not found then
    raise exception 'The new-litter alert was not queued for the member''s phone';
  end if;

  if exists (select 1 from public.cleanup_notifications where user_id in (
    'a2222222-2222-4222-8222-222222222222', 'a3333333-3333-4333-8333-333333333333')) then
    raise exception 'A member got an alert before 5 pm or with nothing nearby';
  end if;
  perform 1 from public.notification_preferences
  where user_id = 'a3333333-3333-4333-8333-333333333333' and last_checked_on is not null and last_sent_at is null;
  if not found then
    raise exception 'The member with nothing nearby was not marked as checked';
  end if;
  perform 1 from public.notification_preferences
  where user_id = 'a2222222-2222-4222-8222-222222222222' and last_checked_on is null;
  if not found then
    raise exception 'The member whose 5 pm has not come was checked early';
  end if;

  sent := private.send_nearby_report_alerts();
  if sent <> 0 or (select count(*) from public.cleanup_notifications where event_type = 'nearby_reports_daily') <> 1 then
    raise exception 'The new-litter alert was sent more than once in a day';
  end if;
end;
$$;

-- ===== A cleanup completed nearby =====
-- A minimal finished cleanup of the first report, set up without the claim/submission workflow
-- (its own tests cover that); only the completed-nearby trigger runs when it completes.
alter table public.cleanup_attempts disable trigger cleanup_attempts_award_rank_points_on_completion;
alter table public.cleanup_attempts disable trigger cleanup_attempts_award_rank_points_on_insert;
alter table public.cleanup_attempts disable trigger cleanup_attempts_notify_contributors;
alter table public.cleanup_attempts disable trigger cleanup_attempts_notify_reporter_on_claim;
alter table public.cleanup_attempts disable trigger cleanup_claim_requires_payout_ready;
alter table public.cleanup_attempts disable trigger earn_reporter_reward;

set local session_replication_role = replica; -- the fixture skips the waiver/submission links
insert into public.cleanup_attempts (id, report_id, cleaner_id, reporter_id, status, claimed_at, claim_expires_at, waiver_version, guidelines_version)
select 'f0000000-0000-4000-8000-000000000001'::uuid, 'e0000000-0000-4000-8000-000000000001'::uuid,
  'b2222222-2222-4222-8222-222222222222', 'b1111111-1111-4111-8111-111111111111', 'claimed',
  now(), now() + private.cleanup_claim_duration(), waiver.waiver_version, waiver.guidelines_version
from (select waiver_version, guidelines_version from public.cleanup_waiver_versions limit 1) as waiver;
insert into public.cleanup_contributions (cleanup_attempt_id, report_id, contributor_id, status,
  client_request_id, pricing_version, principal_amount_cents, platform_fee_cents, total_amount_cents,
  succeeded_at, auto_refund_due_at)
select 'f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'c2222222-2222-4222-8222-222222222222', 'succeeded',
  gen_random_uuid(), 1, 500, 50, 550, now(), now() + interval '1 year 11 mons';
insert into public.cleanup_submissions (id, cleanup_attempt_id, submission_number, description)
values ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 1, 'Bagged it all.');
set local session_replication_role = origin;

update public.cleanup_attempts
set status = 'completed', completed_at = now(), approval_method = 'auto_approved', final_submission_id = 'f1000000-0000-4000-8000-000000000001'
where id = 'f0000000-0000-4000-8000-000000000001';

do $$
begin
  -- Only the nearby member hears about it: not the far member, the cleaner, the reporter or the funder.
  if (select array_agg(user_id order by user_id) from public.cleanup_notifications where event_type = 'cleanup_completed_nearby')
    is distinct from array['a1111111-1111-4111-8111-111111111111'::uuid, 'a2222222-2222-4222-8222-222222222222'::uuid] then
    raise exception 'Completed-nearby went to the wrong members: %',
      (select array_agg(user_id order by user_id) from public.cleanup_notifications where event_type = 'cleanup_completed_nearby');
  end if;
  perform 1 from public.cleanup_notifications
  where event_type = 'cleanup_completed_nearby' and user_id = 'a1111111-1111-4111-8111-111111111111'
    and report_id = 'e0000000-0000-4000-8000-000000000001' and cleanup_attempt_id = 'f0000000-0000-4000-8000-000000000001';
  if not found then
    raise exception 'Completed-nearby does not point at the cleaned-up report';
  end if;
  perform 1 from public.cleanup_notification_deliveries delivery
  join public.cleanup_notifications notice on notice.id = delivery.notification_id
  where notice.user_id = 'a1111111-1111-4111-8111-111111111111' and notice.event_type = 'cleanup_completed_nearby';
  if not found then
    raise exception 'Completed-nearby was not queued for the member''s phone';
  end if;
end;
$$;

-- Completing it again (or any later status change) never notifies twice.
update public.cleanup_attempts set status = 'completed' where id = 'f0000000-0000-4000-8000-000000000001';
do $$
begin
  if (select count(*) from public.cleanup_notifications where event_type = 'cleanup_completed_nearby') <> 2 then
    raise exception 'Completed-nearby was sent twice for one cleanup';
  end if;
end;
$$;

-- Switched off: the notice still lands in Updates, but nothing is queued for the phone.
update public.notification_preferences set payments = false where user_id = 'a1111111-1111-4111-8111-111111111111';
insert into public.cleanup_notifications (user_id, report_id, event_type)
values ('a1111111-1111-4111-8111-111111111111', 'e0000000-0000-4000-8000-000000000002', 'cleanup_fund_increased');
do $$
begin
  if exists (
    select 1 from public.cleanup_notification_deliveries delivery
    join public.cleanup_notifications notice on notice.id = delivery.notification_id
    where notice.user_id = 'a1111111-1111-4111-8111-111111111111' and notice.event_type = 'cleanup_fund_increased'
  ) then
    raise exception 'A payment notification was pushed with payments switched off';
  end if;
end;
$$;

-- Deleting the account removes the preferences and the area.
delete from auth.users where id = 'a3333333-3333-4333-8333-333333333333';
do $$
begin
  if exists (select 1 from public.notification_preferences where user_id = 'a3333333-3333-4333-8333-333333333333') then
    raise exception 'Notification preferences outlived the account';
  end if;
end;
$$;

select 'ALL NOTIFICATION PREFERENCE CHECKS PASSED' as result;

rollback;
