-- Run only against a disposable Supabase database after loading the committed
-- baseline and migrations. The transaction rolls back every test fixture.
\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'phase20-reporter@example.com',
    false,
    '{"full_name":"Phase 20 Reporter"}',
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'phase20-cleaner@example.com',
    false,
    '{"full_name":"Phase 20 Cleaner"}',
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'phase20-other@example.com',
    false,
    '{"full_name":"Phase 20 Other"}',
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444444',
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
  cleanup_state
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'Open claim photo test',
    35,
    -78,
    'claimed'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '11111111-1111-4111-8111-111111111111',
    'Expired claim photo test',
    35,
    -78,
    'claimed'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    '11111111-1111-4111-8111-111111111111',
    'Open correction photo test',
    35,
    -78,
    'changes_requested'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    '11111111-1111-4111-8111-111111111111',
    'Expired correction photo test',
    35,
    -78,
    'changes_requested'
  );

insert into public.cleanup_attempts (
  id,
  report_id,
  cleaner_id,
  reporter_id,
  waiver_version,
  guidelines_version,
  status,
  claimed_at,
  claim_expires_at,
  correction_due_at
) values
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'cleanup-waiver-development-v1',
    'cleanup-guidelines-development-v1',
    'claimed',
    now() - interval '1 hour',
    now() + interval '23 hours',
    null
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'cleanup-waiver-development-v1',
    'cleanup-guidelines-development-v1',
    'claimed',
    now() - interval '25 hours',
    now() - interval '1 hour',
    null
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'cleanup-waiver-development-v1',
    'cleanup-guidelines-development-v1',
    'changes_requested',
    now() - interval '2 hours',
    now() + interval '22 hours',
    now() + interval '1 hour'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'cleanup-waiver-development-v1',
    'cleanup-guidelines-development-v1',
    'changes_requested',
    now() - interval '26 hours',
    now() - interval '2 hours',
    now() - interval '1 hour'
  );

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

insert into storage.objects (bucket_id, name, owner_id)
values
  (
    'cleanup_photos',
    '22222222-2222-4222-8222-222222222222/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1/cccccccc-cccc-4ccc-8ccc-ccccccccccc1/after-1.jpg',
    '22222222-2222-4222-8222-222222222222'
  ),
  (
    'cleanup_photos',
    '22222222-2222-4222-8222-222222222222/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1/cccccccc-cccc-4ccc-8ccc-ccccccccccc2/after-1.jpg',
    '22222222-2222-4222-8222-222222222222'
  ),
  (
    'cleanup_photos',
    '22222222-2222-4222-8222-222222222222/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3/cccccccc-cccc-4ccc-8ccc-ccccccccccc3/after-1.jpg',
    '22222222-2222-4222-8222-222222222222'
  );

do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'cleanup_photos',
      '22222222-2222-4222-8222-222222222222/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2/cccccccc-cccc-4ccc-8ccc-ccccccccccc2/after-1.jpg',
      '22222222-2222-4222-8222-222222222222'
    );
    raise exception 'Cleaner uploaded after the claim deadline';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'cleanup_photos',
      '22222222-2222-4222-8222-222222222222/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4/cccccccc-cccc-4ccc-8ccc-ccccccccccc4/after-1.jpg',
      '22222222-2222-4222-8222-222222222222'
    );
    raise exception 'Cleaner uploaded after the correction deadline';
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
  '{"sub":"33333333-3333-4333-8333-333333333333","is_anonymous":false}',
  true
);

do $$
begin
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'cleanup_photos',
      '33333333-3333-4333-8333-333333333333/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1/cccccccc-cccc-4ccc-8ccc-ccccccccccc5/after-1.jpg',
      '33333333-3333-4333-8333-333333333333'
    );
    raise exception 'Another permanent user uploaded evidence for the cleaner';
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
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'cleanup_photos',
      '44444444-4444-4444-8444-444444444444/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1/cccccccc-cccc-4ccc-8ccc-ccccccccccc6/after-1.jpg',
      '44444444-4444-4444-8444-444444444444'
    );
    raise exception 'Guest user uploaded cleanup evidence';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

