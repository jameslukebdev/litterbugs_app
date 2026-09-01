\set ON_ERROR_STOP on

begin;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'rank_point_events'
      and policyname = 'Rank point events are server managed'
      and permissive = 'RESTRICTIVE'
  ) then
    raise exception 'Rank ledger deny-all RLS policy is missing';
  end if;
end;
$$;

insert into auth.users (
  id,
  email,
  is_anonymous,
  raw_user_meta_data,
  created_at
) values
  (
    '11111111-aaaa-4111-8111-111111111111',
    'rank-reporter@example.com',
    false,
    '{"full_name":"Rank Reporter"}',
    now()
  ),
  (
    '22222222-bbbb-4222-8222-222222222222',
    'rank-cleaner@example.com',
    false,
    '{"full_name":"Rank Cleaner"}',
    now()
  ),
  (
    '33333333-cccc-4333-8333-333333333333',
    null,
    true,
    '{}',
    now()
  );

insert into public.profiles (id, display_name)
values (
  '33333333-cccc-4333-8333-333333333333',
  'Anonymous Rank Fixture'
);

insert into public.reports (
  id,
  user_id,
  title,
  latitude,
  longitude,
  created_at,
  expires_at
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '11111111-aaaa-4111-8111-111111111111',
  'Rank report one',
  35,
  -82,
  '2026-08-01T10:00:00Z',
  now() + interval '30 days'
);

do $$
begin
  if public.get_rank_points('11111111-aaaa-4111-8111-111111111111') <> 0 then
    raise exception 'Unvalidated report received rank points';
  end if;
end;
$$;

update public.reports
set funding_eligibility = 'eligible'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

do $$
begin
  if public.get_rank_points('11111111-aaaa-4111-8111-111111111111') <> 1 then
    raise exception 'First validated report did not move rank points from zero to one';
  end if;

  begin
    insert into public.reports (
      id,
      user_id,
      title,
      latitude,
      longitude,
      created_at,
      expires_at
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      '11111111-aaaa-4111-8111-111111111111',
      'Replayed report one',
      35,
      -82,
      '2026-08-01T10:00:00Z',
      now() + interval '30 days'
    );
    raise exception 'Replayed report insert unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;

  if public.get_rank_points('11111111-aaaa-4111-8111-111111111111') <> 1 then
    raise exception 'Replayed report insert duplicated rank points';
  end if;
end;
$$;

insert into public.reports (
  id,
  user_id,
  title,
  latitude,
  longitude,
  created_at,
  expires_at
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  '11111111-aaaa-4111-8111-111111111111',
  'Rank report two',
  35.01,
  -82,
  '2026-08-02T10:00:00Z',
  now() + interval '30 days'
);

update public.reports
set funding_eligibility = 'eligible'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';

do $$
begin
  if public.get_rank_points('11111111-aaaa-4111-8111-111111111111') <> 2 then
    raise exception 'Second report did not move rank points from one to two';
  end if;
end;
$$;

delete from public.reports
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

do $$
begin
  if public.get_rank_points('11111111-aaaa-4111-8111-111111111111') <> 2 then
    raise exception 'Deleting a report removed an earned point';
  end if;
end;
$$;

insert into public.reports (
  id,
  user_id,
  title,
  latitude,
  longitude,
  created_at,
  expires_at
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    '11111111-aaaa-4111-8111-111111111111',
    'Rank cleanup report',
    35.02,
    -82,
    '2026-08-03T10:00:00Z',
    now() + interval '30 days'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    '33333333-cccc-4333-8333-333333333333',
    'Anonymous report receives no points',
    35.03,
    -82,
    '2026-08-04T10:00:00Z',
    now() + interval '30 days'
  );

update public.reports
set funding_eligibility = 'eligible'
where id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'
);

do $$
declare
  report_event_count integer;
  anonymous_event_count integer;
begin
  select count(*) into report_event_count
  from public.rank_point_events
  where user_id = '11111111-aaaa-4111-8111-111111111111'
    and source_type = 'report_created';

  select count(*) into anonymous_event_count
  from public.rank_point_events
  where user_id = '33333333-cccc-4333-8333-333333333333';

  if report_event_count <> 3 then
    raise exception 'Each permanent-user report did not receive exactly one event';
  end if;
  if anonymous_event_count <> 0 then
    raise exception 'Anonymous user received report points';
  end if;
end;
$$;

-- A completed location remains eligible for a fresh report, but a nearby
-- repeat inside seven days does not farm another rank point.
update public.reports
set cleanup_state = 'completed'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';

insert into public.reports (
  id, user_id, title, latitude, longitude, created_at, expires_at
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
  '11111111-aaaa-4111-8111-111111111111',
  'Fresh litter at a recently completed location',
  35.02,
  -82,
  '2026-08-06T10:00:00Z',
  now() + interval '30 days'
);

update public.reports
set funding_eligibility = 'eligible'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5';

