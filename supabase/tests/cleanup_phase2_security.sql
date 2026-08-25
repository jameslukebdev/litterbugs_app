-- Run only against a disposable Supabase database after loading the committed
-- baseline and migrations. The transaction rolls back every test fixture.
\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'phase2-reporter@example.com',
    false,
    '{"full_name":"Phase 2 Reporter"}',
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'phase2-cleaner-a@example.com',
    false,
    '{"full_name":"Phase 2 Cleaner A"}',
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'phase2-cleaner-b@example.com',
    false,
    '{"full_name":"Phase 2 Cleaner B"}',
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    null,
    true,
    '{}',
    now()
  );

insert into public.cleanup_waiver_acceptances (
  user_id,
  waiver_version,
  guidelines_version
)
values
  (
    '22222222-2222-4222-8222-222222222222',
    'cleanup-waiver-development-v1',
    'cleanup-guidelines-development-v1'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'cleanup-waiver-development-v1',
    'cleanup-guidelines-development-v1'
  );

insert into public.reports (
  id,
  user_id,
  title,
  latitude,
  longitude,
  expires_at
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'Phase 2 release and resubmit report',
    35,
    -78,
    now() + interval '30 days'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '11111111-1111-4111-8111-111111111111',
    'Phase 2 self cleanup report',
    35,
    -78,
    now() + interval '30 days'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    '11111111-1111-4111-8111-111111111111',
    'Phase 2 auto approval report',
    35,
    -78,
    now() + interval '30 days'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    '11111111-1111-4111-8111-111111111111',
    'Phase 2 claim expiration report',
    35,
    -78,
    now() + interval '30 days'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
    '11111111-1111-4111-8111-111111111111',
    'Phase 2 claim reminder report',
    35,
    -78,
    now() + interval '30 days'
  );

set local role anon;

do $$
begin
  begin
    perform public.claim_cleanup(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
    );
    raise exception 'Anon role executed claim_cleanup';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '44444444-4444-4444-8444-444444444444',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444444","is_anonymous":true}',
  true
);

do $$
begin
  begin
    perform public.claim_cleanup(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
    );
    raise exception 'Anonymous authenticated user claimed a cleanup';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":false}',
  true
);

do $$
begin
  begin
    perform public.claim_cleanup(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
    );
    raise exception 'Permanent user claimed without accepting the active waiver';
  exception
    when check_violation then null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","is_anonymous":false}',
  true
);

do $$
declare
  claimed public.cleanup_attempts%rowtype;
begin
  select * into claimed
  from public.claim_cleanup(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  );

  if claimed.cleaner_id <> '22222222-2222-4222-8222-222222222222'::uuid
    or claimed.reporter_id <> '11111111-1111-4111-8111-111111111111'::uuid
    or claimed.status <> 'claimed'
    or claimed.claim_expires_at <> claimed.claimed_at + interval '24 hours'
    or claimed.is_self_cleanup then
    raise exception 'claim_cleanup did not derive and persist secure claim data';
  end if;

  begin
    update public.cleanup_attempts
    set status = 'completed'
    where id = claimed.id;
    raise exception 'Client directly updated cleanup state';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select set_config(
  'phase2.active_cleanup_id',
  (
    select id::text
    from public.cleanup_attempts
    where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      and status = 'claimed'
  ),
  true
);
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","is_anonymous":false}',
  true
);

do $$
declare
  active_cleanup_id uuid := current_setting(
    'phase2.active_cleanup_id'
  )::uuid;
begin
  begin
    perform public.claim_cleanup(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
    );
    raise exception 'Two users claimed the same report';
  exception
    when unique_violation then
      if sqlerrm <> 'This cleanup was just claimed' then
        raise;
      end if;
  end;

  begin
    perform public.release_cleanup(active_cleanup_id);
    raise exception 'Another user released the active cleanup';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","is_anonymous":false}',
  true
);

do $$
declare
  active_cleanup_id uuid;
  released public.cleanup_attempts%rowtype;
