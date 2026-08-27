-- Funded cleanup MVP.
--
-- This deliberately extends the volunteer cleanup workflow instead of creating
-- a second state machine. Stripe and Gemini remain dark until their database
-- feature flags are enabled after deployment credentials and legal copy exist.

create table public.cleanup_feature_flags (
  name text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint cleanup_feature_flags_name_check check (
    name = any (array[
      'payments_enabled',
      'gemini_financial_review_enabled'
    ])
  )
);

insert into public.cleanup_feature_flags (name, enabled)
values
  ('payments_enabled', false),
  ('gemini_financial_review_enabled', false)
on conflict (name) do nothing;

alter table public.cleanup_feature_flags enable row level security;
revoke all on table public.cleanup_feature_flags from anon, authenticated;
grant select on table public.cleanup_feature_flags to anon, authenticated;

create policy "Cleanup feature flags are readable"
  on public.cleanup_feature_flags
  for select
  to anon, authenticated
  using (true);

alter table public.reports
  add column funding_eligibility text not null default 'pending',
  add column funding_hold_reason text,
  add column funded_amount_cents bigint not null default 0,
  add column funding_locked_at timestamptz,
  add column funding_frozen_at timestamptz,
  add column renewal_status text not null default 'active',
  add column renewal_decision_due_at timestamptz,
  add column original_photo_reviewed_at timestamptz;

alter table public.reports
  add constraint reports_funding_eligibility_check check (
    funding_eligibility = any (array[
      'pending',
      'eligible',
      'better_photos',
      'safety_hold',
      'ineligible'
    ])
  ),
  add constraint reports_funding_hold_reason_check check (
    funding_hold_reason is null
    or char_length(btrim(funding_hold_reason)) between 1 and 500
  ),
  add constraint reports_funded_amount_check check (funded_amount_cents >= 0),
  add constraint reports_renewal_status_check check (
    renewal_status = any (array['active', 'decision_required', 'closed'])
  ),
  add constraint reports_renewal_window_check check (
    (renewal_status = 'active' and renewal_decision_due_at is null)
    or (renewal_status = 'decision_required' and renewal_decision_due_at is not null)
    or renewal_status = 'closed'
  );

create index reports_funding_eligible_idx
  on public.reports (cleanup_state, funding_eligibility)
  where renewal_status = 'active' and cancelled_at is null;

create index reports_renewal_due_idx
  on public.reports (renewal_decision_due_at)
  where renewal_status = 'decision_required';

comment on column public.reports.funded_amount_cents is
  'Server-maintained available cleanup reward in USD cents.';
comment on column public.reports.funding_locked_at is
  'Locks material report facts after the first successful contribution.';
comment on column public.reports.funding_frozen_at is
  'Freezes contributions while a funded cleanup is claimed or reviewed.';

alter table public.cleanup_attempts
  add column reward_amount_cents bigint not null default 0,
  add column is_paid boolean not null default false,
  add column first_paid_cleanup boolean not null default false,
  add column financial_review_status text not null default 'not_required',
  add column financial_review_attempts smallint not null default 0,
  add column financial_review_summary text,
  add column first_paid_admin_status text not null default 'not_required',
  add column dispute_status text not null default 'none',
  add column disputed_at timestamptz,
  add column dispute_reason text,
  add column payout_status text not null default 'not_applicable',
  add column stripe_transfer_id text,
  add column payout_last_error text;

alter table public.cleanup_attempts
  add constraint cleanup_attempts_reward_check check (reward_amount_cents >= 0),
  add constraint cleanup_attempts_paid_reward_check check (
    is_paid = (reward_amount_cents > 0)
  ),
  add constraint cleanup_attempts_financial_review_status_check check (
    financial_review_status = any (array[
      'not_required',
      'queued',
      'better_photos',
      'passed',
      'admin_review',
      'rejected'
    ])
  ),
  add constraint cleanup_attempts_financial_review_attempts_check check (
    financial_review_attempts between 0 and 2
  ),
  add constraint cleanup_attempts_financial_summary_check check (
    financial_review_summary is null
    or char_length(btrim(financial_review_summary)) between 1 and 1000
  ),
  add constraint cleanup_attempts_first_paid_admin_status_check check (
    first_paid_admin_status = any (array[
      'not_required',
      'pending',
      'approved',
      'rejected'
    ])
  ),
  add constraint cleanup_attempts_dispute_status_check check (
    dispute_status = any (array['none', 'open', 'upheld', 'denied'])
  ),
  add constraint cleanup_attempts_dispute_fields_check check (
    (dispute_status = 'none' and disputed_at is null and dispute_reason is null)
    or (dispute_status <> 'none' and disputed_at is not null)
  ),
  add constraint cleanup_attempts_payout_status_check check (
    payout_status = any (array[
      'not_applicable',
      'blocked',
      'pending',
      'processing',
      'transferred',
      'failed'
    ])
  );

alter table public.cleanup_attempts
  drop constraint cleanup_attempts_review_window_check,
  add constraint cleanup_attempts_review_window_check check (
    status <> 'completion_submitted'
    or (
      latest_submitted_at is not null
      and (
        (not is_paid and review_due_at = latest_submitted_at + interval '48 hours')
        or (
          is_paid
          and (
            (financial_review_status in ('queued', 'admin_review') and review_due_at is null)
            or (financial_review_status = 'passed' and review_due_at is not null)
          )
        )
      )
    )
  );

create index cleanup_attempts_paid_review_idx
  on public.cleanup_attempts (financial_review_status, latest_submitted_at)
  where is_paid and status = 'completion_submitted';

create index cleanup_attempts_payout_idx
  on public.cleanup_attempts (payout_status, completed_at)
  where payout_status in ('pending', 'failed');

create table public.cleaner_payout_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_account_id text unique,
  onboarding_status text not null default 'not_started',
  payouts_enabled boolean not null default false,
  country text,
  age_18_confirmed_at timestamptz,
  requirements_due text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cleaner_payout_accounts_status_check check (
    onboarding_status = any (array[
      'not_started',
      'pending',
      'enabled',
      'restricted'
    ])
  ),
  constraint cleaner_payout_accounts_country_check check (
    country is null or country = 'US'
  )
);

alter table public.cleaner_payout_accounts enable row level security;
revoke all on table public.cleaner_payout_accounts from anon, authenticated;
grant select on table public.cleaner_payout_accounts to authenticated;

create policy "Cleaners can read their payout readiness"
  on public.cleaner_payout_accounts
  for select
  to authenticated
  using (
    (select public.is_permanent_user())
    and user_id = (select auth.uid())
  );

create table public.cleanup_contributions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete restrict,
  contributor_id uuid references public.profiles(id) on delete set null,
  cleanup_attempt_id uuid references public.cleanup_attempts(id) on delete restrict,
  client_request_id uuid not null,
  principal_amount_cents bigint not null,
  platform_fee_cents bigint not null,
  total_amount_cents bigint not null,
  currency text not null default 'usd',
  status text not null default 'payment_pending',
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  stripe_refund_id text,
  succeeded_at timestamptz,
  auto_refund_due_at timestamptz,
  refund_requested_at timestamptz,
  refunded_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cleanup_contributions_request_key unique (
    contributor_id,
    client_request_id
  ),
  constraint cleanup_contributions_principal_check check (
    principal_amount_cents between 500 and 500000
  ),
  constraint cleanup_contributions_fee_check check (
    platform_fee_cents = floor(principal_amount_cents * 0.10 + 0.5)::bigint
    and total_amount_cents = principal_amount_cents + platform_fee_cents
  ),
  constraint cleanup_contributions_currency_check check (currency = 'usd'),
  constraint cleanup_contributions_status_check check (
    status = any (array[
      'payment_pending',
      'succeeded',
      'refund_pending',
      'refunded',
      'failed',
      'paid_out'
    ])
  ),
  constraint cleanup_contributions_success_fields_check check (
    status in ('payment_pending', 'failed')
    or (
      succeeded_at is not null
      and auto_refund_due_at = succeeded_at + interval '23 months'
    )
  ),
  constraint cleanup_contributions_refund_fields_check check (
    (status <> 'refunded' or refunded_at is not null)
    and (status <> 'refund_pending' or refund_requested_at is not null)
  )
);

create index cleanup_contributions_report_idx
  on public.cleanup_contributions (report_id, status, succeeded_at);
create index cleanup_contributions_refund_due_idx
  on public.cleanup_contributions (auto_refund_due_at)
  where status = 'succeeded' and cleanup_attempt_id is null;
create index cleanup_contributions_attempt_idx
  on public.cleanup_contributions (cleanup_attempt_id)
  where cleanup_attempt_id is not null;

alter table public.cleanup_contributions enable row level security;
revoke all on table public.cleanup_contributions from anon, authenticated;
grant select on table public.cleanup_contributions to authenticated;

create policy "Contributors can read their contributions"
  on public.cleanup_contributions
  for select
  to authenticated
  using (
    (select public.is_permanent_user())
    and contributor_id = (select auth.uid())
  );

create table public.cleanup_ai_checks (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete restrict,
  cleanup_attempt_id uuid references public.cleanup_attempts(id) on delete restrict,
  submission_id uuid references public.cleanup_submissions(id) on delete restrict,
  check_kind text not null,
  status text not null default 'queued',
  attempt_number smallint not null default 1,
  model text,
  prompt_version text not null,
  image_hashes text[] not null default '{}',
  user_summary text,
  reason_codes text[] not null default '{}',
  raw_result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint cleanup_ai_checks_kind_check check (
    check_kind = any (array['report', 'paid_submission'])
  ),
  constraint cleanup_ai_checks_status_check check (
    status = any (array[
      'queued',
      'running',
      'passed',
      'better_photos',
      'admin_review',
      'superseded',
      'failed'
    ])
  ),
  constraint cleanup_ai_checks_attempt_check check (attempt_number between 1 and 2),
  constraint cleanup_ai_checks_target_check check (
    (check_kind = 'report' and cleanup_attempt_id is null and submission_id is null)
    or (check_kind = 'paid_submission' and cleanup_attempt_id is not null and submission_id is not null)
  ),
  constraint cleanup_ai_checks_summary_check check (
    user_summary is null or char_length(btrim(user_summary)) between 1 and 1000
  )
);