do $$
begin
  if (
    select funding_eligibility
    from public.reports
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'
  ) <> 'eligible' then
    raise exception 'Completed location was not eligible for reporting again';
  end if;
  if public.get_rank_points('11111111-aaaa-4111-8111-111111111111') <> 3 then
    raise exception 'Recent repeat location unexpectedly earned rank credit';
  end if;
end;
$$;

insert into public.reports (
  id, user_id, title, latitude, longitude, created_at, expires_at
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
  '11111111-aaaa-4111-8111-111111111111',
  'Fresh litter after the repeat-point window',
  35.02,
  -82,
  '2026-08-12T10:00:01Z',
  now() + interval '30 days'
);

update public.reports
set funding_eligibility = 'eligible'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6';

do $$
begin
  if public.get_rank_points('11111111-aaaa-4111-8111-111111111111') <> 4 then
    raise exception 'Eligible repeat location did not earn credit after seven days';
  end if;
end;
$$;

-- Six otherwise valid reports inside one day can create six records, but only
-- five may add rank credit.
insert into public.reports (
  id, user_id, title, latitude, longitude, created_at, expires_at
)
select
  (
    '30000000-0000-4000-8000-'
    || lpad(sequence_number::text, 12, '0')
  )::uuid,
  '11111111-aaaa-4111-8111-111111111111',
  format('Daily cap report %s', sequence_number),
  37 + sequence_number * 0.01,
  -82,
  '2026-08-20T10:00:00Z'::timestamptz
    + (sequence_number || ' minutes')::interval,
  now() + interval '30 days'
from generate_series(1, 6) as capped_reports(sequence_number);

do $$
declare
  report_id uuid;
begin
  for report_id in
    select id
    from public.reports
    where title like 'Daily cap report %'
    order by created_at
  loop
    update public.reports
    set funding_eligibility = 'eligible'
    where id = report_id;
  end loop;
end;
$$;

do $$
begin
  if public.get_rank_points('11111111-aaaa-4111-8111-111111111111') <> 9 then
    raise exception 'Rolling report-point cap did not stop the sixth daily award';
  end if;
end;
$$;

do $$
begin
  perform private.award_rank_point_event(
    '11111111-aaaa-4111-8111-111111111111',
    'report_created',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    now()
  );
  perform private.award_rank_point_event(
    '11111111-aaaa-4111-8111-111111111111',
    'report_created',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    now()
  );

  if (
    select count(*)
    from public.rank_point_events
    where source_type = 'report_created'
      and source_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
  ) <> 1 then
    raise exception 'Repeated report award created duplicate events';
  end if;

  begin
    perform private.award_rank_point_event(
      '22222222-bbbb-4222-8222-222222222222',
      'report_created',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      now()
    );
    raise exception 'Mismatched report owner received points';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.rank_point_events (
      user_id,
      source_type,
      source_id,
      points
    ) values (
      '11111111-aaaa-4111-8111-111111111111',
      'report_created',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      999
    );
    raise exception 'Invalid client-controlled point value passed constraints';
  exception
    when check_violation then null;
  end;
end;
$$;

insert into public.reports (
  id,
  user_id,
  title,
  latitude,
  longitude,
  created_at,
  expires_at
)
select
  (
    '20000000-0000-4000-8000-'
    || lpad(sequence_number::text, 12, '0')
  )::uuid,
  '22222222-bbbb-4222-8222-222222222222',
  format('Cleaner rank seed report %s', sequence_number),
  36 + sequence_number * 0.01,
  -82,
  '2026-04-01T10:00:00Z'::timestamptz
    + (sequence_number || ' days')::interval * 8,
  now() + interval '30 days'
from generate_series(1, 10) as rank_seed(sequence_number);

update public.reports
set funding_eligibility = 'eligible'
where user_id = '22222222-bbbb-4222-8222-222222222222';

do $$
begin
  if public.get_rank_points('22222222-bbbb-4222-8222-222222222222') <> 10 then
    raise exception 'Cleanup test user did not begin with ten points';
  end if;
end;
$$;

insert into public.cleanup_attempts (
  id,
  report_id,
  cleaner_id,
  reporter_id,
  waiver_version,
  guidelines_version,
  status,
  is_self_cleanup,
  claimed_at,
  claim_expires_at,
  last_activity_at
)
select
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  '22222222-bbbb-4222-8222-222222222222',
  '11111111-aaaa-4111-8111-111111111111',
  waiver_version,
  guidelines_version,
  'claimed',
  false,
  '2026-08-05T10:00:00Z',
  '2026-08-06T10:00:00Z',
  '2026-08-05T10:00:00Z'
from public.cleanup_waiver_versions
where is_active and retired_at is null;

do $$
begin
  if public.get_rank_points('22222222-bbbb-4222-8222-222222222222') <> 10 then
    raise exception 'Claiming a cleanup awarded points before completion';
  end if;
end;
$$;

update public.cleanup_attempts
set last_activity_at = '2026-08-05T10:30:00Z'
where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

do $$
begin
  if public.get_rank_points('22222222-bbbb-4222-8222-222222222222') <> 10 then
    raise exception 'In-progress cleanup activity awarded points before completion';
  end if;
