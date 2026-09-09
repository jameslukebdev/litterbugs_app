alter table public.cleanup_notifications
  drop constraint cleanup_notifications_event_type_check,
  drop constraint cleanup_notifications_target_check,
  add constraint cleanup_notifications_event_type_check check (
    event_type = any (array[
      'report_claimed',
      'claim_expiring_soon',
      'claim_expired',
      'completion_submitted',
      'changes_requested',
      'cleanup_approved',
      'cleanup_auto_approved',
      'correction_expired',
      'paid_review_started',
      'paid_cleanup_disputed',
      'cleanup_reward_sent',
      'cleanup_payout_failed',
      'cleanup_fund_increased',
      'cleanup_contribution_refunded',
      'report_renewal_due',
      'report_renewed',
      'report_funding_photos_needed',
      'report_funding_review_required',
      'report_funding_approved',
      'report_funding_rejected'
    ])
  ),
  add constraint cleanup_notifications_target_check check (
    (event_type <> all (array['changes_requested', 'cleanup_approved', 'cleanup_auto_approved']) or review_id is not null)
    and (event_type <> all (array['completion_submitted', 'paid_review_started']) or submission_id is not null)
    and (
      event_type <> all (array[
        'report_renewal_due',
        'report_renewed',
        'cleanup_fund_increased',
        'cleanup_contribution_refunded',
        'report_funding_photos_needed',
        'report_funding_review_required',
        'report_funding_approved',
        'report_funding_rejected'
      ])
      or cleanup_attempt_id is null
    )
    and (
      event_type = any (array[
        'report_renewal_due',
        'report_renewed',
        'cleanup_fund_increased',
        'cleanup_contribution_refunded',
        'report_funding_photos_needed',
        'report_funding_review_required',
        'report_funding_approved',
        'report_funding_rejected'
      ])
      or cleanup_attempt_id is not null
    )
    and (event_type <> 'cleanup_contribution_refunded' or contribution_id is not null)
  );

create or replace function private.notify_report_funding_photo_feedback()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reporter_id uuid;
  notification_event text;
begin
  if new.check_kind <> 'report'
    or new.status not in ('better_photos', 'admin_review')
    or new.status is not distinct from old.status then
    return new;
  end if;

  select user_id into reporter_id
  from public.reports
  where id = new.report_id;

  notification_event := case new.status
    when 'better_photos' then 'report_funding_photos_needed'
    else 'report_funding_review_required'
  end;

  if reporter_id is not null then
    insert into public.cleanup_notifications (
      user_id,
      cleanup_attempt_id,
      report_id,
      event_type,
      created_at
    ) values (
      reporter_id,
      null,
      new.report_id,
      notification_event,
      coalesce(new.completed_at, now())
    );
  end if;
  return new;
end;
$$;

revoke all on function private.notify_report_funding_photo_feedback()
  from public, anon, authenticated, service_role;

create or replace function private.notify_report_funding_resolution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.funding_eligibility <> 'safety_hold'
    or new.funding_eligibility not in ('eligible', 'ineligible')
    or new.user_id is null then
    return new;
  end if;

  insert into public.cleanup_notifications (
    user_id,
    cleanup_attempt_id,
    report_id,
    event_type,
    created_at
  ) values (
    new.user_id,
    null,
    new.id,
    case new.funding_eligibility
      when 'eligible' then 'report_funding_approved'
      else 'report_funding_rejected'
    end,
    coalesce(new.original_photo_reviewed_at, now())
  );

  return new;
end;
$$;

revoke all on function private.notify_report_funding_resolution()
  from public, anon, authenticated, service_role;

drop trigger if exists reports_notify_funding_resolution on public.reports;

create trigger reports_notify_funding_resolution
after update of funding_eligibility on public.reports
for each row
execute function private.notify_report_funding_resolution();
;
