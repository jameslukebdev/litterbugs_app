\set ON_ERROR_STOP on
begin;
delete from public.customer_drafts where user_id='f888ef8b-d2fd-48bb-bc7f-e86337dcd3f7';
select set_config('request.jwt.claim.sub','f888ef8b-d2fd-48bb-bc7f-e86337dcd3f7',true);
select set_config('request.jwt.claims','{"sub":"f888ef8b-d2fd-48bb-bc7f-e86337dcd3f7","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
select public.write_customer_draft(auth.uid(),'report',0,gen_random_uuid(),'save','{"version":1,"kind":"report"}','{}');
select public.write_customer_draft(auth.uid(),'report',1,gen_random_uuid(),'submit');
reset role;
-- Reserve a report, then discard before publication.
insert into public.reports(id,user_id,is_published) select submission_id,user_id,false from public.customer_drafts where user_id=auth.uid();
set local role authenticated;
select public.write_customer_draft(auth.uid(),'report',2,gen_random_uuid(),'delete');
reset role;
do $$ declare old_id uuid; r public.customer_drafts; begin
 select submission_id into old_id from public.customer_drafts where user_id=auth.uid();
 assert exists(select 1 from private.cancelled_customer_draft_submissions where submission_id=old_id),'missing cancellation';
 begin update public.reports set is_published=true where id=old_id; raise exception 'late report published'; exception when check_violation then assert sqlerrm='draft_submission_cancelled'; end;
 begin insert into public.cleanup_submissions(id,cleanup_attempt_id,submission_number,description) values(old_id,gen_random_uuid(),1,'Late'); raise exception 'late cleanup submitted'; exception when check_violation then assert sqlerrm='draft_submission_cancelled'; end;
 r:=public.write_customer_draft(auth.uid(),'report',3,gen_random_uuid(),'save','{"version":1,"kind":"report"}','{}');
 assert r.submission_id<>old_id and r.state='editing','new report still locked';
 r:=public.write_customer_draft(auth.uid(),'report',4,gen_random_uuid(),'submit');
 -- Commit wins first: discard must keep the published report intact.
 insert into public.reports(id,user_id,is_published) values(r.submission_id,r.user_id,true);
 r:=public.write_customer_draft(auth.uid(),'report',5,gen_random_uuid(),'delete');
 assert not exists(select 1 from private.cancelled_customer_draft_submissions where submission_id=r.submission_id),'published report cancelled';
 assert (select is_published from public.reports where id=r.submission_id),'published report lost';
 -- Expiry also fences late submissions.
 r:=public.write_customer_draft(auth.uid(),'report',6,gen_random_uuid(),'save','{}','{}');
 r:=public.write_customer_draft(auth.uid(),'report',7,gen_random_uuid(),'submit');
 update public.customer_drafts set expires_at=now()-interval '1 day' where user_id=auth.uid();
 perform public.expire_customer_drafts();
 begin insert into public.reports(id,user_id,is_published) values(r.submission_id,r.user_id,false); raise exception 'expired submission resurrected'; exception when check_violation then assert sqlerrm='draft_submission_cancelled'; end;
end $$;
rollback;
