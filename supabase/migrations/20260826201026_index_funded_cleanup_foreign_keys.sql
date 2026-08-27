create index if not exists cleanup_admin_actions_admin_id_idx
  on public.cleanup_admin_actions (admin_id);

create index if not exists cleanup_admin_actions_case_id_idx
  on public.cleanup_admin_actions (case_id);

create index if not exists cleanup_admin_cases_assigned_to_idx
  on public.cleanup_admin_cases (assigned_to);

create index if not exists cleanup_admin_cases_resolved_by_idx
  on public.cleanup_admin_cases (resolved_by);

create index if not exists cleanup_ai_checks_cleanup_attempt_id_idx
  on public.cleanup_ai_checks (cleanup_attempt_id);

create index if not exists cleanup_ai_checks_report_id_idx
  on public.cleanup_ai_checks (report_id);

create index if not exists cleanup_ai_checks_submission_id_idx
  on public.cleanup_ai_checks (submission_id);
