begin;
-- Exercise the real payment finalizer, rather than inserting a synthetic notice.
do $$
declare
  owner_id uuid := gen_random_uuid();
  donor_id uuid := gen_random_uuid();
  fixture_report_id uuid := gen_random_uuid();
  self_intent text := 'qa_self_' || gen_random_uuid();
  other_intent text := 'qa_other_' || gen_random_uuid();
  notices integer;
begin
  insert into auth.users(id, email, is_anonymous) values
    (owner_id, 'self-notice-owner@example.invalid', false),
    (donor_id, 'self-notice-donor@example.invalid', false);
  insert into public.profiles(id) values(owner_id),(donor_id) on conflict do nothing;
  insert into public.cleanup_feature_flags(name,enabled) values
    ('payments_enabled',true),('gemini_financial_review_enabled',true)
    on conflict(name) do update set enabled=true;
  insert into public.reports(id,user_id,title,photo_paths,expires_at)
    values(fixture_report_id,owner_id,'Notification test',array[owner_id::text || '/test.png'],now()+interval '30 days');
  update public.reports set funding_eligibility='eligible' where id=fixture_report_id;
  perform public.create_cleanup_contribution_intent(fixture_report_id,owner_id,gen_random_uuid(),500,self_intent);
  perform public.finalize_cleanup_contribution(self_intent,'qa_charge_self',true);
  select count(*) into notices from public.cleanup_notifications n
    where n.report_id=fixture_report_id and event_type='cleanup_fund_increased';
  if notices <> 0 then raise exception 'Own contribution generated a duplicate notice'; end if;
  perform public.create_cleanup_contribution_intent(fixture_report_id,donor_id,gen_random_uuid(),500,other_intent);
  perform public.finalize_cleanup_contribution(other_intent,'qa_charge_other',true);
  select count(*) into notices from public.cleanup_notifications n
    where n.report_id=fixture_report_id and n.user_id=owner_id and event_type='cleanup_fund_increased';
  if notices <> 1 then raise exception 'Another member contribution lost its notice'; end if;
  if (select funded_amount_cents from public.reports where id=fixture_report_id) <> 1000 then
    raise exception 'Notification suppression changed fund accounting';
  end if;
end;
$$;
rollback;
