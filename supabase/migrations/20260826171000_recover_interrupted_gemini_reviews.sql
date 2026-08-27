alter table public.cleanup_ai_checks
  add column provider_started_at timestamptz;

create index cleanup_ai_checks_stale_provider_idx
  on public.cleanup_ai_checks (provider_started_at)
  where status = 'running';

comment on column public.cleanup_ai_checks.provider_started_at is
  'Start time of the current Gemini provider call, used to recover interrupted Edge workers.';
