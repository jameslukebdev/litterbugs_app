-- Notification preferences, and two opt-in alerts about the member's area.
--
-- Every notification still appears in the member's Updates list. These preferences decide which
-- ones are also pushed to their phone, by topic:
--   reports_and_cleanups  their reports, claims, reviews and approvals (on unless switched off)
--   payments              contributions, rewards, refunds and payouts (on unless switched off)
--   new_litter_nearby     once a day at 5 pm local time, when new litter that still needs a cleanup
--                         was reported within 50 miles (off until the member turns it on)
--   cleanups_nearby       as it happens, when a cleanup within 50 miles is completed
--                         (off until the member turns it on)
-- The two nearby alerts share the member's area: their phone's location rounded to two decimal
-- places (about two thirds of a mile), kept only while at least one of them is on.
-- Admin notifications are always pushed.

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reports_and_cleanups boolean not null default true,
  payments boolean not null default true,
  new_litter_nearby boolean not null default false,
  cleanups_nearby boolean not null default false,
  -- When the member first answered about the nearby alerts (the one-time question, or a switch).
  nearby_decided_at timestamptz,
  latitude double precision,
  longitude double precision,
  time_zone text not null default 'UTC',
  location_updated_at timestamptz,
  last_checked_on date,
  last_checked_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_area_pair_check check ((latitude is null) = (longitude is null)),
  constraint notification_preferences_area_range_check check (
    latitude is null or (latitude between -90 and 90 and longitude between -180 and 180)
  ),
  constraint notification_preferences_area_only_while_nearby_check check (
    new_litter_nearby or cleanups_nearby or latitude is null
  )
);

create index notification_preferences_new_litter_due_idx
  on public.notification_preferences (last_checked_on)
  where new_litter_nearby and latitude is not null;

create index notification_preferences_cleanups_nearby_idx
  on public.notification_preferences (latitude, longitude)
  where cleanups_nearby and latitude is not null;

alter table public.notification_preferences enable row level security;
revoke all on table public.notification_preferences from public, anon, authenticated;
grant select on table public.notification_preferences to authenticated;
grant all on table public.notification_preferences to service_role;

create policy "Members read their own notification preferences"
  on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_permanent_user()));

comment on table public.notification_preferences is
  'Which notification topics reach a member''s phone, and the rounded area for the opt-in nearby alerts.';

-- Change any of the preferences (null leaves a preference as it is), and keep the area and time
-- zone current while a nearby alert is on.
create or replace function public.set_notification_preferences(
  target_reports_and_cleanups boolean default null,
  target_payments boolean default null,
  target_new_litter_nearby boolean default null,
  target_cleanups_nearby boolean default null,
  target_latitude double precision default null,
  target_longitude double precision default null,
  target_time_zone text default null
)
returns setof public.notification_preferences
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  zone text := nullif(btrim(target_time_zone), '');
  rounded_latitude double precision;
  rounded_longitude double precision;
  current_row public.notification_preferences;
  nearby_on boolean;
begin
  if caller is null or not public.is_permanent_user() then
    raise exception 'Sign in to change notification settings.' using errcode = '42501';
  end if;
  if (target_latitude is null) <> (target_longitude is null) then
    raise exception 'An alert area needs both a latitude and a longitude.' using errcode = '22023';
  end if;
  if target_latitude is not null and (
    target_latitude = 'NaN'::double precision or target_longitude = 'NaN'::double precision
    or target_latitude not between -90 and 90 or target_longitude not between -180 and 180
  ) then
    raise exception 'The alert area is not a valid location.' using errcode = '22023';
  end if;
  if zone is not null and not exists (
    select 1 from pg_catalog.pg_timezone_names as names where names.name = zone
  ) then
    raise exception 'Unknown time zone.' using errcode = '22023';
  end if;
  if target_latitude is not null then
    rounded_latitude := round(target_latitude::numeric, 2)::double precision;
    rounded_longitude := round(target_longitude::numeric, 2)::double precision;
  end if;

  insert into public.notification_preferences (user_id) values (caller) on conflict (user_id) do nothing;
  select * into current_row from public.notification_preferences where user_id = caller for update;

  nearby_on := coalesce(target_new_litter_nearby, current_row.new_litter_nearby)
    or coalesce(target_cleanups_nearby, current_row.cleanups_nearby);
  if nearby_on and rounded_latitude is null and current_row.latitude is null then
    raise exception 'Nearby alerts need your location.' using errcode = '22023';
  end if;

  update public.notification_preferences as preference set
    reports_and_cleanups = coalesce(target_reports_and_cleanups, preference.reports_and_cleanups),
    payments = coalesce(target_payments, preference.payments),
    new_litter_nearby = coalesce(target_new_litter_nearby, preference.new_litter_nearby),
    cleanups_nearby = coalesce(target_cleanups_nearby, preference.cleanups_nearby),
    nearby_decided_at = case
      when target_new_litter_nearby is not null or target_cleanups_nearby is not null
        then coalesce(preference.nearby_decided_at, now())
      else preference.nearby_decided_at
    end,
    -- The area is kept only while a nearby alert is on.
    latitude = case when nearby_on then coalesce(rounded_latitude, preference.latitude) end,
    longitude = case when nearby_on then coalesce(rounded_longitude, preference.longitude) end,
    location_updated_at = case
      when not nearby_on then null
      when rounded_latitude is not null then now()
      else preference.location_updated_at
    end,
    time_zone = coalesce(zone, preference.time_zone),
    updated_at = now()
  where preference.user_id = caller;

  return query select * from public.notification_preferences where user_id = caller;
