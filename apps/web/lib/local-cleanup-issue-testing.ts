import 'server-only';
import { readFile } from 'node:fs/promises';
import { headers } from 'next/headers';
type TestUser={id:string;email:string;password:string};
export async function localCleanupIssueTesting() {
 if(process.env.NODE_ENV!=='development'||process.env.VERCEL||process.env.NEXT_PUBLIC_CLEANUP_ISSUES_ENABLED!=='true'||!process.env.LITTERBUGS_LOCAL_TEST_USERS)return null;
 try{
  const backend=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??'');
  const host=(await headers()).get('host')??'';
  if(!['localhost','127.0.0.1','[::1]'].includes(backend.hostname)||!['localhost','127.0.0.1','[::1]'].includes(new URL(`http://${host}`).hostname))return null;
  const config=JSON.parse(await readFile(process.env.LITTERBUGS_LOCAL_TEST_USERS,'utf8')) as {reportId:string;reporter:TestUser;cleaner:TestUser;outsider:TestUser};
  return config;
 }catch{return null;}
}
