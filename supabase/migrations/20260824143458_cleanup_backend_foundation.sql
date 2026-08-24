-- Volunteer cleanup workflow foundation (hosted migration 20260824143458).
--
-- This migration deliberately keeps the legacy reports.status column intact.
-- Cleanup state is a separate, server-managed projection while attempts,
-- submissions, reviews, and waiver acceptances retain transactional history.

alter table public.reports
  add column if not exists cleanup_state text not null default 'available',
  add column if not exists expired_at timestamptz,
  add column if not exists cancelled_at timestamptz;

alter table public.reports
  drop constraint if exists reports_cleanup_state_check,
  add constraint reports_cleanup_state_check check (
    cleanup_state = any (array[
      'available',
      'claimed',
      'completion_submitted',
      'changes_requested',
      'completed'
    ])
  ),
  drop constraint if exists reports_lifecycle_terminal_check,
  add constraint reports_lifecycle_terminal_check check (
    not (expired_at is not null and cancelled_at is not null)
    and (
      cleanup_state <> 'completed'
      or (expired_at is null and cancelled_at is null)
    )
  );

create index if not exists reports_cleanup_state_idx
  on public.reports (cleanup_state, expires_at);
create index if not exists reports_soft_expiration_idx
  on public.reports (expires_at)
  where expired_at is null
    and cancelled_at is null
    and cleanup_state = 'available';

comment on column public.reports.status is
  'Legacy report status retained for cross-client compatibility. Do not use for cleanup workflow state.';
comment on column public.reports.cleanup_state is
  'Server-managed current cleanup projection used by public clients.';
comment on column public.reports.expired_at is
  'Soft-expiration timestamp. Expired reports are retained instead of physically deleted.';
comment on column public.reports.cancelled_at is
  'Soft-cancellation timestamp reserved for an explicit report cancellation workflow.';

create table public.cleanup_waiver_versions (
  version text not null,
  title text not null,
  body text not null,
  is_active boolean not null default false,
  published_at timestamptz not null default now(),
  retired_at timestamptz,
  constraint cleanup_waiver_versions_pkey primary key (version),
  constraint cleanup_waiver_versions_version_check check (
    version = btrim(version)
    and char_length(version) between 1 and 80
  ),
  constraint cleanup_waiver_versions_title_check check (
    title = btrim(title)
    and char_length(title) between 1 and 160
  ),
  constraint cleanup_waiver_versions_body_check check (
    body = btrim(body)
    and char_length(body) between 1 and 20000
  ),
  constraint cleanup_waiver_versions_retired_check check (
    retired_at is null or retired_at >= published_at
  )
);

create unique index cleanup_waiver_versions_one_active_idx
  on public.cleanup_waiver_versions (is_active)
  where is_active;

create table public.cleanup_waiver_acceptances (
  user_id uuid not null references public.profiles(id) on delete cascade,
  waiver_version text not null references public.cleanup_waiver_versions(version) on delete restrict,
  accepted_at timestamptz not null default now(),
  constraint cleanup_waiver_acceptances_pkey primary key (user_id, waiver_version)
);

create table public.cleanup_attempts (
  id uuid not null default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete restrict,
  cleaner_id uuid references public.profiles(id) on delete set null,
  reporter_id uuid references public.profiles(id) on delete set null,
  waiver_version text not null references public.cleanup_waiver_versions(version) on delete restrict,
  status text not null default 'claimed',
  is_self_cleanup boolean not null default false,
  claimed_at timestamptz not null default now(),
  claim_expires_at timestamptz not null,
  first_submitted_at timestamptz,
  latest_submitted_at timestamptz,
  review_due_at timestamptz,
  released_at timestamptz,
  expired_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  last_activity_at timestamptz not null default now(),
  final_submission_id uuid,
  constraint cleanup_attempts_pkey primary key (id),
  constraint cleanup_attempts_status_check check (
    status = any (array[
      'claimed',
      'completion_submitted',
      'changes_requested',
      'completed',
      'released',
      'expired',
      'cancelled'
    ])
  ),
  constraint cleanup_attempts_claim_window_check check (
    claim_expires_at = claimed_at + interval '24 hours'
  ),
  constraint cleanup_attempts_submission_times_check check (
    first_submitted_at is null
    or (
      latest_submitted_at is not null
      and latest_submitted_at >= first_submitted_at
    )
  ),
  constraint cleanup_attempts_review_window_check check (
    status <> 'completion_submitted'
    or (
      latest_submitted_at is not null
      and review_due_at = latest_submitted_at + interval '48 hours'
    )
  ),
  constraint cleanup_attempts_terminal_times_check check (
    (status <> 'released' or released_at is not null)
    and (status <> 'expired' or expired_at is not null)
    and (status <> 'completed' or completed_at is not null)
    and (status <> 'cancelled' or cancelled_at is not null)
  )
);

