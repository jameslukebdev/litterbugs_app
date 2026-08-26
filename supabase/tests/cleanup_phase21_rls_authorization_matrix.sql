\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at)
values
  ('11111111-1111-4111-8111-111111111111', 'matrix-reporter@example.com', false, '{"full_name":"Matrix Reporter"}', now()),
  ('22222222-2222-4222-8222-222222222222', 'matrix-cleaner@example.com', false, '{"full_name":"Matrix Cleaner"}', now()),
  ('33333333-3333-4333-8333-333333333333', 'matrix-outsider@example.com', false, '{"full_name":"Matrix Outsider"}', now()),
  ('44444444-4444-4444-8444-444444444444', 'matrix-self@example.com', false, '{"full_name":"Matrix Self Cleaner"}', now()),
  ('55555555-5555-4555-8555-555555555555', null, true, '{}', now()),
  ('66666666-6666-4666-8666-666666666666', 'matrix-other-reporter@example.com', false, '{"full_name":"Matrix Other Reporter"}', now());

insert into public.reports (
  id,
  user_id,
  title,
  latitude,
  longitude,
  cleanup_state
) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Cleaner workflow report', 35, -78, 'available'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '66666666-6666-4666-8666-666666666666', 'Outsider claim report', 35, -78, 'available'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '44444444-4444-4444-8444-444444444444', 'Self cleanup report', 35, -78, 'available'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '11111111-1111-4111-8111-111111111111', 'Release workflow report', 35, -78, 'available'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '11111111-1111-4111-8111-111111111111', 'Guest claim denial report', 35, -78, 'available');

create temporary table phase21_ids (
  workflow text primary key,
  cleanup_id uuid not null
);
grant select on table phase21_ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","is_anonymous":false}', true);

select public.accept_cleanup_waiver(
  'cleanup-waiver-development-v1',
  'cleanup-guidelines-development-v1'
);

do $$
declare
  attempt public.cleanup_attempts%rowtype;
  submission_id uuid := 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
  photo_path text;
begin
  select * into attempt
  from public.claim_cleanup('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3');

  if not attempt.is_self_cleanup then
    raise exception 'Self-cleaner claim was not identified';
  end if;

  photo_path := concat(
    '44444444-4444-4444-8444-444444444444/',
    attempt.id,
    '/',
    submission_id,
    '/after-1.jpg'
  );

  insert into storage.objects (bucket_id, name, owner_id)
  values ('cleanup_photos', photo_path, '44444444-4444-4444-8444-444444444444');

  perform public.submit_cleanup(
    attempt.id,
    submission_id,
    'Self cleaner submitted completed evidence.',
    array[photo_path],
    1,
    15
  );

  select * into attempt
  from public.review_cleanup(
    attempt.id,
    submission_id,
    'approved',
    null,
    null
  );

  if attempt.status <> 'completed'
    or attempt.approval_method <> 'self_approved'
    or attempt.final_submission_id <> submission_id then
    raise exception 'Self-cleanup approval was not recorded as self-approved';
  end if;
end;
$$;

reset role;

insert into phase21_ids (workflow, cleanup_id)
select 'self', id
from public.cleanup_attempts
where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","is_anonymous":false}', true);

select public.accept_cleanup_waiver(
  'cleanup-waiver-development-v1',
  'cleanup-guidelines-development-v1'
);

do $$
declare
  released public.cleanup_attempts%rowtype;
