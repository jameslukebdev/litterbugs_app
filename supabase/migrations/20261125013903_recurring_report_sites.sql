-- PREPARED ONLY. Apply to an isolated local database for development; not hosted.
-- Occurrences retain their original report, evidence and financial identities.
alter table public.reports
  add column cleanup_site_id uuid not null default gen_random_uuid(),
  add column previous_report_id uuid references public.reports(id) on delete set null;
create index reports_cleanup_site_idx on public.reports(cleanup_site_id, created_at, id);
create index reports_previous_report_idx on public.reports(previous_report_id) where previous_report_id is not null;
-- No INSERT/UPDATE column grants: clients cannot attach arbitrary reports to a site.

create function private.reserve_site_report(source_report_id uuid, new_report_id uuid, draft jsonb)
returns public.reports language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  source public.reports%rowtype;
  reserved public.reports%rowtype;
  current_id uuid;
  litter jsonb;
  presets jsonb;
begin
  if actor is null or not coalesce(public.is_permanent_user(), false) then
    raise insufficient_privilege using message = 'permanent_account_required';
  end if;
  select * into source from public.reports where id = source_report_id
    and is_published and not is_sample and moderated_at is null and cancelled_at is null
    and cleanup_state = 'completed' and nullif(trim(title), '') is not null;
  if not found then raise check_violation using message = 'completed_report_required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(source.cleanup_site_id::text, 0));
  select * into reserved from public.reports where id = new_report_id;
  if found then
    if reserved.user_id is distinct from actor or reserved.previous_report_id is distinct from source.id then
      raise insufficient_privilege using message = 'report_unavailable';
    end if;
    return reserved;
  end if;
  select id into current_id from public.reports where cleanup_site_id = source.cleanup_site_id
    and is_published and moderated_at is null and cancelled_at is null and expired_at is null
    and cleanup_state <> 'completed' and (cleanup_state <> 'available' or expires_at is null or expires_at > now())
    order by created_at desc, id desc limit 1;
  if current_id is not null then
    raise unique_violation using message = 'site_already_reported', detail = current_id::text;
  end if;
  if draft is null or jsonb_typeof(draft) <> 'object' then
    raise check_violation using message = 'invalid_report_details';
  end if;
  -- The ordinary web/mobile draft serializes unused choices as JSON null.
  litter := coalesce(nullif(draft->'litter_types','null'::jsonb),'[]'::jsonb);
  presets := coalesce(nullif(draft->'notes_presets','null'::jsonb),'[]'::jsonb);
  if jsonb_typeof(litter) <> 'array' or jsonb_typeof(presets) <> 'array' then
    raise check_violation using message = 'invalid_report_details';
  end if;
  if length(coalesce(draft->>'title','')) > 80 or length(coalesce(draft->>'notes_other','')) > 500
    or coalesce(draft->>'severity','') not in ('Low','Medium','High')
    or (jsonb_array_length(litter) = 0 and nullif(trim(draft->>'types'),'') is null) then
    raise check_violation using message = 'invalid_report_details';
  end if;
  insert into public.reports(id,user_id,title,latitude,longitude,litter_types,types,severity,notes_presets,notes_other,is_published,photo_paths,cleanup_site_id,previous_report_id)
  values (new_report_id,actor,coalesce(nullif(trim(draft->>'title'),''),source.title),source.latitude,source.longitude,
    array(select jsonb_array_elements_text(litter)),nullif(trim(draft->>'types'),''),draft->>'severity',
    array(select jsonb_array_elements_text(presets)),nullif(trim(draft->>'notes_other'),''),false,'{}',source.cleanup_site_id,source.id)
  returning * into reserved;
  return reserved;
end;
$$;
revoke all on function private.reserve_site_report(uuid,uuid,jsonb) from public, anon;
grant execute on function private.reserve_site_report(uuid,uuid,jsonb) to authenticated;
create function public.reserve_site_report(source_report_id uuid,new_report_id uuid,draft jsonb)
returns public.reports language sql security invoker set search_path = '' as $$
  select private.reserve_site_report(source_report_id,new_report_id,draft);
$$;
revoke all on function public.reserve_site_report(uuid,uuid,jsonb) from public, anon;
grant execute on function public.reserve_site_report(uuid,uuid,jsonb) to authenticated;

-- The ordinary publish_report RPC still performs ownership, photos, fresh GPS,
-- expiry, safety, report credit and funding-review work. Lock the site at its
-- publication boundary too, including when two reserved drafts race to publish.
create function private.guard_site_report_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
declare current_id uuid;
begin
  if new.previous_report_id is null then return new; end if;
  if tg_op = 'UPDATE' and old.is_published then return new; end if;
  if not new.is_published then return new; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.cleanup_site_id::text,0));
  if not exists(select 1 from public.reports where id = new.previous_report_id
      and cleanup_site_id = new.cleanup_site_id and cleanup_state = 'completed'
      and is_published and moderated_at is null and cancelled_at is null and not is_sample
      and latitude is not distinct from new.latitude and longitude is not distinct from new.longitude
      and nullif(trim(title),'') is not null) then
    raise check_violation using message = 'completed_report_required';
  end if;
  select id into current_id from public.reports where cleanup_site_id = new.cleanup_site_id and id <> new.id
    and is_published and moderated_at is null and cancelled_at is null and expired_at is null
    and cleanup_state <> 'completed' and (cleanup_state <> 'available' or expires_at is null or expires_at > now())
    order by created_at desc,id desc limit 1;
  if current_id is not null then
    raise unique_violation using message = 'site_already_reported', detail = current_id::text;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_site_report_publication() from public, anon, authenticated;
