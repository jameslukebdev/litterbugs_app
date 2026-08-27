begin;

-- Exercise the report protection trigger directly. Production clients do not
-- receive this grant, and the enclosing transaction rolls it back.
grant update on table public.reports to authenticated;

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'report_photos'
      and not public
      and file_size_limit = 5242880
      and allowed_mime_types @> array[
        'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
      ]::text[]
  ) then
    raise exception 'Report-photo storage is not privately bounded for Gemini review';
  end if;
end;
$$;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at)
values
  ('81000000-0000-4000-8000-000000000001', 'fund-reporter@example.com', false, '{}', now()),
  ('81000000-0000-4000-8000-000000000002', 'fund-contributor-a@example.com', false, '{}', now()),
  ('81000000-0000-4000-8000-000000000003', 'fund-contributor-b@example.com', false, '{}', now()),
  ('81000000-0000-4000-8000-000000000004', 'fund-cleaner@example.com', false, '{}', now()),
  ('81000000-0000-4000-8000-000000000005', 'fund-outsider@example.com', false, '{}', now());

update public.cleanup_feature_flags set enabled = false, updated_at = now();

insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at
) values (
  '82000000-0000-4000-8000-000000000010',
  '81000000-0000-4000-8000-000000000001',
  'Dark launch report', 35, -78,
  array['81000000-0000-4000-8000-000000000001/report/dark-launch.jpg'],
  now() + interval '30 days'
);

do $$
begin
  if exists (
    select 1 from public.cleanup_ai_checks
    where report_id = '82000000-0000-4000-8000-000000000010'
  ) then
    raise exception 'Gemini-disabled report created a dormant financial review';
  end if;
end;
$$;

update public.cleanup_feature_flags set enabled = true, updated_at = now();

do $$
begin
  if exists (
    select 1 from public.cleanup_ai_checks
    where report_id = '82000000-0000-4000-8000-000000000010'
  ) then
    raise exception 'Enabling Gemini retroactively queued an existing report';
  end if;
end;
$$;

update public.reports set photo_paths =
  array['81000000-0000-4000-8000-000000000001/report/dark-launch-updated.jpg']
where id = '82000000-0000-4000-8000-000000000010';

do $$
begin
  if not exists (
    select 1 from public.cleanup_ai_checks
    where report_id = '82000000-0000-4000-8000-000000000010'
      and check_kind = 'report' and status = 'queued'
  ) then
    raise exception 'Gemini-enabled photo update did not queue financial review';
  end if;
end;
$$;

select public.record_cleanup_ai_result(
  (
    select id from public.cleanup_ai_checks
    where report_id = '82000000-0000-4000-8000-000000000010'
      and check_kind = 'report' and status = 'queued'
    order by created_at desc limit 1
  ),
  'better_photos',
  'gemini-3.7-flash',
  array['dark-launch-photo-hash'],
  'Add a wider, sharper photo of the full litter area.',
  array['poor_framing'],
  '{"fixture":true}'::jsonb
);

do $$
begin
  if not exists (
    select 1 from public.cleanup_notifications
    where report_id = '82000000-0000-4000-8000-000000000010'
      and user_id = '81000000-0000-4000-8000-000000000001'
      and event_type = 'report_funding_photos_needed'
      and cleanup_attempt_id is null
  ) then
    raise exception 'Report-level Gemini photo feedback did not notify its reporter';
  end if;
  if exists (
    select 1 from public.reports
    where id = '82000000-0000-4000-8000-000000000010'
      and funding_hold_reason = 'Add a wider, sharper photo of the full litter area.'
  ) then
    raise exception 'Detailed Gemini feedback leaked onto the public report row';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal1"}',
  true
);
do $$
begin
  if not exists (
    select 1 from public.cleanup_ai_checks
    where report_id = '82000000-0000-4000-8000-000000000010'
      and user_summary = 'Add a wider, sharper photo of the full litter area.'
  ) then
    raise exception 'Reporter could not read their detailed Gemini photo feedback';
  end if;
end;
$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000005', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000005","is_anonymous":false,"aal":"aal1"}',
  true
);
do $$
begin
  if exists (
    select 1 from public.cleanup_ai_checks
    where report_id = '82000000-0000-4000-8000-000000000010'
  ) then
    raise exception 'Another member could read a reporter Gemini assessment';
  end if;
end;
$$;
reset role;

insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at
) values (
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'Funded workflow report', 35, -78,
  array['81000000-0000-4000-8000-000000000001/report/original.jpg'],
  now() + interval '30 days'
);

update public.reports set funding_eligibility = 'eligible', original_photo_reviewed_at = now()
where id = '82000000-0000-4000-8000-000000000001';

select public.create_cleanup_contribution_intent(
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000001',
  1001,
  'pi_funded_a'
);
select public.create_cleanup_contribution_intent(
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000003',
  '83000000-0000-4000-8000-000000000002',
  1005,
  'pi_funded_b'
);
select public.finalize_cleanup_contribution('pi_funded_a', 'ch_funded_a', true, null);
select public.finalize_cleanup_contribution('pi_funded_b', 'ch_funded_b', true, null);

do $$
declare
  principal bigint;
  fees bigint;
  displayed_reward bigint;
begin
  select sum(principal_amount_cents), sum(platform_fee_cents)
  into principal, fees
  from public.cleanup_contributions
  where report_id = '82000000-0000-4000-8000-000000000001';

  select funded_amount_cents into displayed_reward
  from public.reports
  where id = '82000000-0000-4000-8000-000000000001';

  if principal <> 2006 or fees <> 201 or displayed_reward <> 2006 then
    raise exception 'Contribution principal, half-up fees, or displayed reward did not reconcile';
  end if;

end;
$$;

insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at
) values (
  '82000000-0000-4000-8000-000000000006',
  '81000000-0000-4000-8000-000000000001',
  'Eligibility changed during checkout', 35, -78,
  array['81000000-0000-4000-8000-000000000001/report/eligibility-change.jpg'],
  now() + interval '30 days'
);
update public.reports set
  funding_eligibility = 'eligible', original_photo_reviewed_at = now()
where id = '82000000-0000-4000-8000-000000000006';
select public.create_cleanup_contribution_intent(
  '82000000-0000-4000-8000-000000000006',
  '81000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000006',
  500,
  'pi_eligibility_changed'
);
update public.reports set
  funding_eligibility = 'safety_hold',
  funding_hold_reason = 'Safety changed before payment confirmation.'
where id = '82000000-0000-4000-8000-000000000006';
select public.finalize_cleanup_contribution(
  'pi_eligibility_changed', 'ch_eligibility_changed', true, null
);

