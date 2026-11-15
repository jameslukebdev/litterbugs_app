-- Every published, real report now belongs to a community (not only accepted ones), so a report page
-- can name its town from the community data while the report waits for review. Pages, counts and
-- leaderboards still use accepted reports only: a community is public from its first accepted report.

create or replace view private.community_eligible_reports as
  select r.id, r.latitude, r.longitude, r.created_at
  from public.reports r
  where r.is_published
    and not r.is_sample
    and r.latitude is not null
    and r.longitude is not null;
comment on view private.community_eligible_reports is
  'Published, real reports with a location: every one is assigned to a community. Name kept for the assignment job.';

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
      count(distinct rc.report_id) filter (where r.funding_eligibility = 'eligible')::integer as accepted_reports,
      count(distinct a.id) filter (where a.status = 'completed')::integer as cleanups,
      count(distinct rc.report_id) filter (where r.funding_eligibility = 'eligible' and r.created_at >= private.community_month_start(c.time_zone))::integer as month_reports,
      count(distinct a.id) filter (where a.status = 'completed' and a.completed_at >= private.community_month_start(c.time_zone))::integer as month_cleanups,
      min(r.created_at) filter (where r.funding_eligibility = 'eligible') as first_report_at,
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

-- Report pages need the place names too (region and country), to keep "Boone, North Carolina" in
-- report addresses after the old ZIP boundary is retired.
drop function if exists public.community_for_reports(uuid[]);
create function public.community_for_reports(p_report_ids uuid[])
returns table (report_id uuid, slug text, path text, name text, kind text, area_name text,
  country_code text, country_name text, region_code text, region_name text, is_public boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select rc.report_id, c.slug, c.path, c.name, c.kind, c.area_name, c.country_code, c.country_name, c.region_code, c.region_name,
         exists (
           select 1 from private.report_communities x join public.reports r on r.id = x.report_id
           where x.community_id = c.id and r.funding_eligibility = 'eligible'
         )
  from private.report_communities rc
  join public.communities c on c.id = rc.community_id
  where rc.report_id = any(p_report_ids[1:500]);
$$;
revoke all on function public.community_for_reports(uuid[]) from public;
grant execute on function public.community_for_reports(uuid[]) to anon, authenticated;
