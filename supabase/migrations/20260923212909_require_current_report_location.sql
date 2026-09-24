-- Add the GPS-checked publication RPC before releasing compatible clients.
-- No user GPS is stored. Close the legacy direct-write path using the separate
-- enforcement rollout once the new mobile build is distributed.

create or replace function private.publish_report(
  target_report_id uuid, target_photo_paths text[], current_latitude double precision,
  current_longitude double precision, location_captured_at timestamptz
)
returns public.reports language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  report_record public.reports%rowtype;
  haversine double precision;
begin
  if actor_id is null or not coalesce(public.is_permanent_user(), false) then
    raise insufficient_privilege using message = 'permanent_account_required';
  end if;
  select * into report_record from public.reports
    where id = target_report_id and user_id = actor_id and moderated_at is null for update;
  if not found then raise insufficient_privilege using message = 'report_unavailable'; end if;
  -- Resolve a lost response without publishing or awarding report credit twice.
  if report_record.is_published then return report_record; end if;
  if report_record.cleanup_state <> 'available' or report_record.expired_at is not null
    or report_record.cancelled_at is not null then
    raise check_violation using message = 'report_unavailable';
  end if;
  if current_latitude is null or not (current_latitude between -90 and 90)
    or current_longitude is null or not (current_longitude between -180 and 180)
    or report_record.latitude is null or not (report_record.latitude between -90 and 90)
    or report_record.longitude is null or not (report_record.longitude between -180 and 180)
    or location_captured_at is null
    or location_captured_at < clock_timestamp() - interval '2 minutes'
    or location_captured_at > clock_timestamp() + interval '30 seconds' then
    raise check_violation using message = 'fresh_current_location_required';
  end if;
  haversine := sin(radians(report_record.latitude - current_latitude) / 2)^2
    + cos(radians(current_latitude)) * cos(radians(report_record.latitude))
    * sin(radians(report_record.longitude - current_longitude) / 2)^2;
  if 3958.8 * 2 * asin(sqrt(least(1, greatest(0, haversine)))) > 50 then
    raise check_violation using message = 'report_outside_50_mile_radius';
  end if;
  if coalesce(cardinality(target_photo_paths), 0) not between 1 and 3 then
    raise check_violation using message = 'report_requires_one_to_three_photos';
  end if;
  if exists (select 1 from unnest(target_photo_paths) p where p is null
    or p not like actor_id::text || '/' || target_report_id::text || '/%'
    or not exists (select 1 from storage.objects o where o.bucket_id = 'report_photos' and o.name = p)) then
    raise check_violation using message = 'report_photo_not_ready';
  end if;
  update public.reports set photo_paths = target_photo_paths, is_published = true
    where id = target_report_id returning * into report_record;
  return report_record;
end;
$$;
revoke all on function private.publish_report(uuid,text[],double precision,double precision,timestamptz) from public, anon;
grant execute on function private.publish_report(uuid,text[],double precision,double precision,timestamptz) to authenticated;

create or replace function public.publish_report(
  target_report_id uuid, target_photo_paths text[], current_latitude double precision,
  current_longitude double precision, location_captured_at timestamptz
)
returns public.reports language sql security invoker set search_path = '' as $$
  select private.publish_report(target_report_id,target_photo_paths,current_latitude,current_longitude,location_captured_at);
$$;
revoke all on function public.publish_report(uuid,text[],double precision,double precision,timestamptz) from public, anon;
grant execute on function public.publish_report(uuid,text[],double precision,double precision,timestamptz) to authenticated;
