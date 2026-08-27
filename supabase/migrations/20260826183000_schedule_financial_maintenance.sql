create or replace function private.invoke_financial_maintenance()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  function_url text;
  maintenance_secret text;
begin
  select decrypted_secret
  into function_url
  from vault.decrypted_secrets
  where name = 'litterbugs_financial_maintenance_url';

  select decrypted_secret
  into maintenance_secret
  from vault.decrypted_secrets
  where name = 'litterbugs_financial_maintenance_secret';

  if function_url is null or maintenance_secret is null then
    raise warning 'Financial maintenance Vault configuration is missing.';
    return null;
  end if;

  return net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-financial-maintenance-secret', maintenance_secret
    ),
    body := jsonb_build_object(
      'source', 'pg_cron',
      'scheduled_at', now()
    ),
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function private.invoke_financial_maintenance()
  from public, anon, authenticated, service_role;

do $$
declare
  existing_job record;
begin
  if to_regclass('cron.job') is null then
    return;
  end if;

  for existing_job in
    select jobid
    from cron.job
    where jobname = 'litterbugs-financial-maintenance'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'litterbugs-financial-maintenance',
    '* * * * *',
    'select private.invoke_financial_maintenance();'
  );
end;
$$;
