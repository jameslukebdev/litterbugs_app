-- Private aggregate access for the website owner dashboard. Existing admin
-- membership + MFA is checked in every entry point; no service-role API key.
create table private.owner_analytics_cache (
 id text primary key check (id='clarity'),
 source jsonb,
 next_attempt_at timestamptz not null default '-infinity',
 attempt_day date,
 attempts integer not null default 0 check (attempts between 0 and 8),
 lease uuid
);
alter table private.owner_analytics_cache enable row level security;
revoke all on private.owner_analytics_cache from public,anon,authenticated,service_role;

create function private.owner_analytics_business()
returns jsonb language plpgsql stable security definer set search_path='' as $function$
begin
 perform private.require_cleanup_admin();
 return (select jsonb_agg(to_jsonb(result)) from (
-- Aggregate-only, read-only local owner dashboard query. No user input or PII
-- leaves the database. Publication resets reports.created_at in the existing
-- publication trigger. Each completed attempt uses its final submission once.
with review_accounts as (
  -- Server-owned metadata, not user-editable profile claims. Keep persistent
  -- store reviewers and any future fixtures out of real business measurements.
  select id from auth.users where raw_app_meta_data @> '{"review_account":true}'::jsonb
), windows as (
  -- Explicit timestamp casts make these NY midnights timestamptz values.
  -- DATE AT TIME ZONE otherwise chooses a different implicit overload.
  select days,
    (((now() at time zone 'America/New_York')::date - days)::timestamp) at time zone 'America/New_York' as starts,
    ((now() at time zone 'America/New_York')::date::timestamp) at time zone 'America/New_York' as ends
  from (values (7), (28)) p(days)
), reports as (
  select id,user_id,created_at,cleanup_state,funded_amount_cents,expires_at,expired_at,cancelled_at
  from public.reports r
  where is_published and not is_sample and status is distinct from 'removed'
    and not exists(select 1 from review_accounts qa where qa.id=r.user_id)
), cleanups as (
  select a.id,a.cleaner_id,a.completed_at,a.is_paid,s.bags_or_items_removed,s.weight_pounds,s.duration_minutes
  from public.cleanup_attempts a
  join reports r on r.id=a.report_id
  left join public.cleanup_submissions s on s.id=a.final_submission_id and s.cleanup_attempt_id=a.id
  where a.status='completed' and a.completed_at is not null
    and not exists(select 1 from review_accounts qa where qa.id=a.cleaner_id)
), contributions as (
  select c.contributor_id,c.principal_amount_cents,c.succeeded_at,c.refunded_at,c.status
  from public.cleanup_contributions c join public.reports r on r.id=c.report_id
  -- Later report moderation does not erase a real payment or its refund.
  where not r.is_sample and c.succeeded_at is not null and c.currency='usd'
    and not exists(select 1 from review_accounts qa where qa.id=r.user_id or qa.id=c.contributor_id)
    and c.stripe_payment_intent_id is not null
    and c.status in ('succeeded','refund_pending','refunded','paid_out')
), backlog as (
  select * from reports
  where cleanup_state='available' and expired_at is null and cancelled_at is null
    and (expires_at is null or expires_at>now())
), periods as (
  select days,starts,ends,false as previous from windows
  union all
  select days,(((starts at time zone 'America/New_York')::date-days)::timestamp) at time zone 'America/New_York',starts,true from windows
), totals as (
  select p.*,
    (select count(*) from reports r where r.created_at>=p.starts and r.created_at<p.ends) as new_reports,
    (select count(*) from cleanups c where c.completed_at>=p.starts and c.completed_at<p.ends) as completed_cleanups,
    (select coalesce(sum(c.principal_amount_cents),0) from contributions c where c.succeeded_at>=p.starts and c.succeeded_at<p.ends) as funded_cents,
    (select coalesce(sum(c.principal_amount_cents),0) from contributions c where c.status='refunded' and c.refunded_at>=p.starts and c.refunded_at<p.ends) as refunded_cents,
    (select count(*) from (
      select r.user_id as account from reports r where r.created_at>=p.starts and r.created_at<p.ends
      union select c.cleaner_id from cleanups c where c.completed_at>=p.starts and c.completed_at<p.ends
      union select f.contributor_id from contributions f where f.succeeded_at>=p.starts and f.succeeded_at<p.ends
    ) accounts join auth.users u on u.id=accounts.account
      where not coalesce(u.is_anonymous,false)
        and not exists(select 1 from review_accounts qa where qa.id=u.id)) as contributors,
    (select count(*) from cleanups c where c.completed_at>=p.starts and c.completed_at<p.ends and c.is_paid) as paid_cleanups,
    (select coalesce(sum(c.weight_pounds),0) from cleanups c where c.completed_at>=p.starts and c.completed_at<p.ends and c.weight_pounds>0) as pounds,
    (select count(*) from cleanups c where c.completed_at>=p.starts and c.completed_at<p.ends and c.weight_pounds>0) as weight_count,
    (select coalesce(sum(c.bags_or_items_removed),0) from cleanups c where c.completed_at>=p.starts and c.completed_at<p.ends and c.bags_or_items_removed is not null) as bags,
    (select count(*) from cleanups c where c.completed_at>=p.starts and c.completed_at<p.ends and c.bags_or_items_removed is not null) as bags_count,
    (select coalesce(sum(c.duration_minutes),0) from cleanups c where c.completed_at>=p.starts and c.completed_at<p.ends and c.duration_minutes>0) as minutes,
    (select count(*) from cleanups c where c.completed_at>=p.starts and c.completed_at<p.ends and c.duration_minutes>0) as duration_count
  from periods p
)
select w.days as period, to_char(w.starts at time zone 'America/New_York','YYYY-MM-DD') as starts,
  to_char((w.ends at time zone 'America/New_York') - interval '1 second','YYYY-MM-DD') as ends,
  to_char(b.starts at time zone 'America/New_York','YYYY-MM-DD') as previous_starts,
  to_char((b.ends at time zone 'America/New_York') - interval '1 second','YYYY-MM-DD') as previous_ends,
  jsonb_build_object(
    'newReports',t.new_reports,'completedCleanups',t.completed_cleanups,'fundedCents',t.funded_cents,
    'refundedCents',t.refunded_cents,'contributors',t.contributors,'paidCleanups',t.paid_cleanups,
    'awaitingCleanup',(select count(*) from backlog),
    'fundedWaiting',(select count(*) from backlog where funded_amount_cents>0),
    'oldestWaitingDays',(select floor(extract(epoch from (now()-min(created_at)))/86400) from backlog),
    'awaitingReview',(select count(*) from reports where cleanup_state='completion_submitted'),
    'pounds',case when t.weight_count>0 then t.pounds else null end,'weightCount',t.weight_count,
    'bags',case when t.bags_count>0 then t.bags else null end,'bagsCount',t.bags_count,
    'hours',case when t.duration_count>0 then round(t.minutes::numeric/60,1) else null end,'durationCount',t.duration_count,
    'daily',(select jsonb_agg(jsonb_build_object(
      'date',to_char(d.day,'YYYY-MM-DD'),
      'reports',(select count(*) from reports r where (r.created_at at time zone 'America/New_York')::date=d.day::date),
      'cleanups',(select count(*) from cleanups c where (c.completed_at at time zone 'America/New_York')::date=d.day::date)
    ) order by d.day) from generate_series((w.starts at time zone 'America/New_York')::date::timestamp,
      ((w.ends at time zone 'America/New_York')::date-1)::timestamp,interval '1 day') d(day)),
    'previous',jsonb_build_object('newReports',b.new_reports,'completedCleanups',b.completed_cleanups,'fundedCents',b.funded_cents,'contributors',b.contributors)
  ) as data
from windows w join totals t on t.days=w.days and not t.previous
join totals b on b.days=w.days and b.previous
order by w.days
 ) result);
