alter table public.cleanup_waiver_acceptances
  drop constraint cleanup_waiver_acceptances_pkey,
  drop constraint cleanup_waiver_acceptances_waiver_version_fkey;

alter table public.cleanup_attempts
  drop constraint cleanup_attempts_waiver_version_fkey;

alter table public.cleanup_waiver_versions
  drop constraint cleanup_waiver_versions_pkey;

alter table public.cleanup_waiver_versions
  rename column version to waiver_version;

alter table public.cleanup_waiver_versions
  add column guidelines_version text;

update public.cleanup_waiver_versions
set guidelines_version = waiver_version
where guidelines_version is null;

alter table public.cleanup_waiver_versions
  alter column guidelines_version set not null,
  add constraint cleanup_waiver_versions_pkey primary key (
    waiver_version,
    guidelines_version
  ),
  add constraint cleanup_waiver_versions_guidelines_version_check check (
    guidelines_version = btrim(guidelines_version)
    and char_length(guidelines_version) between 1 and 80
  );

alter table public.cleanup_waiver_acceptances
  add column guidelines_version text;

update public.cleanup_waiver_acceptances
set guidelines_version = cleanup_waiver_versions.guidelines_version
from public.cleanup_waiver_versions
where cleanup_waiver_acceptances.waiver_version =
  cleanup_waiver_versions.waiver_version
  and cleanup_waiver_acceptances.guidelines_version is null;

alter table public.cleanup_waiver_acceptances
  alter column guidelines_version set not null,
  add constraint cleanup_waiver_acceptances_pkey primary key (
    user_id,
    waiver_version,
    guidelines_version
  ),
  add constraint cleanup_waiver_acceptances_version_fkey foreign key (
    waiver_version,
    guidelines_version
  ) references public.cleanup_waiver_versions (
    waiver_version,
    guidelines_version
  ) on delete restrict;

alter table public.cleanup_attempts
  add column guidelines_version text;

update public.cleanup_attempts
set guidelines_version = cleanup_waiver_versions.guidelines_version
from public.cleanup_waiver_versions
where cleanup_attempts.waiver_version =
  cleanup_waiver_versions.waiver_version
  and cleanup_attempts.guidelines_version is null;

alter table public.cleanup_attempts
  alter column guidelines_version set not null,
  add constraint cleanup_attempts_waiver_version_fkey foreign key (
    waiver_version,
    guidelines_version
  ) references public.cleanup_waiver_versions (
    waiver_version,
    guidelines_version
  ) on delete restrict;

create index cleanup_attempts_waiver_guidelines_version_idx
  on public.cleanup_attempts (waiver_version, guidelines_version);

insert into public.cleanup_waiver_versions (
  waiver_version,
  guidelines_version,
  title,
  body,
  is_active
)
select
  'cleanup-waiver-development-v1',
  'cleanup-guidelines-development-v1',
  'Cleanup Safety Acknowledgment / Waiver — Development Version',
  $development_waiver$
This is placeholder text for product development and testing only. It is not the final legal waiver and must be reviewed and replaced before production reliance.

By volunteering for a cleanup, I acknowledge that outdoor litter removal may involve traffic, unstable terrain, weather, sharp objects, hazardous materials, private property, and other risks. I agree to use my own judgment, follow applicable laws, and stop when conditions appear unsafe.

Safety guidelines:
• Use appropriate gloves and protective equipment.
• Do not enter unsafe roadways or traffic areas.
• Park safely and lawfully.
• Do not handle hazardous materials.
• Do not handle needles, syringes, or other sharps.
• Do not trespass or enter restricted property.
• Follow local regulations and disposal requirements.
• Stop immediately if conditions appear unsafe.

By explicitly accepting, I confirm that I have read this development acknowledgment and the safety guidance above. A lawyer-approved version will replace this text before the app is made public.
$development_waiver$,
  true
where not exists (
  select 1
  from public.cleanup_waiver_versions
  where cleanup_waiver_versions.is_active
    and cleanup_waiver_versions.retired_at is null
);

drop policy if exists "Users can accept the active cleanup waiver"
  on public.cleanup_waiver_acceptances;

revoke insert on table public.cleanup_waiver_acceptances from authenticated;

create or replace function public.accept_cleanup_waiver(
  accepted_waiver_version text,
  accepted_guidelines_version text
)
returns public.cleanup_waiver_acceptances
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  transition_at timestamptz := now();
  active_waiver_version text;
  active_guidelines_version text;
  acceptance_record public.cleanup_waiver_acceptances%rowtype;
