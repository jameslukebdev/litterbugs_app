-- Preserve expiry provenance when a funding pool closes. Cancellation/refund
-- behavior stays intact; explicit owner withdrawal clears expired_at separately.
-- Apply before the website release so historical photos are readable.
-- Legacy closure recovery below requires matching immutable audit evidence.
-- A closed expiry keeps both closure and expiry provenance. All other terminal
-- combinations retain the existing restriction, including completed cleanups.
alter table public.reports drop constraint reports_lifecycle_terminal_check;
alter table public.reports add constraint reports_lifecycle_terminal_check check (
  (expired_at is null or cancelled_at is null
    or (cleanup_state = 'available' and renewal_status = 'closed'))
  and (cleanup_state <> 'completed' or (expired_at is null and cancelled_at is null))
);

create or replace function private.close_expired_report(
  target_report_id uuid,
  transition_at timestamptz,
  actor_id uuid,
  actor_kind text
)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_record public.reports%rowtype;
begin
  update public.cleanup_contributions set
    status = 'refund_pending',
    refund_requested_at = transition_at,
    updated_at = transition_at
  where report_id = target_report_id
    and status = 'succeeded'
    and cleanup_attempt_id is null;

  update public.reports set
    renewal_status = 'closed',
    renewal_decision_due_at = null,
    expired_at = coalesce(expired_at, expires_at),
    cancelled_at = coalesce(cancelled_at, transition_at),
    funded_amount_cents = coalesce((
      select sum(principal_amount_cents)
      from public.cleanup_contributions
      where report_id = target_report_id
        and status = 'succeeded'
        and cleanup_attempt_id is not null
    ), 0)
  where id = target_report_id
  returning * into report_record;

  insert into public.cleanup_financial_audit (
    actor_id, actor_kind, action, report_id
  ) values (actor_id, actor_kind, 'expired_report_closed', target_report_id);

  return report_record;
end;
$$;

revoke all on function private.close_expired_report(uuid, timestamptz, uuid, text)
  from public, anon, authenticated, service_role;


-- Historical original photos follow report publication and moderation visibility.
-- The report subquery uses the caller's existing report RLS policies.
alter policy "Published report photos are readable" on storage.objects
  using (
    bucket_id = 'report_photos'
    and exists (
      select 1 from public.reports r
      where objects.name = any(r.photo_paths)
        and r.is_published and not r.is_sample
        and (
          (r.cancelled_at is null and r.cleanup_state in
            ('available','completed','claimed','completion_submitted','changes_requested'))
          or (r.cleanup_state = 'available' and r.expired_at is not null and r.renewal_status = 'closed')
        )
    )
  );

-- Recover only positively identified expiry closures, never guess from age.
-- Withdrawal uses a different cancellation timestamp; erased/hidden content stays out.
update public.reports r set expired_at = r.expires_at
where r.is_published and not r.is_sample and r.moderated_at is null
  and nullif(btrim(r.title), '') is not null
  and r.cleanup_state = 'available' and r.renewal_status = 'closed'
  and r.cancelled_at is not null and r.expired_at is null and r.expires_at <= now()
  and exists (
    select 1 from public.cleanup_financial_audit a
    where a.report_id = r.id and a.action = 'expired_report_closed'
      and a.actor_kind in ('system','user') and a.created_at = r.cancelled_at
  );
