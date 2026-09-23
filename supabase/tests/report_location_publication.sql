-- Run in a transaction against the migrated schema; roll back all fixtures.
insert into auth.users(id,is_anonymous,created_at) values
 ('ac230923-0000-4000-8000-000000000001',false,now()),
 ('ac230923-0000-4000-8000-000000000099',false,now());
insert into public.reports(id,user_id,title,latitude,longitude,is_published)
 values('ac230923-0000-4000-8000-000000000002','ac230923-0000-4000-8000-000000000001','GPS publication test',0,0,false);
insert into storage.objects(bucket_id,name) values('report_photos','ac230923-0000-4000-8000-000000000001/ac230923-0000-4000-8000-000000000002/photo.jpg');
select set_config('request.jwt.claim.sub','ac230923-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"ac230923-0000-4000-8000-000000000001","is_anonymous":false}',true);
set local role authenticated;
do $$
declare
 report_id uuid := 'ac230923-0000-4000-8000-000000000002';
 paths text[] := array['ac230923-0000-4000-8000-000000000001/ac230923-0000-4000-8000-000000000002/photo.jpg'];
begin
 begin
  update public.reports set is_published=true where id=report_id;
  raise exception 'direct publication bypassed GPS';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.reports(id,user_id,is_published) values('ac230923-0000-4000-8000-000000000003',auth.uid(),true);
  raise exception 'published insert bypassed GPS';
 exception when insufficient_privilege then null; end;
 begin
  perform public.publish_report(report_id,paths,1,0,now());
  raise exception 'distant report passed';
 exception when check_violation then if sqlerrm <> 'report_outside_50_mile_radius' then raise; end if; end;
 begin
  perform public.publish_report(report_id,paths,0,0,now()-interval '5 minutes');
  raise exception 'stale GPS passed';
 exception when check_violation then if sqlerrm <> 'fresh_current_location_required' then raise; end if; end;
 begin
  perform public.publish_report(report_id,paths,'NaN'::float8,0,now());
  raise exception 'invalid GPS passed';
 exception when check_violation then if sqlerrm <> 'fresh_current_location_required' then raise; end if; end;
 begin
  perform public.publish_report(report_id,array['foreign/photo.jpg'],0,0,now());
  raise exception 'foreign photo passed';
 exception when check_violation then if sqlerrm <> 'report_photo_not_ready' then raise; end if; end;
 begin
  perform public.publish_report(report_id,array[]::text[],0,0,now());
  raise exception 'no photos passed';
 exception when check_violation then if sqlerrm <> 'report_requires_one_to_three_photos' then raise; end if; end;
 if not (public.publish_report(report_id,paths,0.7,0,now())).is_published then raise exception 'nearby report not published'; end if;
 if not (public.publish_report(report_id,paths,0.7,0,now())).is_published then raise exception 'retry not idempotent'; end if;
end $$;
select set_config('request.jwt.claim.sub','ac230923-0000-4000-8000-000000000099',true);
do $$ begin
 begin
  perform public.publish_report('ac230923-0000-4000-8000-000000000002',array[]::text[],0,0,now());
  raise exception 'another owner published';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
