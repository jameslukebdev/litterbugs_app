-- Enforce sample-record removal for already-released clients as well as the
-- updated clients that explicitly filter is_sample.
drop policy if exists "Public Can Read Reports" on public.reports;

create policy "Public Can Read Reports"
  on public.reports
  for select
  to public
  using (not is_sample);
