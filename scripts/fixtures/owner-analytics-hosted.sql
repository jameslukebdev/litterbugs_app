-- Run inside a rollback-only transaction. No user or business fixture writes.
do $check$
declare
 admin_id uuid;
 claims jsonb;
 result jsonb;
 cached jsonb;
 lease_id uuid;
 denied boolean;
 observation jsonb := jsonb_build_object('status','live','updatedAt',now(),
  'window',jsonb_build_object('start',now()-interval '72 hours','end',now(),'timezone','UTC · rolling 72 hours'),
  'data',jsonb_build_object('sessions',29,'rageSessions',null,'deadSessions',null,'quickBackSessions',null,'scriptErrorSessions',null,'rageRate',0,'deadRate',0.069,'quickBackRate',null,'scriptErrorRate',0));
begin
 select user_id into strict admin_id from public.cleanup_admin_memberships where active order by user_id limit 1;
 if has_function_privilege('anon','public.owner_analytics_business()','execute')
   or has_function_privilege('anon','public.owner_analytics_clarity_cache(uuid,jsonb)','execute')
   or has_table_privilege('authenticated','private.owner_analytics_cache','select') then raise exception 'analytics public grant'; end if;
 claims:=jsonb_build_object('sub',admin_id,'role','authenticated','is_anonymous',false,'aal','aal1');
 perform set_config('request.jwt.claims',claims::text,true);
 set local role authenticated;
 denied:=false;
 begin perform public.owner_analytics_business(); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'aal1 business access'; end if;
 denied:=false;
 begin perform public.owner_analytics_clarity_cache(); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'aal1 cache access'; end if;
 perform set_config('request.jwt.claims',(claims||jsonb_build_object('aal','aal2','sub','00000000-0000-0000-0000-000000000000'))::text,true);
 denied:=false;
 begin perform public.owner_analytics_business(); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'nonadmin access'; end if;
 perform set_config('request.jwt.claims',(claims||'{"aal":"aal2"}'::jsonb)::text,true);
 result:=public.owner_analytics_business();
 if jsonb_array_length(result)<>2 then raise exception 'missing business periods'; end if;
 reset role;
 -- Force a fresh cache only inside this rollback transaction.
 delete from private.owner_analytics_cache;
 set local role authenticated;
 result:=public.owner_analytics_clarity_cache();
 if result->>'claimed'<>'true' then raise exception 'initial reservation'; end if;
 lease_id:=(result->>'lease')::uuid;
 cached:=public.owner_analytics_clarity_cache();
 if cached->>'claimed'<>'false' then raise exception 'duplicate quota spent'; end if;
 denied:=false;
 begin perform public.owner_analytics_clarity_cache(lease_id,observation||'{"email":"private@example.invalid"}'); exception when check_violation then denied:=true; end;
 if not denied then raise exception 'private payload accepted'; end if;
 perform public.owner_analytics_clarity_cache(lease_id,observation);
 denied:=false;
 begin perform public.owner_analytics_clarity_cache(lease_id,observation); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'lease replay'; end if;
 cached:=public.owner_analytics_clarity_cache();
 if cached->>'claimed'<>'false' or cached->'source' is distinct from observation then raise exception 'shared cache missing'; end if;
 reset role;
 update private.owner_analytics_cache set next_attempt_at='-infinity', attempts=8, attempt_day=(now() at time zone 'UTC')::date;
 set local role authenticated;
 if public.owner_analytics_clarity_cache()->>'claimed'<>'false' then raise exception 'daily budget exceeded'; end if;
 reset role;
end;
$check$;