do $$
begin
  if not exists (
    select 1 from public.cleanup_contributions
    where stripe_payment_intent_id = 'pi_eligibility_changed'
      and status = 'refund_pending'
      and total_amount_cents = 550
  ) or not exists (
    select 1 from public.reports
    where id = '82000000-0000-4000-8000-000000000006'
      and funded_amount_cents = 0
      and funding_locked_at is null
  ) then
    raise exception 'A newly ineligible report retained a confirmed contribution';
  end if;
end;
$$;

update public.cleanup_contributions set failure_code = 'Excluded from worker regression'
where stripe_payment_intent_id = 'pi_eligibility_changed';

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal1"}',
  true
);
do $$
begin
  begin
    update public.reports set latitude = 36
    where id = '82000000-0000-4000-8000-000000000001';
    raise exception 'A funded report allowed a material fact edit';
  exception when check_violation then null;
  end;

  begin
    update public.reports set funded_amount_cents = 0
    where id = '82000000-0000-4000-8000-000000000001';
    raise exception 'A member altered server-managed financial fields';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

insert into public.cleaner_payout_accounts (
  user_id, stripe_account_id, onboarding_status, payouts_enabled,
  country, age_18_confirmed_at
) values (
  '81000000-0000-4000-8000-000000000004', 'acct_funded_cleaner',
  'enabled', true, 'US', now()
);

-- A permanent member who is unrelated to the report cannot read another
-- member's contribution or payout records. Provider events, admin cases, and
-- the append-only financial audit are not client-readable at all.
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000005', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000005","is_anonymous":false,"aal":"aal2"}',
  true
);
do $$
declare
  exposed_rows integer;
begin
  select count(*) into exposed_rows
  from public.cleanup_contributions
  where report_id = '82000000-0000-4000-8000-000000000001';
  if exposed_rows <> 0 then
    raise exception 'Unrelated member could read cleanup contributions';
  end if;

  select count(*) into exposed_rows
  from public.cleaner_payout_accounts
  where user_id = '81000000-0000-4000-8000-000000000004';
  if exposed_rows <> 0 then
    raise exception 'Unrelated member could read another cleaner payout account';
  end if;

  begin
    perform 1 from public.cleanup_admin_cases limit 1;
    raise exception 'Non-admin could query cleanup admin cases';
  exception when insufficient_privilege then null;
  end;

  begin
    perform 1 from public.cleanup_financial_audit limit 1;
    raise exception 'Member could query the financial audit directly';
  exception when insufficient_privilege then null;
  end;

  begin
    perform 1 from public.processed_stripe_events limit 1;
    raise exception 'Member could query processed Stripe events';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at
) values (
  '82000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000001',
  'Volunteer compatibility report', 35, -78,
  array['81000000-0000-4000-8000-000000000001/report/volunteer.jpg'],
  now() + interval '30 days'
);
update public.reports set funding_eligibility = 'ineligible'
where id = '82000000-0000-4000-8000-000000000004';

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000004', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000004","is_anonymous":false,"aal":"aal1"}',
  true
);
select public.accept_cleanup_waiver(
  (select waiver_version from public.cleanup_waiver_versions where is_active and retired_at is null limit 1),
  (select guidelines_version from public.cleanup_waiver_versions where is_active and retired_at is null limit 1)
);
select public.claim_cleanup('82000000-0000-4000-8000-000000000004');
select public.claim_cleanup('82000000-0000-4000-8000-000000000001');
reset role;

do $$
declare
  attempt public.cleanup_attempts%rowtype;
begin
  if not exists (
    select 1 from public.cleanup_attempts
    where report_id = '82000000-0000-4000-8000-000000000004'
      and status = 'claimed'
      and not is_paid
      and reward_amount_cents = 0
      and financial_review_status = 'not_required'
  ) then
    raise exception 'Gemini funding eligibility blocked the volunteer cleanup path';
  end if;

  select * into attempt from public.cleanup_attempts
  where report_id = '82000000-0000-4000-8000-000000000001';

  if not attempt.is_paid or attempt.reward_amount_cents <> 2006 then
    raise exception 'Claim did not freeze the exact cleaner reward';
  end if;
  if (
    select count(*) from public.cleanup_contributions
    where cleanup_attempt_id = attempt.id and status = 'succeeded'
  ) <> 2 then
    raise exception 'Claim did not attach all active contributions';
  end if;

  begin
    perform public.create_cleanup_contribution_intent(
      '82000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000005',
      '83000000-0000-4000-8000-000000000003',
      500,
      'pi_after_claim'
    );
    raise exception 'Claimed report accepted another contribution';
  exception when check_violation then null;
  end;
end;
$$;

update public.reports set expires_at = now() - interval '1 minute'
where id = '82000000-0000-4000-8000-000000000001';
select private.run_cleanup_maintenance();

do $$
begin
  if not exists (
    select 1 from public.reports
    where id = '82000000-0000-4000-8000-000000000001'
      and cleanup_state = 'claimed'
      and expired_at is null
      and renewal_status = 'active'
  ) then
    raise exception 'An active cleanup did not survive report expiration';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000004', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000004","is_anonymous":false,"aal":"aal1"}',
  true
);
select public.release_cleanup((
  select id from public.cleanup_attempts
  where report_id = '82000000-0000-4000-8000-000000000001'
));
reset role;

do $$
begin
  if not exists (
    select 1 from public.reports
    where id = '82000000-0000-4000-8000-000000000001'
      and cleanup_state = 'available'
      and renewal_status = 'decision_required'
      and funded_amount_cents = 2006
  ) then
    raise exception 'Expired released cleanup did not retain its fund for renewal';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal1"}',
  true
);
select public.renew_report('82000000-0000-4000-8000-000000000001');
reset role;

do $$
begin
  if not exists (
    select 1 from public.reports
    where id = '82000000-0000-4000-8000-000000000001'
      and renewal_status = 'active'
      and funded_amount_cents = 2006
      and expires_at > now() + interval '29 days'
  ) then
    raise exception 'Renewal did not preserve money or grant another 30 active days';
  end if;
end;
$$;

update public.reports set
  expires_at = now() - interval '8 days',
  expired_at = now() - interval '8 days',
  renewal_status = 'decision_required',
  renewal_decision_due_at = now() - interval '1 minute'
where id = '82000000-0000-4000-8000-000000000001';
select private.run_cleanup_maintenance();

