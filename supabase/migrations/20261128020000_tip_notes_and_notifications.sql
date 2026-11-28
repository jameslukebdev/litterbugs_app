-- Tip notes: a tipper can sign their tip and add a short note. When Stripe confirms the payment,
-- the person tipped gets a "tip_received" notification (Updates inbox and, if their Payments
-- notifications are on, a phone push) with the amount, who sent it and the note.

alter table public.cleaner_tips
  add column tipper_name text,
  add column note text,
  add column recipient_role text not null default 'cleaner',
  add column report_id uuid references public.reports(id) on delete set null,
  add constraint cleaner_tips_tipper_name_check check (tipper_name is null or char_length(tipper_name) between 1 and 60),
  add constraint cleaner_tips_note_check check (note is null or char_length(note) between 1 and 280),
  add constraint cleaner_tips_role_check check (recipient_role = any (array['cleaner', 'reporter']));
create index cleaner_tips_report_id_idx on public.cleaner_tips (report_id) where report_id is not null;

alter table public.cleanup_notifications
  add column tip_id uuid references public.cleaner_tips(id) on delete cascade;
create unique index cleanup_notifications_tip_received_key
  on public.cleanup_notifications (tip_id) where event_type = 'tip_received';

-- Allow the new type. These are the live definitions with 'tip_received' added.
alter table public.cleanup_notifications drop constraint cleanup_notifications_event_type_check;
alter table public.cleanup_notifications add constraint cleanup_notifications_event_type_check check (
  event_type = any (array[
    'report_claimed', 'claim_expiring_soon', 'claim_expired', 'completion_submitted', 'changes_requested',
    'cleanup_approved', 'cleanup_auto_approved', 'correction_expired', 'paid_review_started',
    'paid_cleanup_disputed', 'cleanup_reward_sent', 'cleanup_payout_failed', 'cleanup_fund_increased',
    'cleanup_contribution_refunded', 'report_renewal_due', 'report_renewed', 'report_funding_photos_needed',
    'report_funding_review_required', 'report_funding_approved', 'report_funding_rejected',
    'admin_moderation_needed', 'admin_cleanup_needed', 'funded_cleanup_completed', 'nearby_reports_daily',
    'cleanup_completed_nearby', 'reporter_payout_waiting'
  ])
  or event_type = any (array['cleanup_issue_requested', 'cleanup_issue_replied', 'cleanup_issue_report_updated', 'cleanup_issue_resolved'])
  or event_type = 'tip_received'
);

-- A tip may come from a leaderboard (no report) or a report page (with one).
alter table public.cleanup_notifications drop constraint cleanup_notifications_report_or_admin_check;
alter table public.cleanup_notifications add constraint cleanup_notifications_report_or_admin_check check (
  (event_type = any (array['admin_moderation_needed', 'admin_cleanup_needed']) and admin_case_id is not null)
  or (event_type = 'nearby_reports_daily' and report_id is null and admin_case_id is null)
  or (event_type = 'tip_received' and admin_case_id is null)
  or (event_type <> all (array['admin_moderation_needed', 'admin_cleanup_needed', 'nearby_reports_daily', 'tip_received'])
      and report_id is not null and admin_case_id is null)
);

-- Tips have no cleanup attempt; they point at their tip instead.
alter table public.cleanup_notifications drop constraint cleanup_notifications_target_check;
alter table public.cleanup_notifications add constraint cleanup_notifications_target_check check (
  (event_type <> all (array['changes_requested', 'cleanup_approved', 'cleanup_auto_approved']) or review_id is not null)
  and (event_type <> all (array['completion_submitted', 'paid_review_started']) or submission_id is not null)
  and (event_type <> all (array[
    'report_renewal_due', 'report_renewed', 'cleanup_fund_increased', 'cleanup_contribution_refunded',
    'report_funding_photos_needed', 'report_funding_review_required', 'report_funding_approved',
    'report_funding_rejected', 'admin_moderation_needed', 'admin_cleanup_needed', 'nearby_reports_daily', 'tip_received'
  ]) or cleanup_attempt_id is null)
  and (event_type = any (array[
    'report_renewal_due', 'report_renewed', 'cleanup_fund_increased', 'cleanup_contribution_refunded',
    'report_funding_photos_needed', 'report_funding_review_required', 'report_funding_approved',
    'report_funding_rejected', 'admin_moderation_needed', 'admin_cleanup_needed', 'nearby_reports_daily', 'tip_received'
  ]) or cleanup_attempt_id is not null)
  and (event_type <> 'cleanup_contribution_refunded' or contribution_id is not null)
  and (event_type <> 'tip_received' or tip_id is not null)
);

-- Tips are money: the member's "Payments" switch decides whether they reach the phone.
create or replace function private.notification_topic(event_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when event_type in ('admin_moderation_needed', 'admin_cleanup_needed') then 'admin'
    when event_type = 'nearby_reports_daily' then 'new_litter_nearby'
    when event_type = 'cleanup_completed_nearby' then 'cleanups_nearby'
    when event_type in (
      'cleanup_reward_sent', 'cleanup_payout_failed', 'cleanup_fund_increased',
      'cleanup_contribution_refunded', 'paid_cleanup_disputed', 'reporter_payout_waiting', 'tip_received'
    ) then 'payments'
    else 'reports_and_cleanups'
  end;
$$;

-- Notify the person tipped once, when Stripe confirms the payment.
create function private.notify_tip_received()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'succeeded' and old.status is distinct from 'succeeded' and new.cleaner_id is not null then
    insert into public.cleanup_notifications (user_id, report_id, event_type, tip_id)
    values (new.cleaner_id, new.report_id, 'tip_received', new.id)
    on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function private.notify_tip_received() from public, anon, authenticated, service_role;

create trigger notify_tip_received after update of status on public.cleaner_tips
  for each row execute function private.notify_tip_received();
