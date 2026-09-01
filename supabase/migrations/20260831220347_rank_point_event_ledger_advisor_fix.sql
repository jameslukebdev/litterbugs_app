create policy "Rank point events are server managed"
  on public.rank_point_events
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);
