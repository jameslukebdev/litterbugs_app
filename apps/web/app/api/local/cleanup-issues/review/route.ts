import { localCleanupIssueTesting } from '@/lib/local-cleanup-issue-testing';
import { createClient } from '@/lib/supabase/server';
export async function POST(request:Request){
 if(!await localCleanupIssueTesting())return new Response(null,{status:404});
 if(request.headers.get('origin')&&new URL(request.headers.get('origin')!).host!==request.headers.get('host'))return new Response(null,{status:403});
 const body=await request.text();if(body.length>16384)return new Response(null,{status:413});
 let operation:unknown;try{const parsed=JSON.parse(body);operation=parsed.operation;if(parsed.enabled!==undefined)return new Response(null,{status:400});}catch{return new Response(null,{status:400});}
 if(!['list','get','alertPreferences'].includes(String(operation)))return new Response(null,{status:400});
 const client=await createClient();const {data:identity}=await client.auth.getClaims();if(!identity?.claims?.sub)return new Response(null,{status:401});
 const {data}=await client.auth.getSession();
 if(!data.session)return new Response(null,{status:401});
 const response=await fetch('http://127.0.0.1:62344/admin-cleanup-case',{method:'POST',headers:{Authorization:`Bearer ${data.session.access_token}`,'Content-Type':'application/json'},body,cache:'no-store',signal:AbortSignal.timeout(10000)});
 return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
}
