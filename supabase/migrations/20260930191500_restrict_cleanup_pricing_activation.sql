-- Supabase default privileges grant service_role all table privileges. Remove
-- those inherited defaults so Edge Functions can read, but cannot switch, fees.
revoke all on public.cleanup_pricing_config from service_role;
grant select on public.cleanup_pricing_config to service_role;
