-- Custom Storage policy snapshot from project mvaygkflcjswtwchflrk.
-- Supabase-managed Storage tables/functions are intentionally not vendored.

alter table storage.objects enable row level security;

create policy "Allow authenticated uploads to report_photos 1l8xwbw_0"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'report_photos');

create policy "Allow public read access to report_photos 1l8xwbw_0"
  on storage.objects for select
  using (bucket_id = 'report_photos');