create unique index cleanup_attempts_one_active_per_report_idx
  on public.cleanup_attempts (report_id)
  where status = any (array[
    'claimed',
    'completion_submitted',
    'changes_requested'
  ]);
create index cleanup_attempts_cleaner_idx
  on public.cleanup_attempts (cleaner_id, claimed_at desc);
create index cleanup_attempts_reporter_idx
  on public.cleanup_attempts (reporter_id, claimed_at desc);
create index cleanup_attempts_claim_expiration_idx
  on public.cleanup_attempts (claim_expires_at)
  where status = 'claimed';
create index cleanup_attempts_review_due_idx
  on public.cleanup_attempts (review_due_at)
  where status = 'completion_submitted';

create table public.cleanup_submissions (
  id uuid not null default gen_random_uuid(),
  cleanup_attempt_id uuid not null references public.cleanup_attempts(id) on delete restrict,
  submission_number smallint not null,
  submitted_by uuid references public.profiles(id) on delete set null,
  description text not null,
  bags_or_items_removed integer,
  duration_minutes integer,
  after_photo_paths text[] not null,
  created_at timestamptz not null default now(),
  constraint cleanup_submissions_pkey primary key (id),
  constraint cleanup_submissions_attempt_number_key unique (
    cleanup_attempt_id,
    submission_number
  ),
  constraint cleanup_submissions_id_attempt_key unique (
    id,
    cleanup_attempt_id
  ),
  constraint cleanup_submissions_number_check check (submission_number > 0),
  constraint cleanup_submissions_description_check check (
    description = btrim(description)
    and char_length(description) between 1 and 500
  ),
  constraint cleanup_submissions_bags_check check (
    bags_or_items_removed is null or bags_or_items_removed >= 0
  ),
  constraint cleanup_submissions_duration_check check (
    duration_minutes is null or duration_minutes between 1 and 1440
  ),
  constraint cleanup_submissions_photo_count_check check (
    cardinality(after_photo_paths) between 1 and 3
  )
);

alter table public.cleanup_attempts
  add constraint cleanup_attempts_final_submission_fkey
  foreign key (final_submission_id, id)
  references public.cleanup_submissions(id, cleanup_attempt_id)
  on delete restrict;

alter table public.cleanup_attempts
  add constraint cleanup_attempts_completed_submission_check check (
    status <> 'completed' or final_submission_id is not null
  );

create index cleanup_submissions_attempt_idx
  on public.cleanup_submissions (cleanup_attempt_id, submission_number desc);

create table public.cleanup_reviews (
  id uuid not null default gen_random_uuid(),
  cleanup_attempt_id uuid not null,
  submission_id uuid not null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision text not null,
  reason_codes text[],
  note text,
  created_at timestamptz not null default now(),
  constraint cleanup_reviews_pkey primary key (id),
  constraint cleanup_reviews_submission_key unique (submission_id),
  constraint cleanup_reviews_submission_attempt_fkey
    foreign key (submission_id, cleanup_attempt_id)
    references public.cleanup_submissions(id, cleanup_attempt_id)
    on delete restrict,
  constraint cleanup_reviews_decision_check check (
    decision = any (array[
      'approved',
      'changes_requested',
      'auto_approved'
    ])
  ),
  constraint cleanup_reviews_reason_check check (
    decision <> 'changes_requested'
    or cardinality(reason_codes) between 1 and 5
  ),
  constraint cleanup_reviews_note_check check (
    note is null
    or (
      note = btrim(note)
      and char_length(note) between 1 and 500
    )
  )
);

create index cleanup_reviews_attempt_idx
  on public.cleanup_reviews (cleanup_attempt_id, created_at desc);

comment on table public.cleanup_waiver_versions is
  'Immutable, versioned cleanup safety and waiver text. No legal text is seeded by this migration.';
comment on table public.cleanup_waiver_acceptances is
  'Immutable proof that a permanent user accepted a specific cleanup waiver version.';
comment on table public.cleanup_attempts is
  'One historical cleanup claim/attempt. Released and expired attempts are retained.';
comment on table public.cleanup_submissions is
  'Versioned completion evidence. Resubmission creates a new row instead of overwriting history.';
