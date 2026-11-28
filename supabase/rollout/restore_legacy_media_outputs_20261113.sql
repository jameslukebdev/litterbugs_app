-- Emergency rollback for November 13 media closure; exact preceding policy definitions.

-- Restores legacy direct client uploads. Apply only if intentionally reopening compatibility.

begin;

create policy "Cleaners can upload cleanup evidence" on storage.objects as PERMISSIVE for INSERT to authenticated with check ((( SELECT is_permanent_user() AS is_permanent_user) AND (bucket_id = 'cleanup_photos'::text) AND (cardinality(storage.foldername(name)) = 3) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid)) AND ((storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'::text) AND (EXISTS ( SELECT 1
   FROM cleanup_attempts
  WHERE (((cleanup_attempts.id)::text = (storage.foldername(objects.name))[2]) AND (cleanup_attempts.cleaner_id = ( SELECT auth.uid() AS uid)) AND (((cleanup_attempts.status = 'claimed'::text) AND (cleanup_attempts.claim_expires_at > now())) OR ((cleanup_attempts.status = 'changes_requested'::text) AND (cleanup_attempts.correction_due_at > now()))))))));

create policy "Owners can upload report photos" on storage.objects as PERMISSIVE for INSERT to authenticated with check ((( SELECT is_permanent_user() AS is_permanent_user) AND (bucket_id = 'report_photos'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid))));

create policy "Users can replace their profile avatar" on storage.objects as PERMISSIVE for UPDATE to authenticated using ((( SELECT is_permanent_user() AS is_permanent_user) AND (bucket_id = 'profile_avatars'::text) AND (name = (( SELECT (auth.uid())::text AS uid) || '/avatar'::text)))) with check ((( SELECT is_permanent_user() AS is_permanent_user) AND (bucket_id = 'profile_avatars'::text) AND (name = (( SELECT (auth.uid())::text AS uid) || '/avatar'::text))));

create policy "Users can upload their profile avatar" on storage.objects as PERMISSIVE for INSERT to authenticated with check ((( SELECT is_permanent_user() AS is_permanent_user) AND (bucket_id = 'profile_avatars'::text) AND (name = (( SELECT (auth.uid())::text AS uid) || '/avatar'::text))));

update storage.buckets set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[] where id = 'cleanup_photos';

update storage.buckets set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[] where id = 'profile_avatars';

update storage.buckets set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']::text[] where id = 'report_photos';

commit;