do $$
begin
  if not exists (
    select 1 from public.reports
    where id = '82000000-0000-4000-8000-000000000001'
      and renewal_status = 'closed'
      and cancelled_at is not null
      and expired_at is null
      and funded_amount_cents = 0
  ) then
    raise exception 'No-response closure did not enter a valid terminal state';
  end if;
  if (
    select count(*) from public.cleanup_contributions
    where report_id = '82000000-0000-4000-8000-000000000001'
      and status = 'refund_pending'
      and total_amount_cents in (1101, 1106)
  ) <> 2 then
    raise exception 'Closure did not queue full principal-plus-fee refunds';
  end if;
end;
$$;

-- Keep the two closure refunds queued but out of the single-item worker test
-- below so the aging refund is the deterministic next claim.
update public.cleanup_contributions set failure_code = 'Excluded from worker regression'
where report_id = '82000000-0000-4000-8000-000000000001'
  and status = 'refund_pending';

insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at
) values (
  '82000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000001',
  'Aging refund report', 35, -78,
  array['81000000-0000-4000-8000-000000000001/report/aging.jpg'],
  now() + interval '30 days'
);
update public.reports set funding_eligibility = 'eligible', original_photo_reviewed_at = now()
where id = '82000000-0000-4000-8000-000000000002';
select public.create_cleanup_contribution_intent(
  '82000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000004',
  500,
  'pi_aging_refund'
);
select public.finalize_cleanup_contribution('pi_aging_refund', 'ch_aging_refund', true, null);
update public.cleanup_contributions set
  succeeded_at = now() - interval '23 months 1 day',
  auto_refund_due_at = now() - interval '1 day'
where stripe_payment_intent_id = 'pi_aging_refund';
select private.run_cleanup_maintenance();

do $$
begin
  if not exists (
    select 1 from public.cleanup_contributions
    where stripe_payment_intent_id = 'pi_aging_refund'
      and status = 'refund_pending'
      and total_amount_cents = 550
  ) or not exists (
    select 1 from public.reports
    where id = '82000000-0000-4000-8000-000000000002'
      and funded_amount_cents = 0
  ) then
    raise exception '23-month aging did not queue the full refund and remove the displayed reward';
  end if;
end;
$$;

-- An interrupted provider request keeps its idempotency attempt. A new
-- operator-approved retry advances it exactly once.
select public.claim_cleanup_refund_operation();

do $$
begin
  if not exists (
    select 1 from public.cleanup_contributions
    where stripe_payment_intent_id = 'pi_aging_refund'
      and status = 'refund_processing'
      and refund_attempts = 1
      and refund_processing_started_at is not null
  ) then
    raise exception 'Refund worker did not claim the queued refund once';
  end if;
end;
$$;

update public.cleanup_contributions set
  refund_processing_started_at = now() - interval '6 minutes'
where stripe_payment_intent_id = 'pi_aging_refund';
select public.claim_cleanup_refund_operation();

do $$
begin
  if (
    select refund_attempts from public.cleanup_contributions
    where stripe_payment_intent_id = 'pi_aging_refund'
  ) <> 1 then
    raise exception 'Interrupted refund recovery changed its idempotency attempt';
  end if;
end;
$$;

select public.mark_cleanup_refund_result(
  (select id from public.cleanup_contributions where stripe_payment_intent_id = 'pi_aging_refund'),
  false, 're_aging_refund', 'Temporary refund failure'
);
update public.cleanup_contributions set failure_code = null
where stripe_payment_intent_id = 'pi_aging_refund';
select public.claim_cleanup_refund_operation();

do $$
begin
  if (
    select refund_attempts from public.cleanup_contributions
    where stripe_payment_intent_id = 'pi_aging_refund'
  ) <> 2 then
    raise exception 'Fresh refund retry did not advance its idempotency attempt';
  end if;
end;
$$;

select public.mark_cleanup_refund_result(
  (select id from public.cleanup_contributions where stripe_payment_intent_id = 'pi_aging_refund'),
  true, 're_aging_refund', null
);
select public.mark_cleanup_refund_result(
  (select id from public.cleanup_contributions where stripe_payment_intent_id = 'pi_aging_refund'),
  true, 're_aging_refund', null
);

do $$
begin
  if not exists (
    select 1 from public.cleanup_contributions
    where stripe_payment_intent_id = 'pi_aging_refund'
      and status = 'refunded'
      and stripe_refund_id = 're_aging_refund'
  ) or (
    select count(*) from public.cleanup_notifications
    where contribution_id = (
      select id from public.cleanup_contributions
      where stripe_payment_intent_id = 'pi_aging_refund'
    ) and event_type = 'cleanup_contribution_refunded'
  ) <> 1 then
    raise exception 'Duplicate refund completion was not idempotent';
  end if;
end;
$$;

insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at,
  cleanup_state, funding_eligibility, funded_amount_cents, funding_frozen_at
) values (
  '82000000-0000-4000-8000-000000000005',
  '81000000-0000-4000-8000-000000000001',
  'Payout reconciliation report', 35, -78,
  array['81000000-0000-4000-8000-000000000001/report/payout.jpg'],
  now() + interval '30 days', 'completed', 'eligible', 500, now()
);

insert into public.cleanup_attempts (
  id, report_id, cleaner_id, reporter_id, waiver_version, guidelines_version,
  status, claimed_at, claim_expires_at,
  reward_amount_cents, is_paid, financial_review_status,
  first_paid_admin_status, payout_status
)
select
  '84000000-0000-4000-8000-000000000005',
  '82000000-0000-4000-8000-000000000005',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000001',
  waiver_version, guidelines_version, 'claimed', now(),
  now() + interval '24 hours', 500, true, 'passed', 'approved', 'pending'
from public.cleanup_waiver_versions
where is_active and retired_at is null
limit 1;

insert into public.cleanup_submissions (
  id, cleanup_attempt_id, submission_number, submitted_by, description, created_at
) values (
  '85000000-0000-4000-8000-000000000005',
  '84000000-0000-4000-8000-000000000005', 1,
  '81000000-0000-4000-8000-000000000004',
  'Completed payout reconciliation evidence', now()
);

update public.cleanup_attempts set
  status = 'completed',
  first_submitted_at = now(),
  latest_submitted_at = now(),
  final_submission_id = '85000000-0000-4000-8000-000000000005',
  completed_at = now()
where id = '84000000-0000-4000-8000-000000000005';

