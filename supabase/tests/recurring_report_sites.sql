\set ON_ERROR_STOP on
set role authenticated;
set request.jwt.claim.sub='20000000-0000-4000-8000-000000000003';
-- New submitter, exact old location, clean financial state, idempotent reservation.
select public.reserve_site_report('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','{"title":"Litter again","severity":"Medium","litter_types":["Bottles"],"notes_presets":[]}');
select public.reserve_site_report('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','{"title":"Litter again","severity":"Medium","litter_types":["Bottles"],"notes_presets":[]}');
do $$begin
 if not exists(select 1 from public.reports where id='10000000-0000-4000-8000-000000000002' and user_id=auth.uid() and not is_published and funded_amount_cents=0 and funding_eligibility='pending' and latitude=36.2185 and longitude=-81.655 and previous_report_id='10000000-0000-4000-8000-000000000001') then raise exception 'reservation identity failed'; end if;
 begin
  perform public.publish_report('10000000-0000-4000-8000-000000000002',array['wrong/photo.jpg'],36.2185,-81.655,clock_timestamp());
  raise exception 'bad photos accepted';
 exception when check_violation then null; end;
 begin
  update public.reports set cleanup_site_id=gen_random_uuid() where id='10000000-0000-4000-8000-000000000002';
  raise exception 'client site reassignment accepted';
 exception when insufficient_privilege then null; end;
end$$;
set request.jwt.claim.sub='20000000-0000-4000-8000-000000000004';
select public.reserve_site_report('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','{"severity":"High","litter_types":["Cans"]}');
-- Cannot recover somebody else's draft or use an active report as a cleaned source.
do $$begin
 begin
  perform public.reserve_site_report('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','{}');
  raise exception 'other owner draft accepted';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
insert into storage.objects values('report_photos','20000000-0000-4000-8000-000000000003/10000000-0000-4000-8000-000000000002/new.jpg'),('report_photos','20000000-0000-4000-8000-000000000004/10000000-0000-4000-8000-000000000003/new.jpg');
set role authenticated;
set request.jwt.claim.sub='20000000-0000-4000-8000-000000000003';
select public.publish_report('10000000-0000-4000-8000-000000000002',array['20000000-0000-4000-8000-000000000003/10000000-0000-4000-8000-000000000002/new.jpg'],36.2185,-81.655,clock_timestamp());
-- A lost response returns the same publication, even on repeated calls.
select public.publish_report('10000000-0000-4000-8000-000000000002','{}',null,null,null);
set request.jwt.claim.sub='20000000-0000-4000-8000-000000000004';
do $$begin
 begin
  perform public.publish_report('10000000-0000-4000-8000-000000000003',array['20000000-0000-4000-8000-000000000004/10000000-0000-4000-8000-000000000003/new.jpg'],36.2185,-81.655,clock_timestamp());
  raise exception 'duplicate publication accepted';
 exception when unique_violation then if sqlerrm <> 'site_already_reported' then raise; end if; end;
 begin
  perform public.reserve_site_report('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','{"severity":"Low","litter_types":["Cans"]}');
  raise exception 'duplicate reservation accepted';
 exception when unique_violation then if sqlerrm <> 'site_already_reported' then raise; end if; end;
end$$;
set request.jwt.claim.anonymous='true';
do $$begin
 begin
  perform public.reserve_site_report('10000000-0000-4000-8000-000000000001',gen_random_uuid(),'{}');
  raise exception 'guest write accepted';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
set role anon;
do $$begin
 if (select count(*) from public.report_site_history('10000000-0000-4000-8000-000000000001')) <> 2 then raise exception 'public history wrong or draft leaked'; end if;
 begin
  perform public.reserve_site_report('10000000-0000-4000-8000-000000000001',gen_random_uuid(),'{}');
  raise exception 'anonymous reservation accepted';
 exception when insufficient_privilege then null; end;
end$$;
reset role;
do $$begin
 if (select funded_amount_cents from public.reports where id='10000000-0000-4000-8000-000000000001')<>3500
 or (select count(*) from public.cleanup_contributions)<>1 or (select count(*) from public.reporter_rewards)<>1
 or (select count(*) from public.cleanup_attempts)<>1 then raise exception 'prior money or credit changed'; end if;
 if (select user_id from public.reports where id='10000000-0000-4000-8000-000000000001')<>'20000000-0000-4000-8000-000000000001' then raise exception 'old reporter changed'; end if;
end$$;
-- Both directories show one location, preserving the old cleanup when litter recurs.
set role anon;
do $$declare location uuid;begin
 select cleanup_site_id into location from public.reports where id='10000000-0000-4000-8000-000000000001';
 if (select count(*) from public.cleanup_site_directory('completed',1,0))<>1 then raise exception 'completed directory grouping failed'; end if;
 if not exists(select 1 from public.cleanup_site_directory('completed',1,0) where report_id='10000000-0000-4000-8000-000000000001' and current_report_id='10000000-0000-4000-8000-000000000002' and completed_count=1 and report_count=2) then raise exception 'completed site lost history/current condition'; end if;
 if not exists(select 1 from public.cleanup_site_directory('open',1,0) where report_id='10000000-0000-4000-8000-000000000002' and cleanup_site_id=location) then raise exception 'open directory wrong identity'; end if;
 if exists(select 1 from public.cleanup_site_directory('completed',1,1)) then raise exception 'pagination duplicated location'; end if;
 if (select count(*) from public.cleanup_site_reports(location))<>2 then raise exception 'site overview leaked draft'; end if;
end$$;
reset role;
-- A removed source or child must not be revived through the history projection.
update public.reports set moderated_at=now() where id='10000000-0000-4000-8000-000000000002';
set role anon;
do $$begin
 if (select count(*) from public.report_site_history('10000000-0000-4000-8000-000000000001'))<>1 then raise exception 'moderated child leaked'; end if;
 if exists(select 1 from public.report_site_history('10000000-0000-4000-8000-000000000002')) then raise exception 'moderated source leaked'; end if;
end$$;
reset role;