end;
$$;

revoke all on function public.set_notification_preferences(boolean, boolean, boolean, boolean, double precision, double precision, text)
  from public, anon, authenticated, service_role;
grant execute on function public.set_notification_preferences(boolean, boolean, boolean, boolean, double precision, double precision, text)
  to authenticated;

-- Two new notifications: the daily new-litter alert (about an area, not one report) and a
-- cleanup completed nearby (about one report and its cleanup).
alter table public.cleanup_notifications drop constraint cleanup_notifications_event_type_check;
alter table public.cleanup_notifications add constraint cleanup_notifications_event_type_check
  check (event_type = any (array[
    'report_claimed',
    'claim_expiring_soon',
    'claim_expired',
    'completion_submitted',
    'changes_requested',
    'cleanup_approved',
    'cleanup_auto_approved',
    'correction_expired',
    'paid_review_started',
    'paid_cleanup_disputed',
    'cleanup_reward_sent',
    'cleanup_payout_failed',
    'cleanup_fund_increased',
    'cleanup_contribution_refunded',
    'report_renewal_due',
    'report_renewed',
    'report_funding_photos_needed',
    'report_funding_review_required',
    'report_funding_approved',
    'report_funding_rejected',
    'admin_moderation_needed',
    'admin_cleanup_needed',
    'funded_cleanup_completed',
    'nearby_reports_daily',
    'cleanup_completed_nearby'
  ]));

alter table public.cleanup_notifications drop constraint cleanup_notifications_report_or_admin_check;
alter table public.cleanup_notifications add constraint cleanup_notifications_report_or_admin_check
  check (
    (event_type in ('admin_moderation_needed', 'admin_cleanup_needed') and admin_case_id is not null)
    or (event_type = 'nearby_reports_daily' and report_id is null and admin_case_id is null)
    or (
      event_type not in ('admin_moderation_needed', 'admin_cleanup_needed', 'nearby_reports_daily')
      and report_id is not null and admin_case_id is null
    )
  );

alter table public.cleanup_notifications drop constraint cleanup_notifications_target_check;
alter table public.cleanup_notifications add constraint cleanup_notifications_target_check
  check (
    (event_type <> all (array['changes_requested', 'cleanup_approved', 'cleanup_auto_approved']) or review_id is not null)
    and (event_type <> all (array['completion_submitted', 'paid_review_started']) or submission_id is not null)
    and (
      event_type <> all (array[
        'report_renewal_due', 'report_renewed', 'cleanup_fund_increased', 'cleanup_contribution_refunded',
        'report_funding_photos_needed', 'report_funding_review_required', 'report_funding_approved',
        'report_funding_rejected', 'admin_moderation_needed', 'admin_cleanup_needed', 'nearby_reports_daily'
      ])
      or cleanup_attempt_id is null
    )
    and (
      event_type = any (array[
        'report_renewal_due', 'report_renewed', 'cleanup_fund_increased', 'cleanup_contribution_refunded',
        'report_funding_photos_needed', 'report_funding_review_required', 'report_funding_approved',
        'report_funding_rejected', 'admin_moderation_needed', 'admin_cleanup_needed', 'nearby_reports_daily'
      ])
      or cleanup_attempt_id is not null
    )
    and (event_type <> 'cleanup_contribution_refunded' or contribution_id is not null)
  );

-- One completed-nearby notice per member per cleanup.
create unique index cleanup_notifications_completed_nearby_key
  on public.cleanup_notifications (cleanup_attempt_id, user_id)
  where event_type = 'cleanup_completed_nearby';

