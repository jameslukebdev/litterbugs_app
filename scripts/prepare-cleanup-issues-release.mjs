// Generates an atomic, guarded SQL release. This script NEVER connects to a DB.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const index=process.argv.indexOf('--output');
if(index<0||!process.argv[index+1])throw Error('Use --output <private SQL file>; execution requires separate live-release approval.');
const root=fileURLToPath(new URL('../',import.meta.url));
const names=['20261125171211_cleanup_site_issues.sql','20261125175248_cleanup_issue_team_decisions.sql','20261125193511_cleanup_issue_notification_links.sql'];
const migrations=names.map(name=>{const source=readFileSync(root+'supabase/migrations/'+name,'utf8');
 const starts=source.match(/^begin;\s*$/gmi)??[],ends=source.match(/^commit;\s*$/gmi)??[];
 if(starts.length!==ends.length||starts.length>1)throw Error('Unexpected transaction boundaries in '+name);
 return {name,source,body:source.replace(/^begin;\s*$/mi,'').replace(/^commit;\s*$/mi,''),sha:createHash('sha256').update(source).digest('hex')};});
const tables=[['public.reports',['cleanup_issue_hold','content_revision','additional_information']],['public.cleanup_attempts',['issue_paused_at','issue_pause_total','report_content_revision']],['public.cleanup_contributions',['report_content_revision']],['public.cleanup_notifications',['issue_id','issue_message_id']],...['cleanup_notification_deliveries','cleanup_submissions','cleanup_submission_photos','cleanup_reviews','reporter_rewards','cleaner_payout_accounts','cleanup_admin_cases'].map(name=>['public.'+name,[]]),['private.weekly_email_preferences',[]]];
const rows=tables.map(([name,ignored])=>`('${name}',array[${ignored.map(value=>`'${value}'`).join(',')}]::text[])`).join(',\n');
let sql=`-- GENERATED FOR A LATER APPROVED LIVE RELEASE. DO NOT RUN DURING READINESS CHECKS.
-- Intended project: mvaygkflcjswtwchflrk. Verify CLI target separately.
-- Existing backend expiry definition verified read-only on November25.
begin;
set local lock_timeout='5s';
set local statement_timeout='120s';
select pg_advisory_xact_lock(hashtext('litterbugs-cleanup-issues-20261125'));
do $$ begin
 if to_regclass('public.cleanup_issues') is not null then raise exception 'Issue schema already exists; inspect migration state'; end if;
 if md5(pg_get_functiondef('private.expire_cleanup_claim(uuid,timestamptz)'::regprocedure))<>'534b5e8aba7b56df5219501bedf90da2' then raise exception 'Existing backend changed; re-review before release'; end if;
 if exists(select 1 from supabase_migrations.schema_migrations where version in ('20261125171211','20261125175248','20261125193511')) then raise exception 'Issue migration history already present'; end if;
end $$;
create function pg_temp.release_data_fingerprint(target regclass,ignored text[])
returns table(row_count bigint,data_hash text) language plpgsql as $$ begin
 return query execute format('select count(*),md5(coalesce(string_agg((to_jsonb(t)-$1)::text,chr(10) order by (to_jsonb(t)-$1)::text),'''')) from %s t',target) using ignored;
end $$;
create temp table release_tables(name text,ignored text[]);
insert into release_tables values ${rows};
-- Hold these existing rows stable while checking that DDL preserves all original data.
do $$ declare item record; begin for item in select * from release_tables loop
 if to_regclass(item.name) is not null then execute format('lock table %s in share mode',item.name::regclass); end if;
end loop; end $$;
create temp table release_before(name text,ignored text[],row_count bigint,data_hash text);
insert into release_before select t.name,t.ignored,f.* from release_tables t cross join lateral pg_temp.release_data_fingerprint(to_regclass(t.name),t.ignored) f where to_regclass(t.name) is not null;
create temp table release_functions as select p.oid,md5(pg_get_functiondef(p.oid)) hash from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and not(n.nspname='private' and p.proname='expire_cleanup_claim') and p.prokind='f';
`;
for(const migration of migrations){const version=migration.name.slice(0,14),name=migration.name.slice(15,-4),tag='$lb_'+version+'$';if(migration.source.includes(tag))throw Error('SQL quote collision');
 sql+=`\n-- ${migration.name}; SHA256 ${migration.sha}\n${migration.body}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${name}',array[${tag}${migration.source}${tag}]);\n`;}
sql+=`\ndo $$ declare item record; after_row record; begin
 for item in select * from release_before loop
  select * into after_row from pg_temp.release_data_fingerprint(item.name::regclass,item.ignored);
  if after_row.row_count<>item.row_count or after_row.data_hash<>item.data_hash then raise exception 'Existing data changed in %; transaction aborted',item.name; end if;
 end loop;
 if exists(select 1 from release_functions f left join pg_proc p on p.oid=f.oid where p.oid is null or md5(pg_get_functiondef(p.oid))<>f.hash) then raise exception 'Unrelated function changed; transaction aborted'; end if;
 if has_function_privilege('anon','public.cleanup_issue_push_context(uuid[])','execute') or has_function_privilege('authenticated','public.cleanup_issue_push_context(uuid[])','execute') then raise exception 'Private push destination privilege regression'; end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('cleanup_issues','cleanup_issue_messages','report_content_revisions') and not c.relrowsecurity) then raise exception 'Private data lacks RLS'; end if;
end $$;
commit;
`;
writeFileSync(process.argv[index+1],sql,{mode:0o600});
console.log('Generated guarded release for three migrations; no database connection or execution.');
