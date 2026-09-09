-- Execute with the migration inside ONE transaction; caller must ROLLBACK.
insert into auth.users(id, is_anonymous, created_at) values ('aa090909-0000-4000-8000-000000000001', false, now());
insert into public.reports(id,user_id,title,is_published) values ('aa090909-0000-4000-8000-000000000002','aa090909-0000-4000-8000-000000000001','Rollback-only publication test',false);
do $$ begin
 if (select reports_created_count from public.profiles where id='aa090909-0000-4000-8000-000000000001') <> 0 then raise exception 'draft incremented count'; end if;
end $$;
set local role anon;
do $$ begin
 if exists(select 1 from public.reports where id='aa090909-0000-4000-8000-000000000002') then raise exception 'draft public'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aa090909-0000-4000-8000-000000000001","is_anonymous":false}',true);
select set_config('request.jwt.claim.sub','aa090909-0000-4000-8000-000000000001',true);
insert into public.reports(id,user_id,title,is_published)
values ('aa090909-0000-4000-8000-000000000003','aa090909-0000-4000-8000-000000000001','Second draft',false)
on conflict(id) do nothing;
insert into public.reports(id,user_id,title,is_published)
values ('aa090909-0000-4000-8000-000000000003','aa090909-0000-4000-8000-000000000001','Second draft',false)
on conflict(id) do nothing;
update public.reports set latitude=35,longitude=-78 where id='aa090909-0000-4000-8000-000000000003';
do $$ begin
 if not exists(select 1 from public.reports where id='aa090909-0000-4000-8000-000000000002') then raise exception 'owner cannot resume'; end if;
 begin
 update public.reports set is_published=true where id='aa090909-0000-4000-8000-000000000002';
 raise exception 'empty publication accepted';
 exception when check_violation then null;
 end;
 begin
 update public.reports set photo_paths=array['foreign/photo.jpg'],is_published=true where id='aa090909-0000-4000-8000-000000000002';
 raise exception 'foreign evidence accepted';
 exception when check_violation then null;
 end;
end $$;
reset role;
insert into storage.objects(bucket_id,name) values ('report_photos','aa090909-0000-4000-8000-000000000001/aa090909-0000-4000-8000-000000000002/test.jpg');
set local role authenticated;
update public.reports set photo_paths=array['aa090909-0000-4000-8000-000000000001/aa090909-0000-4000-8000-000000000002/test.jpg'],is_published=true where id='aa090909-0000-4000-8000-000000000002';
-- Idempotent retry must not award another report count.
update public.reports set is_published=true where id='aa090909-0000-4000-8000-000000000002';
reset role;
do $$ begin
 if (select reports_created_count from public.profiles where id='aa090909-0000-4000-8000-000000000001') <> 1 then raise exception 'publication count not exactly one'; end if;
end $$;
set local role anon;
do $$ begin
 if not exists(select 1 from public.reports where id='aa090909-0000-4000-8000-000000000002') then raise exception 'published report missing'; end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aa090909-0000-4000-8000-000000000099","is_anonymous":false}',true);
select set_config('request.jwt.claim.sub','aa090909-0000-4000-8000-000000000099',true);
do $$ begin
 if exists(select 1 from public.reports where id='aa090909-0000-4000-8000-000000000003') then raise exception 'another account sees draft'; end if;
end $$;
reset role;
