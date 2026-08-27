alter table public.cleanup_ai_checks
  add column provider_attempts smallint not null default 0,
  add column last_provider_error text;

alter table public.cleanup_ai_checks
  add constraint cleanup_ai_checks_provider_attempts_check
  check (provider_attempts between 0 and 3),
  add constraint cleanup_ai_checks_provider_error_check
  check (
    last_provider_error is null
    or char_length(last_provider_error) between 1 and 500
  );

comment on column public.cleanup_ai_checks.provider_attempts is
  'Bounded count of Gemini provider calls for this immutable review check.';

comment on column public.cleanup_ai_checks.last_provider_error is
  'Most recent bounded provider error for operations troubleshooting; never exposed to clients.';
