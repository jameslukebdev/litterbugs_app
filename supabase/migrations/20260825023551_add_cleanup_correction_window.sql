create or replace function private.cleanup_correction_duration()
returns interval
language sql
immutable
security invoker
set search_path = ''
as $$
  select interval '24 hours';
$$;

revoke all on function private.cleanup_correction_duration()
  from public, anon, authenticated, service_role;

comment on function private.cleanup_correction_duration() is
  'Single production source of truth for the 24-hour cleanup correction window.';

alter table public.cleanup_attempts
  add column correction_due_at timestamptz;

create index cleanup_attempts_correction_due_idx
  on public.cleanup_attempts (correction_due_at)
  where status = 'changes_requested';

comment on column public.cleanup_attempts.correction_due_at is
  'Server-generated deadline for the cleaner to resubmit after changes are requested.';

alter table public.cleanup_notifications
  add column review_id uuid
    references public.cleanup_reviews(id)
    on delete cascade,
  drop constraint cleanup_notifications_event_type_check,
  drop constraint cleanup_notifications_attempt_event_key,
  add constraint cleanup_notifications_event_type_check check (
    event_type = any (array[
      'claim_expired',
      'changes_requested',
      'correction_expired'
    ])
  ),
  add constraint cleanup_notifications_review_event_check check (
    event_type <> 'changes_requested'
    or review_id is not null
  );

create unique index cleanup_notifications_terminal_event_key
  on public.cleanup_notifications (cleanup_attempt_id, event_type)
  where event_type = any (array[
    'claim_expired',
    'correction_expired'
  ]);

create unique index cleanup_notifications_review_event_key
  on public.cleanup_notifications (review_id, event_type)
  where review_id is not null;

comment on table public.cleanup_notifications is
  'Server-created cleanup workflow notices for claim expiration, requested changes, and correction expiration.';

create or replace function private.expire_cleanup_claim(
  target_cleanup_id uuid,
  effective_at timestamptz
)
returns public.cleanup_attempts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  attempt_report_id uuid;
  attempt_record public.cleanup_attempts%rowtype;
  transition_at timestamptz := coalesce(effective_at, now());
begin
  select cleanup_attempts.report_id
  into attempt_report_id
  from public.cleanup_attempts
  where cleanup_attempts.id = target_cleanup_id;

  if attempt_report_id is null then
    return null;
  end if;

  perform 1
  from public.reports
  where reports.id = attempt_report_id
  for update;

  select *
  into attempt_record
  from public.cleanup_attempts
  where cleanup_attempts.id = target_cleanup_id
  for update;

  if attempt_record.status = 'claimed'
    and attempt_record.claim_expires_at <= transition_at then
    update public.cleanup_attempts
    set
      status = 'expired',
      expired_at = claim_expires_at,
      last_activity_at = transition_at
    where cleanup_attempts.id = target_cleanup_id
    returning * into attempt_record;

    update public.reports
    set
      cleanup_state = 'available',
      expired_at = case
        when reports.expires_at is not null
          and reports.expires_at <= transition_at
          then reports.expires_at
        else reports.expired_at
      end
    where reports.id = attempt_report_id;

    if attempt_record.cleaner_id is not null then
      insert into public.cleanup_notifications (
        user_id,
        cleanup_attempt_id,
        report_id,
        event_type,
        created_at
      ) values (
        attempt_record.cleaner_id,
        attempt_record.id,
        attempt_record.report_id,
        'claim_expired',
        attempt_record.claim_expires_at
      )
      on conflict do nothing;
    end if;
  end if;

  return attempt_record;
end;
$$;

revoke all on function private.expire_cleanup_claim(uuid, timestamptz)
  from public, anon, authenticated, service_role;

