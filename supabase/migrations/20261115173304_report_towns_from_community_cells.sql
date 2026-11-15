-- Report addresses and sitemap entries must name the same town every time. The website used to look the town
-- up itself and give up after a short wait, so the sitemap (0.3 s) and the page (2.5 s) could disagree
-- (Ahrefs, Nov 15: "Trash by the tracks" listed without "greensboro-north-carolina"). The community job already
-- stores an OpenStreetMap lookup for each report's ~1 km cell with the same settings the website used
-- (reverse, zoom 10, English names), so report pages now read the town from it.
drop function if exists public.community_for_reports(uuid[]);
create function public.community_for_reports(p_report_ids uuid[])
returns table (report_id uuid, slug text, path text, name text, kind text, area_name text,
  country_code text, country_name text, region_code text, region_name text, is_public boolean,
  town_known boolean, town text, town_region text, town_country text, town_country_code text)
language sql
stable
security definer
set search_path = ''
as $$
  select rc.report_id, c.slug, c.path, c.name, c.kind, c.area_name, c.country_code, c.country_name, c.region_code, c.region_name,
         exists (
           select 1 from private.report_communities x join public.reports r on r.id = x.report_id
           where x.community_id = c.id and r.funding_eligibility = 'eligible'
         ),
         cl.status = 'resolved' and cl.lookup is not null,
         nullif(trim(coalesce(a ->> 'city', a ->> 'town', a ->> 'village', a ->> 'municipality', a ->> 'hamlet')), ''),
         nullif(trim(coalesce(a ->> 'state', a ->> 'province', a ->> 'region')), ''),
         nullif(trim(a ->> 'country'), ''),
         upper(nullif(trim(a ->> 'country_code'), ''))
  from private.report_communities rc
  join public.communities c on c.id = rc.community_id
  left join private.community_cells cl on cl.cell = rc.cell
  left join lateral (select cl.lookup -> 'address' as a) addr on true
  where rc.report_id = any(p_report_ids[1:500]);
$$;
revoke all on function public.community_for_reports(uuid[]) from public;
grant execute on function public.community_for_reports(uuid[]) to anon, authenticated;
