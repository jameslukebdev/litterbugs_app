-- Run only against a disposable Supabase database after loading the committed
-- baseline and migrations. The transaction rolls back every test fixture.
\set ON_ERROR_STOP on

begin;

insert into auth.users (id, is_anonymous)
values
  ('11111111-1111-4111-8111-111111111111', false),
  ('22222222-2222-4222-8222-222222222222', false),
  ('33333333-3333-4333-8333-333333333333', true);

insert into public.reports (id, user_id, title, latitude, longitude)
values (
  '22222222-2222-4222-8222-222222222223',
  '22222222-2222-4222-8222-222222222222',
  'User B report',
  35,
  -78
), (
  '33333333-3333-4333-8333-333333333334',
  null,
  'Anonymous user report',
  35,
  -78
);

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

-- User A can create and update User A's report, and expiration remains an
-- existing backend default rather than a client-only behavior.
insert into public.reports (id, user_id, title, latitude, longitude)
values (
  '11111111-1111-4111-8111-111111111112',
  '11111111-1111-4111-8111-111111111111',
  'User A report',
  35,
  -78
);

update public.reports
set title = 'User A updated'
where id = '11111111-1111-4111-8111-111111111112';

do $$
declare
  affected integer;
  expiration timestamptz;
begin
  if not public.is_permanent_user() then
    raise exception 'Permanent user failed the permanent-user boundary';
  end if;

  select expires_at into expiration
  from public.reports
  where id = '11111111-1111-4111-8111-111111111112';

  if expiration is null then
    raise exception 'Report expiration trigger did not run';
  end if;

  update public.reports
  set title = 'Forbidden update'
  where id = '22222222-2222-4222-8222-222222222223';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'User A updated User B report';
  end if;

  delete from public.reports
  where id = '22222222-2222-4222-8222-222222222223';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'User A deleted User B report';
  end if;

  begin
    insert into public.reports (user_id, title, latitude, longitude)
    values (
      '22222222-2222-4222-8222-222222222222',
      'Forbidden insert',
      35,
      -78
    );
    raise exception 'User A inserted a report owned by User B';
  exception
    when insufficient_privilege then null;
  end;

  insert into public.reports (id, user_id, title, latitude, longitude)
  values (
    '11111111-1111-4111-8111-111111111113',
    '11111111-1111-4111-8111-111111111111',
    'User A deletable report',
    35,
    -78
  );

  delete from public.reports
  where id = '11111111-1111-4111-8111-111111111113';
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Permanent owner could not delete their report';
  end if;
end;
$$;

-- New clients can write candidates only to their own quarantine prefix. Legacy
-- final-bucket policies remain temporarily for installed-client compatibility.
insert into storage.objects (bucket_id, name, owner_id)
values (
  'media_quarantine',
  '11111111-1111-4111-8111-111111111111/report/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg',
  '11111111-1111-4111-8111-111111111111'
);

do $$
declare
  delete_policy_count integer;
  upload_policy_count integer;
  quarantine_bucket_count integer;
  scan_trigger_count integer;
  scan_function_search_path text;
  expiration_search_path text;
  cleanup_search_path text;
begin
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'media_quarantine',
      '22222222-2222-4222-8222-222222222222/report/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg',
      '11111111-1111-4111-8111-111111111111'
    );
    raise exception 'User A inserted into User B storage folder';
  exception
    when insufficient_privilege then null;
  end;

  select count(*) into delete_policy_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Owners can delete report photos'
    and cmd = 'DELETE'
    and qual like '%is_permanent_user%';

  if delete_policy_count <> 1 then
    raise exception 'Permanent-owner photo deletion policy is missing';
  end if;

  select count(*) into upload_policy_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Users can upload quarantined media'
    and cmd = 'INSERT'
    and with_check like '%is_permanent_user%';

  if upload_policy_count <> 1 then
    raise exception 'Permanent-owner quarantine upload policy is missing';
  end if;

  select count(*) into quarantine_bucket_count
  from storage.buckets
  where id = 'media_quarantine'
    and not public
    and file_size_limit = 5242880;

  if quarantine_bucket_count <> 1 then
    raise exception 'Private bounded media quarantine bucket is missing';
  end if;

  select count(*) into scan_trigger_count
  from pg_trigger
  where tgrelid = 'public.media_scan_attempts'::regclass
    and tgname = 'enforce_media_scan_hourly_limit'
    and not tgisinternal;

  if scan_trigger_count <> 1 then
    raise exception 'Atomic media scan quota trigger is missing';
  end if;

  select coalesce(array_to_string(proconfig, ','), '')
  into scan_function_search_path
  from pg_proc
  where oid = 'public.enforce_media_scan_hourly_limit()'::regprocedure;

  if scan_function_search_path not like '%search_path=%' then
    raise exception 'Media scan quota function search_path is not fixed';
  end if;

  select coalesce(array_to_string(proconfig, ','), '')
  into expiration_search_path
  from pg_proc
  where oid = 'public.set_report_expiration()'::regprocedure;

  select coalesce(array_to_string(proconfig, ','), '')
  into cleanup_search_path
  from pg_proc
  where oid = 'public.delete_expired_reports()'::regprocedure;

  if expiration_search_path not like '%search_path=%' then
    raise exception 'set_report_expiration search_path is not fixed';
  end if;

  if cleanup_search_path not like '%search_path=%' then
    raise exception 'delete_expired_reports search_path is not fixed';
  end if;
