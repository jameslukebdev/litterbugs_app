-- Apply only after compatible mobile clients are distributed and the matching
-- website is promoted. Old clients will reject NEW checkouts after this switch.
-- Keep version-aware Edge Functions deployed for old-payment recovery/refunds.
-- This changes future reservations only; stored contribution amounts are immutable.
begin;
update public.cleanup_pricing_config
set pricing_version = 2
where id;
do $$
begin
  assert (select pricing_version = 2 from public.cleanup_pricing_config where id),
    'Combined service fee activation failed';
end;
$$;
select pricing_version from public.cleanup_pricing_config where id;
commit;
