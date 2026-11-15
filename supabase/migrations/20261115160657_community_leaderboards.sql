-- Automatic communities and community leaderboards.
--
-- Additive only: no existing table, policy or trigger changes behaviour. The live
-- website does not read any of this until a website release.
--
-- A community is the area an accepted report falls in (docs/plans/2026-11-15-community-leaderboards.md):
--   * inside a city of 50,000+ people -> that city;
--   * otherwise its county (or local equivalent), named after its largest town of
--     10,000+ people, else after the county itself.
-- Places are looked up inside the database (pg_net + pg_cron), one OpenStreetMap
-- request per minute, using positions rounded to about 1 km.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  path text not null unique,
  name text not null,
  kind text not null check (kind in ('city', 'county', 'region')),
  area_key text not null unique,
  area_name text not null,
  country_code text not null,
  country_name text not null,
  region_code text,
  region_name text,
  latitude double precision,
  longitude double precision,
  time_zone text not null default 'UTC',
  created_at timestamptz not null default now()
);

comment on table public.communities is
  'Communities created automatically from accepted reports. Read through community_directory() for counts and visibility.';

alter table public.communities enable row level security;
create policy "Communities are public" on public.communities
  for select to anon, authenticated using (true);
revoke all on public.communities from anon, authenticated;
grant select on public.communities to anon, authenticated;