end;
$$;

-- Anonymous Supabase users use the authenticated Postgres role, but the JWT
-- boundary keeps their access read-only even for rows and folders they own.
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
  affected integer;
  visible integer;
begin
  if public.is_permanent_user() then
    raise exception 'Anonymous user passed the permanent-user boundary';
  end if;

  if has_table_privilege('anon', 'public.reports', 'INSERT')
    or has_table_privilege('anon', 'public.reports', 'UPDATE')
    or has_table_privilege('anon', 'public.reports', 'DELETE') then
    raise exception 'Signed-out anon role retains report write grants';
  end if;

  select count(*) into visible
  from public.reports;
  if visible < 1 then
    raise exception 'Anonymous user cannot read reports';
  end if;

  begin
    insert into public.reports (user_id, title, latitude, longitude)
    values (
      '33333333-3333-4333-8333-333333333333',
      'Forbidden anonymous insert',
      35,
      -78
    );
    raise exception 'Anonymous user inserted a report';
  exception
    when insufficient_privilege then null;
  end;

  update public.reports
  set title = 'Forbidden anonymous update'
  where id = '33333333-3333-4333-8333-333333333334';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Anonymous user updated a report';
  end if;

  delete from public.reports
  where id = '33333333-3333-4333-8333-333333333334';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Anonymous user deleted a report';
  end if;

  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'report_photos',
      '33333333-3333-4333-8333-333333333333/report-c/forbidden.jpg',
      '33333333-3333-4333-8333-333333333333'
    );
    raise exception 'Anonymous user uploaded a report photo';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- A database-side asynchronous webhook preserves the mobile delete result
-- while queuing cleanup for that report's Storage paths.
reset role;

do $$
declare
  trigger_count integer;
  secret_count integer;
begin
  select count(*) into trigger_count
  from pg_trigger
  where tgrelid = 'public.reports'::regclass
    and tgname = 'reports_queue_photo_cleanup'
    and not tgisinternal;

  if trigger_count <> 1 then
    raise exception 'Report photo cleanup trigger is missing';
  end if;

  select count(*) into secret_count
  from private.report_photo_cleanup_config
  where singleton = true
    and length(webhook_secret) = 64;

  if secret_count <> 1 then
    raise exception 'Report photo cleanup secret is missing';
  end if;

  if has_function_privilege(
    'anon',
    'public.verify_report_photo_cleanup_webhook(text)',
    'execute'
  ) then
    raise exception 'Anon can execute the cleanup secret verifier';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.verify_report_photo_cleanup_webhook(text)',
    'execute'
  ) then
    raise exception 'Authenticated clients can execute the cleanup secret verifier';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.verify_report_photo_cleanup_webhook(text)',
    'execute'
  ) then
    raise exception 'Service role cannot execute the cleanup secret verifier';
  end if;
end;
$$;

update public.reports
set photo_paths = array[
  '11111111-1111-4111-8111-111111111111/11111111-1111-4111-8111-111111111112/photo.jpg'
]
where id = '11111111-1111-4111-8111-111111111112';

delete from public.reports
where id = '11111111-1111-4111-8111-111111111112';

do $$
declare
  queued_count integer;
begin
  select count(*) into queued_count
  from net.http_request_queue
  where url = 'https://mvaygkflcjswtwchflrk.supabase.co/functions/v1/cleanup-report-photos'
    and convert_from(body, 'UTF8')::jsonb #>> '{old_record,id}' =
      '11111111-1111-4111-8111-111111111112';

  if queued_count <> 1 then
    raise exception 'Report deletion did not queue photo cleanup';
  end if;
end;
$$;

rollback;

select 'report_and_storage_ownership_passed' as result;
