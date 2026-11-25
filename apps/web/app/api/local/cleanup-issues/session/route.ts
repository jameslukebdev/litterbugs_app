import { localCleanupIssueTesting, localTotp } from '@/lib/local-cleanup-issue-testing';
import { createClient } from '@/lib/supabase/server';
export async function POST(request:Request){
 if(!await localCleanupIssueTesting())return new Response(null,{status:404});
 let body:FormData;try{body=await request.formData();}catch{return new Response(null,{status:400});}
 const scenario=body.get('scenario');
 const config=await localCleanupIssueTesting(scenario==='safety'||scenario==='missing'?scenario:'access');if(!config)return new Response(null,{status:404});
 const host=request.headers.get('host')??'';const origin=request.headers.get('origin');if(origin&&new URL(origin).host!==host)return new Response(null,{status:403});
 const role=body.get('role');
 if(role!=='cleaner'&&role!=='reporter'&&role!=='outsider'&&role!=='admin')return new Response(null,{status:400});
 const client=await createClient();await client.auth.signOut();
 const result=await client.auth.signInWithPassword({email:config[role].email,password:config[role].password});
 if(result.error)return Response.json({error:'Local account could not be opened.'},{status:503});
 if(role==='admin'){
  const totp=config.admin.totp;if(!totp)return new Response('Local MFA fixture is not ready.',{status:503});
  const verified=await client.auth.mfa.challengeAndVerify({factorId:totp.factorId,code:localTotp(totp.secret)});
  if(verified.error)return new Response('Local team verification failed. Try again after the authenticator code changes.',{status:503});
 }
 const href=role==='admin'?'/admin':role==='cleaner'?`/account/reports/${config.reportId}?from=current&task=cleanup`:role==='reporter'?'/account/notifications':`/reports/${config.reportId}`;
 return new Response(null,{status:303,headers:{Location:new URL(href,`http://${host}`).toString(),'Cache-Control':'no-store'}});
}
