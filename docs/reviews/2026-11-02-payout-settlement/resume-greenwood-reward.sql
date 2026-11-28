-- Owner authorized resuming this exact approved $25 reward on November 2, 2026.
-- Abort rather than requeue a transfer that succeeded, is uncertain, or was reversed.
begin;
do $$
declare a public.cleanup_attempts; c public.cleanup_admin_cases;
begin
  select * into strict a from public.cleanup_attempts
  where id='c89b35f2-df7b-4d24-8d57-932badce3416' for update;
  if a.payout_status <> 'failed' or a.stripe_transfer_id is not null
    or a.payout_attempts <> 1 or a.reward_amount_cents <> 2500
    or a.status <> 'completed' or a.financial_review_status <> 'passed'
    or a.dispute_status <> 'none'
    or a.payout_last_error not like 'Insufficient funds in Stripe account.%' then
    raise exception 'Reward state changed; inspect before resuming';
  end if;
  if exists(select 1 from public.processed_stripe_events
    where event_type='transfer.created'
      and payload->'data'->'object'->'metadata'->>'cleanup_attempt_id'=a.id::text) then
    raise exception 'Stripe transfer event already exists; inspect before resuming';
  end if;
  select * into strict c from public.cleanup_admin_cases
  where cleanup_attempt_id=a.id and case_type='payout_failure' and status='open' for update;
  update public.cleanup_attempts set payout_status='pending',
    payout_last_error='Waiting for Stripe funds to become available. Payment will retry automatically.',
    payout_next_attempt_at=now(), payout_attempt_started_at=null,
    last_activity_at=now() where id=a.id;
  insert into public.cleanup_financial_audit(actor_kind,action,report_id,cleanup_attempt_id,metadata)
  values('system','cleanup_payout_automatic_wait_resumed',a.report_id,a.id,
    jsonb_build_object('owner_authorized',true,'reward_amount_cents',2500,'previous_payout_attempts',a.payout_attempts,
      'reason','Owner requested automatic payment once Stripe funds settle; original transfer failed definitively with insufficient balance.'));
  insert into public.cleanup_admin_actions(case_id,action,reason,metadata)
  values(c.id,'resume_automatic_payout',
    'Owner authorized moving the approved $25 reward into automatic settlement waiting. No transfer was created by this action.',
    jsonb_build_object('owner_authorized',true,'payout_status','pending'));
  update public.cleanup_admin_cases set status='resolved',resolved_at=now(),updated_at=now(),
    context=context||jsonb_build_object('resolution','Automatic settlement waiting enabled at owner request') where id=c.id;
end $$;
commit;
