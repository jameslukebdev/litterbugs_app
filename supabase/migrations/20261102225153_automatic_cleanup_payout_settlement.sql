-- Keep client-visible payout states compatible with installed apps.
alter table public.cleanup_attempts
  add column payout_next_attempt_at timestamptz,
  add column payout_attempt_started_at timestamptz;

-- Conservative start time for any operation already in flight during rollout.
update public.cleanup_attempts set payout_attempt_started_at = completed_at
where payout_status = 'processing';

create or replace function public.claim_cleanup_payout_operation_v2()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  attempt_record public.cleanup_attempts%rowtype;
  transition_at timestamptz := now();
begin
  select * into attempt_record from public.cleanup_attempts
  where payout_status = 'processing' and last_activity_at < transition_at - interval '5 minutes'
  order by last_activity_at for update skip locked limit 1;
  if found then
    update public.cleanup_attempts set last_activity_at = transition_at
    where id = attempt_record.id returning * into attempt_record;
    return to_jsonb(attempt_record) || jsonb_build_object('recovering',true);
  end if;

  select * into attempt_record from public.cleanup_attempts
  where payout_status = 'pending'
    and is_paid and status = 'completed'
    and financial_review_status = 'passed'
    and dispute_status in ('none','denied')
    and first_paid_admin_status <> 'rejected'
    and stripe_transfer_id is null
    and (payout_next_attempt_at is null or payout_next_attempt_at <= transition_at)
  order by completed_at for update skip locked limit 1;
  if not found then return null; end if;
  update public.cleanup_attempts set
    payout_status = 'processing', payout_attempts = payout_attempts + 1,
    payout_attempt_started_at = transition_at, payout_next_attempt_at = null,
    payout_last_error = null, last_activity_at = transition_at
  where id = attempt_record.id returning * into attempt_record;
  return to_jsonb(attempt_record) || jsonb_build_object('recovering',false);
end;
$$;
revoke all on function public.claim_cleanup_payout_operation_v2() from public,anon,authenticated;
grant execute on function public.claim_cleanup_payout_operation_v2() to service_role;

-- Called only before a transfer is attempted, or after a definite balance rejection.
-- Never use this for timeouts or other uncertain transfer outcomes.
create or replace function public.defer_cleanup_payout_for_funds(target_cleanup_id uuid, expected_attempt integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.cleanup_attempts set
    payout_status = 'pending', payout_next_attempt_at = now() + interval '5 minutes',
    payout_attempt_started_at = null,
    payout_last_error = 'Waiting for Stripe funds to become available. Payment will retry automatically.',
    last_activity_at = now()
  where id = target_cleanup_id and payout_status = 'processing'
    and payout_attempts = expected_attempt and stripe_transfer_id is null;
  if not found then
    raise check_violation using message = 'cleanup_payout_wait_invalid_state';
  end if;
end;
$$;
revoke all on function public.defer_cleanup_payout_for_funds(uuid,integer) from public,anon,authenticated;
grant execute on function public.defer_cleanup_payout_for_funds(uuid,integer) to service_role;
