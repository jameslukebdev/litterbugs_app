-- Run only against a disposable Supabase database after loading the committed
-- baseline and migrations. The transaction rolls back every test fixture.
\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'phase1-reporter@example.com',
    false,
    '{"full_name":"Phase 1 Reporter"}',
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'phase1-cleaner@example.com',
    false,
    '{"full_name":"Phase 1 Cleaner"}',
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    null,
    true,
    '{}',
    now()
  );

insert into public.cleanup_waiver_versions (
  version,
  title,
  body,
  is_active
) values (
  'phase1-test-waiver-v1',
  'Phase 1 disposable test waiver',
  'Disposable test text. This is not legal waiver content.',
  true
);

insert into public.reports (
  id,
  user_id,
  title,
  latitude,
  longitude,
  cleanup_state
) values (
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  'Phase 1 cleanup report',
  35,
  -78,
  'claimed'
);

insert into public.cleanup_attempts (
  id,
  report_id,
  cleaner_id,
  reporter_id,
  waiver_version,
  status,
  is_self_cleanup,
  claimed_at,
  claim_expires_at
) values (
  '55555555-5555-4555-8555-555555555555',
  '44444444-4444-4444-8444-444444444444',
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'phase1-test-waiver-v1',
  'claimed',
  false,
  now(),
  now() + interval '24 hours'
);

insert into public.cleanup_submissions (
  id,
  cleanup_attempt_id,
  submission_number,
  submitted_by,
  description,
  bags_or_items_removed,
  duration_minutes,
  created_at
) values
  (
    '66666666-6666-4666-8666-666666666666',
    '55555555-5555-4555-8555-555555555555',
    1,
    '22222222-2222-4222-8222-222222222222',
    'First cleanup evidence revision.',
    2,
    30,
    now()
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    '55555555-5555-4555-8555-555555555555',
    2,
    '22222222-2222-4222-8222-222222222222',
    'Second cleanup evidence revision.',
    3,
    45,
    now() + interval '1 hour'
  );

insert into public.cleanup_submission_photos (
  id,
  submission_id,
  storage_path,
  display_order
) values
  (
    '88888888-8888-4888-8888-888888888888',
    '66666666-6666-4666-8666-666666666666',
    '22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555555/66666666-6666-4666-8666-666666666666/after-1.jpg',
    1
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    '77777777-7777-4777-8777-777777777777',
    '22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555555/77777777-7777-4777-8777-777777777777/after-1.jpg',
    1
  );

set constraints all immediate;

do $$
begin
  begin
    insert into public.cleanup_submissions (
      id,
      cleanup_attempt_id,
      submission_number,
      submitted_by,
      description
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '55555555-5555-4555-8555-555555555555',
      3,
      '22222222-2222-4222-8222-222222222222',
      'Evidence without a required photo.'
    );
    raise exception 'A cleanup submission without photos was accepted';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.cleanup_submission_photos (
      submission_id,
      storage_path,
      display_order
    ) values (
      '77777777-7777-4777-8777-777777777777',
      '22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555555/77777777-7777-4777-8777-777777777777/after-4.jpg',
      4
    );
    raise exception 'A fourth cleanup photo was accepted';
  exception
    when check_violation then null;
  end;

  begin
    delete from public.cleanup_submission_photos
    where id = '88888888-8888-4888-8888-888888888888';
    raise exception 'The only photo was removed from a submitted revision';
  exception
    when check_violation then null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.cleanup_reviews (
      cleanup_attempt_id,
      submission_id,
      reviewer_id,
      decision,
      reason_codes
    ) values (
      '55555555-5555-4555-8555-555555555555',
      '66666666-6666-4666-8666-666666666666',
      '11111111-1111-4111-8111-111111111111',
      'changes_requested',
      array['unsupported_reason']
    );
    raise exception 'An unsupported review reason was accepted';
  exception
    when check_violation then null;
  end;
end;
$$;

insert into public.cleanup_reviews (
  id,
  cleanup_attempt_id,
  submission_id,
  reviewer_id,
  decision,
  reason_codes,
  note,
  created_at
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
    '55555555-5555-4555-8555-555555555555',
    '66666666-6666-4666-8666-666666666666',
    '11111111-1111-4111-8111-111111111111',
    'changes_requested',
    array['additional_photo_needed'],
    'Please add a clearer after photo.',
    now() + interval '30 minutes'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '55555555-5555-4555-8555-555555555555',
    '77777777-7777-4777-8777-777777777777',
    '11111111-1111-4111-8111-111111111111',
    'approved',
    null,
    null,
    now() + interval '2 hours'
  );