create trigger reports_guard_site_publication before insert or update of is_published on public.reports
  for each row execute function private.guard_site_report_publication();

-- Public projection uses the same anonymous RLS as report pages. No draft,
-- moderation queue, donor account or private profile data is exposed here.
create function public.report_site_history(target_report_id uuid)
returns table(report_id uuid,cleanup_site_id uuid) language sql stable security invoker set search_path = '' as $$
  select r.id,r.cleanup_site_id from public.reports r join public.reports source on source.id = target_report_id
  where r.cleanup_site_id = source.cleanup_site_id and source.is_published and not source.is_sample
    and source.moderated_at is null and nullif(trim(source.title),'') is not null
    and (source.cancelled_at is null or (source.expired_at is not null and source.renewal_status = 'closed'))
    and r.is_published and not r.is_sample and r.moderated_at is null and nullif(trim(r.title),'') is not null
    and (r.cancelled_at is null or (r.expired_at is not null and r.renewal_status = 'closed'))
  order by r.created_at,r.id;
$$;
revoke all on function public.report_site_history(uuid) from public;
grant execute on function public.report_site_history(uuid) to anon, authenticated;

create function public.cleanup_site_reports(target_site_id uuid)
returns table(report_id uuid,cleanup_site_id uuid) language sql stable security invoker set search_path = '' as $$
  select r.id,r.cleanup_site_id from public.reports r
  where r.cleanup_site_id = target_site_id and r.is_published and not r.is_sample
    and r.moderated_at is null and nullif(trim(r.title),'') is not null
    and (r.cancelled_at is null or (r.expired_at is not null and r.renewal_status = 'closed'))
  order by r.created_at,r.id;
$$;
revoke all on function public.cleanup_site_reports(uuid) from public;
grant execute on function public.cleanup_site_reports(uuid) to anon,authenticated;

-- Group BEFORE pagination. Completed work stays in the cleanup directory even
-- when that location has another open occurrence. Only IDs/counts already
-- visible under caller RLS leave this projection; no donor or draft identities.
create function public.cleanup_site_directory(feed_kind text,page_size integer default 12,page_offset integer default 0)
returns table(cleanup_site_id uuid,report_id uuid,current_report_id uuid,completed_count integer,report_count integer,last_activity_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  with visible as materialized (
    select r.id,r.cleanup_site_id,r.created_at,r.cleanup_state,
      (r.cancelled_at is null and r.expired_at is null
        and r.cleanup_state in ('available','claimed','completion_submitted','changes_requested')
        and (r.cleanup_state <> 'available' or r.expires_at is null or r.expires_at > now())) as is_current,
      (select max(a.completed_at) from public.cleanup_attempts a
        where a.report_id=r.id and a.status='completed' and a.final_submission_id is not null) as completed_at
    from public.reports r
    where r.is_published and not r.is_sample and r.moderated_at is null
      and nullif(trim(r.title),'') is not null
      and (r.cancelled_at is null or (r.expired_at is not null and r.renewal_status='closed'))
  ), grouped as (
    select v.cleanup_site_id,
      (array_agg(v.id order by v.created_at desc nulls last,v.id desc))[1] as latest_report,
      (array_agg(v.id order by v.created_at desc nulls last,v.id desc) filter(where v.is_current))[1] as current_report,
      (array_agg(v.id order by coalesce(v.completed_at,v.created_at) desc nulls last,v.id desc)
        filter(where v.cleanup_state='completed'))[1] as last_cleanup,
      count(*) filter(where v.cleanup_state='completed')::integer as completions,
      count(*)::integer as occurrences,
      greatest(max(v.created_at),max(v.completed_at)) as activity_at,
      max(coalesce(v.completed_at,v.created_at)) filter(where v.cleanup_state='completed') as last_cleanup_at,
      max(v.created_at) filter(where v.is_current) as current_at
    from visible v group by v.cleanup_site_id
  )
  select g.cleanup_site_id,
    case feed_kind when 'completed' then g.last_cleanup when 'open' then g.current_report else g.latest_report end,
    g.current_report,g.completions,g.occurrences,g.activity_at
  from grouped g
  where (feed_kind='completed' and g.last_cleanup is not null)
    or (feed_kind='open' and g.current_report is not null)
    or (feed_kind='all' and g.occurrences>1)
  order by case feed_kind when 'completed' then g.last_cleanup_at when 'open' then g.current_at else g.activity_at end desc nulls last,g.cleanup_site_id
  limit greatest(1,least(coalesce(page_size,12),500)) offset greatest(0,coalesce(page_offset,0));
$$;
revoke all on function public.cleanup_site_directory(text,integer,integer) from public;
grant execute on function public.cleanup_site_directory(text,integer,integer) to anon,authenticated;
