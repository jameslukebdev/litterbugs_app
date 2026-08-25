create or replace function private.cleanup_claim_expiration_notice_lead()
returns interval
language sql
immutable
security invoker
set search_path = ''
as $$
  select interval '2 hours';
$$;

revoke all on function private.cleanup_claim_expiration_notice_lead()
  from public, anon, authenticated, service_role;

comment on function private.cleanup_claim_expiration_notice_lead() is
  'Production lead time for the one-time cleanup claim expiration reminder.';

alter table public.cleanup_notifications
  add column submission_id uuid
    references public.cleanup_submissions(id)
    on delete cascade,
  drop constraint cleanup_notifications_event_type_check,
  drop constraint cleanup_notifications_review_event_check,
  add constraint cleanup_notifications_event_type_check check (
    event_type = any (array[
      'report_claimed',
      'claim_expiring_soon',
      'claim_expired',
      'completion_submitted',
      'changes_requested',
      'cleanup_approved',
      'cleanup_auto_approved',
      'correction_expired'
    ])
  ),
  add constraint cleanup_notifications_target_check check (
    (
      event_type <> all (array[
        'changes_requested',
        'cleanup_approved',
        'cleanup_auto_approved'
      ])
      or review_id is not null
    )
    and (
      event_type <> 'completion_submitted'
      or submission_id is not null
    )
  );

drop index cleanup_notifications_terminal_event_key;
drop index cleanup_notifications_review_event_key;

create unique index cleanup_notifications_attempt_event_key
  on public.cleanup_notifications (cleanup_attempt_id, event_type)
  where event_type = any (array[
    'report_claimed',
    'claim_expiring_soon',
    'claim_expired',
    'correction_expired'
  ]);

create unique index cleanup_notifications_review_event_key
  on public.cleanup_notifications (review_id, event_type)
  where review_id is not null;

create unique index cleanup_notifications_submission_event_key
  on public.cleanup_notifications (submission_id, event_type)
  where submission_id is not null;

comment on table public.cleanup_notifications is
  'Durable cleanup workflow notifications. Delivery is independent from workflow state transitions.';

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  installation_id uuid not null,
  expo_push_token text not null,
  platform text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_registered_at timestamptz not null default now(),
  disabled_at timestamptz,
  constraint push_devices_user_installation_key unique (
    user_id,
    installation_id
  ),
  constraint push_devices_expo_token_key unique (expo_push_token),
  constraint push_devices_platform_check check (
    platform = any (array['ios', 'android'])
  ),
  constraint push_devices_expo_token_check check (
    char_length(expo_push_token) between 20 and 512
    and expo_push_token ~ '^Expo(nent)?PushToken\[[^]]+\]$'
  )
);

create index push_devices_active_user_idx
  on public.push_devices (user_id, last_registered_at desc)
  where disabled_at is null;

alter table public.push_devices enable row level security;
revoke all on table public.push_devices from public, anon, authenticated;
grant all on table public.push_devices to service_role;

comment on table public.push_devices is
  'Private per-installation Expo push tokens. Tokens are never stored on public profiles.';

create table public.cleanup_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null
    references public.cleanup_notifications(id)
    on delete cascade,
  push_device_id uuid not null
    references public.push_devices(id)
    on delete cascade,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  accepted_at timestamptz,
  expo_ticket_id text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cleanup_notification_deliveries_target_key unique (
    notification_id,
    push_device_id
  ),
  constraint cleanup_notification_deliveries_status_check check (
    status = any (array[
      'pending',
      'sending',
      'accepted',
      'failed',
      'device_unregistered'
    ])
  ),
  constraint cleanup_notification_deliveries_attempt_count_check check (
    attempt_count between 0 and 5
  )
);

create index cleanup_notification_deliveries_pending_idx
  on public.cleanup_notification_deliveries (
    next_attempt_at,
    last_attempt_at,
    created_at
  )
  where status = any (array['pending', 'sending', 'failed']);

alter table public.cleanup_notification_deliveries enable row level security;
revoke all on table public.cleanup_notification_deliveries
  from public, anon, authenticated;
grant all on table public.cleanup_notification_deliveries to service_role;

comment on table public.cleanup_notification_deliveries is
  'Private per-device push outbox. Push delivery failures never roll back cleanup workflow changes.';