insert into public.cleanup_contributions (
  id, report_id, contributor_id, cleanup_attempt_id, client_request_id,
  principal_amount_cents, platform_fee_cents, total_amount_cents, status,
  stripe_payment_intent_id, stripe_charge_id, succeeded_at, auto_refund_due_at
) values (
  '83000000-0000-4000-8000-000000000005',
  '82000000-0000-4000-8000-000000000005',
  '81000000-0000-4000-8000-000000000002',
  '84000000-0000-4000-8000-000000000005',
  '87000000-0000-4000-8000-000000000005',
  500, 50, 550, 'succeeded', 'pi_payout_reconcile', 'ch_payout_reconcile',
  now(), now() + interval '23 months'
);

select public.claim_cleanup_payout_operation();
update public.cleanup_attempts set last_activity_at = now() - interval '6 minutes'
where id = '84000000-0000-4000-8000-000000000005';
select public.claim_cleanup_payout_operation();

do $$
begin
  if not exists (
    select 1 from public.cleanup_attempts
    where id = '84000000-0000-4000-8000-000000000005'
      and payout_status = 'processing'
      and payout_attempts = 1
  ) then
    raise exception 'Interrupted payout recovery changed its idempotency attempt';
  end if;
end;
$$;

select public.mark_cleanup_payout_result(
  '84000000-0000-4000-8000-000000000005', false, null,
  'Temporary transfer failure'
);
update public.cleanup_attempts set payout_status = 'pending', payout_last_error = null
where id = '84000000-0000-4000-8000-000000000005';
select public.claim_cleanup_payout_operation();

do $$
begin
  if (
    select payout_attempts from public.cleanup_attempts
    where id = '84000000-0000-4000-8000-000000000005'
  ) <> 2 then
    raise exception 'Fresh payout retry did not advance its idempotency attempt';
  end if;
end;
$$;

select public.mark_cleanup_payout_result(
  '84000000-0000-4000-8000-000000000005', true, 'tr_payout_reconcile', null
);
select public.mark_cleanup_payout_result(
  '84000000-0000-4000-8000-000000000005', true, 'tr_payout_reconcile', null
);
select public.mark_cleanup_transfer_reversed(
  '84000000-0000-4000-8000-000000000005', 'tr_payout_reconcile',
  'Stripe transfer reversed by regression test'
);
select public.mark_cleanup_transfer_reversed(
  '84000000-0000-4000-8000-000000000005', 'tr_payout_reconcile',
  'Stripe transfer reversed by regression test'
);
select public.mark_cleanup_payout_result(
  '84000000-0000-4000-8000-000000000005', true, 'tr_payout_reconcile', null
);

do $$
begin
  if not exists (
    select 1 from public.cleanup_attempts
    where id = '84000000-0000-4000-8000-000000000005'
      and payout_status = 'failed'
      and stripe_transfer_id = 'tr_payout_reconcile'
      and payout_last_error like 'Stripe transfer reversed%'
  ) or (
    select count(*) from public.cleanup_financial_audit
    where cleanup_attempt_id = '84000000-0000-4000-8000-000000000005'
      and action = 'cleanup_reward_transferred'
  ) <> 1 or (
    select count(*) from public.cleanup_financial_audit
    where cleanup_attempt_id = '84000000-0000-4000-8000-000000000005'
      and action = 'cleanup_reward_transfer_reversed'
  ) <> 1 or (
    select count(*) from public.cleanup_notifications
    where cleanup_attempt_id = '84000000-0000-4000-8000-000000000005'
      and event_type = 'cleanup_reward_sent'
  ) <> 1 then
    raise exception 'Payout completion or reversal reconciliation was not idempotent';
  end if;
end;
$$;

insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at,
  cleanup_state, funding_eligibility, funded_amount_cents, funding_frozen_at
) values (
  '82000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000001',
  'Three-attempt evidence report', 35, -78,
  array['81000000-0000-4000-8000-000000000001/report/retries.jpg'],
  now() + interval '30 days',
  'completion_submitted', 'eligible', 500, now()
);

insert into public.cleanup_attempts (
  id, report_id, cleaner_id, reporter_id, waiver_version, guidelines_version,
  status, claimed_at, claim_expires_at, first_submitted_at, latest_submitted_at,
  reward_amount_cents, is_paid, first_paid_cleanup, financial_review_status,
  financial_review_attempts, first_paid_admin_status, payout_status
)
select
  '84000000-0000-4000-8000-000000000003',
  '82000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000001',
  waiver_version,
  guidelines_version,
  'completion_submitted', now(), now() + interval '24 hours', now(), now(),
  500, true, true, 'queued', 0, 'pending', 'blocked'
from public.cleanup_waiver_versions
where is_active and retired_at is null
limit 1;

insert into public.cleanup_submissions (
  id, cleanup_attempt_id, submission_number, submitted_by, description, created_at
) values (
  '85000000-0000-4000-8000-000000000001',
  '84000000-0000-4000-8000-000000000003',
  1,
  '81000000-0000-4000-8000-000000000004',
  'First evidence attempt',
  now()
);
insert into public.cleanup_submission_photos (submission_id, storage_path, display_order)
values (
  '85000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000004/84000000-0000-4000-8000-000000000003/85000000-0000-4000-8000-000000000001/first.jpg',
  1
);
insert into public.cleanup_ai_checks (
  id, report_id, cleanup_attempt_id, submission_id, check_kind, status, attempt_number, prompt_version
) values (
  '86000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000003',
  '84000000-0000-4000-8000-000000000003',
  '85000000-0000-4000-8000-000000000001',
  'paid_submission', 'queued', 1, 'funded-cleanup-v1'
);
select public.record_cleanup_ai_result(
  '86000000-0000-4000-8000-000000000001',
  'better_photos', 'gemini-3.7-flash', '{}',
  'Please add a wider photo.', array['insufficient_coverage'], '{}'
);

insert into public.cleanup_submissions (
  id, cleanup_attempt_id, submission_number, submitted_by, description, created_at
) values (
  '85000000-0000-4000-8000-000000000002',
  '84000000-0000-4000-8000-000000000003',
  2,
  '81000000-0000-4000-8000-000000000004',
  'Second evidence attempt',
  now()
);
insert into public.cleanup_submission_photos (submission_id, storage_path, display_order)
values (
  '85000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000004/84000000-0000-4000-8000-000000000003/85000000-0000-4000-8000-000000000002/second.jpg',
  1
);
update public.cleanup_attempts set
  status = 'completion_submitted',
  latest_submitted_at = now(),
  financial_review_status = 'queued',
  review_due_at = null
