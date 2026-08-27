alter table public.cleanup_ai_checks
  drop constraint cleanup_ai_checks_attempt_check;

alter table public.cleanup_ai_checks
  add constraint cleanup_ai_checks_attempt_check
  check (attempt_number between 1 and 3);

alter table public.cleanup_attempts
  drop constraint cleanup_attempts_financial_review_attempts_check;

alter table public.cleanup_attempts
  add constraint cleanup_attempts_financial_review_attempts_check
  check (financial_review_attempts between 0 and 3);

create or replace function private.set_funded_cleanup_ai_attempt_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  prior_attempts smallint;
begin
  if new.check_kind <> 'paid_submission' or new.cleanup_attempt_id is null then
    return new;
  end if;

  select financial_review_attempts
  into prior_attempts
  from public.cleanup_attempts
  where id = new.cleanup_attempt_id;

  if prior_attempts is null then
    raise no_data_found using message = 'cleanup_not_found';
  end if;

  new.attempt_number := least(prior_attempts + 1, 3);
  return new;
end;
$$;

revoke all on function private.set_funded_cleanup_ai_attempt_number()
  from public, anon, authenticated, service_role;

drop trigger if exists cleanup_ai_checks_set_attempt_number
  on public.cleanup_ai_checks;

create trigger cleanup_ai_checks_set_attempt_number
before insert on public.cleanup_ai_checks
for each row
execute function private.set_funded_cleanup_ai_attempt_number();

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

  if result_status = 'better_photos' and check_record.attempt_number < 3 then
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
