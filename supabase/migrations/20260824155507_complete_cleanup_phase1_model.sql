-- Complete the Phase 1 cleanup data model without duplicating the cleanup
-- foundation introduced by 20260824143458_cleanup_backend_foundation.sql.

alter table public.cleanup_attempts
  add column final_reviewer_id uuid references public.profiles(id) on delete set null,
  add column approval_method text;

alter table public.cleanup_attempts
  add constraint cleanup_attempts_approval_method_check check (
    approval_method is null
    or approval_method = any (array[
      'reporter_approved',
      'self_approved',
      'auto_approved'
    ])
  ),
  add constraint cleanup_attempts_completion_approval_check check (
    (
      status <> 'completed'
      and approval_method is null
      and final_reviewer_id is null
    )
    or (
      status = 'completed'
      and (
        (
          approval_method = 'auto_approved'
          and final_reviewer_id is null
        )
        or (
          approval_method = 'self_approved'
          and is_self_cleanup
          and (
            final_reviewer_id is null
            or final_reviewer_id = reporter_id
          )
        )
        or (
          approval_method = 'reporter_approved'
          and not is_self_cleanup
          and (
            final_reviewer_id is null
            or final_reviewer_id = reporter_id
          )
        )
      )
    )
  );

create index cleanup_attempts_final_reviewer_idx
  on public.cleanup_attempts (final_reviewer_id)
  where final_reviewer_id is not null;

alter table public.cleanup_reviews
  drop constraint cleanup_reviews_reason_check,
  add constraint cleanup_reviews_reason_check check (
    (
      decision = 'changes_requested'
      and cardinality(reason_codes) between 1 and 4
      and reason_codes <@ array[
        'additional_photo_needed',
        'cleanup_appears_incomplete',
        'details_unclear',
        'other'
      ]::text[]
      and array_position(reason_codes, null) is null
    )
    or (
      decision <> 'changes_requested'
      and coalesce(cardinality(reason_codes), 0) = 0
    )
  );

create table public.cleanup_submission_photos (
  id uuid not null default gen_random_uuid(),
  submission_id uuid not null references public.cleanup_submissions(id) on delete restrict,
  storage_path text not null,
  display_order smallint not null,
  uploaded_at timestamptz not null default now(),
  constraint cleanup_submission_photos_pkey primary key (id),
  constraint cleanup_submission_photos_storage_path_key unique (storage_path),
  constraint cleanup_submission_photos_submission_order_key unique (
    submission_id,
    display_order
  ),
  constraint cleanup_submission_photos_path_check check (
    storage_path = btrim(storage_path)
    and char_length(storage_path) between 1 and 1024
    and storage_path !~ '(^|/)\.\.?(/|$)'
  ),
  constraint cleanup_submission_photos_order_check check (
    display_order between 1 and 3
  )
);

insert into public.cleanup_submission_photos (
  submission_id,
  storage_path,
  display_order,
  uploaded_at
)
select
  cleanup_submissions.id,
  photo.storage_path,
  photo.display_order,
  cleanup_submissions.created_at
from public.cleanup_submissions
cross join lateral unnest(cleanup_submissions.after_photo_paths)
  with ordinality as photo(storage_path, display_order);

drop policy if exists "Cleanup evidence follows cleanup visibility"
  on storage.objects;

alter table public.cleanup_submissions
  drop constraint cleanup_submissions_photo_count_check,
  drop column after_photo_paths;

