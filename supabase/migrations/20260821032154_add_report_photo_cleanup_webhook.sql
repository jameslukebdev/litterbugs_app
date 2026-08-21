-- Queue photo removal after a report row is deleted. The HTTP request is
-- asynchronous, so mobile/web delete results are unchanged.
create extension if not exists pg_net;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.report_photo_cleanup_config (
  singleton boolean primary key default true check (singleton),
  webhook_secret text not null
);

alter table private.report_photo_cleanup_config enable row level security;

revoke all on table private.report_photo_cleanup_config
  from public, anon, authenticated;

insert into private.report_photo_cleanup_config (singleton, webhook_secret)
values (true, encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (singleton) do nothing;

create or replace function public.verify_report_photo_cleanup_webhook(
  candidate_secret text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.report_photo_cleanup_config
    where singleton = true
      and webhook_secret = candidate_secret
  );
$$;

revoke all on function public.verify_report_photo_cleanup_webhook(text)
  from public, anon, authenticated;
grant execute on function public.verify_report_photo_cleanup_webhook(text)
  to service_role;

create or replace function private.queue_report_photo_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleanup_secret text;
begin
  if old.user_id is null
    or old.photo_paths is null
    or cardinality(old.photo_paths) = 0 then
    return old;
  end if;

  select webhook_secret
  into cleanup_secret
  from private.report_photo_cleanup_config
  where singleton = true;

  perform net.http_post(
    url := 'https://mvaygkflcjswtwchflrk.supabase.co/functions/v1/cleanup-report-photos',
    body := jsonb_build_object(
      'type', 'DELETE',
      'table', 'reports',
      'schema', 'public',
      'record', null,
      'old_record', jsonb_build_object(
        'id', old.id,
        'user_id', old.user_id,
        'photo_paths', old.photo_paths
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-report-cleanup-secret', cleanup_secret
    ),
    timeout_milliseconds := 2000
  );

  return old;
end;
$$;

revoke all on function private.queue_report_photo_cleanup()
  from public, anon, authenticated;

drop trigger if exists reports_queue_photo_cleanup on public.reports;
create trigger reports_queue_photo_cleanup
  after delete on public.reports
  for each row
  execute function private.queue_report_photo_cleanup();