begin
  select id into active_cleanup_id
  from public.cleanup_attempts
  where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
    and status = 'claimed';

  select * into released
  from public.release_cleanup(active_cleanup_id);

  if released.status <> 'released' or released.released_at is null then
    raise exception 'Cleaner release did not retain terminal attempt history';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","is_anonymous":false}',
  true
);

do $$
declare
  active_cleanup public.cleanup_attempts%rowtype;
  first_submission_id uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
  first_photo_path text;
  spoofed_photo_path text;
begin
  select * into active_cleanup
  from public.claim_cleanup(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  );

  first_photo_path := concat(
    '33333333-3333-4333-8333-333333333333/',
    active_cleanup.id,
    '/',
    first_submission_id,
    '/after-1.jpg'
  );
  spoofed_photo_path := concat(
    '22222222-2222-4222-8222-222222222222/',
    active_cleanup.id,
    '/',
    first_submission_id,
    '/spoofed.jpg'
  );

  begin
    perform public.submit_cleanup(
      active_cleanup.id,
      first_submission_id,
      'Spoofed cleanup evidence.',
      array[spoofed_photo_path],
      1,
      10
    );
    raise exception 'Cleaner submitted a photo path for another user';
  exception
    when check_violation then null;
  end;

  insert into storage.objects (bucket_id, name, owner_id)
  values (
    'cleanup_photos',
    first_photo_path,
    '33333333-3333-4333-8333-333333333333'
  );

  perform public.submit_cleanup(
    active_cleanup.id,
    first_submission_id,
    'First server-controlled cleanup submission.',
    array[first_photo_path],
    2,
    25
  );

  if not exists (
    select 1
    from public.cleanup_submissions
    where id = first_submission_id
      and submitted_by = '33333333-3333-4333-8333-333333333333'
      and submission_number = 1
  ) then
    raise exception 'submit_cleanup did not derive cleaner identity or revision number';
  end if;

  begin
    perform public.submit_cleanup(
      active_cleanup.id,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
      'Duplicate submission while awaiting review.',
      array[first_photo_path],
      null,
      null
    );
    raise exception 'Cleaner submitted again before review';
  exception
    when check_violation then null;
  end;
end;
$$;

set constraints
  cleanup_submissions_require_photos,
  cleanup_submission_photos_require_valid_count
  immediate;
set constraints
  cleanup_submissions_require_photos,
  cleanup_submission_photos_require_valid_count
  deferred;

do $$
declare
  active_cleanup_id uuid;
begin
  select id into active_cleanup_id
  from public.cleanup_attempts
  where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
    and status = 'completion_submitted';

  begin
    perform public.review_cleanup(
      active_cleanup_id,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      'approved',
      null,
      null
    );
    raise exception 'Cleaner reviewed their own non-self cleanup';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
update public.reports
set user_id = '33333333-3333-4333-8333-333333333333'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":false}',
  true
);

do $$
declare
  active_cleanup_id uuid;
begin
  select id into active_cleanup_id
  from public.cleanup_attempts
  where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
    and status = 'completion_submitted';

  begin
    perform public.review_cleanup(
      active_cleanup_id,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      'approved',
      null,
      null
    );
    raise exception 'Stored reporter reviewed after report ownership changed';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
update public.reports
set user_id = '11111111-1111-4111-8111-111111111111'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":false}',
  true
);

do $$
declare
  active_cleanup_id uuid;
