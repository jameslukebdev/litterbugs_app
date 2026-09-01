\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id,
  email,
  is_anonymous,
  raw_user_meta_data,
  created_at
) values
  (
    '99999999-aaaa-4999-8999-999999999999',
    'rank-celebration@example.com',
    false,
    '{"full_name":"Rank Celebration User"}',
    now()
  ),
  (
    '99999999-bbbb-4999-8999-999999999999',
    null,
    true,
    '{}',
    now()
  );

insert into public.profiles (id, display_name)
values (
  '99999999-bbbb-4999-8999-999999999999',
  'Anonymous Celebration Fixture'
);

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
    '91000000-0000-4000-8000-'
    || lpad(sequence_number::text, 12, '0')
  )::uuid,
  '99999999-aaaa-4999-8999-999999999999',
  format('Celebration seed report %s', sequence_number),
  35,
  -82,
  now() + (sequence_number || ' minutes')::interval,
  now() + interval '30 days'
from generate_series(1, 15) as first_rank_jump(sequence_number);

do $$
begin
  if (
    select rank_celebrated_through_points
    from public.profiles
    where id = '99999999-aaaa-4999-8999-999999999999'
  ) <> 0 then
    raise exception 'New profile did not begin with zero acknowledged points';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '99999999-aaaa-4999-8999-999999999999',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-aaaa-4999-8999-999999999999","is_anonymous":false}',
  true
);

do $$
declare
  acknowledged_points integer;
begin
  acknowledged_points := public.acknowledge_current_rank();
  if acknowledged_points <> 15 then
    raise exception 'First acknowledgment did not persist current points';
  end if;

  update public.profiles
  set rank_celebrated_through_points = 999
  where id = '99999999-aaaa-4999-8999-999999999999';

  if (
    select rank_celebrated_through_points
    from public.profiles
    where id = '99999999-aaaa-4999-8999-999999999999'
  ) <> 15 then
    raise exception 'Client-supplied acknowledgment value bypassed authoritative points';
  end if;

  acknowledged_points := public.acknowledge_current_rank();
  if acknowledged_points <> 15 then
    raise exception 'Repeated acknowledgment changed progress unexpectedly';
  end if;
end;
$$;

reset role;

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
    '92000000-0000-4000-8000-'
    || lpad(sequence_number::text, 12, '0')
  )::uuid,
  '99999999-aaaa-4999-8999-999999999999',
  format('Second celebration seed report %s', sequence_number),
  35,
  -82,
  now() + interval '1 day' + (sequence_number || ' minutes')::interval,
  now() + interval '30 days'
from generate_series(1, 15) as second_rank_jump(sequence_number);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '99999999-aaaa-4999-8999-999999999999',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-aaaa-4999-8999-999999999999","is_anonymous":false}',
  true
);

do $$
begin
  if public.acknowledge_current_rank() <> 30 then
    raise exception 'Later acknowledgment did not advance monotonically';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '99999999-aaaa-4999-8999-999999999999',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-aaaa-4999-8999-999999999999","is_anonymous":false}',
  true
);

do $$
begin
  if (
    select rank_celebrated_through_points
    from public.profiles
    where id = '99999999-aaaa-4999-8999-999999999999'
  ) <> 30 then
    raise exception 'Acknowledgment did not persist across a new session';
  end if;

  if public.acknowledge_current_rank() <> 30 then
    raise exception 'New session replay changed acknowledged progress';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '99999999-bbbb-4999-8999-999999999999',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-bbbb-4999-8999-999999999999","is_anonymous":true}',
  true
);

do $$
begin
  begin
    perform public.acknowledge_current_rank();
    raise exception 'Anonymous user acknowledged rank progress';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role anon;

do $$
begin
  begin
    perform public.acknowledge_current_rank();
    raise exception 'Anon role executed rank acknowledgment';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

rollback;
