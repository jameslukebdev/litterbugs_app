-- Scheduled-job run history (cron.job_run_details) is never cleared by pg_cron. With jobs running every
-- minute it reached 242,000 rows (42 MB) by November 2026. Keep one week, cleared daily.
select cron.unschedule(jobid) from cron.job where jobname = 'litterbugs-cron-history-purge';
select cron.schedule(
  'litterbugs-cron-history-purge',
  '23 4 * * *',
  $$delete from cron.job_run_details where start_time < now() - interval '7 days'$$
);
