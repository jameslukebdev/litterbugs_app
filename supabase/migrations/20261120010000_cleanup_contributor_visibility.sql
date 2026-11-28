alter table public.cleanup_contributions add column show_contributor_name boolean;

-- Keep the existing reservation API for older website and app clients.
create function public.reserve_named_cleanup_contribution(
  target_report_id uuid, target_contributor_id uuid, target_client_request_id uuid,
  principal_cents bigint, expected_pricing_version integer, receipt_email text, show_name boolean
) returns public.cleanup_contributions
language plpgsql security invoker set search_path = '' as $$
declare contribution public.cleanup_contributions;
begin
  if show_name is null then raise check_violation using message = 'cleanup_contribution_visibility_required'; end if;
  contribution := public.reserve_cleanup_contribution(
    target_report_id, target_contributor_id, target_client_request_id, principal_cents,
    expected_pricing_version, receipt_email
  );
  -- The reservation holds the existing idempotency lock until this transaction completes.
  -- Never reset a recorded choice on a retry, including a later change by the donor.
  if contribution.status = 'payment_pending' and contribution.show_contributor_name is null then
    update public.cleanup_contributions c set show_contributor_name = show_name
      where c.id = contribution.id returning c.* into contribution;
  end if;
  return contribution;
end;
$$;
revoke all on function public.reserve_named_cleanup_contribution(uuid, uuid, uuid, bigint, integer, text, boolean) from public, anon, authenticated;
grant execute on function public.reserve_named_cleanup_contribution(uuid, uuid, uuid, bigint, integer, text, boolean) to service_role;

create function public.set_cleanup_contributor_visibility(contribution_id uuid, show_name boolean)
returns boolean language sql volatile security definer set search_path = '' as $$
  with changed as (
    update public.cleanup_contributions c set show_contributor_name = show_name
    where c.id = contribution_id and c.contributor_id = (select auth.uid())
      and (select public.is_permanent_user()) and show_name is not null
      and c.status in ('succeeded', 'paid_out') and c.refunded_at is null
    returning 1
  ) select exists (select 1 from changed);
$$;
revoke all on function public.set_cleanup_contributor_visibility(uuid, boolean) from public, anon;
grant execute on function public.set_cleanup_contributor_visibility(uuid, boolean) to authenticated;

create function public.cleanup_contributor_credits(report_ids uuid[])
returns table (report_id uuid, names text[], anonymous_count integer, donations jsonb)
language sql stable security definer set search_path = '' as $$
  with credits as (
    select c.report_id, c.id, c.principal_amount_cents, c.succeeded_at,
      coalesce(c.show_contributor_name, true) as show_contributor_name,
      coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.username), '')) as profile_name
    from public.cleanup_contributions c
    join public.reports r on r.id = c.report_id
    left join public.profiles p on p.id = c.contributor_id
    where c.report_id = any(report_ids[1:100])
      and r.is_published and not r.is_sample and r.cancelled_at is null and r.expired_at is null
      and (r.cleanup_state in ('claimed', 'completion_submitted', 'changes_requested', 'completed')
        or (r.cleanup_state = 'available' and (r.expires_at is null or r.expires_at > now())))
      and c.status in ('succeeded', 'paid_out') and c.refunded_at is null
  )
  select credits.report_id,
    coalesce(array_agg(distinct profile_name order by profile_name)
      filter (where show_contributor_name and profile_name is not null), '{}'::text[]),
    count(*) filter (where not show_contributor_name or profile_name is null)::integer,
    jsonb_agg(jsonb_build_object(
      'name', case when show_contributor_name then profile_name else null end,
      'amountCents', principal_amount_cents, 'donatedAt', succeeded_at
    ) order by succeeded_at desc, id)
  from credits group by credits.report_id;
$$;
revoke all on function public.cleanup_contributor_credits(uuid[]) from public;
grant execute on function public.cleanup_contributor_credits(uuid[]) to anon, authenticated;

-- Some deployments do not have the community leaderboards yet. Preserve their existing
-- scores where present, while honoring contributors' explicit anonymous choices.
do $migration$
begin
  if to_regprocedure('private.leaderboard_items(text)') is null then return; end if;
  execute $definition$
    create or replace function private.leaderboard_items(p_board text)
    returns table (profile_id uuid, community_id uuid, item_id uuid, counted_at timestamptz)
    language sql stable security definer set search_path = '' as $body$
      select e.user_id, rc.community_id, e.source_id, e.created_at
      from public.rank_point_events e
      join private.report_communities rc on rc.report_id = e.source_id
      where p_board = 'report' and e.source_type = 'report_created'
      union all
      select e.user_id, rc.community_id, e.source_id, e.created_at
      from public.rank_point_events e
      join public.cleanup_attempts a on a.id = e.source_id
      join private.report_communities rc on rc.report_id = a.report_id
      where p_board = 'clean' and e.source_type = 'cleanup_completed'
      union all
      select c.contributor_id, rc.community_id, c.report_id, min(c.succeeded_at)
      from public.cleanup_contributions c
      join private.report_communities rc on rc.report_id = c.report_id
      where p_board = 'fund' and c.status in ('succeeded', 'paid_out')
        and c.refunded_at is null and c.contributor_id is not null and c.succeeded_at is not null
        and c.show_contributor_name is distinct from false
      group by c.contributor_id, rc.community_id, c.report_id;
    $body$;
  $definition$;
end;
$migration$;
