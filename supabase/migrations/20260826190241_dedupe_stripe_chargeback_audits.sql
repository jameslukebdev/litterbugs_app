-- A webhook can be delivered concurrently before the processed-event row is
-- visible to the second worker. Preserve the first audit entry from any such
-- historical race before enforcing provider-event uniqueness.
delete from public.cleanup_financial_audit newer
using public.cleanup_financial_audit older
where newer.actor_kind = 'stripe'
  and older.actor_kind = 'stripe'
  and newer.metadata ? 'stripe_event_id'
  and older.metadata ? 'stripe_event_id'
  and newer.metadata ->> 'stripe_event_id' = older.metadata ->> 'stripe_event_id'
  and newer.id > older.id;

create unique index cleanup_financial_audit_stripe_event_id_key
  on public.cleanup_financial_audit ((metadata ->> 'stripe_event_id'))
  where actor_kind = 'stripe' and metadata ? 'stripe_event_id';

create or replace function public.record_stripe_chargeback_event(
  target_event_id text,
  target_dispute_id text,
  target_charge_id text,
  target_amount_cents bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(target_event_id), '') is null
    or nullif(btrim(target_dispute_id), '') is null
    or nullif(btrim(target_charge_id), '') is null
    or target_amount_cents is null
    or target_amount_cents < 0 then
    raise check_violation using message = 'stripe_chargeback_event_invalid';
  end if;

  insert into public.cleanup_financial_audit (
    actor_kind,
    action,
    metadata
  ) values (
    'stripe',
    'chargeback_absorbed_by_platform',
    jsonb_build_object(
      'stripe_event_id', target_event_id,
      'dispute_id', target_dispute_id,
      'charge_id', target_charge_id,
      'amount', target_amount_cents
    )
  ) on conflict do nothing;
end;
$$;

revoke all on function public.record_stripe_chargeback_event(text, text, text, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.record_stripe_chargeback_event(text, text, text, bigint)
  to service_role;
