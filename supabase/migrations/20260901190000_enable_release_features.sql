-- Enable the production release-candidate integrations after the native and
-- backend release-readiness checks completed on 2026-09-01.
update public.cleanup_feature_flags
set
  enabled = true,
  updated_at = now()
where name in ('gemini_financial_review_enabled', 'payments_enabled');