insert into public.cleanup_submissions (
  id,
  cleanup_attempt_id,
  submission_number,
  submitted_by,
  description,
  created_at
) values
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    1,
    '22222222-2222-4222-8222-222222222222',
    'First preserved cleanup evidence revision.',
    now() - interval '10 minutes'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    2,
    '22222222-2222-4222-8222-222222222222',
    'Second preserved cleanup evidence revision.',
    now()
  );

insert into public.cleanup_submission_photos (
  submission_id,
  storage_path,
  display_order
) values
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    '22222222-2222-4222-8222-222222222222/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1/cccccccc-cccc-4ccc-8ccc-ccccccccccc1/after-1.jpg',
    1
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    '22222222-2222-4222-8222-222222222222/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1/cccccccc-cccc-4ccc-8ccc-ccccccccccc2/after-1.jpg',
    1
  );

set constraints all immediate;

update public.cleanup_attempts
set
  status = 'completion_submitted',
  first_submitted_at = now() - interval '10 minutes',
  latest_submitted_at = now(),
  review_due_at = now() + interval '48 hours',
  last_activity_at = now()
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';

update public.reports
set cleanup_state = 'completion_submitted'
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
  visible_objects integer;
begin
  select count(*) into visible_objects
  from storage.objects
  where bucket_id = 'cleanup_photos'
    and name like '%/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1/%';

  if visible_objects <> 2 then
    raise exception 'Reporter could not view the complete cleanup evidence history for review';
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
  visible_objects integer;
begin
  select count(*) into visible_objects
  from storage.objects
  where bucket_id = 'cleanup_photos'
    and name like '%/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1/%';

  if visible_objects <> 0 then
    raise exception 'Unrelated user viewed cleanup evidence before completion';
  end if;
end;
$$;

reset role;

update public.cleanup_attempts
set
  status = 'completed',
  completed_at = now(),
  final_submission_id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
  approval_method = 'reporter_approved',
  final_reviewer_id = '11111111-1111-4111-8111-111111111111',
  last_activity_at = now()
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';

update public.reports
set cleanup_state = 'completed'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

set local role anon;

do $$
declare
  visible_objects integer;
begin
  select count(*) into visible_objects
  from storage.objects
  where bucket_id = 'cleanup_photos'
    and name like '%/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1/%';

  if visible_objects <> 1 then
    raise exception 'Public completed cleanup visibility did not resolve to only the final evidence revision';
  end if;

  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'cleanup_photos'
      and name like '%/cccccccc-cccc-4ccc-8ccc-ccccccccccc2/%'
  ) then
    raise exception 'Public completed cleanup could not read the approved final photo';
  end if;
end;
$$;

reset role;

do $$
declare
  delete_policy text;
  upload_policy text;
begin
  select with_check
  into upload_policy
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Cleaners can upload cleanup evidence'
    and cmd = 'INSERT';

  if upload_policy not like '%claim_expires_at%'
    or upload_policy not like '%correction_due_at%'
    or upload_policy not like '%is_permanent_user%' then
    raise exception 'Cleanup upload policy is missing state deadline enforcement';
  end if;

  select qual
  into delete_policy
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Cleaners can delete unsubmitted cleanup evidence'
    and cmd = 'DELETE';

  if delete_policy not like '%auth.uid()%'
    or delete_policy not like '%cleaner_id%'
    or delete_policy not like '%cleanup_submission_photos%' then
    raise exception 'Cleanup evidence deletion is not restricted to the owning cleaner and unsubmitted objects';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'UPDATE'
      and (
        qual like '%cleanup_photos%'
        or with_check like '%cleanup_photos%'
      )
  ) then
    raise exception 'Cleanup evidence has an unexpected client update policy';
  end if;
end;
$$;

rollback;
