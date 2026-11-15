-- Your path to the next rank bug, on the Leaderboards.
--
-- my_rank_point_events: the signed-in person's own rank points, oldest first, so the website can draw one
-- stepping stone per point. Read-only and limited to the caller's own rows. It returns only the kind of
-- event, its points and its date: no report or cleanup ids, and never anyone else's ledger. The ledger
-- table itself stays closed to clients; get_rank_points still exposes only totals for other people.

create or replace function public.my_rank_point_events()
returns table (kind text, points smallint, earned_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case events.source_type when 'cleanup_completed' then 'clean' else 'report' end,
    events.points,
    events.created_at
  from public.rank_point_events as events
  where auth.uid() is not null
    and events.user_id = auth.uid()
  order by events.created_at, events.id
  limit 1000;
$$;

revoke all on function public.my_rank_point_events() from public, anon, authenticated, service_role;
grant execute on function public.my_rank_point_events() to authenticated;

comment on function public.my_rank_point_events() is
  'The caller''s own rank point events (kind, points, date), oldest first. Read-only; no source ids.';