do $$
begin
  begin
    update public.cleanup_attempts
    set
      status = 'completed',
      completed_at = now() + interval '2 hours',
      final_submission_id = '77777777-7777-4777-8777-777777777777',
      approval_method = 'self_approved',
      final_reviewer_id = '11111111-1111-4111-8111-111111111111'
    where id = '55555555-5555-4555-8555-555555555555';
    raise exception 'A non-self cleanup used self approval';
  exception
    when check_violation then null;
  end;
end;
$$;

update public.cleanup_attempts
set
  status = 'completed',
  first_submitted_at = now(),
  latest_submitted_at = now() + interval '1 hour',
  review_due_at = now() + interval '49 hours',
  completed_at = now() + interval '2 hours',
  last_activity_at = now() + interval '2 hours',
  final_submission_id = '77777777-7777-4777-8777-777777777777',
  approval_method = 'reporter_approved',
  final_reviewer_id = '11111111-1111-4111-8111-111111111111'
where id = '55555555-5555-4555-8555-555555555555';

update public.reports
set cleanup_state = 'completed'
where id = '44444444-4444-4444-8444-444444444444';

insert into storage.objects (bucket_id, name, owner_id)
values
  (
    'cleanup_photos',
    '22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555555/66666666-6666-4666-8666-666666666666/after-1.jpg',
    '22222222-2222-4222-8222-222222222222'
  ),
  (
    'cleanup_photos',
    '22222222-2222-4222-8222-222222222222/55555555-5555-4555-8555-555555555555/77777777-7777-4777-8777-777777777777/after-1.jpg',
    '22222222-2222-4222-8222-222222222222'
  );

set local role anon;

do $$
declare
  visible_metadata integer;
  visible_objects integer;
begin
  select count(*) into visible_metadata
  from public.cleanup_submission_photos
  where submission_id = any (array[
    '66666666-6666-4666-8666-666666666666'::uuid,
    '77777777-7777-4777-8777-777777777777'::uuid
  ]);

  if visible_metadata <> 1 then
    raise exception 'Public cleanup photo metadata did not resolve to only the final submission';
  end if;

  select count(*) into visible_objects
  from storage.objects
  where bucket_id = 'cleanup_photos';

  if visible_objects <> 1 then
    raise exception 'Public cleanup Storage visibility did not resolve to only the final submission';
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
  visible_metadata integer;
  visible_objects integer;
begin
  select count(*) into visible_metadata
  from public.cleanup_submission_photos
  where submission_id = any (array[
    '66666666-6666-4666-8666-666666666666'::uuid,
    '77777777-7777-4777-8777-777777777777'::uuid
  ]);

  if visible_metadata <> 2 then
    raise exception 'Cleaner could not read their complete photo revision history';
  end if;

  select count(*) into visible_objects
  from storage.objects
  where bucket_id = 'cleanup_photos';

  if visible_objects <> 2 then
    raise exception 'Cleaner could not read their complete Storage revision history';
  end if;

  begin
    insert into public.cleanup_submission_photos (
      submission_id,
      storage_path,
      display_order
    ) values (
      '77777777-7777-4777-8777-777777777777',
      'forbidden-client-write.jpg',
      2
    );
    raise exception 'Client inserted cleanup photo metadata directly';
  exception
    when insufficient_privilege then null;
  end;
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
  '{"sub":"33333333-3333-4333-8333-333333333333","is_anonymous":true}',
  true
);

do $$
declare
  visible_metadata integer;
begin
  select count(*) into visible_metadata
  from public.cleanup_submission_photos
  where submission_id = any (array[
    '66666666-6666-4666-8666-666666666666'::uuid,
    '77777777-7777-4777-8777-777777777777'::uuid
  ]);

  if visible_metadata <> 1 then
    raise exception 'Anonymous Supabase user could read non-final cleanup evidence';
  end if;
end;
$$;

reset role;

do $$
declare
  approval text;
  reviewer uuid;
begin
  select approval_method, final_reviewer_id
  into approval, reviewer
  from public.cleanup_attempts
  where id = '55555555-5555-4555-8555-555555555555';

  if approval <> 'reporter_approved'
    or reviewer <> '11111111-1111-4111-8111-111111111111'::uuid then
    raise exception 'Final approval metadata was not preserved on the cleanup attempt';
  end if;
end;
$$;

rollback;