-- Which community each accepted report belongs to. Set once, never recalculated.
create table private.report_communities (
  report_id uuid primary key references public.reports(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  cell text not null,
  assigned_at timestamptz not null default now()
);
create index report_communities_community_idx on private.report_communities (community_id);

-- One reverse lookup per ~1 km cell, shared by every report in it.
create table private.community_cells (
  cell text primary key,
  latitude numeric(6, 2) not null,
  longitude numeric(6, 2) not null,
  status text not null default 'queued' check (status in ('queued', 'requested', 'resolved', 'failed')),
  request_id bigint,
  requested_at timestamptz,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lookup jsonb,
  area_key text,
  last_error text,
  updated_at timestamptz not null default now()
);

-- One record per city or county; counties wait for a "largest town" lookup before
-- their community is created, so a page never changes name after it exists.
create table private.community_areas (
  area_key text primary key,
  kind text not null check (kind in ('city', 'county', 'region')),
  area_name text not null,
  country_code text not null,
  country_name text not null,
  region_code text,
  region_name text,
  latitude double precision,
  longitude double precision,
  status text not null default 'queued' check (status in ('queued', 'requested', 'resolved', 'failed')),
  request_id bigint,
  requested_at timestamptz,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  largest_name text,
  largest_population bigint,
  community_id uuid references public.communities(id) on delete set null,
  last_error text,
  updated_at timestamptz not null default now()
);

-- Hand corrections, e.g. the Caldwell County part of Blowing Rock counting as Boone.
create table private.community_area_overrides (
  area_key text primary key,
  community_id uuid not null references public.communities(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

-- Monthly winners. Names are resolved when read, so opting out also hides past titles.
create table public.community_champions (
  community_id uuid not null references public.communities(id) on delete cascade,
  board text not null check (board in ('clean', 'report', 'fund')),
  month date not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null,
  recorded_at timestamptz not null default now(),
  primary key (community_id, board, month)
);
alter table public.community_champions enable row level security;
revoke all on public.community_champions from anon, authenticated;

alter table private.report_communities enable row level security;
alter table private.community_cells enable row level security;
alter table private.community_areas enable row level security;
alter table private.community_area_overrides enable row level security;

-- Leaderboard visibility: everyone is included; a person can turn it off.
alter table public.profiles
  add column if not exists show_on_leaderboards boolean not null default true;
grant select (show_on_leaderboards), update (show_on_leaderboards) on public.profiles to authenticated;
comment on column public.profiles.show_on_leaderboards is
  'When false, the person is hidden from every community and global leaderboard and champion list.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function private.community_slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(value, ''),
      'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- "Maya Ríos" -> "Maya R."; a single word stays as it is.
create or replace function private.leaderboard_name(display_name text, username text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(trim(display_name), '') = '' then coalesce(nullif(trim(username), ''), 'A Litterbug')
    when array_length(regexp_split_to_array(trim(display_name), '\s+'), 1) = 1 then trim(display_name)
    else (regexp_split_to_array(trim(display_name), '\s+'))[1] || ' '
      || upper(left((regexp_split_to_array(trim(display_name), '\s+'))[array_length(regexp_split_to_array(trim(display_name), '\s+'), 1)], 1)) || '.'
  end;
$$;

-- Month boundaries need a time zone; places outside the seeded ones use their
-- longitude (whole-hour offset, no daylight saving), which is close enough.
create or replace function private.community_time_zone(longitude double precision)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when longitude is null then 'UTC'
    when round(longitude / 15) = 0 then 'UTC'
    when round(longitude / 15) < 0 then 'Etc/GMT+' || abs(round(longitude / 15))::int
    else 'Etc/GMT-' || round(longitude / 15)::int
  end;
$$;

create or replace function private.community_month_start(time_zone text, months_ago integer default 0)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (date_trunc('month', now() at time zone time_zone) - make_interval(months => months_ago)) at time zone time_zone;
$$;

-- Accepted, real reports: the only ones that make or join a community.
create or replace view private.community_eligible_reports as
  select r.id, r.latitude, r.longitude, r.created_at
  from public.reports r
  where r.funding_eligibility = 'eligible'
    and r.is_published
    and not r.is_sample
    and r.latitude is not null
    and r.longitude is not null;

-- ---------------------------------------------------------------------------
-- Assignment job (runs every minute)
-- ---------------------------------------------------------------------------

create or replace function private.resolve_community_cell(target_cell text, response jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  address jsonb := coalesce(response -> 'address', '{}'::jsonb);
  country_code text := upper(address ->> 'country_code');
  country_name text := coalesce(address ->> 'country', upper(address ->> 'country_code'));
  region_code text := upper(coalesce(address ->> 'ISO3166-2-lvl4', address ->> 'ISO3166-2-lvl5', address ->> 'ISO3166-2-lvl6', address ->> 'ISO3166-2-lvl3'));
  region_name text := coalesce(address ->> 'state', address ->> 'province', address ->> 'region', address ->> 'state_district');
  place_type text := response ->> 'addresstype';
  place_name text := coalesce(response ->> 'name', address ->> 'city', address ->> 'town', address ->> 'village');
  population bigint := nullif(regexp_replace(coalesce(response -> 'extratags' ->> 'population', ''), '[^0-9]', '', 'g'), '')::bigint;
  county text := coalesce(address ->> 'county', address ->> 'state_district');
  cell_row private.community_cells;
  area_kind text;
  area_name text;
  key text;
begin
  select * into cell_row from private.community_cells where cell = target_cell;
  if country_code is null then
    update private.community_cells
      set status = 'failed', last_error = 'No country in lookup', lookup = response, updated_at = now()
      where cell = target_cell;
    return;
  end if;

  if place_type in ('city', 'town', 'village', 'municipality', 'city_district', 'borough', 'suburb') and coalesce(population, 0) >= 50000 then
    area_kind := 'city';
    area_name := place_name;
  elsif county is not null then
    area_kind := 'county';
    area_name := county;
  else
    area_kind := 'region';
    area_name := coalesce(place_name, region_name, country_name);
  end if;
  key := area_kind || ':' || coalesce(region_code, country_code) || ':' || lower(area_name);

  insert into private.community_areas (area_key, kind, area_name, country_code, country_name, region_code, region_name, latitude, longitude, status)
  values (key, area_kind, area_name, country_code, country_name, region_code, region_name, cell_row.latitude, cell_row.longitude,
    case when area_kind = 'county' then 'queued' else 'resolved' end)
  on conflict (area_key) do nothing;

  update private.community_cells
    set status = 'resolved', lookup = response, area_key = key, last_error = null, updated_at = now()
    where cell = target_cell;
end;
$$;

create or replace function private.create_area_community(target_area text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  area private.community_areas;
  community uuid;
  display_name text;
  base_path text;
  candidate_path text;
  suffix integer := 1;
  region_part text;
begin
  select * into area from private.community_areas where area_key = target_area for update;
  if area.community_id is not null then return area.community_id; end if;

  select o.community_id into community from private.community_area_overrides o where o.area_key = target_area;
  if community is null then
    select c.id into community from public.communities c where c.area_key = target_area;
  end if;

  if community is null then
    display_name := case
      when area.kind = 'county' and coalesce(area.largest_population, 0) >= 10000 then area.largest_name
      else area.area_name
    end;
    region_part := coalesce(nullif(lower(split_part(coalesce(area.region_code, ''), '-', 2)), ''), 'all');
    base_path := '/communities/' || lower(area.country_code) || '/' || private.community_slugify(region_part) || '/' || private.community_slugify(display_name);
    candidate_path := base_path;
    while exists (select 1 from public.communities c where c.path = candidate_path) loop
      suffix := suffix + 1;
      candidate_path := base_path || '-' || suffix;
    end loop;

    insert into public.communities (slug, path, name, kind, area_key, area_name, country_code, country_name, region_code, region_name, latitude, longitude, time_zone)
    values (
      replace(substr(candidate_path, length('/communities/') + 1), '/', '-'),
      candidate_path, display_name, area.kind, area.area_key, area.area_name, area.country_code, area.country_name,
      area.region_code, area.region_name, area.latitude, area.longitude, private.community_time_zone(area.longitude)
    )
    returning id into community;
  end if;

  update private.community_areas set community_id = community, status = 'resolved', updated_at = now() where area_key = target_area;
  return community;
end;
$$;

create or replace function private.run_community_assignment()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  response record;
  request bigint;
  overpass text;
begin
  -- 1. Queue a lookup for every new ~1 km cell with an unassigned accepted report.
  insert into private.community_cells (cell, latitude, longitude)
  select distinct round(r.latitude::numeric, 2) || ',' || round(r.longitude::numeric, 2), round(r.latitude::numeric, 2), round(r.longitude::numeric, 2)
  from private.community_eligible_reports r
  where not exists (select 1 from private.report_communities rc where rc.report_id = r.id)
  on conflict (cell) do nothing;

  -- 2. Read finished place lookups.
  for item in select * from private.community_cells where status = 'requested' loop
    select * into response from net._http_response where id = item.request_id;
    if found and response.status_code = 200 and response.content is not null then
      begin
        perform private.resolve_community_cell(item.cell, response.content::jsonb);
      exception when others then
        update private.community_cells set status = 'failed', last_error = sqlerrm, updated_at = now() where cell = item.cell;
      end;
    elsif (found and (response.timed_out or response.status_code is not null))
       or item.requested_at < now() - interval '10 minutes' then
      update private.community_cells
        set status = case when item.attempts >= 5 then 'failed' else 'queued' end,
            next_attempt_at = now() + make_interval(mins => 5 * item.attempts),
            last_error = coalesce(response.error_msg, 'HTTP ' || coalesce(response.status_code::text, 'no response')),
            updated_at = now()
        where cell = item.cell;
    end if;
  end loop;

  -- 3. Read finished "largest town in this county" lookups.
  for item in select * from private.community_areas where status = 'requested' loop
    select * into response from net._http_response where id = item.request_id;
    if found and response.status_code = 200 and response.content is not null then
      begin
        update private.community_areas a
          set largest_name = best.name, largest_population = best.population, status = 'resolved', last_error = null, updated_at = now()
          from (
            select e -> 'tags' ->> 'name' as name,
                   nullif(regexp_replace(coalesce(e -> 'tags' ->> 'population', ''), '[^0-9]', '', 'g'), '')::bigint as population
            from jsonb_array_elements(coalesce(response.content::jsonb -> 'elements', '[]'::jsonb)) e
            where e -> 'tags' ->> 'name' is not null
            order by 2 desc nulls last
            limit 1
          ) best
          where a.area_key = item.area_key;
        update private.community_areas set status = 'resolved', updated_at = now() where area_key = item.area_key and status = 'requested';
      exception when others then
        update private.community_areas set status = 'resolved', last_error = sqlerrm, updated_at = now() where area_key = item.area_key;
      end;
    elsif (found and (response.timed_out or response.status_code is not null))
       or item.requested_at < now() - interval '10 minutes' then
      update private.community_areas
        -- After 3 tries the county keeps its own name rather than waiting forever.
        set status = case when item.attempts >= 3 then 'resolved' else 'queued' end,
            next_attempt_at = now() + make_interval(mins => 5 * item.attempts),
            last_error = coalesce(response.error_msg, 'HTTP ' || coalesce(response.status_code::text, 'no response')),
            updated_at = now()
        where area_key = item.area_key;
    end if;
  end loop;

  -- 4. Create communities for resolved areas, then assign their reports.
  for item in select area_key from private.community_areas where status = 'resolved' and community_id is null loop
    perform private.create_area_community(item.area_key);
  end loop;

  insert into private.report_communities (report_id, community_id, cell)
  select r.id, a.community_id, c.cell
  from private.community_eligible_reports r
  join private.community_cells c on c.cell = round(r.latitude::numeric, 2) || ',' || round(r.longitude::numeric, 2)
  join private.community_areas a on a.area_key = c.area_key
  where a.community_id is not null
    and not exists (select 1 from private.report_communities rc where rc.report_id = r.id)
  on conflict (report_id) do nothing;

  -- 5. Send at most one place lookup and one county lookup per run (OpenStreetMap's limits).
  select * into item from private.community_cells
    where status = 'queued' and next_attempt_at <= now()
    order by attempts, updated_at limit 1;
  if found then
    request := net.http_get(
      url := 'https://nominatim.openstreetmap.org/reverse',
      params := jsonb_build_object('format', 'jsonv2', 'zoom', '10', 'extratags', '1', 'addressdetails', '1',
        'accept-language', 'en', 'lat', item.latitude::text, 'lon', item.longitude::text),
      headers := jsonb_build_object('User-Agent', 'litterbugs.app community pages (place names)'),
      timeout_milliseconds := 15000
    );
    update private.community_cells
      set status = 'requested', request_id = request, requested_at = now(), attempts = attempts + 1, updated_at = now()
      where cell = item.cell;
  end if;

  select * into item from private.community_areas
    where status = 'queued' and next_attempt_at <= now()
    order by attempts, updated_at limit 1;
  if found then
    overpass := '[out:json][timeout:25];'
      || case when item.region_code is not null
           then 'area["ISO3166-2"="' || replace(item.region_code, '"', '') || '"]->.s;'
           else 'area["ISO3166-1"="' || replace(item.country_code, '"', '') || '"]->.s;' end
      || 'rel(area.s)["boundary"="administrative"]["name"="' || replace(item.area_name, '"', '\"') || '"];'
      || 'map_to_area->.c;node(area.c)["place"~"^(city|town)$"]["population"];out tags;';
    request := net.http_get(
      url := 'https://overpass-api.de/api/interpreter',
      params := jsonb_build_object('data', overpass),
      headers := jsonb_build_object('User-Agent', 'litterbugs.app community pages (place names)'),
      timeout_milliseconds := 30000
    );
    update private.community_areas
      set status = 'requested', request_id = request, requested_at = now(), attempts = attempts + 1, updated_at = now()
      where area_key = item.area_key;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Leaderboards
-- ---------------------------------------------------------------------------

-- Every counted item per person, community and time. Reports and cleanups come
-- from the rank-point ledger, so its daily and repeat-spot limits apply.
create or replace function private.leaderboard_items(p_board text)
returns table (profile_id uuid, community_id uuid, item_id uuid, counted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select e.user_id, rc.community_id, e.source_id, e.created_at
  from public.rank_point_events e
  join private.report_communities rc on rc.report_id = e.source_id
  where p_board = 'report' and e.source_type = 'report_created'
  union all
  select e.user_id, rc.community_id, e.source_id, e.created_at
  from public.rank_point_events e
  join public.cleanup_attempts a on a.id = e.source_id
  join private.report_communities rc on rc.report_id = a.report_id
  where p_board = 'clean' and e.source_type = 'cleanup_completed'
  union all
  select c.contributor_id, rc.community_id, c.report_id, min(c.succeeded_at)
  from public.cleanup_contributions c
  join private.report_communities rc on rc.report_id = c.report_id
  where p_board = 'fund'
    and c.status in ('succeeded', 'paid_out')
    and c.refunded_at is null
    and c.contributor_id is not null
    and c.succeeded_at is not null
  group by c.contributor_id, rc.community_id, c.report_id;
$$;

create or replace function private.leaderboard_scores(p_community uuid, p_board text, p_from timestamptz, p_to timestamptz)
returns table (profile_id uuid, score integer, reached_at timestamptz, home_community uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with items as (
    select i.* from private.leaderboard_items(p_board) i
    join public.profiles p on p.id = i.profile_id and p.show_on_leaderboards
    where (p_community is null or i.community_id = p_community)
      and (p_from is null or i.counted_at >= p_from)
      and (p_to is null or i.counted_at < p_to)
  ),
  home as (
    select distinct on (profile_id) profile_id, community_id
    from (select profile_id, community_id, count(*) n, max(counted_at) last_at from items group by 1, 2) x
    order by profile_id, n desc, last_at desc
  )
  select i.profile_id, count(*)::integer, max(i.counted_at), h.community_id
  from items i join home h on h.profile_id = i.profile_id
  group by i.profile_id, h.community_id;
$$;

-- Public board: places, short names, rank points and scores. p_community null = global.
create or replace function public.community_leaderboard(
  p_community text,
  p_board text,
  p_period text default 'month',
  p_limit integer default 100
)
returns table (
  place integer,
  profile_id uuid,
  name text,
  score integer,
  rank_points integer,
  community_name text,
  community_path text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  community public.communities;
  zone text := 'America/New_York';
  starts timestamptz;
begin
  if p_board not in ('clean', 'report', 'fund') or p_period not in ('month', 'all') then
    raise exception 'Unknown board or period' using errcode = '22023';
  end if;
  if p_community is not null then
    select * into community from public.communities c where c.slug = p_community;
    if not found then return; end if;
    zone := community.time_zone;
  end if;
  starts := case when p_period = 'month' then private.community_month_start(zone) end;

  return query
    select (rank() over (order by s.score desc))::integer,
           s.profile_id,
           private.leaderboard_name(p.display_name, p.username),
           s.score,
           (select coalesce(sum(e.points), 0)::integer from public.rank_point_events e where e.user_id = s.profile_id),
           hc.name,
           hc.path
    from private.leaderboard_scores(community.id, p_board, starts, null) s
    join public.profiles p on p.id = s.profile_id
    left join public.communities hc on hc.id = s.home_community
    order by s.score desc, s.reached_at asc, 3
    limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

-- Monthly winners for a community and board, newest first. Opted-out people are left out.
create or replace function public.community_past_champions(p_community text, p_board text, p_limit integer default 12)
returns table (month date, name text, score integer, rank_points integer, profile_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select ch.month,
         private.leaderboard_name(p.display_name, p.username),
         ch.score,
         (select coalesce(sum(e.points), 0)::integer from public.rank_point_events e where e.user_id = ch.profile_id),
         ch.profile_id
  from public.community_champions ch
  join public.communities c on c.id = ch.community_id and c.slug = p_community
  join public.profiles p on p.id = ch.profile_id and p.show_on_leaderboards
  where ch.board = p_board
  order by ch.month desc
  limit greatest(1, least(coalesce(p_limit, 12), 60));
$$;

-- Records last month's winner for every community and board once that month has
-- ended in the community's own time zone. Ties go to whoever got there first.
create or replace function private.record_community_champions(p_months_back integer default 1)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  community public.communities;
  board text;
  months integer;
  recorded integer := 0;
  from_at timestamptz;
  to_at timestamptz;
begin
  for community in select * from public.communities loop
    for months in 1..greatest(1, p_months_back) loop
      from_at := private.community_month_start(community.time_zone, months);
      to_at := private.community_month_start(community.time_zone, months - 1);
      foreach board in array array['clean', 'report', 'fund'] loop
        insert into public.community_champions (community_id, board, month, profile_id, score)
        select community.id, board, (from_at at time zone community.time_zone)::date, s.profile_id, s.score
        from private.leaderboard_scores(community.id, board, from_at, to_at) s
        order by s.score desc, s.reached_at asc
        limit 1
        on conflict do nothing;
        if found then recorded := recorded + 1; end if;
      end loop;
    end loop;
  end loop;
  return recorded;
end;
$$;

-- Every community with at least one accepted report, with the numbers the pages need.
-- Indexable once it has 5 accepted reports or 1 confirmed cleanup.
create or replace function public.community_directory(p_path text default null)
returns table (
  slug text,
  path text,
  name text,
  kind text,
  area_name text,
  country_code text,
  country_name text,
  region_code text,
  region_name text,
  latitude double precision,
  longitude double precision,
  time_zone text,
  accepted_reports integer,
  cleanups integer,
  month_reports integer,
  month_cleanups integer,
  first_report_at timestamptz,
  last_activity_at timestamptz,
  is_indexable boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with counts as (
    select c.id,
      count(distinct rc.report_id)::integer as accepted_reports,
      count(distinct a.id) filter (where a.status = 'completed')::integer as cleanups,
      count(distinct rc.report_id) filter (where r.created_at >= private.community_month_start(c.time_zone))::integer as month_reports,
      count(distinct a.id) filter (where a.status = 'completed' and a.completed_at >= private.community_month_start(c.time_zone))::integer as month_cleanups,
      min(r.created_at) as first_report_at,
      greatest(max(r.created_at), max(a.completed_at)) as last_activity_at
    from public.communities c
    join private.report_communities rc on rc.community_id = c.id
    join public.reports r on r.id = rc.report_id
    left join public.cleanup_attempts a on a.report_id = rc.report_id
    where p_path is null or c.path = p_path
    group by c.id
  )
  select c.slug, c.path, c.name, c.kind, c.area_name, c.country_code, c.country_name, c.region_code, c.region_name,
         c.latitude, c.longitude, c.time_zone,
         n.accepted_reports, n.cleanups, n.month_reports, n.month_cleanups, n.first_report_at, n.last_activity_at,
         (n.accepted_reports >= 5 or n.cleanups >= 1)
  from public.communities c
  join counts n on n.id = c.id
  where n.accepted_reports >= 1
  order by n.month_cleanups desc, n.cleanups desc, n.accepted_reports desc, c.name;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

revoke all on function private.community_slugify(text) from public, anon, authenticated;
revoke all on function private.leaderboard_name(text, text) from public, anon, authenticated;
revoke all on function private.community_time_zone(double precision) from public, anon, authenticated;
revoke all on function private.community_month_start(text, integer) from public, anon, authenticated;
revoke all on function private.resolve_community_cell(text, jsonb) from public, anon, authenticated;
revoke all on function private.create_area_community(text) from public, anon, authenticated;
revoke all on function private.run_community_assignment() from public, anon, authenticated;
revoke all on function private.leaderboard_items(text) from public, anon, authenticated;
revoke all on function private.leaderboard_scores(uuid, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function private.record_community_champions(integer) from public, anon, authenticated;
revoke all on private.community_eligible_reports from public, anon, authenticated;

revoke all on function public.community_leaderboard(text, text, text, integer) from public;
revoke all on function public.community_past_champions(text, text, integer) from public;
revoke all on function public.community_directory(text) from public;
grant execute on function public.community_leaderboard(text, text, text, integer) to anon, authenticated;
grant execute on function public.community_past_champions(text, text, integer) to anon, authenticated;
grant execute on function public.community_directory(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Boone keeps its address; it now covers all of Watauga County.
-- ---------------------------------------------------------------------------

insert into public.communities (slug, path, name, kind, area_key, area_name, country_code, country_name, region_code, region_name, latitude, longitude, time_zone)
values ('us-nc-boone', '/communities/us/nc/boone', 'Boone', 'county', 'county:US-NC:watauga county', 'Watauga County',
        'US', 'United States', 'US-NC', 'North Carolina', 36.2168, -81.6746, 'America/New_York')
on conflict (slug) do nothing;

insert into private.community_areas (area_key, kind, area_name, country_code, country_name, region_code, region_name, latitude, longitude, status, largest_name, largest_population, community_id)
select 'county:US-NC:watauga county', 'county', 'Watauga County', 'US', 'United States', 'US-NC', 'North Carolina', 36.2168, -81.6746,
       'resolved', 'Boone', 19092, c.id
from public.communities c where c.slug = 'us-nc-boone'
on conflict (area_key) do nothing;

-- ---------------------------------------------------------------------------
-- Schedules
-- ---------------------------------------------------------------------------

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname in ('litterbugs-community-assignment', 'litterbugs-community-champions');
  perform cron.schedule('litterbugs-community-assignment', '* * * * *', 'select private.run_community_assignment();');
  perform cron.schedule('litterbugs-community-champions', '17 * * * *', 'select private.record_community_champions(1);');
end;
$$;
