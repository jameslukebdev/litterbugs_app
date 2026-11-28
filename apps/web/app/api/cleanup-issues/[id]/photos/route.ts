import { createClient } from '@/lib/supabase/server';
import { cleanupIssuesEnabled, issueClient } from '@/lib/cleanup-issues';
import { realUserIdFromClaims } from '@/lib/report-access';
export const runtime='nodejs';
const noStore={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie, Authorization'};
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 if(!cleanupIssuesEnabled)return new Response(null,{status:404,headers:noStore});
 const {id}=await params,path=new URL(request.url).searchParams.get('path')??'';
 if(!/^[0-9a-f-]{36}$/i.test(id)||!path||path.length>300||path.split('/').includes('..'))return new Response(null,{status:404,headers:noStore});
 const client=await createClient(),{data:auth}=await client.auth.getClaims();
 if(!realUserIdFromClaims(auth?.claims))return new Response(null,{status:401,headers:noStore});
 const {data,error}=await issueClient(client).from('cleanup_issue_messages').select('id').eq('issue_id',id).contains('photo_paths',[path]).limit(1).maybeSingle();
 if(error||!data)return new Response(null,{status:404,headers:noStore});
 const source=await client.storage.from('cleanup_issue_photos').download(path);
 if(source.error||!source.data||source.data.size>5*1024*1024)return new Response(null,{status:404,headers:noStore});
 return new Response(source.data,{headers:{...noStore,'Content-Type':'image/jpeg'}});
}