comment on table public.cleanup_reviews is
  'Reporter or system review decisions for individual cleanup submissions.';

alter table public.cleanup_waiver_versions enable row level security;
alter table public.cleanup_waiver_acceptances enable row level security;
alter table public.cleanup_attempts enable row level security;
alter table public.cleanup_submissions enable row level security;
alter table public.cleanup_reviews enable row level security;

revoke all on table public.cleanup_waiver_versions from anon, authenticated;
grant select on table public.cleanup_waiver_versions to anon, authenticated;

create policy "Cleanup waiver versions are readable"
  on public.cleanup_waiver_versions
  for select
  to anon, authenticated
  using (true);

revoke all on table public.cleanup_waiver_acceptances from anon, authenticated;
grant select on table public.cleanup_waiver_acceptances to authenticated;
grant insert (user_id, waiver_version)
  on table public.cleanup_waiver_acceptances to authenticated;

create policy "Users can view their waiver acceptances"
  on public.cleanup_waiver_acceptances
  for select
  to authenticated
  using (
    (select public.is_permanent_user())
    and user_id = (select auth.uid())
  );

create policy "Users can accept the active cleanup waiver"
  on public.cleanup_waiver_acceptances
  for insert
  to authenticated
  with check (
    (select public.is_permanent_user())
    and user_id = (select auth.uid())
    and exists (
      select 1
      from public.cleanup_waiver_versions
      where cleanup_waiver_versions.version = waiver_version
        and cleanup_waiver_versions.is_active
        and cleanup_waiver_versions.retired_at is null
    )
  );

revoke all on table public.cleanup_attempts from anon, authenticated;
grant select on table public.cleanup_attempts to anon, authenticated;

create policy "Completed cleanup attempts are public"
  on public.cleanup_attempts
  for select
  to anon, authenticated
  using (status = 'completed');

create policy "Participants can view their cleanup attempts"
  on public.cleanup_attempts
  for select
  to authenticated
  using (
    (select public.is_permanent_user())
    and (
      cleaner_id = (select auth.uid())
      or reporter_id = (select auth.uid())
    )
  );

revoke all on table public.cleanup_submissions from anon, authenticated;
grant select on table public.cleanup_submissions to anon, authenticated;

create policy "Accepted cleanup evidence is public"
  on public.cleanup_submissions
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.cleanup_attempts
      where cleanup_attempts.id = cleanup_attempt_id
        and cleanup_attempts.status = 'completed'
        and cleanup_attempts.final_submission_id = cleanup_submissions.id
    )
  );

create policy "Participants can view cleanup submissions"
  on public.cleanup_submissions
  for select
  to authenticated
  using (
    (select public.is_permanent_user())
    and exists (
      select 1
      from public.cleanup_attempts
      where cleanup_attempts.id = cleanup_attempt_id
        and (
          cleanup_attempts.cleaner_id = (select auth.uid())
          or cleanup_attempts.reporter_id = (select auth.uid())
        )
    )
  );

revoke all on table public.cleanup_reviews from anon, authenticated;
grant select on table public.cleanup_reviews to authenticated;

create policy "Participants can view cleanup reviews"
  on public.cleanup_reviews
  for select
  to authenticated
  using (
    (select public.is_permanent_user())
    and exists (
      select 1
      from public.cleanup_attempts
      where cleanup_attempts.id = cleanup_attempt_id
        and (
          cleanup_attempts.cleaner_id = (select auth.uid())
          or cleanup_attempts.reporter_id = (select auth.uid())
        )
    )
  );

-- Preserve report creation and owner management while preventing clients from
-- writing identity, lifecycle, expiration, or cleanup workflow fields.
revoke all on table public.reports from anon, authenticated;
grant select on table public.reports to anon, authenticated;
grant delete on table public.reports to authenticated;
grant insert (
  user_id,
  title,
  litter_types,
  notes_presets,
  notes_other,
  severity,
  latitude,
  longitude,
  photo_paths,
  types
) on table public.reports to authenticated;
grant update (
  title,
  litter_types,
  notes_presets,
  notes_other,
  severity,
  photo_paths,
  types
) on table public.reports to authenticated;

drop policy if exists "Users Can Insert Their Own Reports" on public.reports;
create policy "Users Can Insert Their Own Reports"
  on public.reports
  for insert
  to authenticated
  with check (
    (select public.is_permanent_user())
    and (select auth.uid()) = user_id
    and cleanup_state = 'available'
    and expired_at is null
    and cancelled_at is null
  );

