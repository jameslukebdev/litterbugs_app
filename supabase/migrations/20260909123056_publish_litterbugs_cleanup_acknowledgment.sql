begin;
-- Publish a new document; accepted historical versions and acceptance rows are immutable.
do $$
declare previous public.cleanup_waiver_versions%rowtype;
begin
  select * into strict previous from public.cleanup_waiver_versions
    where is_active and retired_at is null for update;
  update public.cleanup_waiver_versions set is_active = false, retired_at = now()
    where waiver_version = previous.waiver_version;
  insert into public.cleanup_waiver_versions
    (waiver_version, guidelines_version, title, body, guidelines_body, release_body, is_active, published_at)
  values ('cleanup-acknowledgment-2026-09-09', previous.guidelines_version, previous.title,
    replace(previous.body, 'Litterbugs or Burrow Base LLC', 'Litterbugs'),
    previous.guidelines_body,
    replace(previous.release_body, 'Burrow Base LLC, Litterbugs, and their', 'Litterbugs and its'),
    true, now());
  if exists (select 1 from public.cleanup_waiver_versions where is_active and
      concat_ws(' ', body, guidelines_body, release_body) ilike '%Burrow Base%') then
    raise exception 'New active document still contains the retired display name';
  end if;
end $$;
commit;
