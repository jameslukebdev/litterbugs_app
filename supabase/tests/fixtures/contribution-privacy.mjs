import { readFile } from 'node:fs/promises';

// Test-only schema prerequisites. Reservation, table constraints, and privacy
// functions are loaded from their actual migrations, never reimplemented here.
export async function contributionPrivacyDatabase(PGlite, root) {
const read = file => readFile(`${root}/${file}`, 'utf8');
const before = (source, marker) => {
  const end = source.indexOf(marker);
  if (end < 0) throw new Error(`Migration fixture marker missing: ${marker}`);
  return source.slice(0, end);
};
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema private;
grant usage on schema auth, public to anon, authenticated, service_role;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
create table auth.users(id uuid primary key,email text,is_anonymous boolean,raw_user_meta_data jsonb,created_at timestamptz);
create table public.profiles(id uuid primary key references auth.users(id),display_name text,username text);
create table public.reports(id uuid primary key,user_id uuid,title text,latitude float8,longitude float8,photo_paths text[],expires_at timestamptz,
 is_published boolean default true,is_sample boolean default false,cancelled_at timestamptz,expired_at timestamptz,
 cleanup_state text default 'available',funding_eligibility text default 'pending',renewal_status text default 'active',funding_frozen_at timestamptz);
create table public.cleanup_attempts(id uuid primary key,report_id uuid,status text);
create table public.cleanup_feature_flags(name text primary key,enabled boolean);
insert into public.cleanup_feature_flags values ('payments_enabled',false),('gemini_financial_review_enabled',false);
`);
const permanent = await read('supabase/migrations/20260821202747_guest_read_only_reports.sql');
await db.exec(before(permanent, 'revoke insert, update'));
const foundation = await read('supabase/migrations/20260826144234_funded_cleanup_mvp.sql');
await db.exec(foundation.slice(foundation.indexOf('create table public.cleanup_contributions ('), foundation.indexOf('create table public.cleanup_ai_checks (')));
const pricing = await read('supabase/migrations/20260930183828_version_cleanup_service_fee.sql');
await db.exec(before(pricing, '-- Service-only reservation'));
await db.exec(pricing.slice(pricing.indexOf('create function public.attach_cleanup_payment_intent('), pricing.indexOf('-- Keep the legacy API compatible')));
const lock = await read('supabase/migrations/20260930202000_fix_cleanup_pricing_lock_permissions.sql');
await db.exec(before(lock, 'create or replace function public.reserve_cleanup_contribution('));
const current = await read('supabase/migrations/20261021172120_reporter_reward_and_twenty_percent_fee.sql');
await db.exec(before(current, '-- One earned reward'));
await db.exec(`
grant all on all tables in schema public to service_role;
grant execute on function public.reserve_cleanup_contribution(uuid,uuid,uuid,bigint,integer,text) to service_role;
create table public.rank_point_events(user_id uuid,source_id uuid,source_type text,created_at timestamptz);
create table private.report_communities(report_id uuid,community_id uuid);
create function private.leaderboard_items(text) returns table(profile_id uuid,community_id uuid,item_id uuid,counted_at timestamptz)
language sql as $$ select null::uuid,null::uuid,null::uuid,null::timestamptz where false $$;
`);
await db.exec(await read('supabase/migrations/20261120010000_cleanup_contributor_visibility.sql'));
return db;
}
