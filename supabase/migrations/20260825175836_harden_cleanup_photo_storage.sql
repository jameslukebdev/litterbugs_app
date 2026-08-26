-- Keep Storage eligibility aligned with the server-side submission deadlines.
-- A stale claimed/changes-requested status must not extend upload access after
-- the corresponding server-generated window has ended.

drop policy if exists "Cleaners can upload cleanup evidence"
  on storage.objects;
create policy "Cleaners can upload cleanup evidence"
  on storage.objects
  for insert
  to authenticated
  with check (
    (select public.is_permanent_user())
    and bucket_id = 'cleanup_photos'
    and cardinality(storage.foldername(name)) = 3
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and (storage.foldername(name))[3] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and storage.filename(name) ~* '^after-[1-3]\.(jpe?g|png|webp|heic|heif)$'
    and exists (
      select 1
      from public.cleanup_attempts
      where cleanup_attempts.id::text = (storage.foldername(name))[2]
        and cleanup_attempts.cleaner_id = (select auth.uid())
        and (
          (
            cleanup_attempts.status = 'claimed'
            and cleanup_attempts.claim_expires_at > now()
          )
          or (
            cleanup_attempts.status = 'changes_requested'
            and cleanup_attempts.correction_due_at > now()
          )
        )
    )
  );

comment on policy "Cleaners can upload cleanup evidence" on storage.objects is
  'Permanent cleaners may upload one of the supported after-photo names only while their claim or correction window remains open.';