create function private.assert_cleanup_submission_photo_count(
  target_submission_id uuid
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  photo_count integer;
begin
  if not exists (
    select 1
    from public.cleanup_submissions
    where cleanup_submissions.id = target_submission_id
  ) then
    return;
  end if;

  select count(*)
  into photo_count
  from public.cleanup_submission_photos
  where cleanup_submission_photos.submission_id = target_submission_id;

  if photo_count not between 1 and 3 then
    raise check_violation using
      constraint = 'cleanup_submissions_photo_count_check',
      message = format(
        'Cleanup submission %s must contain between 1 and 3 after photos',
        target_submission_id
      );
  end if;
end;
$$;

create function private.enforce_cleanup_submission_photo_count()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'cleanup_submissions' then
    perform private.assert_cleanup_submission_photo_count(
      case when tg_op = 'DELETE' then old.id else new.id end
    );
  else
    if tg_op <> 'INSERT' then
      perform private.assert_cleanup_submission_photo_count(old.submission_id);
    end if;

    if tg_op <> 'DELETE'
      and (
        tg_op = 'INSERT'
        or new.submission_id is distinct from old.submission_id
      ) then
      perform private.assert_cleanup_submission_photo_count(new.submission_id);
    end if;
  end if;

  return null;
end;
$$;

revoke all on function private.assert_cleanup_submission_photo_count(uuid)
  from public, anon, authenticated;
revoke all on function private.enforce_cleanup_submission_photo_count()
  from public, anon, authenticated;

create constraint trigger cleanup_submissions_require_photos
after insert or update on public.cleanup_submissions
deferrable initially deferred
for each row
execute function private.enforce_cleanup_submission_photo_count();

create constraint trigger cleanup_submission_photos_require_valid_count
after insert or update or delete on public.cleanup_submission_photos
deferrable initially deferred
for each row
execute function private.enforce_cleanup_submission_photo_count();

comment on column public.cleanup_attempts.final_reviewer_id is
  'The reporter who made the final manual decision. Null for automatic approval or after profile deletion.';
comment on column public.cleanup_attempts.approval_method is
  'Final outcome source: reporter_approved, self_approved, or auto_approved.';
comment on table public.cleanup_submission_photos is
  'Ordered after-cleanup photo metadata. Each immutable submission must have one to three rows.';
comment on column public.cleanup_attempts.last_activity_at is
  'Workflow update timestamp; equivalent to the cleanup record updated timestamp.';
comment on column public.cleanup_submissions.created_at is
  'Immutable submission timestamp for this evidence revision.';

alter table public.cleanup_submission_photos enable row level security;

revoke all on table public.cleanup_submission_photos from anon, authenticated;
grant select on table public.cleanup_submission_photos to anon, authenticated;

create policy "Accepted cleanup photo metadata is public"
  on public.cleanup_submission_photos
  for select
  to anon
  using (
    exists (
      select 1
      from public.cleanup_submissions
      join public.cleanup_attempts
        on cleanup_attempts.id = cleanup_submissions.cleanup_attempt_id
      where cleanup_submissions.id = cleanup_submission_photos.submission_id
        and cleanup_attempts.status = 'completed'
        and cleanup_attempts.final_submission_id = cleanup_submissions.id
    )
  );

create policy "Authenticated cleanup photo metadata visibility"
  on public.cleanup_submission_photos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.cleanup_submissions
      join public.cleanup_attempts
        on cleanup_attempts.id = cleanup_submissions.cleanup_attempt_id
      where cleanup_submissions.id = cleanup_submission_photos.submission_id
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

drop policy if exists "Cleanup evidence follows cleanup visibility"
  on storage.objects;
create policy "Cleanup evidence follows cleanup visibility"
  on storage.objects
  for select
  to public
  using (
    bucket_id = 'cleanup_photos'
    and (
      exists (
        select 1
        from public.cleanup_submission_photos
        where cleanup_submission_photos.storage_path = name
      )
      or (
        (select public.is_permanent_user())
        and (storage.foldername(name))[1] = (select auth.uid()::text)
        and not exists (
          select 1
          from public.cleanup_submission_photos
          where cleanup_submission_photos.storage_path = name
        )
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
      )
    )
  );

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

drop policy if exists "Cleaners can delete unsubmitted cleanup evidence"
  on storage.objects;
create policy "Cleaners can delete unsubmitted cleanup evidence"
  on storage.objects
  for delete
  to authenticated
  using (
    (select public.is_permanent_user())
    and bucket_id = 'cleanup_photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and not exists (
      select 1
      from public.cleanup_submission_photos
      where cleanup_submission_photos.storage_path = name
    )
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