create or replace function public.register_push_device(
  target_installation_id uuid,
  target_expo_push_token text,
  target_platform text
)
returns public.push_devices
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  normalized_token text := btrim(target_expo_push_token);
  device_record public.push_devices%rowtype;
  transition_at timestamptz := now();
begin
  actor_id := private.require_permanent_cleanup_user();

  if target_installation_id is null
    or normalized_token is null
    or char_length(normalized_token) not between 20 and 512
    or normalized_token !~ '^Expo(nent)?PushToken\[[^]]+\]$'
    or target_platform <> all (array['ios', 'android']) then
    raise check_violation using
      message = 'push_device_invalid';
  end if;

  delete from public.push_devices
  where push_devices.expo_push_token = normalized_token
    and (
      push_devices.user_id is distinct from actor_id
      or push_devices.installation_id is distinct from target_installation_id
    );

  insert into public.push_devices (
    user_id,
    installation_id,
    expo_push_token,
    platform,
    created_at,
    updated_at,
    last_registered_at,
    disabled_at
  ) values (
    actor_id,
    target_installation_id,
    normalized_token,
    target_platform,
    transition_at,
    transition_at,
    transition_at,
    null
  )
  on conflict (user_id, installation_id) do update
  set
    expo_push_token = excluded.expo_push_token,
    platform = excluded.platform,
    updated_at = transition_at,
    last_registered_at = transition_at,
    disabled_at = null
  returning * into device_record;

  return device_record;
end;
$$;

