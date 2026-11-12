-- Daily "new litter near you" alert.
--
-- Members who turn the alert on get one notification a day, at 5 pm in their own time zone,
-- when at least one new report that still needs a cleanup was posted within 50 miles of their
-- area since the last check. Their area is their phone's location rounded to two decimal places
-- (about two thirds of a mile); it is stored only while the alert is on and cleared when it is
-- turned off. The notification goes through the existing cleanup notification outbox, so it
-- appears in Updates and is pushed to every registered device like any other update.

create table public.nearby_report_alerts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  latitude double precision,
  longitude double precision,
  time_zone text not null default 'UTC',
  location_updated_at timestamptz,
  last_checked_on date,
  last_checked_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nearby_report_alerts_area_pair_check check ((latitude is null) = (longitude is null)),
  constraint nearby_report_alerts_area_range_check check (
    latitude is null or (latitude between -90 and 90 and longitude between -180 and 180)
  ),
  constraint nearby_report_alerts_off_has_no_area_check check (enabled or latitude is null)
);

create index nearby_report_alerts_due_idx
  on public.nearby_report_alerts (last_checked_on)
  where enabled and latitude is not null;

alter table public.nearby_report_alerts enable row level security;
revoke all on table public.nearby_report_alerts from public, anon, authenticated;
grant select on table public.nearby_report_alerts to authenticated;
grant all on table public.nearby_report_alerts to service_role;

create policy "Members read their own nearby report alert"
  on public.nearby_report_alerts for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_permanent_user()));

comment on table public.nearby_report_alerts is
  'Opt-in daily alert for new reports near a member. The area is a rounded phone location, kept only while the alert is on.';

-- Turn the alert on or off, and keep its area and time zone current while it is on.
create or replace function public.set_nearby_report_alerts(
  target_enabled boolean,
  target_latitude double precision default null,
  target_longitude double precision default null,
  target_time_zone text default null
)
returns table (alerts_enabled boolean, has_area boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  zone text := nullif(btrim(target_time_zone), '');
  rounded_latitude double precision;
  rounded_longitude double precision;
begin
  if caller is null or not public.is_permanent_user() then
    raise exception 'Sign in to change nearby report alerts.' using errcode = '42501';
  end if;
  if target_enabled is null then
    raise exception 'Choose whether nearby report alerts are on.' using errcode = '22023';
  end if;
  if (target_latitude is null) <> (target_longitude is null) then
    raise exception 'A nearby report alert area needs both a latitude and a longitude.' using errcode = '22023';
  end if;
  if target_latitude is not null and (
    target_latitude = 'NaN'::double precision or target_longitude = 'NaN'::double precision
    or target_latitude not between -90 and 90 or target_longitude not between -180 and 180
  ) then
    raise exception 'The nearby report alert area is not a valid location.' using errcode = '22023';
  end if;
  if zone is not null and not exists (
    select 1 from pg_catalog.pg_timezone_names as names where names.name = zone
  ) then
    raise exception 'Unknown time zone.' using errcode = '22023';
  end if;

  if target_enabled and target_latitude is not null then
    rounded_latitude := round(target_latitude::numeric, 2)::double precision;
    rounded_longitude := round(target_longitude::numeric, 2)::double precision;
  end if;

  insert into public.nearby_report_alerts as alert (
    user_id, enabled, latitude, longitude, time_zone, location_updated_at
  )
  values (
    caller,
    target_enabled,
    rounded_latitude,
    rounded_longitude,
    coalesce(zone, 'UTC'),
    case when rounded_latitude is not null then now() end
  )
  on conflict (user_id) do update set
    enabled = excluded.enabled,
    latitude = case when excluded.enabled then coalesce(excluded.latitude, alert.latitude) end,
    longitude = case when excluded.enabled then coalesce(excluded.longitude, alert.longitude) end,
    time_zone = coalesce(zone, alert.time_zone),
    location_updated_at = case
      when not excluded.enabled then null
      when excluded.latitude is not null then now()
      else alert.location_updated_at
    end,
    updated_at = now();

  return query
    select alert.enabled, alert.latitude is not null
    from public.nearby_report_alerts as alert
    where alert.user_id = caller;
end;
$$;

revoke all on function public.set_nearby_report_alerts(boolean, double precision, double precision, text)
  from public, anon, authenticated, service_role;
grant execute on function public.set_nearby_report_alerts(boolean, double precision, double precision, text)
  to authenticated;

-- The alert is a notification about an area, not one report or cleanup.
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
    'nearby_reports_daily'
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

-- Production settings for the alert, in one place.
create or replace function private.nearby_report_alert_send_time()
returns time
language sql
immutable
security invoker
set search_path = ''
as $$
  select time '17:00';
$$;

create or replace function private.nearby_report_alert_radius_miles()
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
revoke all on function private.nearby_report_alert_radius_miles() from public, anon, authenticated, service_role;
revoke all on function private.miles_between(double precision, double precision, double precision, double precision)
  from public, anon, authenticated, service_role;

-- New reports that still need a cleanup near a member, posted after `since`. Their own reports,
-- reports they hid, and reports from members either of them blocked never count.
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
    and report.latitude between target_latitude - private.nearby_report_alert_radius_miles() / 69.0
      and target_latitude + private.nearby_report_alert_radius_miles() / 69.0
    and private.miles_between(target_latitude, target_longitude, report.latitude, report.longitude)
      <= private.nearby_report_alert_radius_miles()
    and report.user_id is distinct from target_user_id
    and not exists (
      select 1 from public.user_blocks as block
      where (block.blocker_id = target_user_id and block.blocked_id = report.user_id)
         or (block.blocker_id = report.user_id and block.blocked_id = target_user_id)
    )
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

-- Runs every 15 minutes. Each member is checked once a day, the first run at or after 5 pm in
-- their time zone; the alert is sent only when something new was reported nearby.
create or replace function private.send_nearby_report_alerts(batch_limit integer default 500)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  alert record;
  new_reports integer;
  sent integer := 0;
begin
  for alert in
    select a.user_id, a.latitude, a.longitude, a.time_zone, a.last_checked_at,
      (now() at time zone a.time_zone)::date as local_date
    from public.nearby_report_alerts as a
    where a.enabled
      and a.latitude is not null
      and (now() at time zone a.time_zone)::time >= private.nearby_report_alert_send_time()
      and (a.last_checked_on is null or a.last_checked_on < (now() at time zone a.time_zone)::date)
    order by a.last_checked_at nulls first, a.user_id
    limit greatest(1, least(batch_limit, 5000))
    for update of a skip locked
  loop
    new_reports := private.count_new_nearby_reports(
      alert.user_id,
      alert.latitude,
      alert.longitude,
      greatest(coalesce(alert.last_checked_at, now() - interval '24 hours'), now() - interval '24 hours')
    );

    if new_reports > 0 then
      insert into public.cleanup_notifications (user_id, event_type)
      values (alert.user_id, 'nearby_reports_daily');
      sent := sent + 1;
    end if;

    update public.nearby_report_alerts
    set last_checked_on = alert.local_date,
        last_checked_at = now(),
        last_sent_at = case when new_reports > 0 then now() else last_sent_at end,
        updated_at = now()
    where user_id = alert.user_id;
  end loop;

  return sent;
end;
$$;

revoke all on function private.send_nearby_report_alerts(integer) from public, anon, authenticated, service_role;

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
