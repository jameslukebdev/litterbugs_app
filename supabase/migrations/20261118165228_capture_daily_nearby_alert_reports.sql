-- Keep the report membership of each new nearby alert without retaining its area.
-- Existing rows have no recoverable membership snapshot and stay null.
alter table public.cleanup_notifications
  add column nearby_report_ids uuid[],
  add constraint cleanup_notifications_nearby_report_ids_check
    check (nearby_report_ids is null or (event_type = 'nearby_reports_daily' and cardinality(nearby_report_ids) > 0));

create or replace function private.new_nearby_report_ids(
  target_user_id uuid,
  target_latitude double precision,
  target_longitude double precision,
  since timestamptz
)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(report.id order by report.created_at desc, report.id), '{}'::uuid[])
  from public.reports as report
  where report.created_at > since
    and report.created_at <= now()
    and report.is_published
    and not report.is_sample
    and report.moderated_at is null
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

revoke all on function private.new_nearby_report_ids(uuid, double precision, double precision, timestamptz)
  from public, anon, authenticated, service_role;

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
  select cardinality(private.new_nearby_report_ids(target_user_id, target_latitude, target_longitude, since));
$$;

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
  new_reports uuid[];
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
    new_reports := private.new_nearby_report_ids(
      member.user_id,
      member.latitude,
      member.longitude,
      greatest(coalesce(member.last_checked_at, now() - interval '24 hours'), now() - interval '24 hours')
    );

    if cardinality(new_reports) > 0 then
      insert into public.cleanup_notifications (user_id, event_type, nearby_report_ids)
      values (member.user_id, 'nearby_reports_daily', new_reports);
      sent := sent + 1;
    end if;

    update public.notification_preferences
    set last_checked_on = member.local_date,
        last_checked_at = now(),
        last_sent_at = case when cardinality(new_reports) > 0 then now() else last_sent_at end,
        updated_at = now()
    where user_id = member.user_id;
  end loop;

  return sent;
end;
$$;

revoke all on function private.send_nearby_report_alerts(integer) from public, anon, authenticated, service_role;
