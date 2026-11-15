-- Finding a town on the Leaderboards home.
--
-- community_for_place: the public community a searched place belongs to, using the same rule as report
-- assignment (a city of 50,000+ is its own community, anywhere else its county). The website looks the
-- typed place up with OpenStreetMap and passes the parts here, so "Banner Elk" finds Avery County.
--
-- my_communities: the communities where the signed-in person has reported, cleaned up or funded,
-- most activity first, for the "Your towns" shortcuts.

create or replace function public.community_for_place(
  p_country_code text,
  p_region_code text,
  p_county text,
  p_city text,
  p_city_population bigint default null
)
returns table (slug text, path text, name text, region_name text, country_name text)
language sql
stable
security definer
set search_path = ''
as $$
  with keys as (
    select 1 as preference, 'city:' || upper(coalesce(nullif(p_region_code, ''), p_country_code)) || ':' || lower(p_city) as area_key
      where nullif(trim(p_city), '') is not null and coalesce(p_city_population, 50000) >= 50000
    union all
    select 2, 'county:' || upper(coalesce(nullif(p_region_code, ''), p_country_code)) || ':' || lower(p_county)
      where nullif(trim(p_county), '') is not null
    union all
    select 3, 'region:' || upper(coalesce(nullif(p_region_code, ''), p_country_code)) || ':' || lower(p_city)
      where nullif(trim(p_city), '') is not null
  ),
  matches as (
    select k.preference, coalesce(o.community_id, c.id) as community_id
    from keys k
    left join private.community_area_overrides o on o.area_key = k.area_key
    left join public.communities c on c.area_key = k.area_key
    where coalesce(o.community_id, c.id) is not null
  )
  select c.slug, c.path, c.name, c.region_name, c.country_name
  from matches m
  join public.communities c on c.id = m.community_id
  where exists (
    select 1 from private.report_communities rc join public.reports r on r.id = rc.report_id
    where rc.community_id = c.id and r.funding_eligibility = 'eligible'
  )
  order by m.preference
  limit 1;
$$;
revoke all on function public.community_for_place(text, text, text, text, bigint) from public;
grant execute on function public.community_for_place(text, text, text, text, bigint) to anon, authenticated;

create or replace function public.my_communities(p_limit integer default 4)
returns table (slug text, path text, name text, region_name text, country_code text, activity integer)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select i.community_id, i.counted_at from private.leaderboard_items('clean') i where i.profile_id = auth.uid()
    union all
    select i.community_id, i.counted_at from private.leaderboard_items('report') i where i.profile_id = auth.uid()
    union all
    select i.community_id, i.counted_at from private.leaderboard_items('fund') i where i.profile_id = auth.uid()
  )
  select c.slug, c.path, c.name, c.region_name, c.country_code, count(*)::integer
  from mine m
  join public.communities c on c.id = m.community_id
  where auth.uid() is not null
  group by c.id
  order by count(*) desc, max(m.counted_at) desc
  limit greatest(1, least(coalesce(p_limit, 4), 12));
$$;
revoke all on function public.my_communities(integer) from public;
grant execute on function public.my_communities(integer) to authenticated;