where id = '84000000-0000-4000-8000-000000000003';
insert into public.cleanup_ai_checks (
  id, report_id, cleanup_attempt_id, submission_id, check_kind, status, attempt_number, prompt_version
) values (
  '86000000-0000-4000-8000-000000000002',
  '82000000-0000-4000-8000-000000000003',
  '84000000-0000-4000-8000-000000000003',
  '85000000-0000-4000-8000-000000000002',
  'paid_submission', 'queued', 1, 'funded-cleanup-v1'
);
select public.record_cleanup_ai_result(
  '86000000-0000-4000-8000-000000000002',
  'better_photos', 'gemini-3.7-flash', '{}',
  'Please add a closer photo.', array['insufficient_detail'], '{}'
);

insert into public.cleanup_submissions (
  id, cleanup_attempt_id, submission_number, submitted_by, description, created_at
) values (
  '85000000-0000-4000-8000-000000000003',
  '84000000-0000-4000-8000-000000000003',
  3,
  '81000000-0000-4000-8000-000000000004',
  'Third evidence attempt',
  now()
);
insert into public.cleanup_submission_photos (submission_id, storage_path, display_order)
values (
  '85000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000004/84000000-0000-4000-8000-000000000003/85000000-0000-4000-8000-000000000003/third.jpg',
  1
);
update public.cleanup_attempts set
  status = 'completion_submitted',
  latest_submitted_at = now(),
  financial_review_status = 'queued',
  review_due_at = null
where id = '84000000-0000-4000-8000-000000000003';
insert into public.cleanup_ai_checks (
  id, report_id, cleanup_attempt_id, submission_id, check_kind, status, attempt_number, prompt_version
) values (
  '86000000-0000-4000-8000-000000000003',
  '82000000-0000-4000-8000-000000000003',
  '84000000-0000-4000-8000-000000000003',
  '85000000-0000-4000-8000-000000000003',
  'paid_submission', 'queued', 1, 'funded-cleanup-v1'
);
select public.record_cleanup_ai_result(
  '86000000-0000-4000-8000-000000000003',
  'better_photos', 'gemini-3.7-flash', '{}',
  'The third submission is still inconclusive.', array['ambiguous'], '{}'
);

do $$
begin
  if (
    select array_agg(attempt_number order by attempt_number)
    from public.cleanup_ai_checks
    where cleanup_attempt_id = '84000000-0000-4000-8000-000000000003'
  ) <> array[1, 2, 3]::smallint[] then
    raise exception 'Funded photo checks did not advance through all three attempts';
  end if;

  if not exists (
    select 1 from public.cleanup_attempts
    where id = '84000000-0000-4000-8000-000000000003'
      and status = 'completion_submitted'
      and financial_review_status = 'admin_review'
      and financial_review_attempts = 3
      and review_due_at is null
  ) then
    raise exception 'Third inconclusive photo attempt did not freeze payout for admin review';
  end if;

  if (
    select count(*) from public.cleanup_reviews
    where cleanup_attempt_id = '84000000-0000-4000-8000-000000000003'
      and decision = 'changes_requested'
  ) <> 2 then
    raise exception 'Exactly two replacement-photo rounds were not offered';
  end if;

  if not exists (
    select 1 from public.cleanup_admin_cases
    where cleanup_attempt_id = '84000000-0000-4000-8000-000000000003'
      and case_type = 'gemini_review'
      and status = 'open'
  ) then
    raise exception 'Third inconclusive photo attempt did not create an admin case';
  end if;
end;
$$;

select set_config(
  'test.nonadmin_admin_case_id',
  (
    select id::text from public.cleanup_admin_cases
    where cleanup_attempt_id = '84000000-0000-4000-8000-000000000003'
      and case_type = 'gemini_review'
      and status = 'open'
    limit 1
  ),
  true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000005', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000005","is_anonymous":false,"aal":"aal2"}',
  true
);
do $$
begin
  begin
    perform public.list_cleanup_admin_cases('open');
    raise exception 'Non-admin could list cleanup admin cases';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.resolve_cleanup_admin_case(
      current_setting('test.nonadmin_admin_case_id')::uuid,
      'request_better_photos',
      'Unauthorized decision attempt'
    );
    raise exception 'Non-admin could resolve a cleanup admin case';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

insert into public.cleanup_admin_memberships (user_id)
values ('81000000-0000-4000-8000-000000000001');

-- Simulate an early manual escalation on the second evidence round. An
-- administrator may still offer the agreed final replacement-photo round.
update public.cleanup_attempts set financial_review_attempts = 2
where id = '84000000-0000-4000-8000-000000000003';
select set_config(
  'test.gemini_admin_case_id',
  (
    select id::text from public.cleanup_admin_cases
    where cleanup_attempt_id = '84000000-0000-4000-8000-000000000003'
      and case_type = 'gemini_review'
      and status = 'open'
    limit 1
  ),
  true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal1"}',
  true
);
do $$
begin
  if not public.is_cleanup_admin_member() or public.is_cleanup_admin() then
    raise exception 'Admin membership bypassed the AAL2 requirement';
  end if;
end;
$$;
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal2"}',
  true
);
do $$
begin
  if not public.is_cleanup_admin() then
    raise exception 'Valid AAL2 administrator was not authorized';
  end if;
end;
$$;

select public.resolve_cleanup_admin_case(
  current_setting('test.gemini_admin_case_id')::uuid,
  'request_better_photos',
  'Please add one final wide photo showing the complete area.'
);
do $$
begin
  if not exists (
    select 1 from public.cleanup_attempts
    where id = '84000000-0000-4000-8000-000000000003'
      and status = 'changes_requested'
      and financial_review_attempts = 2
  ) then
    raise exception 'Admin could not offer the final replacement-photo round';
  end if;
end;
$$;
reset role;

-- A paid self-cleanup must wait for both the full reporter dispute deadline
-- and the first-paid-cleanup admin check. Clearing that check after the
-- deadline may complete it, but it never bypasses either gate.
insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at,
  cleanup_state, funding_eligibility, funded_amount_cents,
  funding_locked_at, funding_frozen_at
) values (
  '82000000-0000-4000-8000-000000000007',
  '81000000-0000-4000-8000-000000000004',
  'Paid self-cleanup gate report', 35, -78,
  array['81000000-0000-4000-8000-000000000004/report/self-paid.jpg'],
  now() + interval '30 days', 'completion_submitted', 'eligible', 500,
  now(), now()
);

