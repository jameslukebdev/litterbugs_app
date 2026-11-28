-- Additive, service-only lookup; leave the existing push queue RPC return type unchanged.
create function public.cleanup_issue_push_context(notification_ids uuid[])
returns table(notification_id uuid, issue_id uuid)
language sql security invoker set search_path = '' as $$
 select n.id,n.issue_id
 from public.cleanup_notifications n
 where n.id=any(notification_ids)
 and n.event_type in ('cleanup_issue_requested','cleanup_issue_replied','cleanup_issue_resolved','cleanup_issue_report_updated');
$$;
revoke all on function public.cleanup_issue_push_context(uuid[]) from public,anon,authenticated;
grant execute on function public.cleanup_issue_push_context(uuid[]) to service_role;
notify pgrst, 'reload schema';
