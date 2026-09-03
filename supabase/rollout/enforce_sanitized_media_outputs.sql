-- FINAL ROLLOUT STEP — do not run with the initial quarantine deployment.
-- Apply only after every supported mobile/web client uses media_quarantine and
-- the oldest direct-upload mobile build is no longer supported.
update storage.buckets
set allowed_mime_types = array['image/jpeg']
where id in ('report_photos', 'cleanup_photos', 'profile_avatars');

drop policy if exists "Owners can upload report photos" on storage.objects;
drop policy if exists "Cleaners can upload cleanup evidence" on storage.objects;
drop policy if exists "Users can upload their profile avatar" on storage.objects;
drop policy if exists "Users can replace their profile avatar" on storage.objects;
