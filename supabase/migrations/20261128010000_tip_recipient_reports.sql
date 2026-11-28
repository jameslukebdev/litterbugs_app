-- Tips also go to reporters: the tip page shows a reporter's public report count.
-- Adds a column, so the function is recreated in one transaction; existing callers ignore it.
drop function if exists public.tip_recipient(uuid);

create function public.tip_recipient(target_profile_id uuid)
returns table (
  name text,
  avatar_path text,
  provider_avatar_url text,
  updated_at timestamptz,
  rank_points integer,
  cleanups integer,
  can_receive_tips boolean,
  reports integer
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
    private.cleaner_can_receive_tips(p.id),
    (select count(*)::integer from public.reports r
      where r.user_id = p.id and r.is_published and not r.is_sample
        and r.moderated_at is null and r.cancelled_at is null)
  from public.profiles p
  where p.id = target_profile_id and p.show_on_leaderboards;
$$;
revoke all on function public.tip_recipient(uuid) from public, anon, authenticated;
grant execute on function public.tip_recipient(uuid) to anon, authenticated;