begin
  select id into active_cleanup_id
  from public.cleanup_attempts
  where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
    and status = 'completion_submitted';

  begin
    perform public.review_cleanup(
      active_cleanup_id,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      'changes_requested',
      array['unsupported_reason'],
      null
    );
    raise exception 'Unsupported request-change reason was accepted';
  exception
    when check_violation then null;
  end;

  perform public.review_cleanup(
    active_cleanup_id,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'changes_requested',
    array['additional_photo_needed'],
    'Please add a clearer after photo.'
  );

  if not exists (
    select 1
    from public.cleanup_reviews
    where cleanup_attempt_id = active_cleanup_id
      and reviewer_id = '11111111-1111-4111-8111-111111111111'
      and decision = 'changes_requested'
  ) then
    raise exception 'review_cleanup did not derive the reporter identity';
  end if;

  if not exists (
    select 1
    from public.cleanup_attempts
    join public.cleanup_reviews
      on cleanup_reviews.cleanup_attempt_id = cleanup_attempts.id
    where cleanup_attempts.id = active_cleanup_id
      and cleanup_attempts.status = 'changes_requested'
      and cleanup_attempts.cleaner_id = '33333333-3333-4333-8333-333333333333'
      and cleanup_attempts.review_due_at is null
      and cleanup_attempts.correction_due_at =
        cleanup_reviews.created_at + interval '24 hours'
  ) then
    raise exception 'Change request did not start the 24-hour correction window';
  end if;

end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1
    from public.cleanup_notifications
    join public.cleanup_reviews
      on cleanup_reviews.id = cleanup_notifications.review_id
    where cleanup_notifications.user_id = '33333333-3333-4333-8333-333333333333'
      and cleanup_notifications.event_type = 'changes_requested'
      and cleanup_notifications.cleanup_attempt_id = cleanup_reviews.cleanup_attempt_id
  ) then
    raise exception 'Cleaner change-request notification is missing';
  end if;
end;
$$;

update public.cleanup_attempts
set correction_due_at = now() - interval '1 minute'
where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  and status = 'changes_requested';

select private.run_cleanup_maintenance();

do $$
declare
  expired_cleanup public.cleanup_attempts%rowtype;
begin
  select * into expired_cleanup
  from public.cleanup_attempts
  where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
    and cleaner_id = '33333333-3333-4333-8333-333333333333';

  if expired_cleanup.status <> 'expired'
    or expired_cleanup.correction_due_at is not null then
    raise exception 'Maintenance did not expire correction: status %, due %, expired %',
      expired_cleanup.status,
      expired_cleanup.correction_due_at,
      expired_cleanup.expired_at;
  end if;

  if not exists (
    select 1
    from public.reports
    where id = expired_cleanup.report_id
      and cleanup_state = 'available'
  ) then
    raise exception 'Expired correction did not return the report to available';
  end if;

  if not exists (
    select 1
    from public.cleanup_submissions
    where cleanup_attempt_id = expired_cleanup.id
      and submission_number = 1
  ) or not exists (
    select 1
    from public.cleanup_reviews
    where cleanup_attempt_id = expired_cleanup.id
      and decision = 'changes_requested'
  ) then
    raise exception 'Expired correction destroyed submission or review history';
  end if;

  if not exists (
    select 1
    from public.cleanup_notifications
    where cleanup_attempt_id = expired_cleanup.id
      and event_type = 'correction_expired'
  ) then
    raise exception 'Correction-expiration notification is missing';
  end if;
end;
$$;

update public.cleanup_attempts
set
  status = 'changes_requested',
  expired_at = null,
  correction_due_at = (
    select cleanup_reviews.created_at + private.cleanup_correction_duration()
    from public.cleanup_reviews
    where cleanup_reviews.cleanup_attempt_id = cleanup_attempts.id
      and cleanup_reviews.decision = 'changes_requested'
    order by cleanup_reviews.created_at desc
    limit 1
  )
where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  and cleaner_id = '33333333-3333-4333-8333-333333333333';

update public.reports
set cleanup_state = 'changes_requested'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","is_anonymous":false}',
  true
);

do $$
declare
  active_cleanup_id uuid;
  second_submission_id uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
  second_photo_path text;
