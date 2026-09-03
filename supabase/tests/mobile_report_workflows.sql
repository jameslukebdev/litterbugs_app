begin;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data, created_at)
values
  ('91000000-0000-4000-8000-000000000001', 'mobile-workflow-owner@example.com', false, '{}', now()),
  ('91000000-0000-4000-8000-000000000002', 'mobile-workflow-cleaner@example.com', false, '{}', now());

-- Internal AI/admin history must not prevent an otherwise untouched owner
-- report from being withdrawn.
insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at
) values (
  '92000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000001',
  'Owner withdrawal test', 35, -78,
  array['91000000-0000-4000-8000-000000000001/report/withdrawal.jpg'],
  now() + interval '30 days'
);

insert into public.cleanup_admin_cases (
  id, case_type, priority, report_id, title, summary
) values (
  '93000000-0000-4000-8000-000000000001',
  'report_safety', 2,
  '92000000-0000-4000-8000-000000000001',
  'Review owner withdrawal test',
  'Internal review row that previously caused a foreign-key delete failure.'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal1"}',
  true
);
select public.withdraw_own_report('92000000-0000-4000-8000-000000000001');
reset role;

do $$
begin
  if not exists (
    select 1 from public.reports
    where id = '92000000-0000-4000-8000-000000000001'
      and cancelled_at is not null
      and renewal_status = 'closed'
  ) then
    raise exception 'Owner withdrawal did not soft-close the report';
  end if;
  if not exists (
    select 1 from public.cleanup_admin_cases
    where id = '93000000-0000-4000-8000-000000000001'
      and status = 'resolved'
  ) then
    raise exception 'Owner withdrawal left an obsolete admin case open';
  end if;
  if not exists (
    select 1 from public.cleanup_admin_actions
    where case_id = '93000000-0000-4000-8000-000000000001'
      and action = 'owner_withdrew_report'
  ) then
    raise exception 'Owner withdrawal did not preserve an admin audit action';
  end if;
end;
$$;

-- A funded cleanup that has passed its financial checks can be explicitly
-- approved by the original reporter before the automatic deadline.
insert into public.reports (
  id, user_id, title, latitude, longitude, photo_paths, expires_at,
  cleanup_state, funding_eligibility, funded_amount_cents,
  funding_locked_at, funding_frozen_at
) values (
  '92000000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000001',
  'Funded reporter approval test', 35, -78,
  array['91000000-0000-4000-8000-000000000001/report/approval.jpg'],
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
  '94000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000002',
  '91000000-0000-4000-8000-000000000001',
  waiver_version, guidelines_version,
  'completion_submitted', now(), now() + interval '24 hours', now(), now(),
  now() + interval '48 hours', 500, true, false,
  'passed', 1, 'The cleanup evidence passed automated review.',
  'not_required', 'blocked'
from public.cleanup_waiver_versions
where is_active and retired_at is null
limit 1;

insert into public.cleanup_submissions (
  id, cleanup_attempt_id, submission_number, submitted_by, description, created_at
) values (
  '95000000-0000-4000-8000-000000000001',
  '94000000-0000-4000-8000-000000000001', 1,
  '91000000-0000-4000-8000-000000000002',
  'Evidence approved by the original reporter.', now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-4000-8000-000000000001","is_anonymous":false,"aal":"aal1"}',
  true
);
select public.review_cleanup(
  '94000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000001',
  'approved', null, null
);
reset role;

do $$
begin
  if not exists (
    select 1 from public.cleanup_attempts
    where id = '94000000-0000-4000-8000-000000000001'
      and status = 'completed'
      and approval_method = 'reporter_approved'
      and payout_status = 'pending'
  ) then
    raise exception 'Funded reporter approval did not complete and queue payout';
  end if;
  if not exists (
    select 1 from public.reports
    where id = '92000000-0000-4000-8000-000000000002'
      and cleanup_state = 'completed'
  ) then
    raise exception 'Funded reporter approval did not complete the report';
  end if;
end;
$$;

rollback;
