drop index if exists public.cleanup_waiver_acceptances_version_idx;
create index cleanup_waiver_acceptances_version_idx
  on public.cleanup_waiver_acceptances (
    waiver_version,
    guidelines_version
  );

drop index if exists public.cleanup_attempts_waiver_version_idx;
