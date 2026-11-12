-- Tell a reporter when a payout for their report is waiting because they have not set up
-- payouts. Until now the payout simply stayed pending and nothing told them.
--
-- The notice is created when the reporter payout is earned (private.earn_reporter_reward
-- inserts into public.reporter_rewards) and the reporter has no payout account that can
-- receive it. Reporters whose payouts are ready get the money without this notice.

alter table public.cleanup_notifications drop constraint cleanup_notifications_event_type_check;
alter table public.cleanup_notifications add constraint cleanup_notifications_event_type_check
  check (event_type = any (array[
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
    'report_funding_rejected',
    'admin_moderation_needed',
    'admin_cleanup_needed',
    'funded_cleanup_completed',
    'nearby_reports_daily',
    'cleanup_completed_nearby',
    'reporter_payout_waiting'
  ]));

-- One notice per reporter payout.
create unique index cleanup_notifications_reporter_payout_waiting_key
  on public.cleanup_notifications (cleanup_attempt_id, user_id)
  where event_type = 'reporter_payout_waiting';

-- It is a payments notice: the member's "Payments" switch decides whether it reaches the phone.
create or replace function private.notification_topic(event_type text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when event_type in ('admin_moderation_needed', 'admin_cleanup_needed') then 'admin'
    when event_type = 'nearby_reports_daily' then 'new_litter_nearby'
    when event_type = 'cleanup_completed_nearby' then 'cleanups_nearby'
    when event_type in (
      'cleanup_reward_sent', 'cleanup_payout_failed', 'cleanup_fund_increased',
      'cleanup_contribution_refunded', 'paid_cleanup_disputed', 'reporter_payout_waiting'
    ) then 'payments'
    else 'reports_and_cleanups'
  end;
$$;
revoke all on function private.notification_topic(text) from public, anon, authenticated, service_role;

create function private.notify_reporter_payout_waiting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.cleaner_payout_accounts as p
    where p.user_id = new.reporter_id
      and p.payouts_enabled and p.country = 'US' and p.age_18_confirmed_at is not null
  ) then
    return new;
  end if;

  insert into public.cleanup_notifications (user_id, cleanup_attempt_id, report_id, event_type)
  values (new.reporter_id, new.cleanup_attempt_id, new.report_id, 'reporter_payout_waiting')
  on conflict do nothing;
  return new;
end $$;
revoke all on function private.notify_reporter_payout_waiting() from public, anon, authenticated, service_role;

create trigger notify_reporter_payout_waiting after insert on public.reporter_rewards
  for each row execute function private.notify_reporter_payout_waiting();