begin
  select * into released
  from public.claim_cleanup('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4');

  select * into released
  from public.release_cleanup(released.id);

  if released.status <> 'released' then
    raise exception 'Cleaner could not release an appropriate claim';
  end if;

  perform public.claim_cleanup('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
end;
$$;

reset role;

insert into phase21_ids (workflow, cleanup_id)
select 'cleaner', id
from public.cleanup_attempts
where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
  and status = 'claimed';

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","is_anonymous":false}', true);

select public.accept_cleanup_waiver(
  'cleanup-waiver-development-v1',
  'cleanup-guidelines-development-v1'
);

do $$
declare
  cleaner_cleanup_id uuid;
  visible_reports integer;
begin
  select count(*) into visible_reports
  from public.reports
  where id = any (array[
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'::uuid
  ]);
  if visible_reports <> 5 then
    raise exception 'Permanent non-participant could not read normal public reports';
  end if;

  select cleanup_id into cleaner_cleanup_id
  from phase21_ids
  where workflow = 'cleaner';

  begin
    perform public.release_cleanup(cleaner_cleanup_id);
    raise exception 'Non-participant released another cleaner cleanup';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.submit_cleanup(
      cleaner_cleanup_id,
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
      'Unauthorized outsider submission.',
      array['unauthorized/photo.jpg'],
      null,
      null
    );
    raise exception 'Non-participant submitted another cleaner evidence';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.review_cleanup(
      cleaner_cleanup_id,
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
      'approved',
      null,
      null
    );
    raise exception 'Non-participant reviewed another reporter cleanup';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.cleanup_attempts
    set status = 'completed'
    where id = cleaner_cleanup_id;
    raise exception 'Non-participant manually changed a protected cleanup state';
  exception
    when insufficient_privilege then null;
  end;

  perform public.claim_cleanup('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2');
end;
$$;

reset role;

insert into phase21_ids (workflow, cleanup_id)
select 'outsider', id
from public.cleanup_attempts
where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
  and status = 'claimed';

set local role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', true);
select set_config('request.jwt.claims', '{"sub":"55555555-5555-4555-8555-555555555555","is_anonymous":true}', true);

do $$
declare
  cleaner_cleanup_id uuid;
  self_cleanup_id uuid;
  visible_count integer;
begin
  select cleanup_id into cleaner_cleanup_id from phase21_ids where workflow = 'cleaner';
  select cleanup_id into self_cleanup_id from phase21_ids where workflow = 'self';

  select count(*) into visible_count
  from public.reports
  where id = any (array[
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'::uuid
  ]);
  if visible_count <> 5 then
    raise exception 'Guest could not browse public reports';
  end if;

  select count(*) into visible_count
  from public.cleanup_attempts
  where id = self_cleanup_id
    and status = 'completed';
  if visible_count <> 1 then
    raise exception 'Guest could not read a completed cleanup impact record';
  end if;

  select count(*) into visible_count
  from public.cleanup_submission_photos
  where submission_id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
  if visible_count <> 1 then
    raise exception 'Guest could not read completed cleanup photo metadata';
  end if;

  select count(*) into visible_count
  from storage.objects
  where bucket_id = 'cleanup_photos'
    and name like '%/cccccccc-cccc-4ccc-8ccc-ccccccccccc1/%';
  if visible_count <> 1 then
    raise exception 'Guest could not read completed cleanup evidence';
  end if;

  begin
    perform public.claim_cleanup('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5');
    raise exception 'Guest claimed a cleanup';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.release_cleanup(cleaner_cleanup_id);
    raise exception 'Guest released a cleanup';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.submit_cleanup(
      cleaner_cleanup_id,
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
      'Guest submission attempt.',
      array['guest/photo.jpg'],
      null,
      null
    );
    raise exception 'Guest submitted cleanup evidence';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.review_cleanup(
      cleaner_cleanup_id,
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
      'changes_requested',
      array['additional_photo_needed'],
      null
    );
    raise exception 'Guest requested cleanup changes';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.review_cleanup(
      cleaner_cleanup_id,
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
      'approved',
      null,
      null
    );
    raise exception 'Guest approved a cleanup';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'cleanup_photos',
      concat(
        '55555555-5555-4555-8555-555555555555/',
        cleaner_cleanup_id,
        '/cccccccc-cccc-4ccc-8ccc-ccccccccccc3/after-1.jpg'
      ),
      '55555555-5555-4555-8555-555555555555'
    );
    raise exception 'Guest uploaded cleanup evidence';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","is_anonymous":false}', true);

do $$
declare
  cleaner_cleanup_id uuid;
  outsider_cleanup_id uuid;
  submission_id uuid := 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
  photo_path text;
  visible_count integer;
begin
  select cleanup_id into cleaner_cleanup_id from phase21_ids where workflow = 'cleaner';
  select cleanup_id into outsider_cleanup_id from phase21_ids where workflow = 'outsider';

  select count(*) into visible_count
  from public.cleanup_attempts
  where id = cleaner_cleanup_id
    and cleaner_id = '22222222-2222-4222-8222-222222222222';
  if visible_count <> 1 then
    raise exception 'Cleaner could not view their active cleanup';
  end if;

  begin
    perform public.release_cleanup(outsider_cleanup_id);
    raise exception 'Cleaner released another cleaner claim';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.submit_cleanup(
      outsider_cleanup_id,
      submission_id,
      'Another cleaner submission attempt.',
      array['another-cleaner/photo.jpg'],
      null,
      null
    );
    raise exception 'Cleaner submitted for another cleaner';
  exception
    when insufficient_privilege then null;
  end;

  photo_path := concat(
    '22222222-2222-4222-8222-222222222222/',
    cleaner_cleanup_id,
    '/',
    submission_id,
    '/after-1.jpg'
  );

  insert into storage.objects (bucket_id, name, owner_id)
  values ('cleanup_photos', photo_path, '22222222-2222-4222-8222-222222222222');

  perform public.submit_cleanup(
    cleaner_cleanup_id,
    submission_id,
    'Cleaner submitted the first evidence revision.',
    array[photo_path],
    2,
    25
  );

  begin
    perform public.review_cleanup(
      cleaner_cleanup_id,
      submission_id,
      'approved',
      null,
      null
    );
    raise exception 'Cleaner approved a report they do not own';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","is_anonymous":false}', true);