end;
$$;

insert into public.cleanup_submissions (
  id,
  cleanup_attempt_id,
  submission_number,
  submitted_by,
  description,
  created_at
) values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  1,
  '22222222-bbbb-4222-8222-222222222222',
  'Removed litter for rank ledger testing.',
  '2026-08-05T11:00:00Z'
);

insert into public.cleanup_submission_photos (
  submission_id,
  storage_path,
  display_order,
  uploaded_at
) values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'rank-test/after.png',
  1,
  '2026-08-05T11:00:00Z'
);

update public.cleanup_attempts
set
  status = 'completion_submitted',
  first_submitted_at = '2026-08-05T11:00:00Z',
  latest_submitted_at = '2026-08-05T11:00:00Z',
  review_due_at = '2026-08-07T11:00:00Z',
  last_activity_at = '2026-08-05T11:00:00Z'
where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

do $$
begin
  if public.get_rank_points('22222222-bbbb-4222-8222-222222222222') <> 10 then
    raise exception 'Submitting cleanup evidence awarded points before completion';
  end if;
end;
$$;

update public.cleanup_attempts
set
  status = 'completed',
  completed_at = '2026-08-05T12:00:00Z',
  last_activity_at = '2026-08-05T12:00:00Z',
  final_submission_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  final_reviewer_id = '11111111-aaaa-4111-8111-111111111111',
  approval_method = 'reporter_approved'
where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

do $$
begin
  if public.get_rank_points('22222222-bbbb-4222-8222-222222222222') <> 13 then
    raise exception 'Completed cleanup did not move rank points from ten to thirteen';
  end if;

  if public.get_rank_points('22222222-bbbb-4222-8222-222222222222') <> 13 then
    raise exception 'Reloading completed cleanup changed rank points';
  end if;

  update public.cleanup_attempts
  set status = 'completed'
  where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  perform private.award_rank_point_event(
    '22222222-bbbb-4222-8222-222222222222',
    'cleanup_completed',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    now()
  );

  if (
    select count(*)
    from public.rank_point_events
    where source_type = 'cleanup_completed'
      and source_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ) <> 1 then
    raise exception 'Repeated completion created duplicate events';
  end if;

  if public.get_rank_points('22222222-bbbb-4222-8222-222222222222') <> 13 then
    raise exception 'Repeated completion changed rank points';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from public.rank_point_events
    where source_type = 'report_created'
      and source_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  ) then
    raise exception 'Deleting a report removed earned points';
  end if;

  delete from public.rank_point_events
  where (
    source_type = 'report_created'
    and source_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
  ) or (
    source_type = 'cleanup_completed'
    and source_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  );

  perform private.backfill_rank_point_events();
  perform private.backfill_rank_point_events();

  if (
    select count(*)
    from public.rank_point_events
    where source_type = 'report_created'
      and source_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
  ) <> 1 then
    raise exception 'Report backfill was missing or duplicated';
  end if;
  if (
    select count(*)
    from public.rank_point_events
    where source_type = 'cleanup_completed'
      and source_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ) <> 1 then
    raise exception 'Cleanup backfill was missing or duplicated';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-aaaa-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-aaaa-4111-8111-111111111111","is_anonymous":false}',
  true
);

do $$
begin
  if has_table_privilege(
    'authenticated',
    'public.rank_point_events',
    'select,insert,update,delete'
  ) then
    raise exception 'Authenticated role received direct ledger privileges';
  end if;
  begin
    insert into public.rank_point_events (
      user_id,
      source_type,
      source_id,
      points
    ) values (
      '11111111-aaaa-4111-8111-111111111111',
      'report_created',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      1
    );
    raise exception 'Authenticated client inserted a ledger event';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform private.award_rank_point_event(
      '11111111-aaaa-4111-8111-111111111111',
      'report_created',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      now()
    );
    raise exception 'Authenticated client called the private award function';
  exception
    when insufficient_privilege then null;
  end;

  if public.get_rank_points('11111111-aaaa-4111-8111-111111111111') <> 9 then
    raise exception 'Aggregate-only rank RPC returned the wrong total';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '33333333-cccc-4333-8333-333333333333',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-cccc-4333-8333-333333333333","is_anonymous":true}',
  true
);

do $$
begin
  if public.get_rank_points('33333333-cccc-4333-8333-333333333333') <> 0 then
    raise exception 'Guest rank total was not zero';
  end if;

  begin
    insert into public.rank_point_events (
      user_id,
      source_type,
      source_id,
      points
    ) values (
      '33333333-cccc-4333-8333-333333333333',
      'report_created',
      'ffffffff-ffff-4fff-8fff-ffffffffffff',
      1
    );
    raise exception 'Guest inserted a ledger event';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role anon;

do $$
begin
  if public.get_rank_points('11111111-aaaa-4111-8111-111111111111') <> 9 then
    raise exception 'Public aggregate rank total is unavailable';
  end if;

  begin
    perform count(*) from public.rank_point_events;
    raise exception 'Anon role read raw rank events';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
