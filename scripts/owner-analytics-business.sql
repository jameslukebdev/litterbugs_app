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
order by w.days;
