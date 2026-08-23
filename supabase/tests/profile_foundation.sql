-- Run only against a disposable Supabase database after loading the committed
-- baseline and migrations. The transaction rolls back every test fixture.
\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id,
  email,
  is_anonymous,
  raw_user_meta_data,
  created_at
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'profile-a@example.com',
  false,
  '{"full_name":"Profile A","avatar_url":"https://example.com/a.jpg"}',
  '2026-01-02T03:04:05Z'
), (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'profile-b@example.com',
  false,
  '{"name":"Profile B","picture":"https://example.com/b.jpg"}',
  '2026-02-03T04:05:06Z'
), (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  null,
  true,
  '{}',
  now()
);

do $$
declare
  permanent_profiles integer;
  anonymous_profiles integer;
  seeded_name text;
  seeded_avatar text;
  seeded_created_at timestamptz;
begin
  select count(*) into permanent_profiles
  from public.profiles
  where id in (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  );

  select count(*) into anonymous_profiles
  from public.profiles
  where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  select display_name, provider_avatar_url, created_at
  into seeded_name, seeded_avatar, seeded_created_at
  from public.profiles
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  if permanent_profiles <> 2 then
    raise exception 'Permanent users did not receive one profile each';
  end if;
  if anonymous_profiles <> 0 then
    raise exception 'Anonymous user received a profile';
  end if;
  if seeded_name <> 'Profile A' or seeded_avatar <> 'https://example.com/a.jpg' then
    raise exception 'Provider profile metadata was not seeded';
  end if;
  if seeded_created_at <> '2026-01-02T03:04:05Z'::timestamptz then
    raise exception 'Auth creation date was not preserved';
  end if;
end;
$$;

update public.profiles
set username = 'cleanup.friend'
where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","is_anonymous":false}',
  true
);

update public.profiles
set
  display_name = '  Updated Profile  ',
  username = '  CLEANUP.HERO  ',
  bio = '  Keeping the neighborhood clean.  ',
  location = '  Asheville, NC  ',
  avatar_path = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/avatar'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

do $$
declare
  own_profile public.profiles%rowtype;
  affected integer;
begin
  select * into own_profile
  from public.profiles
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  if own_profile.display_name <> 'Updated Profile'
    or own_profile.username <> 'cleanup.hero'
    or own_profile.bio <> 'Keeping the neighborhood clean.'
    or own_profile.location <> 'Asheville, NC'
    or own_profile.profile_completed_at is null then
    raise exception 'Owner profile update was not normalized or completed';
  end if;

  update public.profiles
  set display_name = 'Forbidden'
  where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'User updated another profile';
  end if;

  begin
    update public.profiles
    set reports_created_count = 99
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'User updated a system-managed profile field';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.profiles (id, display_name)
    values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'Forbidden');
    raise exception 'User inserted a profile';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.profiles
    set username = 'cleanup.friend'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'Duplicate username was accepted';
  exception
    when unique_violation then null;
  end;

  begin
    update public.profiles
    set username = 'admin'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    raise exception 'Reserved username was accepted';
  exception
    when check_violation then null;
  end;
end;
$$;

insert into public.reports (
  id,
  user_id,
  title,
  latitude,
  longitude
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Counter test',
  35,
  -82
);

delete from public.reports
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab';

insert into public.user_blocks (blocker_id, blocked_id)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
);

insert into public.user_moderation_reports (
  reporter_id,
  reported_user_id,
  reason
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'spam_or_misleading'
);

insert into storage.objects (bucket_id, name, owner_id)
values (
  'profile_avatars',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/avatar',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);

update storage.objects
set metadata = '{"mimetype":"image/jpeg","size":1024}'
where bucket_id = 'profile_avatars'
  and name = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/avatar';

do $$
begin
  begin
    insert into public.user_blocks (blocker_id, blocked_id)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    );
    raise exception 'Self-block was accepted';
  exception
    when insufficient_privilege or check_violation then null;
  end;

  begin
    insert into public.user_moderation_reports (
      reporter_id,
      reported_user_id,
      reason,
      details
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'other',
      null
    );
    raise exception 'Other moderation reason was accepted without details';
  exception
    when check_violation then null;
  end;

  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values (
      'profile_avatars',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/avatar',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    );
    raise exception 'User inserted another profile avatar';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

delete from storage.objects
where bucket_id = 'profile_avatars'
  and name = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/avatar';

reset role;

do $$
declare
  report_count integer;
  pending_count integer;
  bucket_is_public boolean;
  bucket_limit bigint;
begin
  select reports_created_count into report_count
  from public.profiles
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  select count(*) into pending_count
  from public.user_moderation_reports
  where reporter_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    and status = 'pending';

  select public, file_size_limit
  into bucket_is_public, bucket_limit
  from storage.buckets
  where id = 'profile_avatars';

  if report_count <> 1 then
    raise exception 'Lifetime report count did not remain after report deletion';
  end if;
  if pending_count <> 1 then
    raise exception 'Moderation report did not enter the pending queue';
  end if;
  if not bucket_is_public or bucket_limit <> 5242880 then
    raise exception 'Profile avatar bucket configuration is incorrect';
  end if;
  if has_table_privilege('authenticated', 'public.profiles', 'INSERT')
    or has_table_privilege('authenticated', 'public.profiles', 'DELETE') then
    raise exception 'Authenticated role has unsafe profile table grants';
  end if;
  if has_table_privilege(
    'authenticated',
    'public.user_moderation_reports',
    'SELECT'
  ) then
    raise exception 'Moderation intake is readable by clients';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","is_anonymous":true}',
  true
);

do $$
begin
  begin
    insert into public.user_blocks (blocker_id, blocked_id)
    values (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    );
    raise exception 'Anonymous user created a block';
  exception
    when insufficient_privilege or foreign_key_violation then null;
  end;
end;
$$;

rollback;

select 'profile_foundation_passed' as result;
