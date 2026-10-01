-- Explicit tombstones keep an older device's one-time import from resurrecting
-- a favorite removed elsewhere. No browser can write another owner's rows.
create table public.report_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  kind text not null check (kind in ('favorites', 'hidden')),
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, report_id, kind)
);
alter table public.report_preferences enable row level security;
create policy "Read own report preferences" on public.report_preferences for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_permanent_user()));
revoke all on public.report_preferences from anon, authenticated;
grant select on public.report_preferences to authenticated;

-- Retain operation identities for the life of the account: a lost response may
-- be retried after a newer device has changed the same preference.
create table private.report_preference_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  payload jsonb not null,
  primary key (user_id, operation_id)
);
alter table private.report_preference_operations enable row level security;
revoke all on private.report_preference_operations from public, anon, authenticated;

create function private.sync_report_preferences(target_user_id uuid, seed jsonb, operations jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); item jsonb; saved_payload jsonb; target uuid; preference_kind text; result jsonb;
begin
  if actor is null or actor is distinct from target_user_id or not public.is_permanent_user() then
    raise insufficient_privilege using message = 'preferences_require_account';
  end if;
  if jsonb_typeof(seed) is distinct from 'array' or jsonb_array_length(seed) > 4000
    or jsonb_typeof(operations) is distinct from 'array' or jsonb_array_length(operations) > 100 then
    raise check_violation using message = 'invalid_preference_batch';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('report-preferences:' || actor::text, 0));
  for item in select value from jsonb_array_elements(seed) loop
    target := (item->>'reportId')::uuid; preference_kind := item->>'kind';
    if target is null or preference_kind is null or preference_kind not in ('favorites', 'hidden') then
      raise check_violation using message = 'invalid_preference';
    end if;
    insert into public.report_preferences(user_id, report_id, kind, enabled)
      select actor, target, preference_kind, true from public.reports where id = target
      on conflict do nothing;
  end loop;
  for item in select value from jsonb_array_elements(operations) loop
    target := (item->>'reportId')::uuid; preference_kind := item->>'kind';
    if target is null or (item->>'id')::uuid is null or preference_kind is null
      or preference_kind not in ('favorites', 'hidden') or jsonb_typeof(item->'enabled') is distinct from 'boolean' then
      raise check_violation using message = 'invalid_preference';
    end if;
    select payload into saved_payload from private.report_preference_operations
      where user_id = actor and operation_id = (item->>'id')::uuid;
    if found then
      if saved_payload <> item then raise check_violation using message = 'preference_operation_mismatch'; end if;
      continue;
    end if;
    insert into private.report_preference_operations values (actor, (item->>'id')::uuid, item);
    insert into public.report_preferences(user_id, report_id, kind, enabled)
      select actor, target, preference_kind, (item->>'enabled')::boolean from public.reports where id = target
      on conflict (user_id, report_id, kind) do update set enabled = excluded.enabled, updated_at = now();
  end loop;
  select jsonb_build_object(
    'favorites', coalesce(jsonb_agg(report_id order by report_id) filter (where kind = 'favorites' and enabled), '[]'),
    'hidden', coalesce(jsonb_agg(report_id order by report_id) filter (where kind = 'hidden' and enabled), '[]')
  ) into result from public.report_preferences where user_id = actor;
  return result;
end;
$$;
revoke all on function private.sync_report_preferences(uuid, jsonb, jsonb) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.sync_report_preferences(uuid, jsonb, jsonb) to authenticated;
create function public.sync_report_preferences(target_user_id uuid, seed jsonb default '[]', operations jsonb default '[]')
returns jsonb language sql security invoker set search_path = '' as $$
  select private.sync_report_preferences(target_user_id, seed, operations);
$$;
revoke all on function public.sync_report_preferences(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.sync_report_preferences(uuid, jsonb, jsonb) to authenticated;