create function private.handle_cleanup_change_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record public.cleanup_attempts%rowtype;
begin
  if new.decision <> 'changes_requested' then
    return new;
  end if;

  update public.cleanup_attempts
  set correction_due_at =
    new.created_at + private.cleanup_correction_duration()
  where cleanup_attempts.id = new.cleanup_attempt_id
    and cleanup_attempts.status = 'completion_submitted'
  returning * into attempt_record;

  if attempt_record.id is null then
    raise check_violation using
      message = 'cleanup_review_invalid_state';
  end if;

  if attempt_record.cleaner_id is not null then
    insert into public.cleanup_notifications (
      user_id,
      cleanup_attempt_id,
      report_id,
      review_id,
      event_type,
      created_at
    ) values (
      attempt_record.cleaner_id,
      attempt_record.id,
      attempt_record.report_id,
      new.id,
      'changes_requested',
      new.created_at
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.handle_cleanup_change_request()
  from public, anon, authenticated, service_role;

create trigger cleanup_reviews_start_correction_window
after insert on public.cleanup_reviews
for each row
execute function private.handle_cleanup_change_request();

create function private.prepare_cleanup_resubmission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record public.cleanup_attempts%rowtype;
begin
  select *
  into attempt_record
  from public.cleanup_attempts
  where cleanup_attempts.id = new.cleanup_attempt_id
  for update;

  if attempt_record.status <> 'changes_requested' then
    return new;
  end if;

  if attempt_record.correction_due_at is null
    or attempt_record.correction_due_at <= new.created_at then
    raise check_violation using
      message = 'cleanup_correction_expired';
  end if;

  update public.cleanup_attempts
  set correction_due_at = null
  where cleanup_attempts.id = new.cleanup_attempt_id;

  return new;
end;
$$;

revoke all on function private.prepare_cleanup_resubmission()
  from public, anon, authenticated, service_role;

create trigger cleanup_submissions_close_correction_window
before insert on public.cleanup_submissions
for each row
execute function private.prepare_cleanup_resubmission();

create function private.expire_cleanup_correction(
  target_cleanup_id uuid,
  effective_at timestamptz
)
returns public.cleanup_attempts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  attempt_report_id uuid;
  attempt_record public.cleanup_attempts%rowtype;
  correction_deadline timestamptz;
  transition_at timestamptz := coalesce(effective_at, now());
begin
  select cleanup_attempts.report_id
  into attempt_report_id
  from public.cleanup_attempts
  where cleanup_attempts.id = target_cleanup_id;

  if attempt_report_id is null then
    return null;
  end if;

  perform 1
  from public.reports
  where reports.id = attempt_report_id
  for update;

  select *
  into attempt_record
  from public.cleanup_attempts
  where cleanup_attempts.id = target_cleanup_id
  for update;

  correction_deadline := attempt_record.correction_due_at;

  if attempt_record.status = 'changes_requested'
    and correction_deadline is not null
    and correction_deadline <= transition_at then
    update public.cleanup_attempts
    set
      status = 'expired',
      expired_at = correction_deadline,
      correction_due_at = null,
      review_due_at = null,
      last_activity_at = transition_at
    where cleanup_attempts.id = target_cleanup_id
    returning * into attempt_record;

    update public.reports
    set cleanup_state = 'available'
    where reports.id = attempt_report_id;

    if attempt_record.cleaner_id is not null then
      insert into public.cleanup_notifications (
        user_id,
        cleanup_attempt_id,
        report_id,
        event_type,
        created_at
      ) values (
        attempt_record.cleaner_id,
        attempt_record.id,
        attempt_record.report_id,
        'correction_expired',
        correction_deadline
      )
      on conflict do nothing;
    end if;
  end if;

  return attempt_record;
end;
$$;

revoke all on function private.expire_cleanup_correction(uuid, timestamptz)
  from public, anon, authenticated, service_role;

create or replace function private.run_cleanup_maintenance()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  maintenance_at timestamptz := now();
  due_cleanup record;
begin
  for due_cleanup in
    select cleanup_attempts.id
    from public.cleanup_attempts
    where cleanup_attempts.status = 'claimed'
      and cleanup_attempts.claim_expires_at <= maintenance_at
    order by cleanup_attempts.claim_expires_at
  loop
    perform private.expire_cleanup_claim(due_cleanup.id, maintenance_at);
  end loop;

  for due_cleanup in
    select cleanup_attempts.id
    from public.cleanup_attempts
    where cleanup_attempts.status = 'completion_submitted'
      and cleanup_attempts.review_due_at <= maintenance_at
    order by cleanup_attempts.review_due_at
  loop
    perform private.auto_approve_cleanup(due_cleanup.id, maintenance_at);
  end loop;

  for due_cleanup in
    select cleanup_attempts.id
    from public.cleanup_attempts
    where cleanup_attempts.status = 'changes_requested'
      and cleanup_attempts.correction_due_at <= maintenance_at
    order by cleanup_attempts.correction_due_at
  loop
    perform private.expire_cleanup_correction(due_cleanup.id, maintenance_at);
  end loop;

  update public.reports
  set expired_at = expires_at
  where expires_at < maintenance_at
    and expired_at is null
    and cancelled_at is null
    and cleanup_state = 'available';
end;
$$;

revoke all on function private.run_cleanup_maintenance()
  from public, anon, authenticated, service_role;
