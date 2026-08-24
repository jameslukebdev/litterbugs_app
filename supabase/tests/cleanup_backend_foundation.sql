-- Run only against a disposable Supabase database after loading the committed
-- baseline and migrations. The transaction rolls back every test fixture.
\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'cleanup-reporter@example.com',
    false,
    '{"full_name":"Cleanup Reporter"}',
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'cleanup-cleaner@example.com',
    false,
    '{"full_name":"Cleanup Cleaner"}',
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
  'development-placeholder-v1',
  'Development cleanup guidelines',
  'Disposable test text. This is not legal waiver content.',
  true
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

insert into public.reports (
  user_id,
  title,
  latitude,
  longitude
) values (
  '11111111-1111-4111-8111-111111111111',
  'Cleanup foundation report',
  35,
  -78
);

insert into public.cleanup_waiver_acceptances (user_id, waiver_version)
values (
  '11111111-1111-4111-8111-111111111111',
  'development-placeholder-v1'
);

do $$
declare
  report_id uuid;
  affected integer;
begin
  select id into report_id
  from public.reports
  where title = 'Cleanup foundation report';

  update public.reports
  set title = 'Cleanup foundation report updated'
  where id = report_id;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Owner could not update an available report';
  end if;

  begin
    update public.reports
    set cleanup_state = 'claimed'
    where id = report_id;
    raise exception 'Client updated server-managed cleanup_state';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.reports
    set expires_at = now() + interval '1 year'
    where id = report_id;
    raise exception 'Client updated server-managed expires_at';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

do $$
declare
  report_id uuid;
  attempt_id uuid;
begin
  select id into report_id
  from public.reports
  where title = 'Cleanup foundation report updated';

  insert into public.cleanup_attempts (
    report_id,
    cleaner_id,
    reporter_id,
    waiver_version,
    claimed_at,
    claim_expires_at,
    is_self_cleanup
  ) values (
    report_id,
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'development-placeholder-v1',
    now(),
    now() + interval '24 hours',
    false
  )
  returning id into attempt_id;

  update public.reports
  set cleanup_state = 'claimed'
  where id = report_id;

  begin
    insert into public.cleanup_attempts (
      report_id,
      cleaner_id,
      reporter_id,
      waiver_version,
      claimed_at,
      claim_expires_at,
      is_self_cleanup
    ) values (
      report_id,
      '11111111-1111-4111-8111-111111111111',
      '11111111-1111-4111-8111-111111111111',
      'development-placeholder-v1',
      now(),
      now() + interval '24 hours',
      true
    );
    raise exception 'A second active cleanup attempt was created';
  exception
    when unique_violation then null;
  end;
end;
$$;

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
  report_id uuid;
  affected integer;
begin
  select id into report_id
  from public.reports
  where title = 'Cleanup foundation report updated';

  update public.reports
  set title = 'Forbidden claimed-report update'
  where id = report_id;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Reporter updated a claimed report';
  end if;

  delete from public.reports
  where id = report_id;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Reporter deleted a claimed report';
  end if;

  begin
    insert into public.cleanup_attempts (
      report_id,
      cleaner_id,
      reporter_id,
      waiver_version,
      claimed_at,
      claim_expires_at
    ) values (
      report_id,
      '11111111-1111-4111-8111-111111111111',
      '11111111-1111-4111-8111-111111111111',
      'development-placeholder-v1',
      now(),
      now() + interval '24 hours'
    );
    raise exception 'Client inserted a cleanup attempt directly';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

insert into public.reports (
  user_id,
  title,
  latitude,
  longitude,
  created_at,
  expires_at
) values (
  '11111111-1111-4111-8111-111111111111',
  'Soft-expired report',
  35,
  -78,
  now() - interval '31 days',
  now() - interval '1 day'
), (
  '11111111-1111-4111-8111-111111111111',
  'Completed impact report',
  35,
  -78,
  now() - interval '31 days',
  now() - interval '1 day'
);

update public.reports
set cleanup_state = 'completed'
where title = 'Completed impact report';

select private.run_cleanup_maintenance();

do $$
declare
  soft_expired_count integer;
  completed_count integer;
  canonical_jobs integer;
begin
  select count(*) into soft_expired_count
  from public.reports
  where title = 'Soft-expired report'
    and expired_at is not null;

  if soft_expired_count <> 1 then
    raise exception 'Expired report was deleted or not soft-expired';
  end if;

  select count(*) into completed_count
  from public.reports
  where title = 'Completed impact report'
    and expired_at is null
    and cleanup_state = 'completed';

  if completed_count <> 1 then
    raise exception 'Completed impact report was expired or deleted';
  end if;

  if to_regclass('cron.job') is not null then
    select count(*) into canonical_jobs
    from cron.job
    where jobname = 'litterbugs-workflow-maintenance';

    if canonical_jobs <> 1 then
      raise exception 'Canonical workflow maintenance job is missing or duplicated';
    end if;
  end if;
end;
$$;

rollback;