begin
  select id into active_cleanup_id
  from public.cleanup_attempts
  where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
    and status = 'changes_requested';

  second_photo_path := concat(
    '33333333-3333-4333-8333-333333333333/',
    active_cleanup_id,
    '/',
    second_submission_id,
    '/after-2.jpg'
  );

  insert into storage.objects (bucket_id, name, owner_id)
  values (
    'cleanup_photos',
    second_photo_path,
    '33333333-3333-4333-8333-333333333333'
  );

  perform public.submit_cleanup(
    active_cleanup_id,
    second_submission_id,
    'Second server-controlled cleanup submission.',
    array[second_photo_path],
    3,
    35
  );

  if not exists (
    select 1
    from public.cleanup_attempts
    where id = active_cleanup_id
      and status = 'completion_submitted'
      and correction_due_at is null
      and review_due_at = latest_submitted_at + interval '48 hours'
  ) then
    raise exception 'Resubmission did not start a fresh 48-hour review window';
  end if;

  if (
    select count(*)
    from public.cleanup_submissions
    where cleanup_attempt_id = active_cleanup_id
  ) <> 2 or (
    select count(*)
    from public.cleanup_reviews
    where cleanup_attempt_id = active_cleanup_id
  ) <> 1 then
    raise exception 'Resubmission overwrote cleanup history';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":false}',
  true
);

select public.accept_cleanup_waiver(
  'cleanup-waiver-development-v1',
  'cleanup-guidelines-development-v1'
);

do $$
declare
  active_cleanup_id uuid;
  reviewed public.cleanup_attempts%rowtype;
begin
  select id into active_cleanup_id
  from public.cleanup_attempts
  where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
    and status = 'completion_submitted';

  select * into reviewed
  from public.review_cleanup(
    active_cleanup_id,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'approved',
    null,
    'Cleanup approved.'
  );

  if reviewed.status <> 'completed'
    or reviewed.approval_method <> 'reporter_approved'
    or reviewed.final_reviewer_id <> '11111111-1111-4111-8111-111111111111'::uuid
    or reviewed.final_submission_id <> 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid then
    raise exception 'Reporter approval did not finalize the current submission';
  end if;
end;
$$;

do $$
declare
  self_cleanup public.cleanup_attempts%rowtype;
  self_submission_id uuid := 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
  self_photo_path text;
begin
  select * into self_cleanup
  from public.claim_cleanup(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
  );

  if not self_cleanup.is_self_cleanup then
    raise exception 'Self-cleanup was not identified';
  end if;

  self_photo_path := concat(
    '11111111-1111-4111-8111-111111111111/',
    self_cleanup.id,
    '/',
    self_submission_id,
    '/after.jpg'
  );

  insert into storage.objects (bucket_id, name, owner_id)
  values (
    'cleanup_photos',
    self_photo_path,
    '11111111-1111-4111-8111-111111111111'
  );

  perform public.submit_cleanup(
    self_cleanup.id,
    self_submission_id,
    'Reporter completed their own cleanup.',
    array[self_photo_path],
    1,
    15
  );

  select * into self_cleanup
  from public.review_cleanup(
    self_cleanup.id,
    self_submission_id,
    'approved',
    null,
    null
  );

  if self_cleanup.approval_method <> 'self_approved' then
    raise exception 'Self-cleanup approval method was not preserved';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","is_anonymous":false}',
  true
);

do $$
declare
  auto_cleanup public.cleanup_attempts%rowtype;
  auto_submission_id uuid := 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
  auto_photo_path text;
begin
  select * into auto_cleanup
  from public.claim_cleanup(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
  );

  auto_photo_path := concat(
    '22222222-2222-4222-8222-222222222222/',
    auto_cleanup.id,
    '/',
    auto_submission_id,
    '/after.jpg'
  );

  insert into storage.objects (bucket_id, name, owner_id)
  values (
    'cleanup_photos',
    auto_photo_path,
    '22222222-2222-4222-8222-222222222222'
  );

  perform public.submit_cleanup(
    auto_cleanup.id,
    auto_submission_id,
    'Cleanup awaiting automatic approval.',
    array[auto_photo_path],
    null,
    20
  );

  perform public.claim_cleanup(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'
  );

  perform public.claim_cleanup(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'
  );
end;
$$;

reset role;

