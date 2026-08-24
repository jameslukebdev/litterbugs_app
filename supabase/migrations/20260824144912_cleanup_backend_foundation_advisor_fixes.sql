-- Hosted migration 20260824144912: cover cleanup foreign keys and consolidate public/participant SELECT paths
-- identified by the hosted database performance advisor.

create index if not exists cleanup_attempts_final_submission_idx
  on public.cleanup_attempts (final_submission_id, id)
  where final_submission_id is not null;
create index if not exists cleanup_attempts_waiver_version_idx
  on public.cleanup_attempts (waiver_version);
create index if not exists cleanup_reviews_reviewer_idx
  on public.cleanup_reviews (reviewer_id)
  where reviewer_id is not null;
create index if not exists cleanup_reviews_submission_attempt_idx
  on public.cleanup_reviews (submission_id, cleanup_attempt_id);
create index if not exists cleanup_submissions_submitted_by_idx
  on public.cleanup_submissions (submitted_by)
  where submitted_by is not null;
create index if not exists cleanup_waiver_acceptances_version_idx
  on public.cleanup_waiver_acceptances (waiver_version);

drop policy if exists "Completed cleanup attempts are public"
  on public.cleanup_attempts;
drop policy if exists "Participants can view their cleanup attempts"
  on public.cleanup_attempts;

create policy "Completed cleanup attempts are public"
  on public.cleanup_attempts
  for select
  to anon
  using (status = 'completed');

create policy "Authenticated cleanup attempt visibility"
  on public.cleanup_attempts
  for select
  to authenticated
  using (
    status = 'completed'
    or (
      (select public.is_permanent_user())
      and (
        cleaner_id = (select auth.uid())
        or reporter_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Accepted cleanup evidence is public"
  on public.cleanup_submissions;
drop policy if exists "Participants can view cleanup submissions"
  on public.cleanup_submissions;

create policy "Accepted cleanup evidence is public"
  on public.cleanup_submissions
  for select
  to anon
  using (
    exists (
      select 1
      from public.cleanup_attempts
      where cleanup_attempts.id = cleanup_attempt_id
        and cleanup_attempts.status = 'completed'
        and cleanup_attempts.final_submission_id = cleanup_submissions.id
    )
  );

create policy "Authenticated cleanup submission visibility"
  on public.cleanup_submissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.cleanup_attempts
      where cleanup_attempts.id = cleanup_attempt_id
        and (
          (
            cleanup_attempts.status = 'completed'
            and cleanup_attempts.final_submission_id = cleanup_submissions.id
          )
          or (
            (select public.is_permanent_user())
            and (
              cleanup_attempts.cleaner_id = (select auth.uid())
              or cleanup_attempts.reporter_id = (select auth.uid())
            )
          )
        )
    )
  );
