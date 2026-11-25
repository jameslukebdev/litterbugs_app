import { localCleanupIssueTesting } from '@/lib/local-cleanup-issue-testing';
import { createClient } from '@/lib/supabase/server';
export async function POST(request:Request){
 const config=await localCleanupIssueTesting();if(!config)return new Response(null,{status:404});
 const host=request.headers.get('host')??'';const origin=request.headers.get('origin');if(origin&&new URL(origin).host!==host)return new Response(null,{status:403});
 const body=await request.formData(),role=body.get('role');
 if(role!=='cleaner'&&role!=='reporter'&&role!=='outsider')return new Response(null,{status:400});
 const client=await createClient();await client.auth.signOut();
 const result=await client.auth.signInWithPassword({email:config[role].email,password:config[role].password});
 if(result.error)return Response.json({error:'Local account could not be opened.'},{status:503});
 const href=role==='cleaner'?`/account/reports/${config.reportId}?from=current&task=cleanup`:role==='reporter'?'/account/notifications':`/reports/${config.reportId}`;
 return new Response(null,{status:303,headers:{Location:new URL(href,`http://${host}`).toString(),'Cache-Control':'no-store'}});
}
