-- Full migrated isolated fixture database only. All test mutations roll back.
\set ON_ERROR_STOP on
begin;
insert into storage.objects(bucket_id,name) values
 ('customer_draft_photos','f888ef8b-d2fd-48bb-bc7f-e86337dcd3f7/draft-test.jpg'),
 ('customer_draft_photos','858a97d0-ca99-4423-89a2-babee67afe41/draft-test.jpg');
set local role authenticated;
select set_config('request.jwt.claim.sub','f888ef8b-d2fd-48bb-bc7f-e86337dcd3f7',true);
select set_config('request.jwt.claims','{"sub":"f888ef8b-d2fd-48bb-bc7f-e86337dcd3f7","role":"authenticated","is_anonymous":false}',true);
do $$ declare r public.customer_drafts; id uuid; begin
 r:=public.write_customer_draft(auth.uid(),'report',0,'b0000000-0000-4000-8000-000000000001','save','{"version":1,"kind":"report"}',array[auth.uid()::text||'/draft-test.jpg']);
 assert r.revision=1 and r.state='editing','save failed'; id:=r.submission_id;
 r:=public.write_customer_draft(auth.uid(),'report',0,'b0000000-0000-4000-8000-000000000001','save','{"version":1,"kind":"report"}',array[auth.uid()::text||'/draft-test.jpg']);
 assert r.revision=1,'response-loss retry created another revision';
 begin perform public.write_customer_draft(auth.uid(),'report',0,gen_random_uuid(),'save','{}','{}'); raise exception 'stale revision accepted'; exception when serialization_failure then null; end;
 begin perform public.write_customer_draft(auth.uid(),'report',1,gen_random_uuid(),'save','{}',array['858a97d0-ca99-4423-89a2-babee67afe41/draft-test.jpg']); raise exception 'foreign photo accepted'; exception when insufficient_privilege then null; end;
 begin perform public.write_customer_draft('858a97d0-ca99-4423-89a2-babee67afe41','report',0,gen_random_uuid(),'save','{}','{}'); raise exception 'account-switch write accepted'; exception when insufficient_privilege then null; end;
 begin update public.customer_drafts set revision=99; raise exception 'direct writes accepted'; exception when insufficient_privilege then null; end;
 r:=public.write_customer_draft(auth.uid(),'report',1,'b0000000-0000-4000-8000-000000000002','submit');
 assert r.revision=2 and r.submission_id=id and r.state='submitting','submission lock failed';
 begin perform public.write_customer_draft(auth.uid(),'report',2,gen_random_uuid(),'save','{}','{}'); raise exception 'pending submission changed'; exception when check_violation then null; end;
 begin perform public.write_customer_draft(auth.uid(),'report',2,gen_random_uuid(),'delete'); raise exception 'unconfirmed submission discarded'; exception when check_violation then null; end;
 assert (select count(*) from storage.objects where bucket_id='customer_draft_photos')=1,'foreign draft photo readable';
end $$;
select set_config('request.jwt.claim.sub','858a97d0-ca99-4423-89a2-babee67afe41',true);
select set_config('request.jwt.claims','{"sub":"858a97d0-ca99-4423-89a2-babee67afe41","role":"authenticated","is_anonymous":false}',true);
do $$ begin assert (select count(*) from public.customer_drafts)=0,'foreign draft visible'; end $$;
set local role anon;
do $$ begin
 begin perform * from public.customer_drafts; raise exception 'anonymous draft read allowed'; exception when insufficient_privilege then null; end;
 begin perform public.expire_customer_drafts(); raise exception 'anonymous retention allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.customer_drafts set expires_at=now()-interval '1 day';
update storage.objects set created_at=now()-interval '2 days' where bucket_id='customer_draft_photos';
set local role service_role;
do $$ declare n integer; begin
 select count(*) into n from public.expire_customer_drafts(); assert n=2,'orphan photo retention missing';
 assert (select count(*) from public.customer_drafts where state='deleted' and payload is null and revision=3)=1,'expiry did not preserve revision tombstone';
end $$;
reset role;
rollback;
