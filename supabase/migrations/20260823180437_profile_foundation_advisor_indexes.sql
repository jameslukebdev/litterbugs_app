-- Cover moderation foreign keys identified by the hosted database performance advisor.
create index if not exists user_moderation_reports_reporter_id_idx
  on public.user_moderation_reports (reporter_id);

create index if not exists user_moderation_reports_source_report_id_idx
  on public.user_moderation_reports (source_report_id)
  where source_report_id is not null;
