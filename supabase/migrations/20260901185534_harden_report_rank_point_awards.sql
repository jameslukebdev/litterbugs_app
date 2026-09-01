-- Report points are earned only after the existing Gemini-backed funding
-- review accepts the report. Reporting itself remains unrestricted: nearby or
-- previously completed locations can still create a fresh report and proceed
-- through funding review, but repeated reports do not necessarily earn rank
-- credit.

drop trigger if exists reports_award_rank_points on public.reports;

create or replace function private.award_rank_point_event(
  target_user_id uuid,
  target_source_type text,
  target_source_id uuid,
  target_created_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  awarded_points smallint;
  source_created_at timestamptz;
  report_record public.reports%rowtype;
begin
  if target_user_id is null or target_source_id is null then
    return;
  end if;

  if not exists (
    select 1
    from auth.users
    where id = target_user_id
      and coalesce(is_anonymous, false) is false
  ) then
    return;
  end if;

  -- Serialize awards for one user so concurrent validation callbacks cannot
  -- race the rolling cap or nearby-report check.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rank-points:' || target_user_id::text, 0)
  );

  case target_source_type
    when 'report_created' then
      awarded_points := 1;

      select * into report_record
      from public.reports
      where id = target_source_id
        and user_id = target_user_id;

      if not found then
        raise check_violation using message = 'rank_report_source_invalid';
      end if;

      -- A report may remain visible and usable without earning rank credit.
      if report_record.funding_eligibility <> 'eligible' then
        return;
      end if;

      source_created_at := coalesce(
        report_record.created_at,
        target_created_at,
        now()
      );

      -- At most five validated report points in a rolling 24-hour window.
      if (
        select count(*)
        from public.rank_point_events
        where user_id = target_user_id
          and source_type = 'report_created'
          and created_at > source_created_at - interval '24 hours'
          and created_at <= source_created_at
      ) >= 5 then
        return;
      end if;

      -- Keep reports at newly dirty locations eligible, including locations
      -- whose earlier cleanup is complete, while withholding repeat-location
      -- rank credit inside a seven-day window. Twenty-five metres absorbs GPS
      -- drift without treating nearby, distinct litter as the same location.
      if report_record.latitude is not null
        and report_record.longitude is not null
        and exists (
          select 1
          from public.rank_point_events as events
          join public.reports as earlier_reports
            on earlier_reports.id = events.source_id
          where events.user_id = target_user_id
            and events.source_type = 'report_created'
            and events.source_id <> target_source_id
            and events.created_at > source_created_at - interval '7 days'
            and events.created_at <= source_created_at
            and earlier_reports.latitude is not null
            and earlier_reports.longitude is not null
            and 2 * 6371000 * pg_catalog.asin(
              pg_catalog.sqrt(
                least(
                  1::double precision,
                  pg_catalog.power(
                    pg_catalog.sin(
                      pg_catalog.radians(
                        (earlier_reports.latitude - report_record.latitude) / 2
                      )
                    ),
                    2
                  )
                  + pg_catalog.cos(pg_catalog.radians(report_record.latitude))
                  * pg_catalog.cos(pg_catalog.radians(earlier_reports.latitude))
                  * pg_catalog.power(
                    pg_catalog.sin(
                      pg_catalog.radians(
                        (earlier_reports.longitude - report_record.longitude) / 2
                      )
                    ),
                    2
                  )
                )
              )
            ) < 25
        ) then
        return;
      end if;

    when 'cleanup_completed' then
      awarded_points := 3;
      source_created_at := coalesce(target_created_at, now());

      if not exists (
        select 1
        from public.cleanup_attempts
        where id = target_source_id
          and cleaner_id = target_user_id
          and status = 'completed'
      ) then
        raise check_violation using message = 'rank_cleanup_source_invalid';
      end if;
    else
      raise check_violation using message = 'rank_source_type_invalid';
  end case;

  insert into public.rank_point_events (
    user_id,
    source_type,
    source_id,
    points,
    created_at
  ) values (
    target_user_id,
    target_source_type,
    target_source_id,
    awarded_points,
    source_created_at
  )
  on conflict (source_type, source_id) do nothing;
end;
$$;

revoke all on function private.award_rank_point_event(
  uuid,
  text,
  uuid,
  timestamptz
) from public, anon, authenticated, service_role;

create or replace function private.award_validated_report_rank_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.award_rank_point_event(
    new.user_id,
    'report_created',
    new.id,
    new.created_at
  );
  return new;
end;
$$;

revoke all on function private.award_validated_report_rank_points()
  from public, anon, authenticated, service_role;

drop trigger if exists reports_award_rank_points_when_inserted_eligible
  on public.reports;
create trigger reports_award_rank_points_when_inserted_eligible
  after insert on public.reports
  for each row
  when (new.funding_eligibility = 'eligible')
  execute function private.award_validated_report_rank_points();

drop trigger if exists reports_award_rank_points_when_validated
  on public.reports;
create trigger reports_award_rank_points_when_validated
  after update of funding_eligibility on public.reports
  for each row
  when (
    new.funding_eligibility = 'eligible'
    and old.funding_eligibility is distinct from new.funding_eligibility
  )
  execute function private.award_validated_report_rank_points();

comment on function private.award_validated_report_rank_points() is
  'Awards anti-gamed report rank credit only after server-side funding validation.';

create or replace function private.backfill_rank_point_events()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_record record;
begin
  for source_record in
    select reports.id, reports.user_id, reports.created_at
    from public.reports as reports
    join auth.users as users on users.id = reports.user_id
    where reports.user_id is not null
      and reports.funding_eligibility = 'eligible'
      and coalesce(users.is_anonymous, false) is false
    order by reports.created_at, reports.id
  loop
    perform private.award_rank_point_event(
      source_record.user_id,
      'report_created',
      source_record.id,
      source_record.created_at
    );
  end loop;

  for source_record in
    select
      attempts.id,
      attempts.cleaner_id,
      coalesce(
        attempts.completed_at,
        attempts.last_activity_at,
        attempts.claimed_at
      ) as event_created_at
    from public.cleanup_attempts as attempts
    join auth.users as users on users.id = attempts.cleaner_id
    where attempts.cleaner_id is not null
      and attempts.status = 'completed'
      and coalesce(users.is_anonymous, false) is false
    order by event_created_at, attempts.id
  loop
    perform private.award_rank_point_event(
      source_record.cleaner_id,
      'cleanup_completed',
      source_record.id,
      source_record.event_created_at
    );
  end loop;
end;
$$;

revoke all on function private.backfill_rank_point_events()
  from public, anon, authenticated, service_role;