-- Which preference controls whether a notification reaches the phone.
create or replace function private.notification_topic(event_type text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when event_type in ('admin_moderation_needed', 'admin_cleanup_needed') then 'admin'
    when event_type = 'nearby_reports_daily' then 'new_litter_nearby'
    when event_type = 'cleanup_completed_nearby' then 'cleanups_nearby'
    when event_type in (
      'cleanup_reward_sent', 'cleanup_payout_failed', 'cleanup_fund_increased',
      'cleanup_contribution_refunded', 'paid_cleanup_disputed'
    ) then 'payments'
    else 'reports_and_cleanups'
  end;
$$;

create or replace function private.notification_reaches_phone(target_user_id uuid, event_type text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case private.notification_topic(event_type)
    when 'admin' then true
    when 'payments' then coalesce((select p.payments from public.notification_preferences p where p.user_id = target_user_id), true)
    when 'new_litter_nearby' then coalesce((select p.new_litter_nearby from public.notification_preferences p where p.user_id = target_user_id), false)
    when 'cleanups_nearby' then coalesce((select p.cleanups_nearby from public.notification_preferences p where p.user_id = target_user_id), false)
    else coalesce((select p.reports_and_cleanups from public.notification_preferences p where p.user_id = target_user_id), true)
  end;
$$;

revoke all on function private.notification_topic(text) from public, anon, authenticated, service_role;
revoke all on function private.notification_reaches_phone(uuid, text) from public, anon, authenticated, service_role;

-- The push outbox now skips topics the member switched off (the notice stays in Updates).
create or replace function private.seed_cleanup_push_deliveries()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery_count integer;
begin
  if not private.notification_reaches_phone(new.user_id, new.event_type) then
    return new;
  end if;

  insert into public.cleanup_notification_deliveries (
    notification_id,
    push_device_id,
    created_at,
    updated_at
  )
  select
    new.id,
    push_devices.id,
    new.created_at,
    new.created_at
  from public.push_devices
  where push_devices.user_id = new.user_id
    and push_devices.disabled_at is null
  on conflict do nothing;

  get diagnostics delivery_count = row_count;
  if delivery_count > 0 then
    perform private.queue_cleanup_push_worker(new.id);
  end if;

  return new;
exception
  when others then
    raise warning 'Unable to seed cleanup push deliveries: %', sqlerrm;
    return new;
end;
$$;

revoke all on function private.seed_cleanup_push_deliveries()
  from public, anon, authenticated, service_role;

-- Production settings for the nearby alerts, in one place.
create or replace function private.nearby_report_alert_send_time()
returns time
language sql
immutable
security invoker
set search_path = ''
as $$
  select time '17:00';
$$;

create or replace function private.nearby_alert_radius_miles()
returns double precision
language sql
immutable
security invoker
set search_path = ''
as $$
  select 50::double precision;
$$;

-- Great-circle distance in miles.
create or replace function private.miles_between(
  first_latitude double precision,
  first_longitude double precision,
  second_latitude double precision,
  second_longitude double precision
)
returns double precision
language sql
immutable
security invoker
set search_path = ''
as $$
  select 3958.8 * 2 * asin(least(1, sqrt(
    power(sin(radians(second_latitude - first_latitude) / 2), 2)
    + cos(radians(first_latitude)) * cos(radians(second_latitude))
      * power(sin(radians(second_longitude - first_longitude) / 2), 2)
  )));
$$;

revoke all on function private.nearby_report_alert_send_time() from public, anon, authenticated, service_role;
revoke all on function private.nearby_alert_radius_miles() from public, anon, authenticated, service_role;
revoke all on function private.miles_between(double precision, double precision, double precision, double precision)
  from public, anon, authenticated, service_role;

-- Whether two members are kept apart by a block, either way.
create or replace function private.members_blocked(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks as block
    where (block.blocker_id = first_user_id and block.blocked_id = second_user_id)
       or (block.blocker_id = second_user_id and block.blocked_id = first_user_id)
  );
$$;

revoke all on function private.members_blocked(uuid, uuid) from public, anon, authenticated, service_role;

-- New reports that still need a cleanup near a member, posted after `since`. Their own reports,
-- reports they hid, sample reports, and reports from members either of them blocked never count.
create or replace function private.count_new_nearby_reports(
  target_user_id uuid,
  target_latitude double precision,
  target_longitude double precision,
  since timestamptz
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.reports as report
  where report.created_at > since
    and report.created_at <= now()
    and report.is_published
    and not report.is_sample
    and report.cancelled_at is null
    and report.expired_at is null
    and report.cleanup_state = 'available'
    and report.expires_at > now()
    and report.latitude between target_latitude - private.nearby_alert_radius_miles() / 69.0
      and target_latitude + private.nearby_alert_radius_miles() / 69.0
    and private.miles_between(target_latitude, target_longitude, report.latitude, report.longitude)
      <= private.nearby_alert_radius_miles()
    and report.user_id is distinct from target_user_id
    and not private.members_blocked(target_user_id, report.user_id)
    and not exists (
      select 1 from public.report_preferences as preference
      where preference.user_id = target_user_id
        and preference.report_id = report.id
        and preference.kind = 'hidden'
        and preference.enabled
    );
$$;

revoke all on function private.count_new_nearby_reports(uuid, double precision, double precision, timestamptz)
  from public, anon, authenticated, service_role;

-- Runs every 15 minutes. Each member with the daily alert on is checked once a day, the first run
-- at or after 5 pm in their time zone; the alert is sent only when something new is nearby.
create or replace function private.send_nearby_report_alerts(batch_limit integer default 500)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  member record;
  new_reports integer;
  sent integer := 0;
begin
  for member in
    select p.user_id, p.latitude, p.longitude, p.last_checked_at,
      (now() at time zone p.time_zone)::date as local_date
    from public.notification_preferences as p
    where p.new_litter_nearby
      and p.latitude is not null
      and (now() at time zone p.time_zone)::time >= private.nearby_report_alert_send_time()
      and (p.last_checked_on is null or p.last_checked_on < (now() at time zone p.time_zone)::date)
    order by p.last_checked_at nulls first, p.user_id
    limit greatest(1, least(batch_limit, 5000))
    for update of p skip locked
  loop
    new_reports := private.count_new_nearby_reports(
      member.user_id,
      member.latitude,
      member.longitude,
      greatest(coalesce(member.last_checked_at, now() - interval '24 hours'), now() - interval '24 hours')
    );

    if new_reports > 0 then
      insert into public.cleanup_notifications (user_id, event_type)
      values (member.user_id, 'nearby_reports_daily');
      sent := sent + 1;
    end if;

    update public.notification_preferences
    set last_checked_on = member.local_date,
        last_checked_at = now(),
        last_sent_at = case when new_reports > 0 then now() else last_sent_at end,
        updated_at = now()
    where user_id = member.user_id;
  end loop;

  return sent;
end;
$$;

revoke all on function private.send_nearby_report_alerts(integer) from public, anon, authenticated, service_role;

-- A cleanup was completed: tell members nearby who turned the alert on. Not the cleaner or the
-- reporter (they get their own updates), not contributors (they hear it was their cleanup), and
-- nobody kept apart from the cleaner or reporter by a block, or who hid the report.
create or replace function private.notify_cleanup_completed_nearby()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  report record;
begin
  if new.status <> 'completed' or old.status = 'completed' then
    return new;
  end if;

  select r.id, r.user_id, r.latitude, r.longitude, r.is_published, r.is_sample
  into report
  from public.reports as r
  where r.id = new.report_id;
  if not found or not report.is_published or report.is_sample
    or report.latitude is null or report.longitude is null then
    return new;
  end if;

  insert into public.cleanup_notifications (user_id, cleanup_attempt_id, report_id, event_type)
  select p.user_id, new.id, report.id, 'cleanup_completed_nearby'
  from public.notification_preferences as p
  where p.cleanups_nearby
    and p.latitude between report.latitude - private.nearby_alert_radius_miles() / 69.0
      and report.latitude + private.nearby_alert_radius_miles() / 69.0
    and private.miles_between(p.latitude, p.longitude, report.latitude, report.longitude)
      <= private.nearby_alert_radius_miles()
    and p.user_id is distinct from new.cleaner_id
    and p.user_id is distinct from report.user_id
    and not exists (
      select 1 from public.cleanup_contributions as c
      where c.cleanup_attempt_id = new.id and c.contributor_id = p.user_id
        and c.status in ('succeeded', 'paid_out')
    )
    and not private.members_blocked(p.user_id, new.cleaner_id)
    and not private.members_blocked(p.user_id, report.user_id)
    and not exists (
      select 1 from public.report_preferences as preference
      where preference.user_id = p.user_id and preference.report_id = report.id
        and preference.kind = 'hidden' and preference.enabled
    )
  on conflict do nothing;

  return new;
exception
  when others then
    -- A notification problem must never undo a cleanup approval.
    raise warning 'Unable to notify members near a completed cleanup: %', sqlerrm;
    return new;
end;
$$;

revoke all on function private.notify_cleanup_completed_nearby() from public, anon, authenticated, service_role;

create trigger cleanup_attempts_notify_nearby_members
  after update of status on public.cleanup_attempts
  for each row execute function private.notify_cleanup_completed_nearby();

do $$
declare
  existing_job record;
begin
  if to_regclass('cron.job') is null then
    return;
  end if;

  for existing_job in
    select jobid from cron.job where jobname = 'litterbugs-nearby-report-alerts'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'litterbugs-nearby-report-alerts',
    '*/15 * * * *',
    'select private.send_nearby_report_alerts();'
  );
end;
$$;
