-- Aggregate-only, read-only local owner dashboard query. No user input or PII
-- leaves the database. Publication resets reports.created_at in the existing
-- publication trigger. Each completed attempt uses its final submission once.
-- Aggregate-only, read-only local owner dashboard query. No user input or PII
-- leaves the database. Publication resets reports.created_at in the existing
-- publication trigger. Each completed attempt uses its final submission once.
with fixture_clock as (
 select ((((now() at time zone 'America/New_York')::date-1)::timestamp)+interval '23 hours 30 minutes') at time zone 'America/New_York' as late
), fixture_users(id,raw_app_meta_data,raw_user_meta_data,is_anonymous) as (
 values ('real','{}'::jsonb,'{}'::jsonb,false),
 ('review','{"review_account":true}'::jsonb,'{}'::jsonb,false),
 ('profile-flag','{}'::jsonb,'{"review_account":true}'::jsonb,false)
), fixture_reports(id,user_id,created_at,cleanup_state,funded_amount_cents,expires_at,expired_at,cancelled_at,is_published,is_sample,status) as (
 values ('real-report','real',(select late from fixture_clock),'available',500,now()+interval '7 days',null::timestamptz,null::timestamptz,true,false,'open'),
 ('review-report','review',(select late from fixture_clock),'available',20000,now()+interval '7 days',null::timestamptz,null::timestamptz,true,false,'open'),
 ('profile-report','profile-flag',(select late from fixture_clock),'available',0,now()+interval '7 days',null::timestamptz,null::timestamptz,true,false,'open')
), fixture_attempts(id,report_id,cleaner_id,completed_at,is_paid,final_submission_id,status) as (
 values ('real-attempt','real-report','real',(select late from fixture_clock),false,'real-submission','completed'),
 ('review-cleaner','real-report','review',(select late from fixture_clock),false,'review-cleaner-submission','completed'),
 ('review-parent','review-report','real',(select late from fixture_clock),false,'review-parent-submission','completed')
), fixture_submissions(id,cleanup_attempt_id,bags_or_items_removed,weight_pounds,duration_minutes) as (
 values ('real-submission','real-attempt',1,3,30),
 ('review-cleaner-submission','review-cleaner',999,999,999),
 ('review-parent-submission','review-parent',999,999,999)
), fixture_contributions(contributor_id,report_id,principal_amount_cents,succeeded_at,refunded_at,status,currency,stripe_payment_intent_id) as (
 values ('real','real-report',500,(select late from fixture_clock),null::timestamptz,'succeeded','usd','fixture-1'),
 ('review','real-report',10000,(select late from fixture_clock),null::timestamptz,'succeeded','usd','fixture-2'),
 ('real','review-report',20000,(select late from fixture_clock),null::timestamptz,'succeeded','usd','fixture-3'),
 ('real','real-report',100,now()-interval '2 days',(select late from fixture_clock),'refunded','usd','fixture-4'),
 ('review','real-report',9999,now()-interval '2 days',(select late from fixture_clock),'refunded','usd','fixture-5'),
 ('real','real-report',700,((((now() at time zone 'America/New_York')::date-7)::timestamp)-interval '30 minutes') at time zone 'America/New_York',null::timestamptz,'succeeded','usd','fixture-6')
), review_accounts as (
