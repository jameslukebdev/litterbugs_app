-- A customer can abandon a failed/uncertain submission without a delayed
-- request publishing it later. The same transaction lock covers commit/cancel.
create table private.cancelled_customer_draft_submissions (
  submission_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  cancelled_at timestamptz not null default now()
);
alter table private.cancelled_customer_draft_submissions enable row level security;
revoke all on private.cancelled_customer_draft_submissions from public,anon,authenticated;

create function private.guard_customer_draft_submission()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('customer-draft-submission:' || new.id::text,0));
  if exists(select 1 from private.cancelled_customer_draft_submissions where submission_id=new.id) then
    raise check_violation using message='draft_submission_cancelled';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_customer_draft_submission() from public,anon,authenticated;
create trigger a00_guard_customer_report_draft_insert before insert on public.reports
  for each row execute function private.guard_customer_draft_submission();
create trigger a00_guard_customer_report_draft_publish before update of is_published on public.reports
  for each row when (new.is_published and not old.is_published)
  execute function private.guard_customer_draft_submission();
create trigger a00_guard_customer_cleanup_draft_insert before insert on public.cleanup_submissions
  for each row execute function private.guard_customer_draft_submission();

create function private.cancel_customer_draft_submission(d public.customer_drafts)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('customer-draft-submission:' || d.submission_id::text,0));
  -- A commit that won the race stays published; discarding only clears its draft.
  if (d.draft_key='report' and exists(select 1 from public.reports where id=d.submission_id and user_id=d.user_id and is_published))
    or (d.draft_key<>'report' and exists(select 1 from public.cleanup_submissions where id=d.submission_id and cleanup_attempt_id=substring(d.draft_key from 9)::uuid)) then
    return;
  end if;
  insert into private.cancelled_customer_draft_submissions(submission_id,user_id)
    values(d.submission_id,d.user_id) on conflict do nothing;
end;
$$;
revoke all on function private.cancel_customer_draft_submission(public.customer_drafts) from public,anon,authenticated;

create or replace function private.write_customer_draft(target_user_id uuid, target_key text, expected_revision bigint, operation_id uuid, action text, draft_payload jsonb, draft_photos text[])
returns public.customer_drafts language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); current_draft public.customer_drafts; fingerprint text;
begin
  if actor is null or actor is distinct from target_user_id or not public.is_permanent_user() then
    raise insufficient_privilege using message='draft_requires_account';
  end if;
  if target_key is null or (target_key <> 'report' and target_key !~ '^cleanup:[0-9a-f-]{36}$')
    or expected_revision is null or expected_revision < 0 or operation_id is null
    or action is null or action not in ('save','delete','submit')
    or draft_photos is null or cardinality(draft_photos)>3
    or (action='save' and (jsonb_typeof(draft_payload) is distinct from 'object' or pg_column_size(draft_payload)>32768)) then
    raise check_violation using message='invalid_draft';
  end if;
  fingerprint := md5(jsonb_build_array(expected_revision,action,draft_payload,draft_photos)::text);
  perform pg_advisory_xact_lock(hashtextextended('customer-draft:' || actor::text || ':' || target_key,0));
  insert into public.customer_drafts(user_id,draft_key) values(actor,target_key) on conflict do nothing;
  select * into strict current_draft from public.customer_drafts where user_id=actor and draft_key=target_key for update;
  if current_draft.mutation_id=operation_id then
    if current_draft.request_hash is distinct from fingerprint then raise check_violation using message='draft_operation_mismatch'; end if;
    return current_draft;
  end if;
  if current_draft.revision<>expected_revision then raise serialization_failure using message='draft_conflict'; end if;
  if action='delete' and current_draft.state='submitting' then
    perform private.cancel_customer_draft_submission(current_draft);
  end if;
  if action='save' and current_draft.state='submitting' then raise check_violation using message='draft_submission_pending'; end if;
  if action in ('save','submit') and target_key<>'report' and not exists(
    select 1 from public.cleanup_attempts where id=substring(target_key from 9)::uuid and cleaner_id=actor and status in ('claimed','changes_requested')
  ) then raise check_violation using message='cleanup_draft_not_active'; end if;
  if action='save' and exists(select 1 from unnest(draft_photos) p where p is null or split_part(p,'/',1)<>actor::text
    or not exists(select 1 from storage.objects o where o.bucket_id='customer_draft_photos' and o.name=p)) then
    raise insufficient_privilege using message='draft_photo_not_owned';
  end if;
  if action='submit' and (current_draft.payload is null or current_draft.expires_at<=now()) then
    raise check_violation using message='draft_unavailable';
  end if;
  update public.customer_drafts set
    revision=revision+1, mutation_id=operation_id, request_hash=fingerprint,
    payload=case action when 'delete' then null when 'save' then draft_payload else payload end,
    photo_paths=case action when 'delete' then '{}'::text[] when 'save' then draft_photos else photo_paths end,
    state=case action when 'delete' then 'deleted' when 'submit' then 'submitting' else 'editing' end,
    submission_id=case when action='save' and current_draft.state='deleted' then gen_random_uuid() else submission_id end,
    updated_at=now(), expires_at=now()+interval '30 days'
    where user_id=actor and draft_key=target_key returning * into current_draft;
  return current_draft;
end;
$$;

create or replace function private.expire_customer_drafts()
returns table(path text) language plpgsql security definer set search_path='' as $$
declare d public.customer_drafts;
begin
  for d in select * from public.customer_drafts where expires_at<now() and state<>'deleted' for update skip locked loop
    if d.state='submitting' then perform private.cancel_customer_draft_submission(d); end if;
    update public.customer_drafts set payload=null,photo_paths='{}',state='deleted',revision=revision+1,mutation_id=null,request_hash=null
      where user_id=d.user_id and draft_key=d.draft_key;
  end loop;
  return query select o.name from storage.objects o where o.bucket_id='customer_draft_photos' and o.created_at<now()-interval '24 hours'
    and not exists(select 1 from public.customer_drafts kept where o.name=any(kept.photo_paths))
    order by o.created_at limit 100;
end;
$$;
