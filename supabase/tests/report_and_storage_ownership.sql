-- Run only against a disposable Supabase database after loading the committed
-- baseline and migrations. The transaction rolls back every test fixture.
\set ON_ERROR_STOP on

begin;

insert into auth.users (id)
values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

insert into public.reports (id, user_id, title, latitude, longitude)
values (
  '22222222-2222-4222-8222-222222222223',
  '22222222-2222-4222-8222-222222222222',
  'User B report',
  35,
  -78
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
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
end;
$$;

-- Both clients already write uid/report-id/file. User A can upload to that
-- folder and cannot write into User B's folder.
insert into storage.objects (bucket_id, name, owner_id)
values (
  'report_photos',
  '11111111-1111-4111-8111-111111111111/report-a/photo.jpg',
  '11111111-1111-4111-8111-111111111111'
);

do $$
declare
  delete_policy_count integer;
  expiration_search_path text;
  cleanup_search_path text;
begin
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'report_photos',
      '22222222-2222-4222-8222-222222222222/report-b/forbidden.jpg',
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
    and cmd = 'DELETE';

  if delete_policy_count <> 1 then
    raise exception 'Owner photo deletion policy is missing';
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
