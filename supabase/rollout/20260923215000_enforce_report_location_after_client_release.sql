-- Apply after compatible mobile clients have been distributed. The September 16
-- build writes is_published directly and cannot publish after this switch.
begin;
alter table public.reports alter column is_published set default false;
revoke update (is_published) on public.reports from authenticated;
create policy "Reports start as unpublished drafts" on public.reports
  as restrictive for insert to authenticated with check (not is_published);
commit;
