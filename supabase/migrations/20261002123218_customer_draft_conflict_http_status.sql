-- Optimistic draft conflicts are normal HTTP 409 responses, not retryable
-- transaction serialization failures. PostgREST can retry SQLSTATE 40001
-- indefinitely, preventing clients from presenting their conflict controls.
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
  if current_draft.revision<>expected_revision then raise sqlstate 'PT409' using message='draft_conflict'; end if;
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

