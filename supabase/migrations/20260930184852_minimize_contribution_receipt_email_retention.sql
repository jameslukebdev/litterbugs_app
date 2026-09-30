-- Receipt email is needed only while an interrupted Stripe create can be retried.
-- Remove it once the PaymentIntent is attached or the contributor is deleted.
create or replace function public.protect_cleanup_contribution_pricing() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.stripe_payment_intent_id is not null or new.contributor_id is null then
    new.stripe_receipt_email := null;
  end if;
  if (new.principal_amount_cents, new.platform_fee_cents, new.total_amount_cents, new.pricing_version,
      new.report_id, new.client_request_id)
    is distinct from
     (old.principal_amount_cents, old.platform_fee_cents, old.total_amount_cents, old.pricing_version,
      old.report_id, old.client_request_id)
    or (new.stripe_receipt_email is distinct from old.stripe_receipt_email
      and not (new.stripe_receipt_email is null and (new.stripe_payment_intent_id is not null or new.contributor_id is null))) then
    raise check_violation using message = 'cleanup_contribution_pricing_immutable';
  end if;
  return new;
end;
$$;
update public.cleanup_contributions set stripe_receipt_email = null
where stripe_receipt_email is not null and (stripe_payment_intent_id is not null or contributor_id is null);