revoke all on function public.register_push_device(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.register_push_device(uuid, text, text)
  to authenticated;

create or replace function public.unregister_push_device(
  target_installation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  disabled_count integer;
begin
  actor_id := private.require_permanent_cleanup_user();

  update public.push_devices
  set
    disabled_at = now(),
    updated_at = now()
  where push_devices.user_id = actor_id
    and push_devices.installation_id = target_installation_id
    and push_devices.disabled_at is null;

  get diagnostics disabled_count = row_count;
  return disabled_count > 0;
end;
$$;

revoke all on function public.unregister_push_device(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.unregister_push_device(uuid)
  to authenticated;

create table private.cleanup_push_config (
  singleton boolean primary key default true check (singleton),
  webhook_secret text not null
);

alter table private.cleanup_push_config enable row level security;
revoke all on table private.cleanup_push_config
  from public, anon, authenticated;

insert into private.cleanup_push_config (singleton, webhook_secret)
values (true, encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (singleton) do nothing;

create or replace function public.verify_cleanup_push_webhook(
  candidate_secret text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.cleanup_push_config
    where singleton = true
      and webhook_secret = candidate_secret
  );
$$;

revoke all on function public.verify_cleanup_push_webhook(text)
  from public, anon, authenticated;
grant execute on function public.verify_cleanup_push_webhook(text)
  to service_role;

create or replace function public.claim_cleanup_push_deliveries(
  target_notification_id uuid default null,
  batch_limit integer default 100
)
returns table (
  delivery_id uuid,
  notification_id uuid,
  push_device_id uuid,
  expo_push_token text,
  event_type text,
  report_id uuid,
  cleanup_attempt_id uuid,
  review_id uuid,
  submission_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  transition_at timestamptz := now();
  normalized_limit integer := greatest(1, least(coalesce(batch_limit, 100), 100));
begin
  return query
  with candidate_deliveries as (
    select delivery.id
    from public.cleanup_notification_deliveries as delivery
    join public.push_devices as device
      on device.id = delivery.push_device_id
    where device.disabled_at is null
      and delivery.attempt_count < 5
      and (
        delivery.status = 'pending'
        or (
          delivery.status = 'failed'
          and (
            delivery.next_attempt_at is null
            or delivery.next_attempt_at <= transition_at
          )
        )
        or (
          delivery.status = 'sending'
          and delivery.last_attempt_at <= transition_at - interval '5 minutes'
        )
      )
      and (
        target_notification_id is null
        or delivery.notification_id = target_notification_id
      )
    order by delivery.created_at
    for update of delivery skip locked
    limit normalized_limit
  ),
  claimed_deliveries as (
    update public.cleanup_notification_deliveries as delivery
    set
      status = 'sending',
      attempt_count = delivery.attempt_count + 1,
      last_attempt_at = transition_at,
      next_attempt_at = null,
      updated_at = transition_at
    from candidate_deliveries
    where delivery.id = candidate_deliveries.id
    returning delivery.*
  )
  select
    claimed.id,
    claimed.notification_id,
    claimed.push_device_id,
    device.expo_push_token,
    notification.event_type,
    notification.report_id,
    notification.cleanup_attempt_id,
    notification.review_id,
    notification.submission_id
  from claimed_deliveries as claimed
  join public.push_devices as device
    on device.id = claimed.push_device_id
  join public.cleanup_notifications as notification
    on notification.id = claimed.notification_id
  order by claimed.created_at;
end;
$$;

revoke all on function public.claim_cleanup_push_deliveries(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_cleanup_push_deliveries(uuid, integer)
  to service_role;

create or replace function public.complete_cleanup_push_delivery(
  target_delivery_id uuid,
  delivery_outcome text,
  target_ticket_id text default null,
  target_error_code text default null,
  target_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  transition_at timestamptz := now();
  affected_device_id uuid;
begin
  if delivery_outcome <> all (array[
    'accepted',
    'failed',
    'device_unregistered'
  ]) then
    raise check_violation using
      message = 'cleanup_push_delivery_outcome_invalid';
  end if;

  update public.cleanup_notification_deliveries as delivery
  set
    status = delivery_outcome,
    accepted_at = case
      when delivery_outcome = 'accepted' then transition_at
      else delivery.accepted_at
    end,
    expo_ticket_id = nullif(btrim(target_ticket_id), ''),
    error_code = nullif(btrim(target_error_code), ''),
    error_message = left(nullif(btrim(target_error_message), ''), 500),
    next_attempt_at = case
      when delivery_outcome = 'failed' and delivery.attempt_count < 5 then
        transition_at + make_interval(
          mins => least(60, power(2, delivery.attempt_count)::integer)
        )
      else null
    end,
    updated_at = transition_at
  where delivery.id = target_delivery_id
    and delivery.status = 'sending'
  returning delivery.push_device_id into affected_device_id;

  if delivery_outcome = 'device_unregistered'
    and affected_device_id is not null then
    update public.push_devices
    set
      disabled_at = coalesce(disabled_at, transition_at),
      updated_at = transition_at
    where push_devices.id = affected_device_id;
  end if;
end;
$$;

revoke all on function public.complete_cleanup_push_delivery(
  uuid,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
grant execute on function public.complete_cleanup_push_delivery(
  uuid,
  text,
  text,
  text,
  text
) to service_role;

create or replace function private.queue_cleanup_push_worker(
  target_notification_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleanup_push_secret text;
begin
  select webhook_secret
  into cleanup_push_secret
  from private.cleanup_push_config
  where singleton = true;

  if cleanup_push_secret is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://mvaygkflcjswtwchflrk.supabase.co/functions/v1/send-cleanup-notifications',
    body := jsonb_build_object(
      'notificationId', target_notification_id,
      'retry', target_notification_id is null
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cleanup-push-secret', cleanup_push_secret
    ),
    timeout_milliseconds := 2000
  );
exception
  when others then
    raise warning 'Unable to queue cleanup push worker: %', sqlerrm;
end;
$$;

revoke all on function private.queue_cleanup_push_worker(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.seed_cleanup_push_deliveries()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery_count integer;
begin
  insert into public.cleanup_notification_deliveries (
    notification_id,
    push_device_id,
    created_at,
    updated_at
  )
  select
    new.id,
    push_devices.id,
    new.created_at,
    new.created_at
  from public.push_devices
  where push_devices.user_id = new.user_id
    and push_devices.disabled_at is null
  on conflict do nothing;

  get diagnostics delivery_count = row_count;
  if delivery_count > 0 then
    perform private.queue_cleanup_push_worker(new.id);
  end if;

  return new;
exception
  when others then
    raise warning 'Unable to seed cleanup push deliveries: %', sqlerrm;
    return new;
end;
$$;

revoke all on function private.seed_cleanup_push_deliveries()
  from public, anon, authenticated, service_role;

create trigger cleanup_notifications_seed_push_deliveries
after insert on public.cleanup_notifications
for each row
execute function private.seed_cleanup_push_deliveries();

create or replace function private.notify_cleanup_claimed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reporter_id is not null then
    insert into public.cleanup_notifications (
      user_id,
      cleanup_attempt_id,
      report_id,
      event_type,
      created_at
    ) values (
      new.reporter_id,
      new.id,
      new.report_id,
      'report_claimed',
      new.claimed_at
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.notify_cleanup_claimed()
  from public, anon, authenticated, service_role;

create trigger cleanup_attempts_notify_reporter_on_claim
after insert on public.cleanup_attempts
for each row
execute function private.notify_cleanup_claimed();

create or replace function private.notify_cleanup_submitted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record public.cleanup_attempts%rowtype;
begin
  select *
  into attempt_record
  from public.cleanup_attempts
  where cleanup_attempts.id = new.cleanup_attempt_id;

  if attempt_record.reporter_id is not null then
    insert into public.cleanup_notifications (
      user_id,
      cleanup_attempt_id,
      report_id,
      submission_id,
      event_type,
      created_at
    ) values (
      attempt_record.reporter_id,
      attempt_record.id,
      attempt_record.report_id,
      new.id,
      'completion_submitted',
      new.created_at
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.notify_cleanup_submitted()
  from public, anon, authenticated, service_role;

create trigger cleanup_submissions_notify_reporter
after insert on public.cleanup_submissions
for each row
execute function private.notify_cleanup_submitted();

create or replace function private.notify_cleanup_reviewed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record public.cleanup_attempts%rowtype;
  notification_event text;
begin
  notification_event := case new.decision
    when 'approved' then 'cleanup_approved'
    when 'auto_approved' then 'cleanup_auto_approved'
    else null
  end;

  if notification_event is null then
    return new;
  end if;

  select *
  into attempt_record
  from public.cleanup_attempts
  where cleanup_attempts.id = new.cleanup_attempt_id;

  if attempt_record.cleaner_id is not null then
    insert into public.cleanup_notifications (
      user_id,
      cleanup_attempt_id,
      report_id,
      review_id,
      submission_id,
      event_type,
      created_at
    ) values (
      attempt_record.cleaner_id,
      attempt_record.id,
      attempt_record.report_id,
      new.id,
      new.submission_id,
      notification_event,
      new.created_at
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.notify_cleanup_reviewed()
  from public, anon, authenticated, service_role;

create trigger cleanup_reviews_notify_cleaner
after insert on public.cleanup_reviews
for each row
execute function private.notify_cleanup_reviewed();

create or replace function private.run_cleanup_maintenance()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  maintenance_at timestamptz := now();
  due_cleanup record;
begin
  insert into public.cleanup_notifications (
    user_id,
    cleanup_attempt_id,
    report_id,
    event_type,
    created_at
  )
  select
    cleanup_attempts.cleaner_id,
    cleanup_attempts.id,
    cleanup_attempts.report_id,
    'claim_expiring_soon',
    maintenance_at
  from public.cleanup_attempts
  where cleanup_attempts.status = 'claimed'
    and cleanup_attempts.cleaner_id is not null
    and cleanup_attempts.claim_expires_at > maintenance_at
    and cleanup_attempts.claim_expires_at <=
      maintenance_at + private.cleanup_claim_expiration_notice_lead()
  on conflict do nothing;

  for due_cleanup in
    select cleanup_attempts.id
    from public.cleanup_attempts
    where cleanup_attempts.status = 'claimed'
      and cleanup_attempts.claim_expires_at <= maintenance_at
    order by cleanup_attempts.claim_expires_at
  loop
    perform private.expire_cleanup_claim(due_cleanup.id, maintenance_at);
  end loop;

  for due_cleanup in
    select cleanup_attempts.id
    from public.cleanup_attempts
    where cleanup_attempts.status = 'completion_submitted'
      and cleanup_attempts.review_due_at <= maintenance_at
    order by cleanup_attempts.review_due_at
  loop
    perform private.auto_approve_cleanup(due_cleanup.id, maintenance_at);
  end loop;

  for due_cleanup in
    select cleanup_attempts.id
    from public.cleanup_attempts
    where cleanup_attempts.status = 'changes_requested'
      and cleanup_attempts.correction_due_at <= maintenance_at
    order by cleanup_attempts.correction_due_at
  loop
    perform private.expire_cleanup_correction(due_cleanup.id, maintenance_at);
  end loop;

  update public.reports
  set expired_at = expires_at
  where expires_at < maintenance_at
    and expired_at is null
    and cancelled_at is null
    and cleanup_state = 'available';

  perform private.queue_cleanup_push_worker(null);
end;
$$;

revoke all on function private.run_cleanup_maintenance()
  from public, anon, authenticated, service_role;