create index cleanup_ai_checks_queue_idx
  on public.cleanup_ai_checks (status, created_at)
  where status in ('queued', 'running');

alter table public.cleanup_ai_checks enable row level security;
revoke all on table public.cleanup_ai_checks from anon, authenticated;

create table public.cleanup_admin_memberships (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.cleanup_admin_memberships enable row level security;
revoke all on table public.cleanup_admin_memberships from anon, authenticated;

create table public.cleanup_admin_cases (
  id uuid primary key default gen_random_uuid(),
  case_type text not null,
  status text not null default 'open',
  priority smallint not null default 2,
  report_id uuid references public.reports(id) on delete restrict,
  cleanup_attempt_id uuid references public.cleanup_attempts(id) on delete restrict,
  contribution_id uuid references public.cleanup_contributions(id) on delete restrict,
  title text not null,
  summary text,
  context jsonb not null default '{}'::jsonb,
  assigned_to uuid references public.cleanup_admin_memberships(user_id) on delete set null,
  resolved_by uuid references public.cleanup_admin_memberships(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint cleanup_admin_cases_type_check check (
    case_type = any (array[
      'report_safety',
      'gemini_review',
      'first_paid_cleanup',
      'dispute',
      'refund_failure',
      'payout_failure'
    ])
  ),
  constraint cleanup_admin_cases_status_check check (
    status = any (array['open', 'resolved'])
  ),
  constraint cleanup_admin_cases_priority_check check (priority between 1 and 3),
  constraint cleanup_admin_cases_title_check check (
    char_length(btrim(title)) between 1 and 160
  )
);

create unique index cleanup_admin_cases_one_open_attempt_type_idx
  on public.cleanup_admin_cases (cleanup_attempt_id, case_type)
  where status = 'open' and cleanup_attempt_id is not null;
create unique index cleanup_admin_cases_one_open_report_type_idx
  on public.cleanup_admin_cases (report_id, case_type)
  where status = 'open'
    and report_id is not null
    and cleanup_attempt_id is null
    and contribution_id is null;
create unique index cleanup_admin_cases_one_open_contribution_type_idx
  on public.cleanup_admin_cases (contribution_id, case_type)
  where status = 'open' and contribution_id is not null;
create index cleanup_admin_cases_inbox_idx
  on public.cleanup_admin_cases (status, priority, created_at);

alter table public.cleanup_admin_cases enable row level security;
revoke all on table public.cleanup_admin_cases from anon, authenticated;

create table public.cleanup_admin_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cleanup_admin_cases(id) on delete restrict,
  admin_id uuid references public.cleanup_admin_memberships(user_id) on delete set null,
  action text not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint cleanup_admin_actions_reason_check check (
    char_length(btrim(reason)) between 3 and 1000
  )
);

alter table public.cleanup_admin_actions enable row level security;
revoke all on table public.cleanup_admin_actions from anon, authenticated;

create table public.processed_stripe_events (
  event_id text primary key,
  event_type text not null,
  livemode boolean not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

alter table public.processed_stripe_events enable row level security;
revoke all on table public.processed_stripe_events from anon, authenticated;

create table public.cleanup_financial_audit (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_kind text not null,
  action text not null,
  report_id uuid,
  cleanup_attempt_id uuid,
  contribution_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint cleanup_financial_audit_actor_check check (
    actor_kind = any (array['user', 'admin', 'stripe', 'system'])
  )
);

alter table public.cleanup_financial_audit enable row level security;
revoke all on table public.cleanup_financial_audit from anon, authenticated;

-- Service-role access is intentionally limited to tables used by Edge
-- Functions. The key never ships in either client.
grant select, insert, update on table public.cleanup_contributions to service_role;
grant select, insert, update on table public.cleaner_payout_accounts to service_role;
grant select, insert, update on table public.cleanup_ai_checks to service_role;
grant select, insert, update on table public.cleanup_admin_cases to service_role;
grant select, insert on table public.cleanup_admin_actions to service_role;
grant select, insert on table public.processed_stripe_events to service_role;
grant select, insert on table public.cleanup_financial_audit to service_role;
grant usage, select on sequence public.cleanup_financial_audit_id_seq to service_role;
grant select on table public.cleanup_admin_memberships to service_role;
grant select on table public.cleanup_feature_flags to service_role;

alter table public.cleanup_notifications
  alter column cleanup_attempt_id drop not null,
  add column contribution_id uuid references public.cleanup_contributions(id) on delete set null,
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
      'report_renewed'
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
        'cleanup_contribution_refunded'
      ])
      or cleanup_attempt_id is null
    )
    and (
      event_type = any (array[
        'report_renewal_due',
        'report_renewed',
        'cleanup_fund_increased',
        'cleanup_contribution_refunded'
      ])
      or cleanup_attempt_id is not null
    )
    and (event_type <> 'cleanup_contribution_refunded' or contribution_id is not null)
  );

create unique index cleanup_notifications_paid_dispute_event_key
  on public.cleanup_notifications (cleanup_attempt_id, event_type)
  where event_type in ('paid_cleanup_disputed', 'cleanup_reward_sent', 'cleanup_payout_failed');

create unique index cleanup_notifications_contribution_event_key
  on public.cleanup_notifications (contribution_id, event_type)
  where contribution_id is not null;

create or replace function private.notify_cleanup_submitted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record public.cleanup_attempts%rowtype;
begin
  select * into attempt_record
  from public.cleanup_attempts
  where id = new.cleanup_attempt_id;

  -- Funded submissions are not reviewable by the reporter until the financial
  -- photo gate passes and starts the 48-hour dispute window.
  if attempt_record.is_paid then
    return new;
  end if;

  if attempt_record.reporter_id is not null then
    insert into public.cleanup_notifications (
      user_id, cleanup_attempt_id, report_id, submission_id, event_type, created_at
    ) values (
      attempt_record.reporter_id, attempt_record.id, attempt_record.report_id,
      new.id, 'completion_submitted', new.created_at
    ) on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.notify_cleanup_submitted()
  from public, anon, authenticated, service_role;

create or replace function public.set_report_expiration()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.expires_at is null then
    new.expires_at := now() + interval '30 days';
  end if;
  return new;
end;
$$;

create or replace function private.protect_funded_report_facts()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
    and tg_op = 'DELETE'
    and old.funding_locked_at is not null then
    raise check_violation using message = 'funded_report_must_be_closed';
  end if;

  if current_user in ('anon', 'authenticated')
    and tg_op = 'UPDATE'
    and (
      new.funding_eligibility is distinct from old.funding_eligibility
      or new.funding_hold_reason is distinct from old.funding_hold_reason
      or new.funded_amount_cents is distinct from old.funded_amount_cents
      or new.funding_locked_at is distinct from old.funding_locked_at
      or new.funding_frozen_at is distinct from old.funding_frozen_at
      or new.renewal_status is distinct from old.renewal_status
      or new.renewal_decision_due_at is distinct from old.renewal_decision_due_at
      or new.original_photo_reviewed_at is distinct from old.original_photo_reviewed_at
    ) then
    raise insufficient_privilege using message = 'cleanup_financial_fields_are_server_managed';
  end if;

  if current_user in ('anon', 'authenticated')
    and tg_op = 'UPDATE'
    and old.funding_locked_at is not null
    and (
      new.title is distinct from old.title
      or new.latitude is distinct from old.latitude
      or new.longitude is distinct from old.longitude
      or new.severity is distinct from old.severity
      or new.photo_paths is distinct from old.photo_paths
      or new.litter_types is distinct from old.litter_types
      or new.notes_presets is distinct from old.notes_presets
      or new.notes_other is distinct from old.notes_other
      or new.types is distinct from old.types
    ) then
    raise check_violation using message = 'funded_report_facts_locked';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.protect_funded_report_facts()
  from public, anon, authenticated, service_role;

create trigger reports_protect_funded_facts
before update or delete on public.reports
for each row execute function private.protect_funded_report_facts();

create or replace function public.is_cleanup_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select public.is_permanent_user())
    and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and exists (
      select 1
      from public.cleanup_admin_memberships
      where cleanup_admin_memberships.user_id = (select auth.uid())
        and cleanup_admin_memberships.active
    );
$$;

revoke all on function public.is_cleanup_admin()
  from public, anon, authenticated, service_role;
grant execute on function public.is_cleanup_admin() to authenticated;

create or replace function public.is_cleanup_admin_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select public.is_permanent_user())
    and exists (
      select 1 from public.cleanup_admin_memberships
      where user_id = (select auth.uid()) and active
    );
$$;

revoke all on function public.is_cleanup_admin_member()
  from public, anon, authenticated, service_role;
grant execute on function public.is_cleanup_admin_member() to authenticated;

create or replace function private.require_cleanup_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if not (select public.is_cleanup_admin()) then
    raise insufficient_privilege using message = 'cleanup_admin_mfa_required';
  end if;
  return actor_id;
end;
$$;

revoke all on function private.require_cleanup_admin()
  from public, anon, authenticated, service_role;

create or replace function public.create_cleanup_contribution_intent(
  target_report_id uuid,
  target_contributor_id uuid,
  target_client_request_id uuid,
  principal_cents bigint,
  payment_intent_id text
)
returns public.cleanup_contributions
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_record public.reports%rowtype;
  contribution_record public.cleanup_contributions%rowtype;
  fee_cents bigint;
