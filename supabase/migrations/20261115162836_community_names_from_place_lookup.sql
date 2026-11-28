-- Name counties from the place lookup each report already gets (town name and population) instead of
-- the public Overpass service, which was repeatedly at capacity and left new counties waiting.

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

  -- A county is named after its largest town of 10,000+ people. The town comes from this same lookup
  -- (the place the report is in, with its population), so no second service is needed.
  insert into private.community_areas (area_key, kind, area_name, country_code, country_name, region_code, region_name, latitude, longitude, status,
    largest_name, largest_population)
  values (key, area_kind, area_name, country_code, country_name, region_code, region_name, cell_row.latitude, cell_row.longitude, 'resolved',
    case when area_kind = 'county' and place_type in ('city', 'town', 'village', 'municipality') then place_name end,
    case when area_kind = 'county' and place_type in ('city', 'town', 'village', 'municipality') then population end)
  on conflict (area_key) do update
    set largest_name = excluded.largest_name, largest_population = excluded.largest_population, updated_at = now()
    where private.community_areas.community_id is null
      and coalesce(excluded.largest_population, 0) > coalesce(private.community_areas.largest_population, 0);

  update private.community_cells
    set status = 'resolved', lookup = response, area_key = key, last_error = null, updated_at = now()
    where cell = target_cell;
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

  -- 3. Create communities for resolved areas, then assign their reports.
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

  -- 4. Send at most one place lookup per run (OpenStreetMap's usage limit).
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
end;
$$;

revoke all on function private.resolve_community_cell(text, jsonb) from public, anon, authenticated;
revoke all on function private.run_community_assignment() from public, anon, authenticated;

-- Counties still waiting: take their largest town from the lookups already stored for their cells.
update private.community_areas a
  set largest_name = best.name, largest_population = best.population, status = 'resolved', last_error = null, updated_at = now()
  from (
    select distinct on (c.area_key) c.area_key, c.lookup ->> 'name' as name,
      nullif(regexp_replace(coalesce(c.lookup -> 'extratags' ->> 'population', ''), '[^0-9]', '', 'g'), '')::bigint as population
    from private.community_cells c
    where c.lookup ->> 'addresstype' in ('city', 'town', 'village', 'municipality')
    order by c.area_key, 3 desc nulls last
  ) best
  where a.area_key = best.area_key and a.community_id is null;
update private.community_areas set status = 'resolved', last_error = null, updated_at = now()
  where community_id is null and status <> 'resolved';

-- Which public community each report is in (replaces the website's old ZIP-boundary lookup).
-- Only communities with at least one accepted report are public; others return nothing.
create or replace function public.community_for_reports(p_report_ids uuid[])
returns table (report_id uuid, slug text, path text, name text, kind text, country_code text, country_name text, region_code text)
language sql
stable
security definer
set search_path = ''
as $$
  select rc.report_id, c.slug, c.path, c.name, c.kind, c.country_code, c.country_name, c.region_code
  from private.report_communities rc
  join public.communities c on c.id = rc.community_id
  where rc.report_id = any(p_report_ids[1:200]);
$$;
revoke all on function public.community_for_reports(uuid[]) from public;
grant execute on function public.community_for_reports(uuid[]) to anon, authenticated;