update public.cleanup_attempts
set
  first_submitted_at = now() - interval '49 hours',
  latest_submitted_at = now() - interval '49 hours',
  review_due_at = now() - interval '1 hour',
  last_activity_at = now() - interval '49 hours'
where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';

update public.cleanup_attempts
set
  claimed_at = now() - interval '25 hours',
  claim_expires_at = now() - interval '1 hour',
  last_activity_at = now() - interval '25 hours'
where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';

update public.cleanup_attempts
set
  claimed_at = now() - interval '23 hours',
  claim_expires_at = now() + interval '1 hour',
  last_activity_at = now() - interval '23 hours'
where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5';

select private.run_cleanup_maintenance();

do $$
declare
  auto_cleanup public.cleanup_attempts%rowtype;
  expired_cleanup public.cleanup_attempts%rowtype;
begin
  select * into auto_cleanup
  from public.cleanup_attempts
  where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';

  if auto_cleanup.status <> 'completed'
    or auto_cleanup.approval_method <> 'auto_approved'
    or auto_cleanup.final_reviewer_id is not null
    or auto_cleanup.completed_at <> auto_cleanup.review_due_at then
    raise exception 'Maintenance did not apply the 48-hour automatic approval';
  end if;

  if not exists (
    select 1
    from public.cleanup_reviews
    where cleanup_attempt_id = auto_cleanup.id
      and decision = 'auto_approved'
      and reviewer_id is null
  ) then
    raise exception 'Automatic approval review history is missing';
  end if;

  select * into expired_cleanup
  from public.cleanup_attempts
  where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';

  if expired_cleanup.status <> 'expired'
    or expired_cleanup.expired_at <> expired_cleanup.claim_expires_at then
    raise exception 'Maintenance did not expire the 24-hour claim';
  end if;

  if not exists (
    select 1
    from public.reports
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'
      and cleanup_state = 'available'
  ) then
    raise exception 'Expired claim did not return the report to available';
  end if;

  if not exists (
    select 1
    from public.cleanup_notifications
    where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'
      and event_type = 'claim_expiring_soon'
  ) or not exists (
    select 1
    from public.cleanup_attempts
    where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'
      and status = 'claimed'
  ) then
    raise exception 'Maintenance did not create the one-time claim reminder';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from public.cleanup_notifications
    where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      and event_type = 'report_claimed'
  ) then
    raise exception 'Reporter claim notification is missing';
  end if;

  if (
    select count(*) from public.cleanup_notifications
    where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      and event_type = 'completion_submitted'
  ) <> 2 then
    raise exception 'Submission notifications did not preserve both revisions';
  end if;

  if not exists (
    select 1 from public.cleanup_notifications
    where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      and event_type = 'changes_requested'
  ) or not exists (
    select 1 from public.cleanup_notifications
    where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
      and event_type = 'cleanup_approved'
  ) then
    raise exception 'Reporter review notifications are incomplete';
  end if;

  if not exists (
    select 1 from public.cleanup_notifications
    where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
      and event_type = 'cleanup_auto_approved'
  ) then
    raise exception 'Automatic approval notification is missing';
  end if;

  if not exists (
    select 1 from public.cleanup_notifications
    where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'
      and event_type = 'claim_expired'
  ) then
    raise exception 'Claim expiration notification is missing';
  end if;
end;
$$;

do $$
begin
  if has_function_privilege('anon', 'public.claim_cleanup(uuid)', 'execute') then
    raise exception 'Anon retained execute on claim_cleanup';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.claim_cleanup(uuid)',
    'execute'
  ) then
    raise exception 'Authenticated users cannot execute claim_cleanup';
  end if;

  if has_function_privilege(
    'authenticated',
    'private.auto_approve_cleanup(uuid,timestamp with time zone)',
    'execute'
  ) then
    raise exception 'Authenticated users can execute private auto approval';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.claim_cleanup_push_deliveries(uuid,integer)',
    'execute'
  ) then
    raise exception 'Authenticated users can claim private push deliveries';
  end if;
end;
$$;

rollback;
