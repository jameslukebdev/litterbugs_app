-- Extend the existing durable notification queue; no new review gates.
alter table public.cleanup_notifications drop constraint cleanup_notifications_event_type_check;
alter table public.cleanup_notifications add constraint cleanup_notifications_event_type_check
  CHECK ((event_type = ANY (ARRAY['report_claimed'::text,
    'claim_expiring_soon'::text,
    'claim_expired'::text,
    'completion_submitted'::text,
    'changes_requested'::text,
    'cleanup_approved'::text,
    'cleanup_auto_approved'::text,
    'correction_expired'::text,
    'paid_review_started'::text,
    'paid_cleanup_disputed'::text,
    'cleanup_reward_sent'::text,
    'cleanup_payout_failed'::text,
    'cleanup_fund_increased'::text,
    'cleanup_contribution_refunded'::text,
    'report_renewal_due'::text,
    'report_renewed'::text,
    'report_funding_photos_needed'::text,
    'report_funding_review_required'::text,
    'report_funding_approved'::text,
    'report_funding_rejected'::text,
    'admin_moderation_needed'::text,
    'admin_cleanup_needed'::text,
    'funded_cleanup_completed'::text])));

alter table public.cleanup_notifications drop constraint cleanup_notifications_report_or_admin_check;
alter table public.cleanup_notifications add constraint cleanup_notifications_report_or_admin_check
  CHECK ((((event_type in ('admin_moderation_needed','admin_cleanup_needed')) AND (admin_case_id IS NOT NULL)) OR ((event_type not in ('admin_moderation_needed','admin_cleanup_needed')) AND (report_id IS NOT NULL) AND (admin_case_id IS NULL))));

alter table public.cleanup_notifications drop constraint cleanup_notifications_target_check;
alter table public.cleanup_notifications add constraint cleanup_notifications_target_check
  CHECK ((((event_type <> ALL (ARRAY['changes_requested'::text,
    'cleanup_approved'::text,
    'cleanup_auto_approved'::text])) OR (review_id IS NOT NULL)) AND ((event_type <> ALL (ARRAY['completion_submitted'::text,
    'paid_review_started'::text])) OR (submission_id IS NOT NULL)) AND ((event_type <> ALL (ARRAY['report_renewal_due'::text,
    'report_renewed'::text,
    'cleanup_fund_increased'::text,
    'cleanup_contribution_refunded'::text,
    'report_funding_photos_needed'::text,
    'report_funding_review_required'::text,
    'report_funding_approved'::text,
    'report_funding_rejected'::text,
    'admin_moderation_needed'::text,
    'admin_cleanup_needed'::text])) OR (cleanup_attempt_id IS NULL)) AND ((event_type = ANY (ARRAY['report_renewal_due'::text,
    'report_renewed'::text,
    'cleanup_fund_increased'::text,
    'cleanup_contribution_refunded'::text,
    'report_funding_photos_needed'::text,
    'report_funding_review_required'::text,
    'report_funding_approved'::text,
    'report_funding_rejected'::text,
    'admin_moderation_needed'::text,
    'admin_cleanup_needed'::text])) OR (cleanup_attempt_id IS NOT NULL)) AND ((event_type <> 'cleanup_contribution_refunded'::text) OR (contribution_id IS NOT NULL))));

-- One notice per contributor, even if they contributed more than once.
create unique index cleanup_notifications_funder_completion_key
  on public.cleanup_notifications(cleanup_attempt_id, user_id)
  where event_type = 'funded_cleanup_completed';
create unique index cleanup_notifications_admin_exception_key
  on public.cleanup_notifications(admin_case_id, user_id)
  where event_type = 'admin_cleanup_needed';

create or replace function private.notify_cleanup_contributors()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;
  insert into public.cleanup_notifications(user_id,cleanup_attempt_id,report_id,event_type)
    select distinct c.contributor_id,new.id,new.report_id,'funded_cleanup_completed'
    from public.cleanup_contributions c
    where c.cleanup_attempt_id=new.id and c.report_id=new.report_id
      and c.status in ('succeeded','paid_out') and c.contributor_id is not null
      -- The cleaner already gets the approval notice, including self-funders.
      and c.contributor_id is distinct from new.cleaner_id
    on conflict do nothing;
  return new;
end; $$;
revoke all on function private.notify_cleanup_contributors() from public,anon,authenticated,service_role;
create trigger cleanup_attempts_notify_contributors after update of status on public.cleanup_attempts
  for each row execute function private.notify_cleanup_contributors();

create or replace function private.notify_cleanup_admin_exception()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> 'open' or new.case_type not in
    ('report_safety','gemini_review','dispute','refund_failure','payout_failure') then return new; end if;
  insert into public.cleanup_notifications(user_id,report_id,event_type,admin_case_id)
    select m.user_id,new.report_id,'admin_cleanup_needed',new.id
    from public.cleanup_admin_memberships m
    where m.active and m.moderation_alerts_enabled
    on conflict do nothing;
  return new;
end; $$;
revoke all on function private.notify_cleanup_admin_exception() from public,anon,authenticated,service_role;
create trigger cleanup_admin_cases_notify_exception after insert or update of status on public.cleanup_admin_cases
  for each row execute function private.notify_cleanup_admin_exception();
