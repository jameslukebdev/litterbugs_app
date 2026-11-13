-- Owner confirmed November 13: direct-upload clients were development-only, with no active users.
-- Current public 2.0.1 and unreleased 2.1.0 use quarantine and checked server promotion.
-- Final activation of supabase/rollout/enforce_sanitized_media_outputs.sql.

update storage.buckets
set allowed_mime_types = array['image/jpeg']
where id in ('report_photos', 'cleanup_photos', 'profile_avatars');

drop policy if exists "Owners can upload report photos" on storage.objects;
drop policy if exists "Cleaners can upload cleanup evidence" on storage.objects;
drop policy if exists "Users can upload their profile avatar" on storage.objects;
drop policy if exists "Users can replace their profile avatar" on storage.objects;