drop policy if exists "Users Can Update Their Own Reports" on public.reports;
create policy "Users Can Update Their Own Reports"
  on public.reports
  for update
  to authenticated
  using (
    (select public.is_permanent_user())
    and (select auth.uid()) = user_id
    and cleanup_state = 'available'
    and expired_at is null
    and cancelled_at is null
  )
  with check (
    (select public.is_permanent_user())
    and (select auth.uid()) = user_id
    and cleanup_state = 'available'
    and expired_at is null
    and cancelled_at is null
  );

drop policy if exists "Users Can Delete Their Own Reports" on public.reports;
create policy "Users Can Delete Their Own Reports"
  on public.reports
  for delete
  to authenticated
  using (
    (select public.is_permanent_user())
    and (select auth.uid()) = user_id
    and cleanup_state = 'available'
    and expired_at is null
    and cancelled_at is null
  );

-- Replace physical report deletion with soft expiration. The public wrapper is
-- retained so existing scheduled commands cannot destructively delete rows.
create or replace function private.run_cleanup_maintenance()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reports
  set expired_at = expires_at
  where expires_at < now()
    and expired_at is null
    and cancelled_at is null
    and cleanup_state = 'available';
end;
$$;

revoke all on function private.run_cleanup_maintenance()
  from public, anon, authenticated, service_role;

create or replace function public.delete_expired_reports()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.run_cleanup_maintenance();
$$;

comment on function public.delete_expired_reports() is
  'Compatibility wrapper. Soft-expires available reports and never physically deletes report or cleanup history.';

revoke all on function public.delete_expired_reports()
  from public, anon, authenticated, service_role;

-- Normalize dashboard-created expiration jobs into one version-controlled job.
-- Local disposable databases without pg_cron skip this block.
do $$
declare
  existing_job record;
begin
  if to_regclass('cron.job') is null then
    return;
  end if;

  for existing_job in
    select jobid
    from cron.job
    where jobname in (
      'delete-expired-reports',
      'delete-expired-reports-daily',
      'litterbugs-workflow-maintenance'
    )
      or command ilike '%delete_expired_reports%'
      or command ilike '%run_cleanup_maintenance%'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'litterbugs-workflow-maintenance',
    '0 * * * *',
    'select private.run_cleanup_maintenance();'
  );
end;
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'cleanup_photos',
  'cleanup_photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Cleanup evidence follows cleanup visibility" on storage.objects;
create policy "Cleanup evidence follows cleanup visibility"
  on storage.objects
  for select
  to public
  using (
    bucket_id = 'cleanup_photos'
    and (
      exists (
        select 1
        from public.cleanup_submissions
        where name = any (cleanup_submissions.after_photo_paths)
      )
      or (
        (storage.foldername(name))[1] = (select auth.uid()::text)
        and exists (
          select 1
          from public.cleanup_attempts
          where cleanup_attempts.id::text = (storage.foldername(name))[2]
            and cleanup_attempts.cleaner_id = (select auth.uid())
            and cleanup_attempts.status = any (array[
              'claimed',
              'completion_submitted',
              'changes_requested'
            ])
        )
      )
    )
  );

drop policy if exists "Cleaners can upload cleanup evidence" on storage.objects;
create policy "Cleaners can upload cleanup evidence"
  on storage.objects
  for insert
  to authenticated
  with check (
    (select public.is_permanent_user())
    and bucket_id = 'cleanup_photos'
    and cardinality(storage.foldername(name)) = 3
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1
      from public.cleanup_attempts
      where cleanup_attempts.id::text = (storage.foldername(name))[2]
        and cleanup_attempts.cleaner_id = (select auth.uid())
        and cleanup_attempts.status = any (array[
          'claimed',
          'changes_requested'
        ])
    )
  );

drop policy if exists "Cleaners can delete unsubmitted cleanup evidence" on storage.objects;
create policy "Cleaners can delete unsubmitted cleanup evidence"
  on storage.objects
  for delete
  to authenticated
  using (
    (select public.is_permanent_user())
    and bucket_id = 'cleanup_photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1
      from public.cleanup_attempts
      where cleanup_attempts.id::text = (storage.foldername(name))[2]
        and cleanup_attempts.cleaner_id = (select auth.uid())
        and cleanup_attempts.status = any (array[
          'claimed',
          'changes_requested'
        ])
    )
  );

comment on table public.cleanup_attempts is
  'Historical volunteer cleanup attempts. State-changing client access is provided only through reviewed backend functions.';