begin
  if not exists (
    select 1 from public.cleanup_feature_flags
    where name = 'payments_enabled' and enabled
  ) then
    raise check_violation using message = 'payments_disabled';
  end if;
  if not exists (
    select 1 from public.cleanup_feature_flags
    where name = 'gemini_financial_review_enabled' and enabled
  ) then
    raise check_violation using message = 'financial_review_disabled';
  end if;

  if target_contributor_id is null
    or target_client_request_id is null
    or payment_intent_id is null
    or principal_cents not between 500 and 500000 then
    raise check_violation using message = 'cleanup_contribution_invalid';
  end if;

  select * into report_record
  from public.reports
  where reports.id = target_report_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_report_not_found';
  end if;

  if report_record.cleanup_state <> 'available'
    or report_record.funding_eligibility <> 'eligible'
    or report_record.funding_frozen_at is not null
    or report_record.renewal_status <> 'active'
    or report_record.expired_at is not null
    or report_record.cancelled_at is not null
    or report_record.expires_at <= now()
    or coalesce(cardinality(report_record.photo_paths), 0) = 0 then
    raise check_violation using message = 'report_not_open_for_funding';
  end if;

  fee_cents := floor(principal_cents * 0.10 + 0.5)::bigint;

  insert into public.cleanup_contributions (
    report_id,
    contributor_id,
    client_request_id,
    principal_amount_cents,
    platform_fee_cents,
    total_amount_cents,
    stripe_payment_intent_id
  ) values (
    target_report_id,
    target_contributor_id,
    target_client_request_id,
    principal_cents,
    fee_cents,
    principal_cents + fee_cents,
    payment_intent_id
  )
  on conflict (contributor_id, client_request_id)
  do update set updated_at = now()
  returning * into contribution_record;

  if contribution_record.stripe_payment_intent_id <> payment_intent_id
    or contribution_record.principal_amount_cents <> principal_cents then
    raise check_violation using message = 'cleanup_contribution_idempotency_mismatch';
  end if;

  return contribution_record;
end;
$$;

revoke all on function public.create_cleanup_contribution_intent(uuid, uuid, uuid, bigint, text)
  from public, anon, authenticated, service_role;
grant execute on function public.create_cleanup_contribution_intent(uuid, uuid, uuid, bigint, text)
  to service_role;

create or replace function public.finalize_cleanup_contribution(
  payment_intent_id text,
  charge_id text,
  payment_succeeded boolean,
  payment_failure_code text default null
)
returns public.cleanup_contributions
language plpgsql
security definer
set search_path = ''
as $$
declare
  contribution_record public.cleanup_contributions%rowtype;
  report_record public.reports%rowtype;
  transition_at timestamptz := now();
begin
  select * into contribution_record
  from public.cleanup_contributions
  where stripe_payment_intent_id = payment_intent_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_contribution_not_found';
  end if;

  if contribution_record.status in ('succeeded', 'refund_pending', 'refunded', 'paid_out') then
    return contribution_record;
  end if;

  if not payment_succeeded then
    update public.cleanup_contributions
    set status = 'failed', failure_code = payment_failure_code, updated_at = transition_at
    where id = contribution_record.id
    returning * into contribution_record;
    return contribution_record;
  end if;

  select * into report_record
  from public.reports
  where id = contribution_record.report_id
  for update;

  if report_record.cleanup_state <> 'available'
    or report_record.funding_frozen_at is not null
    or report_record.renewal_status <> 'active'
    or report_record.expired_at is not null
    or report_record.cancelled_at is not null
    or report_record.expires_at <= transition_at then
    update public.cleanup_contributions
    set
      status = 'refund_pending',
      stripe_charge_id = charge_id,
      succeeded_at = transition_at,
      auto_refund_due_at = transition_at + interval '23 months',
      refund_requested_at = transition_at,
      updated_at = transition_at
    where id = contribution_record.id
    returning * into contribution_record;
    return contribution_record;
  end if;

  update public.cleanup_contributions
  set
    status = 'succeeded',
    stripe_charge_id = charge_id,
    succeeded_at = transition_at,
    auto_refund_due_at = transition_at + interval '23 months',
    failure_code = null,
    updated_at = transition_at
  where id = contribution_record.id
  returning * into contribution_record;

  update public.reports
  set
    funded_amount_cents = funded_amount_cents + contribution_record.principal_amount_cents,
    funding_locked_at = coalesce(funding_locked_at, transition_at)
  where id = contribution_record.report_id;

  insert into public.cleanup_financial_audit (
    actor_id, actor_kind, action, report_id, contribution_id, metadata
  ) values (
    contribution_record.contributor_id,
    'stripe',
    'contribution_succeeded',
    contribution_record.report_id,
    contribution_record.id,
    jsonb_build_object('principal_amount_cents', contribution_record.principal_amount_cents)
  );

  if report_record.user_id is not null then
    insert into public.cleanup_notifications (
      user_id, cleanup_attempt_id, report_id, contribution_id, event_type, created_at
    ) values (
      report_record.user_id, null, contribution_record.report_id,
      contribution_record.id, 'cleanup_fund_increased', transition_at
    );
  end if;

  return contribution_record;
end;
$$;

revoke all on function public.finalize_cleanup_contribution(text, text, boolean, text)
  from public, anon, authenticated, service_role;
grant execute on function public.finalize_cleanup_contribution(text, text, boolean, text)
  to service_role;

create or replace function public.sync_cleaner_payout_account(
  target_user_id uuid,
  target_stripe_account_id text,
  target_onboarding_status text,
  target_payouts_enabled boolean,
  target_country text,
  target_requirements_due text[] default '{}'
)
returns public.cleaner_payout_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_record public.cleaner_payout_accounts%rowtype;
begin
  if target_onboarding_status <> all (array['not_started', 'pending', 'enabled', 'restricted'])
    or (target_country is not null and target_country <> 'US') then
    raise check_violation using message = 'cleaner_payout_account_invalid';
  end if;

  insert into public.cleaner_payout_accounts (
    user_id,
    stripe_account_id,
    onboarding_status,
    payouts_enabled,
    country,
    requirements_due,
    updated_at
  ) values (
    target_user_id,
    target_stripe_account_id,
    target_onboarding_status,
    target_payouts_enabled,
    target_country,
    coalesce(target_requirements_due, '{}'),
    now()
  )
  on conflict (user_id) do update set
    stripe_account_id = excluded.stripe_account_id,
    onboarding_status = excluded.onboarding_status,
    payouts_enabled = excluded.payouts_enabled,
    country = excluded.country,
    requirements_due = excluded.requirements_due,
    updated_at = excluded.updated_at
  returning * into account_record;

  return account_record;
end;
$$;

revoke all on function public.sync_cleaner_payout_account(uuid, text, text, boolean, text, text[])
  from public, anon, authenticated, service_role;
grant execute on function public.sync_cleaner_payout_account(uuid, text, text, boolean, text, text[])
  to service_role;

create or replace function public.renew_report(target_report_id uuid)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_permanent_cleanup_user();
  report_record public.reports%rowtype;
begin
  select * into report_record
  from public.reports
  where id = target_report_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_report_not_found';
  end if;
  if report_record.user_id <> actor_id then
    raise insufficient_privilege using message = 'report_renewal_not_allowed';
  end if;
  if report_record.renewal_status <> 'decision_required'
    or report_record.renewal_decision_due_at < now()
    or report_record.cleanup_state <> 'available' then
    raise check_violation using message = 'report_not_renewable';
  end if;

  update public.reports set
    expires_at = now() + interval '30 days',
    expired_at = null,
    cancelled_at = null,
    renewal_status = 'active',
    renewal_decision_due_at = null
  where id = target_report_id
  returning * into report_record;

  insert into public.cleanup_notifications (
    user_id, cleanup_attempt_id, report_id, event_type, created_at
  ) values (
    actor_id, null, target_report_id, 'report_renewed', now()
  );

  return report_record;
end;
$$;

