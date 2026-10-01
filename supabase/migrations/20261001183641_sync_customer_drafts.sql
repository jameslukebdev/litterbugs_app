-- Private account drafts. Revision checks apply to every save, discard and
-- submission handoff; stale devices cannot overwrite or resurrect newer work.
create table public.customer_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_key text not null check (draft_key = 'report' or draft_key ~ '^cleanup:[0-9a-f-]{36}$'),
  revision bigint not null default 0,
  mutation_id uuid,
  request_hash text,
  payload jsonb,
  photo_paths text[] not null default '{}',
  submission_id uuid not null default gen_random_uuid(),
  state text not null default 'deleted' check (state in ('editing','submitting','deleted')),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  primary key (user_id, draft_key),
  check (cardinality(photo_paths) <= 3),
  check (payload is null or pg_column_size(payload) <= 32768)
);
alter table public.customer_drafts enable row level security;
revoke all on public.customer_drafts from anon, authenticated;
grant select on public.customer_drafts to authenticated;
create policy "Read own customer drafts" on public.customer_drafts for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_permanent_user()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('customer_draft_photos','customer_draft_photos',false,5242880,array['image/jpeg','image/png','image/webp','image/heic','image/heif']);
create policy "Read own private draft photos" on storage.objects for select to authenticated
  using (bucket_id='customer_draft_photos' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.is_permanent_user()));
create policy "Upload own private draft photos" on storage.objects for insert to authenticated
  with check (bucket_id='customer_draft_photos' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.is_permanent_user()));
-- Immutable uploads. Deletion is performed by retention/account deletion only:
-- another device may still be loading a previously returned revision.

create function private.write_customer_draft(target_user_id uuid, target_key text, expected_revision bigint, operation_id uuid, action text, draft_payload jsonb, draft_photos text[])
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
  if action='delete' and current_draft.state='submitting' and not (
    (target_key='report' and exists(select 1 from public.reports where id=current_draft.submission_id and user_id=actor and is_published))
    or (target_key<>'report' and exists(select 1 from public.cleanup_submissions where id=current_draft.submission_id and cleanup_attempt_id=substring(target_key from 9)::uuid))
  ) then raise check_violation using message='draft_submission_pending'; end if;
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
revoke all on function private.write_customer_draft(uuid,text,bigint,uuid,text,jsonb,text[]) from public,anon,authenticated;
grant execute on function private.write_customer_draft(uuid,text,bigint,uuid,text,jsonb,text[]) to authenticated;
create function public.write_customer_draft(target_user_id uuid,target_key text,expected_revision bigint,operation_id uuid,action text,draft_payload jsonb default null,draft_photos text[] default '{}')
returns public.customer_drafts language sql security invoker set search_path='' as $$
  select private.write_customer_draft(target_user_id,target_key,expected_revision,operation_id,action,draft_payload,draft_photos);
$$;
revoke all on function public.write_customer_draft(uuid,text,bigint,uuid,text,jsonb,text[]) from public,anon;
grant execute on function public.write_customer_draft(uuid,text,bigint,uuid,text,jsonb,text[]) to authenticated;

-- The scheduled maintenance worker removes returned objects using Storage API.
-- Never delete storage metadata directly. Tombstones retain revision numbers.
create function private.expire_customer_drafts()
returns table(path text) language plpgsql security definer set search_path='' as $$
begin
  update public.customer_drafts set payload=null,photo_paths='{}',state='deleted',revision=revision+1,mutation_id=null,request_hash=null
    where expires_at<now() and state<>'deleted';
  return query select o.name from storage.objects o where o.bucket_id='customer_draft_photos' and o.created_at<now()-interval '24 hours'
    and not exists(select 1 from public.customer_drafts d where o.name=any(d.photo_paths))
    order by o.created_at limit 100;
end;
$$;
revoke all on function private.expire_customer_drafts() from public,anon,authenticated;
grant execute on function private.expire_customer_drafts() to service_role;
create function public.expire_customer_drafts() returns table(path text) language sql security invoker set search_path='' as $$ select * from private.expire_customer_drafts(); $$;
revoke all on function public.expire_customer_drafts() from public,anon,authenticated;
grant execute on function public.expire_customer_drafts() to service_role;
