\set ON_ERROR_STOP on

begin;

do $$
begin
  if private.cleanup_claim_duration() <> interval '24 hours' then
    raise exception 'Production claim duration is not 24 hours';
  end if;

  if private.cleanup_review_duration() <> interval '48 hours' then
    raise exception 'Production review duration is not 48 hours';
  end if;
end;
$$;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at)
values
  (
    '55555555-5555-4555-8555-555555555555',
    'phase5-cleaner@example.com',
    false,
    '{"full_name":"Phase 5 Cleaner"}',
    now()
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'phase5-reporter@example.com',
    false,
    '{"full_name":"Phase 5 Reporter"}',
    now()
  ),
  (
    '77777777-7777-4777-8777-777777777777',
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
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
    '66666666-6666-4666-8666-666666666666',
    'Phase 5 release report',
    35,
    -78,
    now() + interval '30 days'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
    '66666666-6666-4666-8666-666666666666',
    'Phase 5 expiration report',
    35,
    -78,
    now() + interval '30 days'
  );

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '55555555-5555-4555-8555-555555555555',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-4555-8555-555555555555","is_anonymous":false}',
  true
);

select public.accept_cleanup_waiver(
  'cleanup-waiver-development-v1',
  'cleanup-guidelines-development-v1'
);

do $$
declare
  claimed public.cleanup_attempts%rowtype;
  released public.cleanup_attempts%rowtype;
begin
  select * into claimed
  from public.claim_cleanup('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1');

  if claimed.claim_expires_at <> claimed.claimed_at + interval '24 hours' then
    raise exception 'Claim did not use the centralized production duration';
  end if;

  select * into released
  from public.release_cleanup(claimed.id);

  if released.status <> 'released' or released.released_at is null then
    raise exception 'Release did not preserve released attempt history';
  end if;

  if not exists (
    select 1
    from public.reports
    where id = released.report_id
      and cleanup_state = 'available'
  ) then
    raise exception 'Released report did not return to available';
  end if;

  if exists (
    select 1
    from public.cleanup_notifications
    where cleanup_attempt_id = released.id
      and event_type = 'claim_expired'
  ) then
    raise exception 'Voluntary release incorrectly created an expiration notice';
  end if;
end;
$$;

select public.claim_cleanup('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2');

reset role;

update public.cleanup_attempts
set
  claimed_at = now() - private.cleanup_claim_duration() - interval '2 minutes',
  claim_expires_at = now() - interval '2 minutes',
  last_activity_at = now() - private.cleanup_claim_duration() - interval '2 minutes'
where report_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2';

select private.run_cleanup_maintenance();

do $$
declare
  expired public.cleanup_attempts%rowtype;
  notice public.cleanup_notifications%rowtype;
begin
  select * into expired
  from public.cleanup_attempts
  where report_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2';

  if expired.status <> 'expired'
    or expired.expired_at <> expired.claim_expires_at then
    raise exception 'Maintenance did not expire at the authoritative deadline';
  end if;

  if not exists (
    select 1
    from public.reports
    where id = expired.report_id
      and cleanup_state = 'available'
  ) then
    raise exception 'Expired report did not return to available';
  end if;

  select * into notice
  from public.cleanup_notifications
  where cleanup_attempt_id = expired.id
    and event_type = 'claim_expired';

  if notice.user_id <> expired.cleaner_id
    or notice.event_type <> 'claim_expired'
    or notice.created_at <> expired.claim_expires_at
    or notice.read_at is not null then
    raise exception 'Expiration notice was not recorded correctly';
  end if;

  perform private.expire_cleanup_claim(expired.id, now());

  if (
    select count(*)
    from public.cleanup_notifications
    where cleanup_attempt_id = expired.id
      and event_type = 'claim_expired'
  ) <> 1 then
    raise exception 'Expiration notification was duplicated';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '77777777-7777-4777-8777-777777777777',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"77777777-7777-4777-8777-777777777777","is_anonymous":true}',
  true
);

do $$
begin
  if exists (
    select 1
    from public.cleanup_notifications
    where event_type = 'claim_expired'
  ) then
    raise exception 'Anonymous user could read a cleanup expiration notice';
  end if;

  begin
    perform public.acknowledge_cleanup_notifications(
      array['00000000-0000-4000-8000-000000000000'::uuid]
    );
    raise exception 'Anonymous user acknowledged cleanup notifications';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '66666666-6666-4666-8666-666666666666',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-4666-8666-666666666666","is_anonymous":false}',
  true
);

do $$
begin
  if exists (
    select 1
    from public.cleanup_notifications
    where event_type = 'claim_expired'
  ) then
    raise exception 'Reporter could read the cleaner expiration notice';
  end if;

  if not exists (
    select 1
    from public.cleanup_notifications
    where event_type = 'report_claimed'
  ) then
    raise exception 'Reporter could not read their report claim notice';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '55555555-5555-4555-8555-555555555555',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-4555-8555-555555555555","is_anonymous":false}',
  true
);

do $$
declare
  notification_id uuid;
begin
  select id into notification_id
  from public.cleanup_notifications
  where read_at is null
    and event_type = 'claim_expired';

  perform public.acknowledge_cleanup_notifications(array[notification_id]);

  if not exists (
    select 1
    from public.cleanup_notifications
    where id = notification_id
      and read_at is not null
  ) then
    raise exception 'Cleaner could not acknowledge the expiration notice';
  end if;
end;
$$;

reset role;

do $$
begin
  if has_function_privilege(
    'anon',
    'public.acknowledge_cleanup_notifications(uuid[])',
    'execute'
  ) then
    raise exception 'Anon can acknowledge cleanup notifications';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.acknowledge_cleanup_notifications(uuid[])',
    'execute'
  ) then
    raise exception 'Authenticated users cannot acknowledge cleanup notifications';
  end if;

  if (
    select count(*)
    from cron.job
    where jobname = 'litterbugs-workflow-maintenance'
      and schedule = '* * * * *'
      and active
  ) <> 1 then
    raise exception 'Workflow maintenance is not scheduled once per minute';
  end if;
end;
$$;

rollback;
