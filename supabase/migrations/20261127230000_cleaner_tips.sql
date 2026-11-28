-- Tips: anyone can tip a cleaner who has finished Stripe payout setup. Each tip is a single
-- Stripe destination charge: the cleaner receives 100% of the tip directly in their Stripe
-- account and Litterbugs keeps only the service fee added on top. Litterbugs never holds tips.

-- Launch switch, off until a real test tip has been verified.
alter table public.cleanup_feature_flags drop constraint cleanup_feature_flags_name_check;
alter table public.cleanup_feature_flags add constraint cleanup_feature_flags_name_check check (
  name = any (array['payments_enabled', 'gemini_financial_review_enabled', 'tips_enabled'])
);
insert into public.cleanup_feature_flags (name, enabled) values ('tips_enabled', false)
on conflict (name) do nothing;

create table public.cleaner_tips (
  id uuid primary key default gen_random_uuid(),
  -- Financial records outlive account deletion; the people links are cleared instead.
  cleaner_id uuid references public.profiles(id) on delete set null,
  tipper_id uuid references public.profiles(id) on delete set null,
  client_request_id uuid not null unique,
  tip_amount_cents integer not null,
  platform_fee_cents integer not null,
  total_amount_cents integer not null,
  stripe_destination_account_id text not null,
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  status text not null default 'pending',
  failure_code text,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cleaner_tips_amount_check check (tip_amount_cents between 300 and 100000),
  constraint cleaner_tips_fee_check check (platform_fee_cents = 50 + (tip_amount_cents + 10) / 20),
  constraint cleaner_tips_total_check check (total_amount_cents = tip_amount_cents + platform_fee_cents),
  constraint cleaner_tips_status_check check (status = any (array['pending', 'succeeded', 'failed', 'refunded'])),
  constraint cleaner_tips_not_self check (tipper_id is null or tipper_id <> cleaner_id)
);

create index cleaner_tips_cleaner_id_idx on public.cleaner_tips (cleaner_id, created_at desc);
create index cleaner_tips_tipper_id_idx on public.cleaner_tips (tipper_id);

alter table public.cleaner_tips enable row level security;
revoke all on public.cleaner_tips from anon, authenticated;
grant select on public.cleaner_tips to authenticated;

-- Cleaners see tips they received; signed-in tippers see tips they sent. Only the backend writes.
create policy "Cleaners and tippers read their own tips" on public.cleaner_tips
  for select to authenticated
  using ((select auth.uid()) = cleaner_id or (select auth.uid()) = tipper_id);

create or replace function private.cleaner_can_receive_tips(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.cleaner_payout_accounts a
    join public.profiles p on p.id = a.user_id
    join public.cleanup_feature_flags f on f.name = 'tips_enabled' and f.enabled
    where a.user_id = target_profile_id
      and p.show_on_leaderboards
      and a.onboarding_status = 'enabled'
      and a.payouts_enabled
      and a.stripe_account_id is not null
      and a.country = 'US'
      and a.age_18_confirmed_at is not null
  );
$$;
revoke all on function private.cleaner_can_receive_tips(uuid) from public, anon, authenticated;
grant execute on function private.cleaner_can_receive_tips(uuid) to service_role;

-- Public: which of these leaderboard cleaners have a Tip button. Reveals nothing else.
create or replace function public.tip_eligible_profiles(profile_ids uuid[])
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from unnest(coalesce(profile_ids[1:200], '{}'::uuid[])) as ids(id)
  where private.cleaner_can_receive_tips(id);
$$;
revoke all on function public.tip_eligible_profiles(uuid[]) from public, anon, authenticated;
grant execute on function public.tip_eligible_profiles(uuid[]) to anon, authenticated;

-- Public: what the tip page shows, in the same privacy-preserving form as the leaderboard.
create or replace function public.tip_recipient(target_profile_id uuid)
returns table (
  name text,
  avatar_path text,
  provider_avatar_url text,
  updated_at timestamptz,
  rank_points integer,
  cleanups integer,
  can_receive_tips boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select private.leaderboard_name(p.display_name, p.username),
    p.avatar_path,
    p.provider_avatar_url,
    p.updated_at,
    public.get_rank_points(p.id),
    (select count(*)::integer from public.cleanup_attempts a where a.cleaner_id = p.id and a.status = 'completed'),
    private.cleaner_can_receive_tips(p.id)
  from public.profiles p
  where p.id = target_profile_id and p.show_on_leaderboards;
$$;
revoke all on function public.tip_recipient(uuid) from public, anon, authenticated;
grant execute on function public.tip_recipient(uuid) to anon, authenticated;