insert into public.cleanup_attempts (
  id, report_id, cleaner_id, reporter_id, waiver_version, guidelines_version,
  status, is_self_cleanup, claimed_at, claim_expires_at,
  first_submitted_at, latest_submitted_at, review_due_at,
  reward_amount_cents, is_paid, first_paid_cleanup,
  financial_review_status, financial_review_attempts,
  financial_review_summary, first_paid_admin_status, payout_status
)
select
  '84000000-0000-4000-8000-000000000007',
  '82000000-0000-4000-8000-000000000007',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000004',
  waiver_version, guidelines_version,
  'completion_submitted', true, now() - interval '3 days', now() - interval '2 days',
  now() - interval '49 hours', now() - interval '49 hours', now() - interval '1 hour',
  500, true, true, 'passed', 1,
  'The cleanup evidence passed automated review.', 'pending', 'blocked'
from public.cleanup_waiver_versions
where is_active and retired_at is null
limit 1;

insert into public.cleanup_submissions (
  id, cleanup_attempt_id, submission_number, submitted_by, description, created_at
) values (
  '85000000-0000-4000-8000-000000000007',
  '84000000-0000-4000-8000-000000000007', 1,
  '81000000-0000-4000-8000-000000000004',
  'Paid self-cleanup evidence', now() - interval '49 hours'
);

insert into public.cleanup_contributions (
  id, report_id, contributor_id, cleanup_attempt_id, client_request_id,
  principal_amount_cents, platform_fee_cents, total_amount_cents, status,
  stripe_payment_intent_id, stripe_charge_id, succeeded_at, auto_refund_due_at
) values (
  '83000000-0000-4000-8000-000000000007',
  '82000000-0000-4000-8000-000000000007',
  '81000000-0000-4000-8000-000000000002',
  '84000000-0000-4000-8000-000000000007',
  '87000000-0000-4000-8000-000000000007',
  500, 50, 550, 'succeeded', 'pi_self_paid_gate', 'ch_self_paid_gate',
  now() - interval '4 days', now() - interval '4 days' + interval '23 months'
);

insert into public.cleanup_admin_cases (
  id, case_type, priority, report_id, cleanup_attempt_id, title, summary
) values (
  '89000000-0000-4000-8000-000000000007', 'first_paid_cleanup', 2,
  '82000000-0000-4000-8000-000000000007',
  '84000000-0000-4000-8000-000000000007',
  'First paid cleanup check', 'Confirm the first paid cleanup before payout.'
);

select private.run_cleanup_maintenance();

do $$
begin
  if not exists (
    select 1 from public.cleanup_attempts
    where id = '84000000-0000-4000-8000-000000000007'
      and status = 'completion_submitted'
      and is_self_cleanup
      and first_paid_admin_status = 'pending'
      and payout_status = 'blocked'
      and review_due_at < now()
  ) then
    raise exception 'Paid self-cleanup bypassed the 48-hour or first-payout gate';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal2"}',
  true
);
select public.resolve_cleanup_admin_case(
  '89000000-0000-4000-8000-000000000007',
  'approve_cleanup',
  'The first paid cleanup evidence is consistent and complete.'
);
reset role;

do $$
begin
  if not exists (
    select 1 from public.cleanup_attempts
    where id = '84000000-0000-4000-8000-000000000007'
      and status = 'completed'
      and approval_method = 'auto_approved'
      and first_paid_admin_status = 'approved'
      and payout_status = 'pending'
  ) or (
    select count(*) from public.cleanup_reviews
    where cleanup_attempt_id = '84000000-0000-4000-8000-000000000007'
      and decision = 'auto_approved'
  ) <> 1 then
    raise exception 'Admin-cleared first paid self-cleanup did not complete exactly once';
  end if;
end;
$$;

-- A reporter dispute freezes the reward. Denying the dispute preserves the
-- cleanup and allows payout only after the already-established 48-hour timer.
insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at,
  cleanup_state, funding_eligibility, funded_amount_cents,
  funding_locked_at, funding_frozen_at
) values (
  '82000000-0000-4000-8000-000000000008',
  '81000000-0000-4000-8000-000000000001',
  'Denied dispute report', 35, -78,
  array['81000000-0000-4000-8000-000000000001/report/dispute-denied.jpg'],
  now() + interval '30 days', 'completion_submitted', 'eligible', 500,
  now(), now()
);

insert into public.cleanup_attempts (
  id, report_id, cleaner_id, reporter_id, waiver_version, guidelines_version,
  status, claimed_at, claim_expires_at, first_submitted_at, latest_submitted_at,
  review_due_at, reward_amount_cents, is_paid, first_paid_cleanup,
  financial_review_status, financial_review_attempts,
  financial_review_summary, first_paid_admin_status, payout_status
)
select
  '84000000-0000-4000-8000-000000000008',
  '82000000-0000-4000-8000-000000000008',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000001',
  waiver_version, guidelines_version,
  'completion_submitted', now(), now() + interval '24 hours', now(), now(),
  now() + interval '48 hours', 500, true, false, 'passed', 1,
  'The cleanup evidence passed automated review.', 'not_required', 'blocked'
from public.cleanup_waiver_versions
where is_active and retired_at is null
limit 1;

insert into public.cleanup_submissions (
  id, cleanup_attempt_id, submission_number, submitted_by, description, created_at
) values (
  '85000000-0000-4000-8000-000000000008',
  '84000000-0000-4000-8000-000000000008', 1,
  '81000000-0000-4000-8000-000000000004',
  'Evidence for a reporter dispute', now()
);

insert into public.cleanup_contributions (
  id, report_id, contributor_id, cleanup_attempt_id, client_request_id,
  principal_amount_cents, platform_fee_cents, total_amount_cents, status,
  stripe_payment_intent_id, stripe_charge_id, succeeded_at, auto_refund_due_at
) values (
  '83000000-0000-4000-8000-000000000008',
  '82000000-0000-4000-8000-000000000008',
  '81000000-0000-4000-8000-000000000002',
  '84000000-0000-4000-8000-000000000008',
  '87000000-0000-4000-8000-000000000008',
  500, 50, 550, 'succeeded', 'pi_dispute_denied', 'ch_dispute_denied',
  now(), now() + interval '23 months'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal1"}',
  true
);
select public.dispute_paid_cleanup(
  '84000000-0000-4000-8000-000000000008',
  'The final photo does not show the full reported area.'
);
reset role;

select set_config(
  'test.dispute_denied_case_id',
  (
    select id::text from public.cleanup_admin_cases
    where cleanup_attempt_id = '84000000-0000-4000-8000-000000000008'
      and case_type = 'dispute' and status = 'open'
  ),
  true
);

