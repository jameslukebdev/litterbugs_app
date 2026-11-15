-- The county "largest town" lookup takes ~35 s on the public Overpass server; allow up to 90 s.
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
    overpass := '[out:json][timeout:90];'
      || case when item.region_code is not null
           then 'area["ISO3166-2"="' || replace(item.region_code, '"', '') || '"]->.s;'
           else 'area["ISO3166-1"="' || replace(item.country_code, '"', '') || '"]->.s;' end
      || 'rel(area.s)["boundary"="administrative"]["name"="' || replace(item.area_name, '"', '\"') || '"];'
      || 'map_to_area->.c;node(area.c)["place"~"^(city|town)$"]["population"];out tags;';
    request := net.http_get(
      url := 'https://overpass-api.de/api/interpreter',
      params := jsonb_build_object('data', overpass),
      headers := jsonb_build_object('User-Agent', 'litterbugs.app community pages (place names)'),
      timeout_milliseconds := 90000
    );
    update private.community_areas
      set status = 'requested', request_id = request, requested_at = now(), attempts = attempts + 1, updated_at = now()
      where area_key = item.area_key;
  end if;
end;
$$;

revoke all on function private.run_community_assignment() from public, anon, authenticated;

-- Let counties that timed out try again with the longer limit.
update private.community_areas set status = 'queued', attempts = 0, next_attempt_at = now(), last_error = null
  where status = 'queued' and community_id is null and last_error like 'HTTP 5%';