revoke all on function public.renew_report(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.renew_report(uuid) to authenticated;

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
    expired_at = null,
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

create or replace function public.close_expired_report(target_report_id uuid)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_permanent_cleanup_user();
  report_record public.reports%rowtype;
begin
  select * into report_record
  from public.reports
  where id = target_report_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_report_not_found';
  end if;
  if report_record.user_id <> actor_id then
    raise insufficient_privilege using message = 'report_close_not_allowed';
  end if;
  if report_record.renewal_status <> 'decision_required' then
    raise check_violation using message = 'report_not_waiting_for_renewal';
  end if;

  return private.close_expired_report(target_report_id, now(), actor_id, 'user');
end;
$$;

revoke all on function public.close_expired_report(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.close_expired_report(uuid) to authenticated;

create or replace function private.reopen_cleanup_pool(
  target_cleanup_id uuid,
  transition_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_report_id uuid;
  report_expiration timestamptz;
begin
  select report_id into attempt_report_id
  from public.cleanup_attempts
  where id = target_cleanup_id;

  if attempt_report_id is null then
    return;
  end if;

  update public.cleanup_contributions
  set cleanup_attempt_id = null, updated_at = transition_at
  where cleanup_attempt_id = target_cleanup_id
    and status = 'succeeded';

  select expires_at into report_expiration
  from public.reports
  where id = attempt_report_id;

  update public.reports set
    cleanup_state = 'available',
    funding_frozen_at = null,
    expired_at = case
      when report_expiration <= transition_at then report_expiration
      else null
    end,
    renewal_status = case
      when report_expiration <= transition_at then 'decision_required'
      else 'active'
    end,
    renewal_decision_due_at = case
      when report_expiration <= transition_at then transition_at + interval '7 days'
      else null
    end
  where id = attempt_report_id;
end;
$$;

revoke all on function private.reopen_cleanup_pool(uuid, timestamptz)
  from public, anon, authenticated, service_role;

create or replace function private.expire_cleanup_claim(
  target_cleanup_id uuid,
  effective_at timestamptz
)
returns public.cleanup_attempts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  attempt_record public.cleanup_attempts%rowtype;
  transition_at timestamptz := coalesce(effective_at, now());
begin
  select * into attempt_record
  from public.cleanup_attempts
  where id = target_cleanup_id
  for update;

  if not found then
    return null;
  end if;

  perform 1 from public.reports
  where id = attempt_record.report_id
  for update;

  if attempt_record.status = 'claimed'
    and attempt_record.claim_expires_at <= transition_at then
    update public.cleanup_attempts set
      status = 'expired',
      expired_at = claim_expires_at,
      last_activity_at = transition_at
    where id = target_cleanup_id
    returning * into attempt_record;

    perform private.reopen_cleanup_pool(target_cleanup_id, transition_at);

    if attempt_record.cleaner_id is not null then
      insert into public.cleanup_notifications (
        user_id, cleanup_attempt_id, report_id, event_type, created_at
      ) values (
        attempt_record.cleaner_id,
        attempt_record.id,
        attempt_record.report_id,
        'claim_expired',
        attempt_record.claim_expires_at
      ) on conflict do nothing;
    end if;
  end if;

  return attempt_record;
end;
$$;

revoke all on function private.expire_cleanup_claim(uuid, timestamptz)
  from public, anon, authenticated, service_role;

create or replace function public.claim_cleanup(target_report_id uuid)
returns public.cleanup_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_permanent_cleanup_user();
  transition_at timestamptz := now();
  report_record public.reports%rowtype;
  active_waiver_version text;
  active_guidelines_version text;
  attempt_record public.cleanup_attempts%rowtype;
  expired_attempt_id uuid;
  reward_cents bigint;
  first_paid boolean;
begin
  select waiver_version, guidelines_version
  into active_waiver_version, active_guidelines_version
  from public.cleanup_waiver_versions
  where is_active and retired_at is null
  for share;

  if active_waiver_version is null then
    raise check_violation using message = 'cleanup_waiver_unavailable';
  end if;

  if not exists (
    select 1 from public.cleanup_waiver_acceptances
    where user_id = actor_id
      and waiver_version = active_waiver_version
      and guidelines_version = active_guidelines_version
  ) then
    raise check_violation using message = 'cleanup_waiver_required';
  end if;

  select * into report_record
  from public.reports
  where id = target_report_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_report_not_found';
  end if;

  for expired_attempt_id in
    select id from public.cleanup_attempts
    where report_id = target_report_id
      and status = 'claimed'
      and claim_expires_at <= transition_at
  loop
    perform private.expire_cleanup_claim(expired_attempt_id, transition_at);
  end loop;

  select * into report_record
  from public.reports
  where id = target_report_id;

  if report_record.cleanup_state = 'claimed' then
    raise unique_violation using message = 'This cleanup was just claimed';
  end if;

  if report_record.cleanup_state <> 'available'
    or report_record.renewal_status <> 'active'
    or report_record.expired_at is not null
    or report_record.cancelled_at is not null
    or report_record.expires_at <= transition_at then
    raise check_violation using message = 'cleanup_report_not_available';
  end if;

  if exists (
    select 1 from public.cleanup_attempts
    where report_id = target_report_id
      and status = any (array['claimed', 'completion_submitted', 'changes_requested'])
  ) then
    raise unique_violation using message = 'This cleanup was just claimed';
  end if;

  if exists (
    select 1 from public.cleanup_feature_flags
    where name = 'gemini_financial_review_enabled' and enabled
  ) and report_record.funding_eligibility <> 'eligible' then
    raise check_violation using message = 'cleanup_report_safety_review_required';
  end if;

  select coalesce(sum(principal_amount_cents), 0)
  into reward_cents
  from public.cleanup_contributions
  where report_id = target_report_id
    and status = 'succeeded'
    and cleanup_attempt_id is null;

  if reward_cents > 0 then
    if report_record.funding_eligibility <> 'eligible'
      or not exists (
        select 1 from public.cleaner_payout_accounts
        where user_id = actor_id
          and onboarding_status = 'enabled'
          and payouts_enabled
          and country = 'US'
          and age_18_confirmed_at is not null
      ) then
      raise check_violation using message = 'cleaner_payout_onboarding_required';
    end if;

    if exists (
      select 1 from public.cleanup_contributions
      where report_id = target_report_id
        and status = 'succeeded'
        and cleanup_attempt_id is null
        and auto_refund_due_at <= transition_at + interval '7 days'
    ) then
      raise check_violation using message = 'cleanup_fund_maintenance_pending';
    end if;
  end if;

  select not exists (
    select 1 from public.cleanup_attempts
    where cleaner_id = actor_id
      and is_paid
      and payout_status = 'transferred'
  ) into first_paid;

  insert into public.cleanup_attempts (
    report_id,
    cleaner_id,
    reporter_id,
    waiver_version,
    guidelines_version,
    status,
    is_self_cleanup,
    claimed_at,
    claim_expires_at,
    last_activity_at,
    reward_amount_cents,
    is_paid,
    first_paid_cleanup,
    financial_review_status,
    first_paid_admin_status,
    payout_status
  ) values (
    target_report_id,
    actor_id,
    report_record.user_id,
    active_waiver_version,
    active_guidelines_version,
    'claimed',
    report_record.user_id = actor_id,
    transition_at,
    transition_at + private.cleanup_claim_duration(),
    transition_at,
    reward_cents,
    reward_cents > 0,
    reward_cents > 0 and first_paid,
    case when reward_cents > 0 then 'queued' else 'not_required' end,
    case when reward_cents > 0 and first_paid then 'pending' else 'not_required' end,
    case when reward_cents > 0 then 'blocked' else 'not_applicable' end
  ) returning * into attempt_record;

  if reward_cents > 0 then
    update public.cleanup_contributions set
      cleanup_attempt_id = attempt_record.id,
      updated_at = transition_at
    where report_id = target_report_id
      and status = 'succeeded'
      and cleanup_attempt_id is null;
  end if;

  update public.reports set
    cleanup_state = 'claimed',
    funded_amount_cents = reward_cents,
    funding_frozen_at = case when reward_cents > 0 then transition_at else null end
  where id = target_report_id;

  return attempt_record;
exception
  when unique_violation then
    raise unique_violation using message = 'This cleanup was just claimed';
end;
$$;

revoke all on function public.claim_cleanup(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_cleanup(uuid) to authenticated;

create or replace function public.release_cleanup(target_cleanup_id uuid)
returns public.cleanup_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_permanent_cleanup_user();
  transition_at timestamptz := now();
  attempt_record public.cleanup_attempts%rowtype;
begin
  select * into attempt_record
  from public.cleanup_attempts
  where id = target_cleanup_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_not_found';
  end if;

  perform 1 from public.reports
  where id = attempt_record.report_id
  for update;

  if attempt_record.cleaner_id is distinct from actor_id then
    raise insufficient_privilege using message = 'cleanup_release_not_allowed';
  end if;
  if attempt_record.status <> 'claimed' then
    raise check_violation using message = 'cleanup_release_invalid_state';
  end if;
  if attempt_record.claim_expires_at <= transition_at then
    return private.expire_cleanup_claim(target_cleanup_id, transition_at);
  end if;

  update public.cleanup_attempts set
    status = 'released',
    released_at = transition_at,
    last_activity_at = transition_at
  where id = target_cleanup_id
  returning * into attempt_record;

  perform private.reopen_cleanup_pool(target_cleanup_id, transition_at);
  return attempt_record;
end;
$$;

revoke all on function public.release_cleanup(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.release_cleanup(uuid) to authenticated;

create or replace function public.submit_cleanup(
  target_cleanup_id uuid,
  target_submission_id uuid,
  cleanup_description text,
  cleanup_photo_paths text[],
  cleanup_bags_or_items_removed integer default null,
  cleanup_duration_minutes integer default null
)
returns public.cleanup_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_permanent_cleanup_user();
  transition_at timestamptz := now();
  attempt_record public.cleanup_attempts%rowtype;
  submission_record public.cleanup_submissions%rowtype;
  next_submission_number smallint;
  candidate_path text;
  path_folders text[];
  distinct_photo_count integer;
begin
  if target_submission_id is null then
    raise check_violation using message = 'cleanup_submission_id_required';
  end if;
  if cleanup_description is null
    or char_length(btrim(cleanup_description)) not between 1 and 500 then
    raise check_violation using message = 'cleanup_description_invalid';
  end if;
  if cleanup_photo_paths is null
    or cardinality(cleanup_photo_paths) not between 1 and 3
    or array_position(cleanup_photo_paths, null) is not null then
    raise check_violation using message = 'cleanup_photos_invalid';
  end if;

  select count(distinct photo_path) into distinct_photo_count
  from unnest(cleanup_photo_paths) as photo_path;
  if distinct_photo_count <> cardinality(cleanup_photo_paths) then
    raise check_violation using message = 'cleanup_photos_must_be_unique';
  end if;

  select * into attempt_record
  from public.cleanup_attempts
  where id = target_cleanup_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_not_found';
  end if;

  perform 1 from public.reports
  where id = attempt_record.report_id
  for update;

  if attempt_record.cleaner_id is distinct from actor_id then
    raise insufficient_privilege using message = 'cleanup_submission_not_allowed';
  end if;
  if attempt_record.status <> all (array['claimed', 'changes_requested']) then
    raise check_violation using message = 'cleanup_submission_invalid_state';
  end if;
  if attempt_record.status = 'claimed'
    and attempt_record.claim_expires_at <= transition_at then
    raise check_violation using message = 'cleanup_claim_expired';
  end if;
  if attempt_record.status = 'changes_requested'
    and attempt_record.correction_due_at <= transition_at then
    raise check_violation using message = 'cleanup_correction_expired';
  end if;

  foreach candidate_path in array cleanup_photo_paths loop
    path_folders := storage.foldername(candidate_path);
    if cardinality(path_folders) <> 3
      or path_folders[1] <> actor_id::text
      or path_folders[2] <> target_cleanup_id::text
      or path_folders[3] <> target_submission_id::text then
      raise check_violation using message = 'cleanup_photo_path_invalid';
    end if;
    if not exists (
      select 1 from storage.objects
      where bucket_id = 'cleanup_photos'
        and name = candidate_path
        and owner_id = actor_id::text
    ) then
      raise check_violation using message = 'cleanup_photo_upload_missing';
    end if;
  end loop;

  select (coalesce(max(submission_number), 0) + 1)::smallint
  into next_submission_number
  from public.cleanup_submissions
  where cleanup_attempt_id = target_cleanup_id;

  insert into public.cleanup_submissions (
    id,
    cleanup_attempt_id,
    submission_number,
    submitted_by,
    description,
    bags_or_items_removed,
    duration_minutes,
    created_at
  ) values (
    target_submission_id,
    target_cleanup_id,
    next_submission_number,
    actor_id,
    btrim(cleanup_description),
    cleanup_bags_or_items_removed,
    cleanup_duration_minutes,
    transition_at
  ) returning * into submission_record;

  insert into public.cleanup_submission_photos (
    submission_id, storage_path, display_order, uploaded_at
  )
  select
    target_submission_id,
    photo.storage_path,
    photo.display_order::smallint,
    stored_object.created_at
  from unnest(cleanup_photo_paths)
    with ordinality as photo(storage_path, display_order)
  join storage.objects as stored_object
    on stored_object.bucket_id = 'cleanup_photos'
    and stored_object.name = photo.storage_path
    and stored_object.owner_id = actor_id::text;

  perform private.assert_cleanup_submission_photo_count(target_submission_id);

  update public.cleanup_attempts set
    status = 'completion_submitted',
    first_submitted_at = coalesce(first_submitted_at, transition_at),
    latest_submitted_at = transition_at,
    review_due_at = case
      when is_paid then null
      else transition_at + private.cleanup_review_duration()
    end,
    correction_due_at = null,
    financial_review_status = case
      when is_paid then 'queued'
      else financial_review_status
    end,
    financial_review_summary = case
      when is_paid then null
      else financial_review_summary
    end,
    last_activity_at = transition_at
  where id = target_cleanup_id
  returning * into attempt_record;

  update public.reports
  set cleanup_state = 'completion_submitted'
  where id = attempt_record.report_id;

  if attempt_record.is_paid then
    insert into public.cleanup_ai_checks (
      report_id,
      cleanup_attempt_id,
      submission_id,
      check_kind,
      status,
      attempt_number,
      prompt_version
    ) values (
      attempt_record.report_id,
      attempt_record.id,
      target_submission_id,
      'paid_submission',
      'queued',
      least(attempt_record.financial_review_attempts + 1, 2),
      'funded-cleanup-v1'
    );
  end if;

  return submission_record;
end;
$$;

revoke all on function public.submit_cleanup(uuid, uuid, text, text[], integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_cleanup(uuid, uuid, text, text[], integer, integer)
  to authenticated;

create or replace function public.record_cleanup_ai_result(
  target_check_id uuid,
  result_status text,
  result_model text,
  result_image_hashes text[],
  result_summary text,
  result_reason_codes text[],
  result_raw jsonb
)
returns public.cleanup_ai_checks
language plpgsql
security definer
set search_path = ''
as $$
declare
  check_record public.cleanup_ai_checks%rowtype;
  attempt_record public.cleanup_attempts%rowtype;
  latest_submission_id uuid;
  transition_at timestamptz := now();
begin
  if result_status <> all (array['passed', 'better_photos', 'admin_review', 'failed'])
    or result_summary is null
    or char_length(btrim(result_summary)) not between 1 and 1000 then
    raise check_violation using message = 'cleanup_ai_result_invalid';
  end if;

  select * into check_record
  from public.cleanup_ai_checks
  where id = target_check_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_ai_check_not_found';
  end if;
  if check_record.status not in ('queued', 'running') then
    return check_record;
  end if;

  update public.cleanup_ai_checks set
    status = result_status,
    model = result_model,
    image_hashes = coalesce(result_image_hashes, '{}'),
    user_summary = btrim(result_summary),
    reason_codes = coalesce(result_reason_codes, '{}'),
    raw_result = result_raw,
    completed_at = transition_at
  where id = target_check_id
  returning * into check_record;

  if check_record.check_kind = 'report' then
    update public.reports set
      funding_eligibility = case result_status
        when 'passed' then 'eligible'
        when 'better_photos' then 'better_photos'
        when 'admin_review' then 'safety_hold'
        else 'ineligible'
      end,
      funding_hold_reason = case
        when result_status = 'passed' then null
        else btrim(result_summary)
      end,
      original_photo_reviewed_at = transition_at
    where id = check_record.report_id;

    if result_status in ('admin_review', 'failed') then
      insert into public.cleanup_admin_cases (
        case_type, priority, report_id, title, summary, context
      ) values (
        'report_safety',
        case when result_status = 'failed' then 1 else 2 end,
        check_record.report_id,
        'Report funding eligibility review',
        btrim(result_summary),
        jsonb_build_object('ai_check_id', check_record.id, 'reason_codes', result_reason_codes)
      ) on conflict do nothing;
    end if;

    return check_record;
  end if;

  select * into attempt_record
  from public.cleanup_attempts
  where id = check_record.cleanup_attempt_id
  for update;

  select id into latest_submission_id
  from public.cleanup_submissions
  where cleanup_attempt_id = attempt_record.id
  order by submission_number desc
  limit 1;

  if attempt_record.status <> 'completion_submitted'
    or latest_submission_id is distinct from check_record.submission_id then
    raise check_violation using message = 'cleanup_ai_submission_is_not_current';
  end if;

  if result_status = 'passed' then
    update public.cleanup_attempts set
      financial_review_status = 'passed',
      financial_review_attempts = check_record.attempt_number,
      financial_review_summary = btrim(result_summary),
      review_due_at = transition_at + private.cleanup_review_duration(),
      last_activity_at = transition_at
    where id = attempt_record.id;

    if attempt_record.reporter_id is not null then
      insert into public.cleanup_notifications (
        user_id, cleanup_attempt_id, report_id, submission_id, event_type, created_at
      ) values (
        attempt_record.reporter_id,
        attempt_record.id,
        attempt_record.report_id,
        check_record.submission_id,
        'paid_review_started',
        transition_at
      ) on conflict do nothing;
    end if;

    if attempt_record.first_paid_cleanup then
      insert into public.cleanup_admin_cases (
        case_type,
        priority,
        report_id,
        cleanup_attempt_id,
        title,
        summary,
        context
      ) values (
        'first_paid_cleanup',
        2,
        attempt_record.report_id,
        attempt_record.id,
        'First paid cleanup check',
        btrim(result_summary),
        jsonb_build_object('submission_id', check_record.submission_id, 'ai_check_id', check_record.id)
      ) on conflict do nothing;
    end if;

    return check_record;
  end if;

  if result_status = 'better_photos' and check_record.attempt_number < 2 then
    insert into public.cleanup_reviews (
      cleanup_attempt_id,
      submission_id,
      reviewer_id,
      decision,
      reason_codes,
      note,
      created_at
    ) values (
      attempt_record.id,
      check_record.submission_id,
      null,
      'changes_requested',
      array['additional_photo_needed'],
      btrim(result_summary),
      transition_at
    );

    update public.cleanup_attempts set
      status = 'changes_requested',
      financial_review_status = 'better_photos',
      financial_review_attempts = check_record.attempt_number,
      financial_review_summary = btrim(result_summary),
      review_due_at = null,
      last_activity_at = transition_at
    where id = attempt_record.id;

    update public.reports set cleanup_state = 'changes_requested'
    where id = attempt_record.report_id;
    return check_record;
  end if;

  update public.cleanup_attempts set
    financial_review_status = 'admin_review',
    financial_review_attempts = check_record.attempt_number,
    financial_review_summary = btrim(result_summary),
    review_due_at = null,
    last_activity_at = transition_at
  where id = attempt_record.id;

  insert into public.cleanup_admin_cases (
    case_type,
    priority,
    report_id,
    cleanup_attempt_id,
    title,
    summary,
    context
  ) values (
    'gemini_review',
    case when result_status = 'failed' then 1 else 2 end,
    attempt_record.report_id,
    attempt_record.id,
    'Funded cleanup evidence review',
    btrim(result_summary),
    jsonb_build_object('submission_id', check_record.submission_id, 'ai_check_id', check_record.id)
  ) on conflict do nothing;

  return check_record;
end;
$$;

revoke all on function public.record_cleanup_ai_result(uuid, text, text, text[], text, text[], jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.record_cleanup_ai_result(uuid, text, text, text[], text, text[], jsonb)
  to service_role;

create or replace function public.dispute_paid_cleanup(
  target_cleanup_id uuid,
  dispute_reason text
)
returns public.cleanup_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_permanent_cleanup_user();
  attempt_record public.cleanup_attempts%rowtype;
  normalized_reason text := btrim(dispute_reason);
  transition_at timestamptz := now();
begin
  if normalized_reason is null or char_length(normalized_reason) not between 3 and 1000 then
    raise check_violation using message = 'paid_cleanup_dispute_reason_invalid';
  end if;

  select * into attempt_record
  from public.cleanup_attempts
  where id = target_cleanup_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_not_found';
  end if;
  if attempt_record.reporter_id is distinct from actor_id then
    raise insufficient_privilege using message = 'paid_cleanup_dispute_not_allowed';
  end if;
  if not attempt_record.is_paid
    or attempt_record.status <> 'completion_submitted'
    or attempt_record.financial_review_status <> 'passed'
    or attempt_record.review_due_at is null
    or attempt_record.review_due_at <= transition_at
    or attempt_record.dispute_status <> 'none' then
    raise check_violation using message = 'paid_cleanup_not_disputable';
  end if;

  update public.cleanup_attempts set
    dispute_status = 'open',
    disputed_at = transition_at,
    dispute_reason = normalized_reason,
    payout_status = 'blocked',
    last_activity_at = transition_at
  where id = target_cleanup_id
  returning * into attempt_record;

  insert into public.cleanup_admin_cases (
    case_type,
    priority,
    report_id,
    cleanup_attempt_id,
    title,
    summary,
    context
  ) values (
    'dispute',
    1,
    attempt_record.report_id,
    attempt_record.id,
    'Reporter disputed funded cleanup',
    normalized_reason,
    jsonb_build_object('review_due_at', attempt_record.review_due_at)
  ) on conflict do nothing;

  if attempt_record.cleaner_id is not null then
    insert into public.cleanup_notifications (
      user_id, cleanup_attempt_id, report_id, event_type, created_at
    ) values (
      attempt_record.cleaner_id,
      attempt_record.id,
      attempt_record.report_id,
      'paid_cleanup_disputed',
      transition_at
    ) on conflict do nothing;
  end if;

  return attempt_record;
end;
$$;

revoke all on function public.dispute_paid_cleanup(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.dispute_paid_cleanup(uuid, text) to authenticated;

create or replace function public.review_cleanup(
  target_cleanup_id uuid,
  target_submission_id uuid,
  review_decision text,
  request_change_reasons text[] default null,
  reviewer_note text default null
)
returns public.cleanup_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_permanent_cleanup_user();
  transition_at timestamptz := now();
  attempt_record public.cleanup_attempts%rowtype;
  report_owner_id uuid;
  latest_submission_id uuid;
  normalized_note text := nullif(btrim(reviewer_note), '');
begin
  select * into attempt_record
  from public.cleanup_attempts
  where id = target_cleanup_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_not_found';
  end if;

  select user_id into report_owner_id
  from public.reports
  where id = attempt_record.report_id
  for update;

  if attempt_record.reporter_id is distinct from actor_id
    or report_owner_id is distinct from actor_id then
    raise insufficient_privilege using message = 'cleanup_review_not_allowed';
  end if;
  if attempt_record.is_paid then
    raise check_violation using message = 'paid_cleanup_uses_dispute_only';
  end if;
  if attempt_record.status <> 'completion_submitted' then
    raise check_violation using message = 'cleanup_review_invalid_state';
  end if;
  if attempt_record.review_due_at <= transition_at then
    return private.auto_approve_cleanup(target_cleanup_id, transition_at);
  end if;

  select id into latest_submission_id
  from public.cleanup_submissions
  where cleanup_attempt_id = target_cleanup_id
  order by submission_number desc limit 1;
  if latest_submission_id is distinct from target_submission_id then
    raise check_violation using message = 'cleanup_review_submission_is_not_current';
  end if;
  if normalized_note is not null and char_length(normalized_note) > 500 then
    raise check_violation using message = 'cleanup_review_note_invalid';
  end if;

  if review_decision = 'changes_requested' then
    insert into public.cleanup_reviews (
      cleanup_attempt_id, submission_id, reviewer_id, decision,
      reason_codes, note, created_at
    ) values (
      target_cleanup_id, target_submission_id, actor_id, 'changes_requested',
      request_change_reasons, normalized_note, transition_at
    );
    update public.cleanup_attempts set
      status = 'changes_requested', review_due_at = null, last_activity_at = transition_at
    where id = target_cleanup_id returning * into attempt_record;
    update public.reports set cleanup_state = 'changes_requested'
    where id = attempt_record.report_id;
    return attempt_record;
  end if;

  if review_decision <> 'approved'
    or coalesce(cardinality(request_change_reasons), 0) <> 0 then
    raise check_violation using message = 'cleanup_review_decision_invalid';
  end if;

  insert into public.cleanup_reviews (
    cleanup_attempt_id, submission_id, reviewer_id, decision,
    reason_codes, note, created_at
  ) values (
    target_cleanup_id, target_submission_id, actor_id, 'approved',
    null, normalized_note, transition_at
  );
  update public.cleanup_attempts set
    status = 'completed',
    completed_at = transition_at,
    last_activity_at = transition_at,
    final_submission_id = target_submission_id,
    final_reviewer_id = actor_id,
    approval_method = case when is_self_cleanup then 'self_approved' else 'reporter_approved' end
  where id = target_cleanup_id returning * into attempt_record;
  update public.reports set
    cleanup_state = 'completed', expired_at = null, cancelled_at = null
  where id = attempt_record.report_id;
  return attempt_record;
end;
$$;

revoke all on function public.review_cleanup(uuid, uuid, text, text[], text)
  from public, anon, authenticated, service_role;
grant execute on function public.review_cleanup(uuid, uuid, text, text[], text)
  to authenticated;

create or replace function private.auto_approve_cleanup(
  target_cleanup_id uuid,
  effective_at timestamptz
)
returns public.cleanup_attempts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  attempt_record public.cleanup_attempts%rowtype;
  latest_submission_id uuid;
  transition_at timestamptz := coalesce(effective_at, now());
begin
  select * into attempt_record
  from public.cleanup_attempts
  where id = target_cleanup_id
  for update;

  if not found then return null; end if;

  perform 1 from public.reports
  where id = attempt_record.report_id
  for update;

  if attempt_record.status <> 'completion_submitted'
    or attempt_record.review_due_at is null
    or attempt_record.review_due_at > transition_at then
    return attempt_record;
  end if;

  if attempt_record.is_paid and (
    attempt_record.financial_review_status <> 'passed'
    or attempt_record.dispute_status = 'open'
    or attempt_record.first_paid_admin_status = 'pending'
  ) then
    return attempt_record;
  end if;

  select id into latest_submission_id
  from public.cleanup_submissions
  where cleanup_attempt_id = target_cleanup_id
  order by submission_number desc limit 1;
  if latest_submission_id is null then
    raise check_violation using message = 'cleanup_submission_required';
  end if;

  if exists (
    select 1 from public.cleanup_reviews
    where cleanup_attempt_id = target_cleanup_id
      and submission_id = latest_submission_id
      and reviewer_id is not null
  ) then
    return attempt_record;
  end if;

  insert into public.cleanup_reviews (
    cleanup_attempt_id, submission_id, reviewer_id, decision,
    reason_codes, note, created_at
  ) values (
    target_cleanup_id, latest_submission_id, null, 'auto_approved',
    null, null, transition_at
  ) on conflict do nothing;

  update public.cleanup_attempts set
    status = 'completed',
    completed_at = transition_at,
    last_activity_at = transition_at,
    final_submission_id = latest_submission_id,
    final_reviewer_id = null,
    approval_method = 'auto_approved',
    payout_status = case when is_paid then 'pending' else 'not_applicable' end
  where id = target_cleanup_id
  returning * into attempt_record;

  update public.reports set
    cleanup_state = 'completed',
    expired_at = null,
    cancelled_at = null
  where id = attempt_record.report_id;

  return attempt_record;
end;
$$;

revoke all on function private.auto_approve_cleanup(uuid, timestamptz)
  from public, anon, authenticated, service_role;

create or replace function private.reject_paid_cleanup(
  target_cleanup_id uuid,
  transition_at timestamptz,
  rejection_summary text
)
returns public.cleanup_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record public.cleanup_attempts%rowtype;
begin
  update public.cleanup_attempts set
    status = 'cancelled',
    cancelled_at = transition_at,
    financial_review_status = 'rejected',
    financial_review_summary = coalesce(nullif(btrim(rejection_summary), ''), financial_review_summary),
    review_due_at = null,
    correction_due_at = null,
    payout_status = 'blocked',
    last_activity_at = transition_at
  where id = target_cleanup_id
    and is_paid
    and status in ('claimed', 'completion_submitted', 'changes_requested')
  returning * into attempt_record;

  if attempt_record.id is not null then
    perform private.reopen_cleanup_pool(target_cleanup_id, transition_at);
  end if;
  return attempt_record;
end;
$$;

revoke all on function private.reject_paid_cleanup(uuid, timestamptz, text)
  from public, anon, authenticated, service_role;

create or replace function public.list_cleanup_admin_cases(
  target_status text default 'open'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_cleanup_admin();
  if target_status <> all (array['open', 'resolved']) then
    raise check_violation using message = 'cleanup_admin_case_status_invalid';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', cases.id,
      'case_type', cases.case_type,
      'status', cases.status,
      'priority', cases.priority,
      'title', cases.title,
      'summary', cases.summary,
      'report_id', cases.report_id,
      'cleanup_attempt_id', cases.cleanup_attempt_id,
      'contribution_id', cases.contribution_id,
      'created_at', cases.created_at,
      'updated_at', cases.updated_at,
      'report_title', reports.title,
      'reward_amount_cents', attempts.reward_amount_cents,
      'review_due_at', attempts.review_due_at
    ) order by cases.priority, cases.created_at)
    from public.cleanup_admin_cases as cases
    left join public.reports as reports on reports.id = cases.report_id
    left join public.cleanup_attempts as attempts on attempts.id = cases.cleanup_attempt_id
    where cases.status = target_status
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.list_cleanup_admin_cases(text)
  from public, anon, authenticated, service_role;
grant execute on function public.list_cleanup_admin_cases(text) to authenticated;

create or replace function public.get_cleanup_admin_case(target_case_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform private.require_cleanup_admin();
  select jsonb_build_object(
    'case', to_jsonb(cases),
    'report', to_jsonb(reports),
    'attempt', to_jsonb(attempts),
    'contribution', to_jsonb(contributions),
    'cleaner_history', case
      when attempts.cleaner_id is null then null
      else jsonb_build_object(
        'completed_cleanups', (
          select count(*) from public.cleanup_attempts as history
          where history.cleaner_id = attempts.cleaner_id and history.status = 'completed'
        ),
        'paid_rewards_sent', (
          select count(*) from public.cleanup_attempts as history
          where history.cleaner_id = attempts.cleaner_id and history.payout_status = 'transferred'
        )
      )
    end,
    'submissions', coalesce((
      select jsonb_agg(to_jsonb(submissions) order by submissions.submission_number)
      from public.cleanup_submissions as submissions
      where submissions.cleanup_attempt_id = cases.cleanup_attempt_id
    ), '[]'::jsonb),
    'ai_checks', coalesce((
      select jsonb_agg(to_jsonb(checks) - 'raw_result' order by checks.created_at)
      from public.cleanup_ai_checks as checks
      where checks.report_id = cases.report_id
        and (cases.cleanup_attempt_id is null or checks.cleanup_attempt_id = cases.cleanup_attempt_id)
    ), '[]'::jsonb),
    'actions', coalesce((
      select jsonb_agg(to_jsonb(actions) order by actions.created_at)
      from public.cleanup_admin_actions as actions
      where actions.case_id = cases.id
    ), '[]'::jsonb)
  ) into result
  from public.cleanup_admin_cases as cases
  left join public.reports as reports on reports.id = cases.report_id
  left join public.cleanup_attempts as attempts on attempts.id = cases.cleanup_attempt_id
  left join public.cleanup_contributions as contributions on contributions.id = cases.contribution_id
  where cases.id = target_case_id;

  if result is null then
    raise no_data_found using message = 'cleanup_admin_case_not_found';
  end if;
  return result;
end;
$$;

revoke all on function public.get_cleanup_admin_case(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_cleanup_admin_case(uuid) to authenticated;

create or replace function public.resolve_cleanup_admin_case(
  target_case_id uuid,
  target_action text,
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := private.require_cleanup_admin();
  case_record public.cleanup_admin_cases%rowtype;
  attempt_record public.cleanup_attempts%rowtype;
  latest_submission_id uuid;
  transition_at timestamptz := now();
  normalized_reason text := btrim(target_reason);
begin
  if normalized_reason is null or char_length(normalized_reason) not between 3 and 1000 then
    raise check_violation using message = 'cleanup_admin_reason_required';
  end if;

  select * into case_record
  from public.cleanup_admin_cases
  where id = target_case_id
  for update;

  if not found then
    raise no_data_found using message = 'cleanup_admin_case_not_found';
  end if;
  if case_record.status <> 'open' then
    raise check_violation using message = 'cleanup_admin_case_already_resolved';
  end if;

  if case_record.case_type = 'report_safety' then
    if target_action = 'approve_funding' then
      update public.reports set
        funding_eligibility = 'eligible', funding_hold_reason = null,
        original_photo_reviewed_at = transition_at
      where id = case_record.report_id;
    elsif target_action = 'reject_funding' then
      update public.reports set
        funding_eligibility = 'ineligible', funding_hold_reason = normalized_reason,
        original_photo_reviewed_at = transition_at
      where id = case_record.report_id;
    elsif target_action = 'close_and_refund' then
      perform private.close_expired_report(
        case_record.report_id, transition_at, actor_id, 'admin'
      );
    else
      raise check_violation using message = 'cleanup_admin_action_invalid';
    end if;
  elsif case_record.case_type in ('gemini_review', 'first_paid_cleanup', 'dispute') then
    select * into attempt_record
    from public.cleanup_attempts
    where id = case_record.cleanup_attempt_id
    for update;

    if target_action in ('reject_cleanup', 'reject_and_close', 'uphold_dispute') then
      attempt_record := private.reject_paid_cleanup(
        case_record.cleanup_attempt_id, transition_at, normalized_reason
      );
      if case_record.case_type = 'dispute' then
        update public.cleanup_attempts set dispute_status = 'upheld'
        where id = case_record.cleanup_attempt_id;
      elsif case_record.case_type = 'first_paid_cleanup' then
        update public.cleanup_attempts set first_paid_admin_status = 'rejected'
        where id = case_record.cleanup_attempt_id;
      end if;
      if target_action = 'reject_and_close' then
        perform private.close_expired_report(
          case_record.report_id, transition_at, actor_id, 'admin'
        );
      end if;
    elsif case_record.case_type = 'first_paid_cleanup'
      and target_action = 'approve_cleanup' then
      update public.cleanup_attempts set first_paid_admin_status = 'approved'
      where id = case_record.cleanup_attempt_id returning * into attempt_record;
    elsif case_record.case_type = 'gemini_review'
      and target_action = 'approve_cleanup' then
      update public.cleanup_attempts set
        financial_review_status = 'passed',
        financial_review_summary = normalized_reason,
        review_due_at = transition_at + private.cleanup_review_duration(),
        last_activity_at = transition_at
      where id = case_record.cleanup_attempt_id returning * into attempt_record;
      if attempt_record.first_paid_cleanup then
        insert into public.cleanup_admin_cases (
          case_type, priority, report_id, cleanup_attempt_id,
          title, summary, context
        ) values (
          'first_paid_cleanup', 2, attempt_record.report_id, attempt_record.id,
          'First paid cleanup check', normalized_reason,
          jsonb_build_object('source_case_id', case_record.id)
        ) on conflict do nothing;
      end if;
    elsif case_record.case_type = 'gemini_review'
      and target_action = 'request_better_photos' then
      if attempt_record.financial_review_attempts >= 2 then
        raise check_violation using message = 'cleanup_photo_attempts_exhausted';
      end if;
      select id into latest_submission_id
      from public.cleanup_submissions
      where cleanup_attempt_id = attempt_record.id
      order by submission_number desc limit 1;
      insert into public.cleanup_reviews (
        cleanup_attempt_id, submission_id, reviewer_id, decision,
        reason_codes, note, created_at
      ) values (
        attempt_record.id, latest_submission_id, actor_id, 'changes_requested',
        array['additional_photo_needed'], normalized_reason, transition_at
      );
      update public.cleanup_attempts set
        status = 'changes_requested',
        financial_review_status = 'better_photos',
        review_due_at = null,
        last_activity_at = transition_at
      where id = attempt_record.id;
      update public.reports set cleanup_state = 'changes_requested'
      where id = attempt_record.report_id;
    elsif case_record.case_type = 'dispute'
      and target_action = 'deny_dispute' then
      update public.cleanup_attempts set dispute_status = 'denied'
      where id = case_record.cleanup_attempt_id returning * into attempt_record;
    else
      raise check_violation using message = 'cleanup_admin_action_invalid';
    end if;
  elsif case_record.case_type = 'payout_failure' and target_action = 'retry_payout' then
    update public.cleanup_attempts set payout_status = 'pending', payout_last_error = null
    where id = case_record.cleanup_attempt_id;
  elsif case_record.case_type = 'refund_failure' and target_action = 'retry_refund' then
    update public.cleanup_contributions set
      status = 'refund_pending', failure_code = null, updated_at = transition_at
    where id = case_record.contribution_id;
  else
    raise check_violation using message = 'cleanup_admin_action_invalid';
  end if;

  insert into public.cleanup_admin_actions (
    case_id, admin_id, action, reason, created_at
  ) values (
    target_case_id, actor_id, target_action, normalized_reason, transition_at
  );

  update public.cleanup_admin_cases set
    status = 'resolved',
    resolved_by = actor_id,
    resolved_at = transition_at,
    updated_at = transition_at
  where id = target_case_id;

  if attempt_record.id is not null
    and attempt_record.status = 'completion_submitted'
    and attempt_record.review_due_at <= transition_at then
    attempt_record := private.auto_approve_cleanup(attempt_record.id, transition_at);
  end if;

  return public.get_cleanup_admin_case(target_case_id);
end;
$$;

revoke all on function public.resolve_cleanup_admin_case(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.resolve_cleanup_admin_case(uuid, text, text)
  to authenticated;

create or replace function private.queue_report_ai_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.funding_locked_at is not null then
    return new;
  end if;

  with superseded_cases as (
    update public.cleanup_admin_cases set
      status = 'resolved',
      resolved_at = now(),
      updated_at = now()
    where report_id = new.id
      and case_type = 'report_safety'
      and status = 'open'
    returning id
  )
  insert into public.cleanup_admin_actions (case_id, action, reason)
  select id, 'superseded', 'A newer report photo set replaced this review.'
  from superseded_cases;

  update public.cleanup_ai_checks set
    status = 'superseded',
    completed_at = now(),
    user_summary = 'A newer report photo set replaced this review.'
  where report_id = new.id
    and check_kind = 'report'
    and status in ('queued', 'running');

  update public.reports set
    funding_eligibility = case
      when coalesce(cardinality(new.photo_paths), 0) > 0 then 'pending'
      else 'ineligible'
    end,
    funding_hold_reason = case
      when coalesce(cardinality(new.photo_paths), 0) > 0 then null
      else 'A usable original photo is required before this report can be funded.'
    end,
    original_photo_reviewed_at = null
  where id = new.id;

  if coalesce(cardinality(new.photo_paths), 0) > 0 then
    insert into public.cleanup_ai_checks (
      report_id, check_kind, status, attempt_number, prompt_version
    ) values (
      new.id, 'report', 'queued', 1, 'report-funding-v1'
    );
  end if;
  return new;
end;
$$;

revoke all on function private.queue_report_ai_check()
  from public, anon, authenticated, service_role;

create trigger reports_queue_funding_photo_review_on_insert
after insert on public.reports
for each row execute function private.queue_report_ai_check();

create trigger reports_queue_funding_photo_review_on_update
after update of photo_paths on public.reports
for each row
when (new.photo_paths is distinct from old.photo_paths)
execute function private.queue_report_ai_check();

create or replace function private.expire_cleanup_correction(
  target_cleanup_id uuid,
  effective_at timestamptz
)
returns public.cleanup_attempts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  attempt_record public.cleanup_attempts%rowtype;
  correction_deadline timestamptz;
  transition_at timestamptz := coalesce(effective_at, now());
begin
  select * into attempt_record
  from public.cleanup_attempts
  where id = target_cleanup_id
  for update;
  if not found then return null; end if;

  perform 1 from public.reports
  where id = attempt_record.report_id
  for update;

  correction_deadline := attempt_record.correction_due_at;
  if attempt_record.status = 'changes_requested'
    and correction_deadline is not null
    and correction_deadline <= transition_at then
    update public.cleanup_attempts set
      status = 'expired',
      expired_at = correction_deadline,
      correction_due_at = null,
      review_due_at = null,
      last_activity_at = transition_at
    where id = target_cleanup_id
    returning * into attempt_record;

    perform private.reopen_cleanup_pool(target_cleanup_id, transition_at);

    if attempt_record.cleaner_id is not null then
      insert into public.cleanup_notifications (
        user_id, cleanup_attempt_id, report_id, event_type, created_at
      ) values (
        attempt_record.cleaner_id, attempt_record.id, attempt_record.report_id,
        'correction_expired', correction_deadline
      ) on conflict do nothing;
    end if;
  end if;
  return attempt_record;
end;
$$;

revoke all on function private.expire_cleanup_correction(uuid, timestamptz)
  from public, anon, authenticated, service_role;

create or replace function public.mark_cleanup_payout_result(
  target_cleanup_id uuid,
  transfer_succeeded boolean,
  target_transfer_id text default null,
  target_error text default null
)
returns public.cleanup_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record public.cleanup_attempts%rowtype;
  transition_at timestamptz := now();
begin
  select * into attempt_record
  from public.cleanup_attempts
  where id = target_cleanup_id
  for update;
  if not found then
    raise no_data_found using message = 'cleanup_not_found';
  end if;
  if not attempt_record.is_paid or attempt_record.status <> 'completed' then
    raise check_violation using message = 'cleanup_payout_invalid_state';
  end if;

  if transfer_succeeded then
    if target_transfer_id is null then
      raise check_violation using message = 'cleanup_transfer_id_required';
    end if;
    update public.cleanup_attempts set
      payout_status = 'transferred',
      stripe_transfer_id = target_transfer_id,
      payout_last_error = null,
      last_activity_at = transition_at
    where id = target_cleanup_id returning * into attempt_record;

    update public.cleanup_contributions set
      status = 'paid_out', updated_at = transition_at
    where cleanup_attempt_id = target_cleanup_id and status = 'succeeded';

    update public.reports set
      funded_amount_cents = 0,
      funding_frozen_at = null
    where id = attempt_record.report_id;

    insert into public.cleanup_financial_audit (
      actor_kind, action, report_id, cleanup_attempt_id, metadata
    ) values (
      'stripe', 'cleanup_reward_transferred', attempt_record.report_id,
      attempt_record.id,
      jsonb_build_object('transfer_id', target_transfer_id, 'amount_cents', attempt_record.reward_amount_cents)
    );

    if attempt_record.cleaner_id is not null then
      insert into public.cleanup_notifications (
        user_id, cleanup_attempt_id, report_id, event_type, created_at
      ) values (
        attempt_record.cleaner_id,
        attempt_record.id,
        attempt_record.report_id,
        'cleanup_reward_sent',
        transition_at
      ) on conflict do nothing;
    end if;
  else
    update public.cleanup_attempts set
      payout_status = 'failed',
      payout_last_error = left(coalesce(target_error, 'Transfer failed'), 1000),
      last_activity_at = transition_at
    where id = target_cleanup_id returning * into attempt_record;

    insert into public.cleanup_admin_cases (
      case_type, priority, report_id, cleanup_attempt_id, title, summary
    ) values (
      'payout_failure', 1, attempt_record.report_id, attempt_record.id,
      'Cleanup reward transfer failed', attempt_record.payout_last_error
    ) on conflict do nothing;

    if attempt_record.cleaner_id is not null then
      insert into public.cleanup_notifications (
        user_id, cleanup_attempt_id, report_id, event_type, created_at
      ) values (
        attempt_record.cleaner_id, attempt_record.id, attempt_record.report_id,
        'cleanup_payout_failed', transition_at
      ) on conflict do nothing;
    end if;
  end if;
  return attempt_record;
end;
$$;

revoke all on function public.mark_cleanup_payout_result(uuid, boolean, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.mark_cleanup_payout_result(uuid, boolean, text, text)
  to service_role;

create or replace function public.mark_cleanup_refund_result(
  target_contribution_id uuid,
  refund_succeeded boolean,
  target_refund_id text default null,
  target_error text default null
)
returns public.cleanup_contributions
language plpgsql
security definer
set search_path = ''
as $$
declare
  contribution_record public.cleanup_contributions%rowtype;
  transition_at timestamptz := now();
begin
  select * into contribution_record
  from public.cleanup_contributions
  where id = target_contribution_id
  for update;
  if not found then
    raise no_data_found using message = 'cleanup_contribution_not_found';
  end if;
  if contribution_record.status <> 'refund_pending' then
    return contribution_record;
  end if;

  if refund_succeeded then
    update public.cleanup_contributions set
      status = 'refunded',
      stripe_refund_id = target_refund_id,
      refunded_at = transition_at,
      failure_code = null,
      updated_at = transition_at
    where id = target_contribution_id
    returning * into contribution_record;

    if contribution_record.contributor_id is not null then
      insert into public.cleanup_notifications (
        user_id, cleanup_attempt_id, report_id, contribution_id, event_type, created_at
      ) values (
        contribution_record.contributor_id, null, contribution_record.report_id,
        contribution_record.id, 'cleanup_contribution_refunded', transition_at
      ) on conflict do nothing;
    end if;

  else
    update public.cleanup_contributions set
      failure_code = left(coalesce(target_error, 'Refund failed'), 500),
      updated_at = transition_at
    where id = target_contribution_id
    returning * into contribution_record;

    insert into public.cleanup_admin_cases (
      case_type, priority, report_id, contribution_id, title, summary
    ) values (
      'refund_failure', 1, contribution_record.report_id, contribution_record.id,
      'Contribution refund failed', contribution_record.failure_code
    ) on conflict do nothing;
  end if;
  return contribution_record;
end;
$$;

revoke all on function public.mark_cleanup_refund_result(uuid, boolean, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.mark_cleanup_refund_result(uuid, boolean, text, text)
  to service_role;

create or replace function public.prepare_funded_cleanup_account_deletion(
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_attempt record;
  funded_report record;
  transition_at timestamptz := now();
begin
  if exists (
    select 1 from public.cleanup_attempts
    where cleaner_id = target_user_id
      and is_paid
      and status = 'completed'
      and payout_status in ('pending', 'processing', 'failed')
  ) then
    raise check_violation using message = 'cleanup_payout_must_finish_before_account_deletion';
  end if;

  for active_attempt in
    select attempts.id
    from public.cleanup_attempts as attempts
    join public.reports as reports on reports.id = attempts.report_id
    where attempts.is_paid
      and attempts.status in ('claimed', 'completion_submitted', 'changes_requested')
      and (attempts.cleaner_id = target_user_id or reports.user_id = target_user_id)
    order by attempts.claimed_at
  loop
    perform private.reject_paid_cleanup(
      active_attempt.id,
      transition_at,
      'Account deletion ended this funded cleanup.'
    );
  end loop;

  for funded_report in
    select id from public.reports
    where user_id = target_user_id
      and funding_locked_at is not null
      and cleanup_state = 'available'
      and cancelled_at is null
  loop
    perform private.close_expired_report(
      funded_report.id, transition_at, target_user_id, 'system'
    );
  end loop;
end;
$$;

revoke all on function public.prepare_funded_cleanup_account_deletion(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.prepare_funded_cleanup_account_deletion(uuid)
  to service_role;

create or replace function private.run_cleanup_maintenance()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  maintenance_at timestamptz := now();
  due_cleanup record;
  due_report record;
begin
  insert into public.cleanup_notifications (
    user_id, cleanup_attempt_id, report_id, event_type, created_at
  )
  select cleaner_id, id, report_id, 'claim_expiring_soon', maintenance_at
  from public.cleanup_attempts
  where status = 'claimed'
    and cleaner_id is not null
    and claim_expires_at > maintenance_at
    and claim_expires_at <= maintenance_at + private.cleanup_claim_expiration_notice_lead()
  on conflict do nothing;

  for due_cleanup in
    select id from public.cleanup_attempts
    where status = 'claimed' and claim_expires_at <= maintenance_at
    order by claim_expires_at
  loop
    perform private.expire_cleanup_claim(due_cleanup.id, maintenance_at);
  end loop;

  for due_cleanup in
    select id from public.cleanup_attempts
    where status = 'completion_submitted'
      and review_due_at <= maintenance_at
      and (not is_paid or (
        financial_review_status = 'passed'
        and dispute_status <> 'open'
        and first_paid_admin_status <> 'pending'
      ))
    order by review_due_at
  loop
    perform private.auto_approve_cleanup(due_cleanup.id, maintenance_at);
  end loop;

  for due_cleanup in
    select id from public.cleanup_attempts
    where status = 'changes_requested' and correction_due_at <= maintenance_at
    order by correction_due_at
  loop
    perform private.expire_cleanup_correction(due_cleanup.id, maintenance_at);
  end loop;

  with expired_reports as (
    update public.reports set
      expired_at = expires_at,
      renewal_status = 'decision_required',
      renewal_decision_due_at = maintenance_at + interval '7 days'
    where expires_at < maintenance_at
      and expired_at is null
      and cancelled_at is null
      and cleanup_state = 'available'
      and renewal_status = 'active'
    returning id, user_id
  )
  insert into public.cleanup_notifications (
    user_id, cleanup_attempt_id, report_id, event_type, created_at
  )
  select user_id, null, id, 'report_renewal_due', maintenance_at
  from expired_reports
  where user_id is not null;

  for due_report in
    select id from public.reports
    where renewal_status = 'decision_required'
      and renewal_decision_due_at <= maintenance_at
    order by renewal_decision_due_at
  loop
    perform private.close_expired_report(due_report.id, maintenance_at, null, 'system');
  end loop;

  with refund_due as (
    update public.cleanup_contributions set
      status = 'refund_pending',
      refund_requested_at = maintenance_at,
      updated_at = maintenance_at
    where status = 'succeeded'
      and cleanup_attempt_id is null
      and auto_refund_due_at <= maintenance_at
    returning report_id, principal_amount_cents
  ), refund_totals as (
    select report_id, sum(principal_amount_cents) as principal_amount_cents
    from refund_due
    group by report_id
  )
  update public.reports as reports set
    funded_amount_cents = greatest(
      0,
      reports.funded_amount_cents - refund_totals.principal_amount_cents
    )
  from refund_totals
  where reports.id = refund_totals.report_id;

  perform private.queue_cleanup_push_worker(null);
end;
$$;

revoke all on function private.run_cleanup_maintenance()
  from public, anon, authenticated, service_role;
