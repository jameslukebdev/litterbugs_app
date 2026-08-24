\set ON_ERROR_STOP on

begin;

do $$
declare
  active_count integer;
  development_record public.cleanup_waiver_versions%rowtype;
begin
  select count(*) into active_count
  from public.cleanup_waiver_versions
  where is_active and retired_at is null;

  if active_count <> 1 then
    raise exception 'Expected exactly one active cleanup waiver pair';
  end if;

  select * into development_record
  from public.cleanup_waiver_versions
  where is_active and retired_at is null;

  if development_record.waiver_version <> 'cleanup-waiver-development-v1'
    or development_record.guidelines_version <>
      'cleanup-guidelines-development-v1'
    or development_record.title not ilike '%Development Version%'
    or development_record.body not ilike '%lawyer-approved version%'
    or development_record.body not ilike '%Do not handle needles%'
    or development_record.body not ilike '%Do not trespass%'
  then
    raise exception 'Development waiver content or version pair is incomplete';
  end if;
end;
$$;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'phase3-cleaner@example.com',
    false,
    '{"full_name":"Phase 3 Cleaner"}',
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'phase3-reporter@example.com',
    false,
    '{"full_name":"Phase 3 Reporter"}',
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
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
  expires_at
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '22222222-2222-4222-8222-222222222222',
    'Phase 3 accepted cleanup report',
    35,
    -78,
    now() + interval '30 days'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '11111111-1111-4111-8111-111111111111',
    'Phase 3 missing acceptance report',
    35,
    -78,
    now() + interval '30 days'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    '22222222-2222-4222-8222-222222222222',
    'Phase 3 changed version report',
    35,
    -78,
    now() + interval '30 days'
  );

set local role anon;

do $$
begin
  begin
    perform public.accept_cleanup_waiver(
      'cleanup-waiver-development-v1',
      'cleanup-guidelines-development-v1'
    );
    raise exception 'Signed-out user accepted the cleanup waiver';
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
begin
  begin
    perform public.accept_cleanup_waiver(
      'cleanup-waiver-development-v1',
      'cleanup-guidelines-development-v1'
    );
    raise exception 'Anonymous authenticated user accepted the cleanup waiver';
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
    perform public.accept_cleanup_waiver(
      'cleanup-waiver-development-v0',
      'cleanup-guidelines-development-v0'
    );
    raise exception 'Permanent user accepted a stale waiver pair';
  exception
    when check_violation then
      if sqlerrm <> 'cleanup_waiver_outdated' then
        raise;
      end if;
  end;
end;
$$;

do $$
declare
  first_acceptance public.cleanup_waiver_acceptances%rowtype;
  repeated_acceptance public.cleanup_waiver_acceptances%rowtype;
  acceptance_count integer;
  claimed_attempt public.cleanup_attempts%rowtype;
begin
  select * into first_acceptance
  from public.accept_cleanup_waiver(
    'cleanup-waiver-development-v1',
    'cleanup-guidelines-development-v1'
  );

  select * into repeated_acceptance
  from public.accept_cleanup_waiver(
    'cleanup-waiver-development-v1',
    'cleanup-guidelines-development-v1'
  );

  select count(*) into acceptance_count
  from public.cleanup_waiver_acceptances
  where user_id = '11111111-1111-4111-8111-111111111111';

  if first_acceptance.user_id <>
      '11111111-1111-4111-8111-111111111111'::uuid
    or first_acceptance.accepted_at is null
    or repeated_acceptance.accepted_at <> first_acceptance.accepted_at
    or acceptance_count <> 1
  then
    raise exception 'Versioned acceptance was not immutable and user-derived';
  end if;

  begin
    insert into public.cleanup_waiver_acceptances (
      user_id,
      waiver_version,
      guidelines_version
    ) values (
      '22222222-2222-4222-8222-222222222222',
      'cleanup-waiver-development-v1',
      'cleanup-guidelines-development-v1'
    );
    raise exception 'Client inserted a waiver acceptance directly';
  exception
    when insufficient_privilege then null;
  end;

  select * into claimed_attempt
  from public.claim_cleanup('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');

  if claimed_attempt.cleaner_id <>
      '11111111-1111-4111-8111-111111111111'::uuid
    or claimed_attempt.waiver_version <>
      'cleanup-waiver-development-v1'
    or claimed_attempt.guidelines_version <>
      'cleanup-guidelines-development-v1'
  then
    raise exception 'Claim did not preserve the accepted version pair';
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
begin
  begin
    perform public.claim_cleanup('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2');
    raise exception 'Cleaner claimed without accepting the current version pair';
  exception
    when check_violation then
      if sqlerrm <> 'cleanup_waiver_required' then
        raise;
      end if;
  end;
end;
$$;

reset role;

update public.cleanup_waiver_versions
set
  is_active = false,
  retired_at = now()
where is_active and retired_at is null;

insert into public.cleanup_waiver_versions (
  waiver_version,
  guidelines_version,
  title,
  body,
  is_active
) values (
  'cleanup-waiver-development-v2',
  'cleanup-guidelines-development-v2',
  'Phase 3 disposable changed waiver',
  'Disposable changed development text for rollback-only testing.',
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

do $$
declare
  claimed_attempt public.cleanup_attempts%rowtype;
begin
  begin
    perform public.claim_cleanup('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3');
    raise exception 'Prior acceptance remained valid after a version change';
  exception
    when check_violation then
      if sqlerrm <> 'cleanup_waiver_required' then
        raise;
      end if;
  end;

  begin
    perform public.accept_cleanup_waiver(
      'cleanup-waiver-development-v1',
      'cleanup-guidelines-development-v1'
    );
    raise exception 'Old displayed versions were accepted after replacement';
  exception
    when check_violation then
      if sqlerrm <> 'cleanup_waiver_outdated' then
        raise;
      end if;
  end;

  perform public.accept_cleanup_waiver(
    'cleanup-waiver-development-v2',
    'cleanup-guidelines-development-v2'
  );

  select * into claimed_attempt
  from public.claim_cleanup('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3');

  if claimed_attempt.waiver_version <> 'cleanup-waiver-development-v2'
    or claimed_attempt.guidelines_version <>
      'cleanup-guidelines-development-v2'
  then
    raise exception 'New version pair was not required for the next claim';
  end if;
end;
$$;

reset role;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.accept_cleanup_waiver(text, text)',
    'execute'
  ) then
    raise exception 'Anon role retained accept_cleanup_waiver execution';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.accept_cleanup_waiver(text, text)',
    'execute'
  ) then
    raise exception 'Authenticated role cannot accept cleanup waiver';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.cleanup_waiver_acceptances',
    'insert'
  ) then
    raise exception 'Authenticated role retained direct acceptance inserts';
  end if;
end;
$$;

rollback;
