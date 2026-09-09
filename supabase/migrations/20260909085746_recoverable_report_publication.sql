-- Existing clients retain their behavior. New clients reserve an owner-only
-- report before uploading evidence, then publish it atomically with photo paths.
alter table public.reports add column is_published boolean not null default true;
grant insert (id, is_published), update (is_published, latitude, longitude) on public.reports to authenticated;
create policy "Unpublished reports are owner only" on public.reports
  as restrictive for select to public
  using (is_published or user_id = (select auth.uid()));

create or replace function private.validate_report_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if old.is_published and (new.latitude is distinct from old.latitude or new.longitude is distinct from old.longitude) then
      raise check_violation using message = 'published_report_location_locked';
    end if;
    if old.is_published and not new.is_published then
      raise check_violation using message = 'published_report_cannot_be_unpublished';
    end if;
    if not old.is_published and new.is_published then
      if coalesce(cardinality(new.photo_paths), 0) = 0 then
        raise check_violation using message = 'report_photo_required';
      end if;
      if exists (
        select 1 from unnest(new.photo_paths) p
        where p not like new.user_id::text || '/' || new.id::text || '/%'
          or not exists (select 1 from storage.objects o where o.bucket_id = 'report_photos' and o.name = p)
      ) then
        raise check_violation using message = 'report_photo_not_ready';
      end if;
      new.created_at := now();
      new.expires_at := now() + interval '30 days';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_report_publication() from public, anon, authenticated;
create trigger reports_validate_publication before update on public.reports
  for each row execute function private.validate_report_publication();

create or replace function private.increment_profile_report_count()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null and new.is_published then
    update public.profiles set reports_created_count = reports_created_count + 1 where id = new.user_id;
  end if;
  return new;
end;
$$;
create trigger reports_count_on_publication after update of is_published on public.reports
  for each row when (not old.is_published and new.is_published)
  execute function private.increment_profile_report_count();