do $$
declare
  cleanup_id uuid;
  submission_id uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1';
  photo_path text;
begin
  select phase21_ids.cleanup_id into cleanup_id
  from phase21_ids
  where workflow = 'outsider';

  photo_path := concat(
    '33333333-3333-4333-8333-333333333333/',
    cleanup_id,
    '/',
    submission_id,
    '/after-1.jpg'
  );

  insert into storage.objects (bucket_id, name, owner_id)
  values ('cleanup_photos', photo_path, '33333333-3333-4333-8333-333333333333');

  perform public.submit_cleanup(
    cleanup_id,
    submission_id,
    'Outsider became the authorized cleaner and submitted evidence.',
    array[photo_path],
    1,
    10
  );
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":false}', true);

do $$
declare
  cleaner_cleanup_id uuid;
  outsider_cleanup_id uuid;
  deleted_count integer;
begin
  select cleanup_id into cleaner_cleanup_id from phase21_ids where workflow = 'cleaner';
  select cleanup_id into outsider_cleanup_id from phase21_ids where workflow = 'outsider';

  begin
    perform public.review_cleanup(
      outsider_cleanup_id,
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
      'approved',
      null,
      null
    );
    raise exception 'Reporter reviewed an unrelated report';
  exception
    when insufficient_privilege then null;
  end;

  delete from public.reports
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  get diagnostics deleted_count = row_count;
  if deleted_count <> 0 then
    raise exception 'Reporter deleted an active cleanup report';
  end if;

  perform public.review_cleanup(
    cleaner_cleanup_id,
    'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    'changes_requested',
    array['additional_photo_needed'],
    'Please add a wider after photo.'
  );
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","is_anonymous":false}', true);

do $$
declare
  cleanup_id uuid;
  submission_id uuid := 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2';
  photo_path text;
  feedback_count integer;
begin
  select phase21_ids.cleanup_id into cleanup_id
  from phase21_ids
  where workflow = 'cleaner';

  select count(*) into feedback_count
  from public.cleanup_reviews
  where cleanup_attempt_id = cleanup_id
    and decision = 'changes_requested';
  if feedback_count <> 1 then
    raise exception 'Cleaner could not view requested-change feedback';
  end if;

  photo_path := concat(
    '22222222-2222-4222-8222-222222222222/',
    cleanup_id,
    '/',
    submission_id,
    '/after-1.jpg'
  );

  insert into storage.objects (bucket_id, name, owner_id)
  values ('cleanup_photos', photo_path, '22222222-2222-4222-8222-222222222222');

  perform public.submit_cleanup(
    cleanup_id,
    submission_id,
    'Cleaner resubmitted with the requested wider evidence.',
    array[photo_path],
    2,
    30
  );
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":false}', true);

select public.review_cleanup(
  (select cleanup_id from phase21_ids where workflow = 'cleaner'),
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
  'approved',
  null,
  'Cleanup approved after resubmission.'
);

reset role;

do $$
declare
  cleaner_cleanup_id uuid;
  released_count integer;
begin
  select cleanup_id into cleaner_cleanup_id
  from phase21_ids
  where workflow = 'cleaner';

  if not exists (
    select 1
    from public.cleanup_attempts
    where id = cleaner_cleanup_id
      and status = 'completed'
      and approval_method = 'reporter_approved'
      and final_submission_id = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2'
  ) then
    raise exception 'Reporter approval did not complete the cleaner workflow';
  end if;

  if (
    select count(*)
    from public.cleanup_submissions
    where cleanup_attempt_id = cleaner_cleanup_id
  ) <> 2 then
    raise exception 'Cleaner resubmission did not preserve submission history';
  end if;

  select count(*) into released_count
  from public.cleanup_attempts
  where report_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'
    and status = 'released';
  if released_count <> 1 then
    raise exception 'Released cleanup history was not preserved';
  end if;

  if not exists (
    select 1
    from public.reports
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'
      and cleanup_state = 'available'
  ) then
    raise exception 'Released cleanup report did not return to available';
  end if;

  if has_table_privilege('authenticated', 'public.cleanup_attempts', 'UPDATE')
    or has_table_privilege('authenticated', 'public.cleanup_submission_photos', 'INSERT')
    or has_table_privilege('authenticated', 'public.cleanup_submission_photos', 'UPDATE')
    or has_table_privilege('authenticated', 'public.cleanup_submission_photos', 'DELETE') then
    raise exception 'Authenticated clients have direct cleanup workflow mutation privileges';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'UPDATE'
      and (
        coalesce(qual, '') like '%cleanup_photos%'
        or coalesce(with_check, '') like '%cleanup_photos%'
      )
  ) then
    raise exception 'Cleanup evidence has an unexpected client update policy';
  end if;
end;
$$;

rollback;