begin
  actor_id := private.require_permanent_cleanup_user();

  select
    cleanup_waiver_versions.waiver_version,
    cleanup_waiver_versions.guidelines_version
  into
    active_waiver_version,
    active_guidelines_version
  from public.cleanup_waiver_versions
  where cleanup_waiver_versions.is_active
    and cleanup_waiver_versions.retired_at is null
  for share;

  if active_waiver_version is null then
    raise check_violation using
      message = 'cleanup_waiver_unavailable';
  end if;

  if accepted_waiver_version is distinct from active_waiver_version
    or accepted_guidelines_version is distinct from active_guidelines_version
  then
    raise check_violation using
      message = 'cleanup_waiver_outdated';
  end if;

  insert into public.cleanup_waiver_acceptances (
    user_id,
    waiver_version,
    guidelines_version,
    accepted_at
  ) values (
    actor_id,
    active_waiver_version,
    active_guidelines_version,
    transition_at
  )
  on conflict (user_id, waiver_version, guidelines_version) do nothing;

  select *
  into acceptance_record
  from public.cleanup_waiver_acceptances
  where cleanup_waiver_acceptances.user_id = actor_id
    and cleanup_waiver_acceptances.waiver_version = active_waiver_version
    and cleanup_waiver_acceptances.guidelines_version =
      active_guidelines_version;

  return acceptance_record;
end;
$$;

comment on function public.accept_cleanup_waiver(text, text) is
  'Records immutable acceptance of the exact active waiver and safety-guideline versions for the authenticated permanent user.';

revoke all on function public.accept_cleanup_waiver(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.accept_cleanup_waiver(text, text)
  to authenticated;

create or replace function public.claim_cleanup(target_report_id uuid)
returns public.cleanup_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  transition_at timestamptz := now();
  report_record public.reports%rowtype;
  active_waiver_version text;
  active_guidelines_version text;
  attempt_record public.cleanup_attempts%rowtype;
  expired_attempt_id uuid;
begin
  actor_id := private.require_permanent_cleanup_user();

  select
    cleanup_waiver_versions.waiver_version,
    cleanup_waiver_versions.guidelines_version
  into
    active_waiver_version,
    active_guidelines_version
  from public.cleanup_waiver_versions
  where cleanup_waiver_versions.is_active
    and cleanup_waiver_versions.retired_at is null
  for share;

  if active_waiver_version is null then
    raise check_violation using
      message = 'cleanup_waiver_unavailable';
  end if;

  if not exists (
    select 1
    from public.cleanup_waiver_acceptances
    where cleanup_waiver_acceptances.user_id = actor_id
      and cleanup_waiver_acceptances.waiver_version = active_waiver_version
      and cleanup_waiver_acceptances.guidelines_version =
        active_guidelines_version
  ) then
    raise check_violation using
      message = 'cleanup_waiver_required';
  end if;

  select *
  into report_record
  from public.reports
  where reports.id = target_report_id
  for update;

  if not found then
    raise no_data_found using
      message = 'cleanup_report_not_found';
  end if;

  for expired_attempt_id in
    select cleanup_attempts.id
    from public.cleanup_attempts
    where cleanup_attempts.report_id = target_report_id
      and cleanup_attempts.status = 'claimed'
      and cleanup_attempts.claim_expires_at <= transition_at
  loop
    perform private.expire_cleanup_claim(expired_attempt_id, transition_at);
  end loop;

  select *
  into report_record
  from public.reports
  where reports.id = target_report_id;

  if report_record.cleanup_state = 'claimed' then
    raise unique_violation using
      message = 'This cleanup was just claimed';
  end if;

  if report_record.cleanup_state <> 'available'
    or report_record.expired_at is not null
    or report_record.cancelled_at is not null
    or (
      report_record.expires_at is not null
      and report_record.expires_at <= transition_at
    ) then
    raise check_violation using
      message = 'cleanup_report_not_available';
  end if;

  if exists (
    select 1
    from public.cleanup_attempts
    where cleanup_attempts.report_id = target_report_id
      and cleanup_attempts.status = any (array[
        'claimed',
        'completion_submitted',
        'changes_requested'
      ])
  ) then
    raise unique_violation using
      message = 'This cleanup was just claimed';
  end if;

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
    last_activity_at
  ) values (
    target_report_id,
    actor_id,
    report_record.user_id,
    active_waiver_version,
    active_guidelines_version,
    'claimed',
    report_record.user_id = actor_id,
    transition_at,
    transition_at + interval '24 hours',
    transition_at
  )
  returning * into attempt_record;

  update public.reports
  set cleanup_state = 'claimed'
  where reports.id = target_report_id;

  return attempt_record;
exception
  when unique_violation then
    raise unique_violation using
      message = 'This cleanup was just claimed';
end;
$$;

comment on function public.claim_cleanup(uuid) is
  'Atomically claims an available report after verifying acceptance of the exact active waiver and guideline versions.';

revoke all on function public.claim_cleanup(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_cleanup(uuid) to authenticated;

comment on column public.cleanup_waiver_versions.waiver_version is
  'Version identifier for the cleanup acknowledgment or waiver text.';
comment on column public.cleanup_waiver_versions.guidelines_version is
  'Independent version identifier for the cleanup safety guidelines.';
comment on table public.cleanup_waiver_acceptances is
  'Immutable proof that a permanent user accepted an exact waiver and safety-guideline version pair.';
comment on column public.cleanup_attempts.guidelines_version is
  'Safety-guideline version accepted for this historical cleanup attempt.';
