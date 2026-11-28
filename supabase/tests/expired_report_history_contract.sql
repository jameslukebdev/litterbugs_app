-- Run against an EMPTY disposable PostgreSQL database only, never a linked project.
-- Minimal lifecycle/storage contract: tests the real migration without changing live data.
\set ON_ERROR_STOP on
begin;
create role anon;
create role authenticated;
create role service_role;
create schema private;
create schema storage;
create table public.reports (
 id uuid primary key, title text, cleanup_state text default 'available',
 is_published boolean default true, is_sample boolean default false, moderated_at timestamptz,
 photo_paths text[], expires_at timestamptz, expired_at timestamptz, cancelled_at timestamptz,
 renewal_status text default 'active', renewal_decision_due_at timestamptz, funded_amount_cents bigint default 0
);
alter table public.reports add constraint reports_lifecycle_terminal_check check (
 not (expired_at is not null and cancelled_at is not null)
 and (cleanup_state <> 'completed' or (expired_at is null and cancelled_at is null))
);
create table public.cleanup_contributions (
 report_id uuid, status text, cleanup_attempt_id uuid, principal_amount_cents bigint,
 refund_requested_at timestamptz, updated_at timestamptz
);
create table public.cleanup_financial_audit (
 actor_id uuid, actor_kind text, action text, report_id uuid, created_at timestamptz default now()
);
create table storage.objects (name text, bucket_id text);
alter table public.reports enable row level security;
create policy visible_reports on public.reports for select to anon using (is_published and not is_sample and moderated_at is null);
alter table storage.objects enable row level security;
create policy "Published report photos are readable" on storage.objects for select to anon using (false);
grant usage on schema public, storage to anon;
grant select on public.reports, storage.objects to anon;
insert into public.reports (id,title,photo_paths,expires_at,cancelled_at,renewal_status)
values ('00000000-0000-4000-8000-000000000008','Verified old expiry',array['photo-8'],now()-interval '40 days',now()-interval '3 days','closed'),
('00000000-0000-4000-8000-000000000009','Withdrawn after prior expiry',array['photo-9'],now()-interval '40 days',now()-interval '2 days','closed');
insert into public.cleanup_financial_audit (report_id,action,actor_kind,created_at)
values ('00000000-0000-4000-8000-000000000008','expired_report_closed','system',now()-interval '3 days'),
('00000000-0000-4000-8000-000000000009','expired_report_closed','system',now()-interval '4 days');
insert into storage.objects values ('photo-8','report_photos'),('photo-9','report_photos');
\ir ../migrations/20261103125813_retain_expired_public_report_history.sql
insert into public.reports (id,title,photo_paths,expires_at,expired_at,renewal_status)
select ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid, 'Report ' || n,
 array['photo-' || n], now() - interval '30 days', now() - interval '30 days', 'decision_required'
from generate_series(1,7) n;
update public.reports set expired_at=null, expires_at=now()+interval '30 days', renewal_status='active' where title='Report 1';
update public.reports set cancelled_at=now(), expired_at=null, renewal_status='closed' where title='Report 4';
update public.reports set is_published=false where title='Report 5';
update public.reports set is_sample=true where title='Report 6';
update public.reports set moderated_at=now() where title='Report 7';
insert into storage.objects select 'photo-' || n, 'report_photos' from generate_series(1,7) n;
insert into storage.objects values ('unattached-photo','report_photos'),('photo-2','another_bucket');
insert into public.cleanup_contributions values ('00000000-0000-4000-8000-000000000003','succeeded',null,1200,null,null);
select private.close_expired_report('00000000-0000-4000-8000-000000000003', now(), null, 'system');
do $$ begin
 if not exists(select 1 from public.reports where title='Report 3' and expired_at is not null and cancelled_at is not null and renewal_status='closed' and funded_amount_cents=0) then raise exception 'Expiry closure lost provenance'; end if;
 if not exists(select 1 from public.cleanup_contributions where status='refund_pending' and refund_requested_at is not null) then raise exception 'Refund behavior changed'; end if;
 if not exists(select 1 from public.cleanup_financial_audit where action='expired_report_closed') then raise exception 'Missing closure audit'; end if;
 begin
  update public.reports set cleanup_state='completed' where title='Report 3';
  raise exception 'Completed cleanup accepted expired/cancelled markers';
 exception when check_violation then null;
 end;
end $$;
set local role anon;
do $$ declare names text[]; begin
 select array_agg(name order by name) into names from storage.objects;
 if names is distinct from array['photo-1','photo-2','photo-3','photo-8'] then raise exception 'Unexpected public photo access: %',names; end if;
end $$;
reset role;
-- Later removal must still revoke historical photo access.
update public.reports set is_published=false where title='Report 2';
delete from public.reports where title='Report 3';
set local role anon;
do $$ begin
 if (select count(*) from storage.objects) <> 2 then raise exception 'Withdrawal/deletion did not revoke historical photos'; end if;
end $$;
reset role;
rollback;
