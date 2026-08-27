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
      'report_funding_photos_needed'
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
        'report_funding_photos_needed'
      ])
      or cleanup_attempt_id is null
    )
    and (
      event_type = any (array[
        'report_renewal_due',
        'report_renewed',
        'cleanup_fund_increased',
        'cleanup_contribution_refunded',
        'report_funding_photos_needed'
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
begin
  if new.check_kind <> 'report'
    or new.status <> 'better_photos'
    or new.status is not distinct from old.status then
    return new;
  end if;

  select user_id into reporter_id
  from public.reports
  where id = new.report_id;

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
      'report_funding_photos_needed',
      coalesce(new.completed_at, now())
    );
  end if;
  return new;
end;
$$;

revoke all on function private.notify_report_funding_photo_feedback()
  from public, anon, authenticated, service_role;

drop trigger if exists cleanup_ai_checks_notify_report_photo_feedback
  on public.cleanup_ai_checks;

create trigger cleanup_ai_checks_notify_report_photo_feedback
after update of status on public.cleanup_ai_checks
for each row
execute function private.notify_report_funding_photo_feedback();