do $$
begin
  if not exists (
    select 1 from public.cleanup_attempts
    where id = '84000000-0000-4000-8000-000000000008'
      and dispute_status = 'open'
      and payout_status = 'blocked'
  ) or not exists (
    select 1 from public.cleanup_admin_cases
    where cleanup_attempt_id = '84000000-0000-4000-8000-000000000008'
      and case_type = 'dispute' and status = 'open'
  ) then
    raise exception 'Reporter dispute did not freeze payout and open an admin case';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal2"}',
  true
);
select public.resolve_cleanup_admin_case(
  current_setting('test.dispute_denied_case_id')::uuid,
  'deny_dispute',
  'The complete evidence set supports the cleanup.'
);
reset role;

update public.cleanup_attempts set review_due_at = now() - interval '1 minute'
where id = '84000000-0000-4000-8000-000000000008';
select private.run_cleanup_maintenance();

do $$
begin
  if not exists (
    select 1 from public.cleanup_attempts
    where id = '84000000-0000-4000-8000-000000000008'
      and status = 'completed'
      and dispute_status = 'denied'
      and payout_status = 'pending'
  ) then
    raise exception 'Denied dispute did not resume the timed payout path';
  end if;
end;
$$;

-- Upholding a dispute rejects the cleanup, reopens the report, and returns
-- the complete principal pool for another cleaner without refunding it.
insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at,
  cleanup_state, funding_eligibility, funded_amount_cents,
  funding_locked_at, funding_frozen_at
) values (
  '82000000-0000-4000-8000-000000000009',
  '81000000-0000-4000-8000-000000000001',
  'Upheld dispute report', 35, -78,
  array['81000000-0000-4000-8000-000000000001/report/dispute-upheld.jpg'],
  now() + interval '30 days', 'completion_submitted', 'eligible', 500,
  now(), now()
);

insert into public.cleanup_attempts (
  id, report_id, cleaner_id, reporter_id, waiver_version, guidelines_version,
  status, claimed_at, claim_expires_at, first_submitted_at, latest_submitted_at,
  review_due_at, reward_amount_cents, is_paid, first_paid_cleanup,
  financial_review_status, financial_review_attempts,
  financial_review_summary, first_paid_admin_status, payout_status
)
select
  '84000000-0000-4000-8000-000000000009',
  '82000000-0000-4000-8000-000000000009',
  '81000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000001',
  waiver_version, guidelines_version,
  'completion_submitted', now(), now() + interval '24 hours', now(), now(),
  now() + interval '48 hours', 500, true, false, 'passed', 1,
  'The cleanup evidence passed automated review.', 'not_required', 'blocked'
from public.cleanup_waiver_versions
where is_active and retired_at is null
limit 1;

insert into public.cleanup_submissions (
  id, cleanup_attempt_id, submission_number, submitted_by, description, created_at
) values (
  '85000000-0000-4000-8000-000000000009',
  '84000000-0000-4000-8000-000000000009', 1,
  '81000000-0000-4000-8000-000000000004',
  'Evidence for an upheld dispute', now()
);

insert into public.cleanup_contributions (
  id, report_id, contributor_id, cleanup_attempt_id, client_request_id,
  principal_amount_cents, platform_fee_cents, total_amount_cents, status,
  stripe_payment_intent_id, stripe_charge_id, succeeded_at, auto_refund_due_at
) values (
  '83000000-0000-4000-8000-000000000009',
  '82000000-0000-4000-8000-000000000009',
  '81000000-0000-4000-8000-000000000003',
  '84000000-0000-4000-8000-000000000009',
  '87000000-0000-4000-8000-000000000009',
  500, 50, 550, 'succeeded', 'pi_dispute_upheld', 'ch_dispute_upheld',
  now(), now() + interval '23 months'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal1"}',
  true
);
select public.dispute_paid_cleanup(
  '84000000-0000-4000-8000-000000000009',
  'The cleanup does not cover the original reported area.'
);
reset role;

select set_config(
  'test.dispute_upheld_case_id',
  (
    select id::text from public.cleanup_admin_cases
    where cleanup_attempt_id = '84000000-0000-4000-8000-000000000009'
      and case_type = 'dispute' and status = 'open'
  ),
  true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal2"}',
  true
);
select public.resolve_cleanup_admin_case(
  current_setting('test.dispute_upheld_case_id')::uuid,
  'uphold_dispute',
  'The submitted evidence does not verify the cleanup.'
);
reset role;

do $$
begin
  if not exists (
    select 1 from public.cleanup_attempts
    where id = '84000000-0000-4000-8000-000000000009'
      and status = 'cancelled'
      and dispute_status = 'upheld'
      and payout_status = 'blocked'
  ) or not exists (
    select 1 from public.reports
    where id = '82000000-0000-4000-8000-000000000009'
      and cleanup_state = 'available'
      and funding_frozen_at is null
      and funded_amount_cents = 500
  ) or not exists (
    select 1 from public.cleanup_contributions
    where id = '83000000-0000-4000-8000-000000000009'
      and status = 'succeeded'
      and cleanup_attempt_id is null
  ) then
    raise exception 'Upheld dispute did not reopen the funded report safely';
  end if;
end;
$$;

-- Stripe can deliver the same dispute event to concurrent webhook workers.
-- The provider event is recorded once even if both workers reach the RPC.
select public.record_stripe_chargeback_event(
  'evt_chargeback_duplicate', 'dp_chargeback_duplicate',
  'ch_chargeback_duplicate', 550
);
select public.record_stripe_chargeback_event(
  'evt_chargeback_duplicate', 'dp_chargeback_duplicate',
  'ch_chargeback_duplicate', 550
);

do $$
begin
  if (
    select count(*)
    from public.cleanup_financial_audit
    where actor_kind = 'stripe'
      and action = 'chargeback_absorbed_by_platform'
      and metadata ->> 'stripe_event_id' = 'evt_chargeback_duplicate'
  ) <> 1 then
    raise exception 'Duplicate Stripe chargeback events created duplicate audit entries';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000005', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000005","is_anonymous":false,"aal":"aal1"}',
  true
);
do $$
begin
  begin
    perform public.record_stripe_chargeback_event(
      'evt_member_chargeback', 'dp_member_chargeback',
      'ch_member_chargeback', 550
    );
    raise exception 'A member directly recorded a Stripe chargeback event';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- A funded cleanup cannot be claimed until the cleaner is 18+, US-based,