end;
$function$;
revoke all on function private.owner_analytics_business() from public,anon,authenticated,service_role;
grant execute on function private.owner_analytics_business() to authenticated;
create function public.owner_analytics_business()
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.owner_analytics_business();
$$;
revoke all on function public.owner_analytics_business() from public,anon,authenticated,service_role;
grant execute on function public.owner_analytics_business() to authenticated;

create function private.owner_analytics_clarity_cache(target_lease uuid default null, observed_source jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare
 item private.owner_analytics_cache%rowtype;
 today date := (now() at time zone 'UTC')::date;
 next_lease uuid;
 field text;
 value jsonb;
begin
 perform private.require_cleanup_admin();
 if target_lease is not null then
  if observed_source is null or jsonb_typeof(observed_source)<>'object'
    or coalesce(observed_source->>'status','') not in ('live','error')
    or not (observed_source ?& array['status','updatedAt','window','data'])
    or (observed_source-array['status','updatedAt','window','data'])<>'{}'::jsonb
    or jsonb_typeof(observed_source->'updatedAt')<>'string'
    or jsonb_typeof(observed_source->'window')<>'object'
    or not ((observed_source->'window') ?& array['start','end','timezone'])
    or ((observed_source->'window')-array['start','end','timezone'])<>'{}'::jsonb
    or jsonb_typeof(observed_source->'window'->'start')<>'string'
    or jsonb_typeof(observed_source->'window'->'end')<>'string'
    or observed_source->'window'->>'timezone' is distinct from 'UTC · rolling 72 hours'
    or octet_length(observed_source::text)>8192 then
   raise check_violation using message='invalid_analytics_observation';
  end if;
  perform (observed_source->>'updatedAt')::timestamptz;
  perform (observed_source->'window'->>'start')::timestamptz;
  perform (observed_source->'window'->>'end')::timestamptz;
  if observed_source->>'status'='live' then
   if jsonb_typeof(observed_source->'data')<>'object'
    or not ((observed_source->'data') ?& array['sessions','rageSessions','deadSessions','quickBackSessions','scriptErrorSessions','rageRate','deadRate','quickBackRate','scriptErrorRate'])
    or ((observed_source->'data')-array['sessions','rageSessions','deadSessions','quickBackSessions','scriptErrorSessions','rageRate','deadRate','quickBackRate','scriptErrorRate'])<>'{}'::jsonb then
    raise check_violation using message='invalid_analytics_metrics';
   end if;
   for field,value in select * from jsonb_each(observed_source->'data') loop
    if jsonb_typeof(value) not in ('number','null')
     or (jsonb_typeof(value)='number' and (value::text::numeric<0 or value::text::numeric>9007199254740991))
     or (field like '%Rate' and jsonb_typeof(value)='number' and value::text::numeric>1) then
     raise check_violation using message='invalid_analytics_metric';
    end if;
   end loop;
  elsif observed_source->'data'<>'null'::jsonb then
   raise check_violation using message='invalid_analytics_error';
  end if;
  update private.owner_analytics_cache set source=observed_source,lease=null
   where id='clarity' and lease=target_lease returning * into item;
  if not found then raise insufficient_privilege using message='analytics_refresh_lease_invalid'; end if;
  return jsonb_build_object('claimed',false,'source',item.source);
 end if;
 if observed_source is not null then raise check_violation using message='analytics_lease_required'; end if;
 insert into private.owner_analytics_cache(id) values('clarity') on conflict do nothing;
 select * into item from private.owner_analytics_cache where id='clarity' for update;
 if item.next_attempt_at>now() or (item.attempt_day=today and item.attempts>=8) then
  return jsonb_build_object('claimed',false,'source',item.source);
 end if;
 next_lease:=gen_random_uuid();
 update private.owner_analytics_cache set next_attempt_at=now()+interval '6 hours',
  attempt_day=today,attempts=case when item.attempt_day=today then item.attempts+1 else 1 end,
  lease=next_lease where id='clarity';
 return jsonb_build_object('claimed',true,'lease',next_lease,'source',item.source);
end;
$function$;
revoke all on function private.owner_analytics_clarity_cache(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.owner_analytics_clarity_cache(uuid,jsonb) to authenticated;
create function public.owner_analytics_clarity_cache(target_lease uuid default null, observed_source jsonb default null)
returns jsonb language sql security invoker set search_path='' as $$
 select private.owner_analytics_clarity_cache(target_lease,observed_source);
$$;
revoke all on function public.owner_analytics_clarity_cache(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.owner_analytics_clarity_cache(uuid,jsonb) to authenticated;
