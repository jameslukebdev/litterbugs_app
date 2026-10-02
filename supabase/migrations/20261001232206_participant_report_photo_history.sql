-- Report history is available to its owner, cleaners and contributors. Keep
-- original photos under the same authorization, including after public closure.
create policy "Report participants can read historical photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'report_photos'
    and (select public.is_permanent_user())
    and exists (
      select 1 from public.reports r
      where objects.name = any(r.photo_paths)
        and r.is_published and not r.is_sample
        and (
          r.user_id = (select auth.uid())
          or exists (select 1 from public.cleanup_attempts a where a.report_id = r.id and a.cleaner_id = (select auth.uid()))
          or exists (select 1 from public.cleanup_contributions c where c.report_id = r.id and c.contributor_id = (select auth.uid()))
        )
    )
  );

-- Public storage reads must follow the discovery lifecycle too. Ongoing work
-- survives the original date, but cancelled/expired/unpublished work is private.
alter policy "Published report photos are readable" on storage.objects
  using (
    bucket_id = 'report_photos'
    and exists (
      select 1 from public.reports r
      where objects.name = any(r.photo_paths)
        and r.is_published and not r.is_sample
        and r.cancelled_at is null and r.expired_at is null
        and (r.cleanup_state in ('completed','claimed','completion_submitted','changes_requested') or r.expires_at > now())
    )
  );