-- fully onboarded, and payout-enabled. Enabling all gates then permits it.
insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at
) values (
  '82000000-0000-4000-8000-000000000011',
  '81000000-0000-4000-8000-000000000001',
  'Payout onboarding gate report', 35, -78,
  array['81000000-0000-4000-8000-000000000001/report/payout-gate.jpg'],
  now() + interval '30 days'
);
update public.reports set funding_eligibility = 'eligible', original_photo_reviewed_at = now()
where id = '82000000-0000-4000-8000-000000000011';
select public.create_cleanup_contribution_intent(
  '82000000-0000-4000-8000-000000000011',
  '81000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000011',
  500,
  'pi_payout_gate'
);
select public.finalize_cleanup_contribution('pi_payout_gate', 'ch_payout_gate', true, null);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000005', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000005","is_anonymous":false,"aal":"aal1"}',
  true
);
select public.accept_cleanup_waiver(
  (select waiver_version from public.cleanup_waiver_versions where is_active and retired_at is null limit 1),
  (select guidelines_version from public.cleanup_waiver_versions where is_active and retired_at is null limit 1)
);
do $$
begin
  begin
    perform public.claim_cleanup('82000000-0000-4000-8000-000000000011');
    raise exception 'A funded cleanup was claimed without Stripe onboarding';
  exception when check_violation then
    if sqlerrm <> 'cleaner_payout_onboarding_required' then
      raise;
    end if;
  end;
end;
$$;
reset role;

insert into public.cleaner_payout_accounts (
  user_id, stripe_account_id, onboarding_status, payouts_enabled, country
) values (
  '81000000-0000-4000-8000-000000000005', 'acct_payout_gate',
  'pending', false, 'US'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000005', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000005","is_anonymous":false,"aal":"aal1"}',
  true
);
do $$
begin
  begin
    perform public.claim_cleanup('82000000-0000-4000-8000-000000000011');
    raise exception 'A partially onboarded cleaner claimed a funded cleanup';
  exception when check_violation then
    if sqlerrm <> 'cleaner_payout_onboarding_required' then
      raise;
    end if;
  end;
end;
$$;
reset role;

update public.cleaner_payout_accounts set
  onboarding_status = 'enabled',
  payouts_enabled = true,
  age_18_confirmed_at = now()
where user_id = '81000000-0000-4000-8000-000000000005';

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000005', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000005","is_anonymous":false,"aal":"aal1"}',
  true
);
select public.claim_cleanup('82000000-0000-4000-8000-000000000011');
reset role;

do $$
begin
  if not exists (
    select 1 from public.cleanup_attempts
    where report_id = '82000000-0000-4000-8000-000000000011'
      and cleaner_id = '81000000-0000-4000-8000-000000000005'
      and status = 'claimed'
      and is_paid
      and reward_amount_cents = 500
  ) then
    raise exception 'Payout-ready cleaner could not claim the funded cleanup';
  end if;
end;
$$;

-- The reporter can explicitly close an expired report during the seven-day
-- decision window. The full principal plus fee is queued for refund.
insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at
) values (
  '82000000-0000-4000-8000-000000000012',
  '81000000-0000-4000-8000-000000000001',
  'Reporter-closed expired report', 35, -78,
  array['81000000-0000-4000-8000-000000000001/report/reporter-close.jpg'],
  now() + interval '30 days'
);
update public.reports set funding_eligibility = 'eligible', original_photo_reviewed_at = now()
where id = '82000000-0000-4000-8000-000000000012';
select public.create_cleanup_contribution_intent(
  '82000000-0000-4000-8000-000000000012',
  '81000000-0000-4000-8000-000000000003',
  '83000000-0000-4000-8000-000000000012',
  500,
  'pi_reporter_close'
);
select public.finalize_cleanup_contribution('pi_reporter_close', 'ch_reporter_close', true, null);
update public.reports set
  expires_at = now() - interval '1 minute',
  expired_at = now() - interval '1 minute',
  renewal_status = 'decision_required',
  renewal_decision_due_at = now() + interval '7 days'
where id = '82000000-0000-4000-8000-000000000012';

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal1"}',
  true
);
select public.close_expired_report('82000000-0000-4000-8000-000000000012');
reset role;

do $$
begin
  if not exists (
    select 1 from public.reports
    where id = '82000000-0000-4000-8000-000000000012'
      and renewal_status = 'closed'
      and cancelled_at is not null
      and funded_amount_cents = 0
  ) or not exists (
    select 1 from public.cleanup_contributions
    where stripe_payment_intent_id = 'pi_reporter_close'
      and status = 'refund_pending'
      and principal_amount_cents = 500
      and platform_fee_cents = 50
      and total_amount_cents = 550
      and refund_requested_at is not null
  ) then
    raise exception 'Reporter closure did not queue the full contribution refund';
  end if;
end;
$$;

-- A late success after a failure is accepted once. Any still-later failure is
-- ignored so out-of-order provider delivery cannot reduce or double the fund.
insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at
) values (
  '82000000-0000-4000-8000-000000000013',
  '81000000-0000-4000-8000-000000000001',
  'Out-of-order payment report', 35, -78,
  array['81000000-0000-4000-8000-000000000001/report/out-of-order.jpg'],
  now() + interval '30 days'
);
update public.reports set funding_eligibility = 'eligible', original_photo_reviewed_at = now()
where id = '82000000-0000-4000-8000-000000000013';
select public.create_cleanup_contribution_intent(
  '82000000-0000-4000-8000-000000000013',
  '81000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000013',
  500,
  'pi_out_of_order'
);
select public.finalize_cleanup_contribution(
  'pi_out_of_order', null, false, 'card_declined'
);
select public.finalize_cleanup_contribution(
  'pi_out_of_order', 'ch_out_of_order', true, null
);
select public.finalize_cleanup_contribution(
  'pi_out_of_order', null, false, 'late_failure_event'
);
select public.finalize_cleanup_contribution(
  'pi_out_of_order', 'ch_out_of_order', true, null
);

do $$
begin
  if not exists (
    select 1 from public.cleanup_contributions
    where stripe_payment_intent_id = 'pi_out_of_order'
      and status = 'succeeded'
      and stripe_charge_id = 'ch_out_of_order'
      and failure_code is null
  ) or not exists (
    select 1 from public.reports
    where id = '82000000-0000-4000-8000-000000000013'
      and funded_amount_cents = 500
  ) or (
    select count(*) from public.cleanup_financial_audit
    where contribution_id = (
      select id from public.cleanup_contributions
      where stripe_payment_intent_id = 'pi_out_of_order'
    )
      and action = 'contribution_succeeded'
  ) <> 1 or (
    select count(*) from public.cleanup_notifications
    where contribution_id = (
      select id from public.cleanup_contributions
      where stripe_payment_intent_id = 'pi_out_of_order'
    )
      and event_type = 'cleanup_fund_increased'
  ) <> 1 then
    raise exception 'Out-of-order payment events corrupted or duplicated the fund';
  end if;
end;
$$;

rollback;
