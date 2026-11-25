import 'server-only';
import { readFile } from 'node:fs/promises';
import { headers } from 'next/headers';
import { createHmac } from 'node:crypto';
type TestUser={id:string;email:string;password:string};
export type LocalIssueScenario='access'|'safety'|'missing';
export function localTotp(secret:string){
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const letter of secret.toUpperCase().replace(/=+$/,''))bits+=alphabet.indexOf(letter).toString(2).padStart(5,'0');
 const bytes=Buffer.from((bits.match(/.{8}/g)??[]).map(part=>parseInt(part,2)));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
 const hash=createHmac('sha1',bytes).update(counter).digest();const offset=hash[hash.length-1]&15;return ((hash.readUInt32BE(offset)&0x7fffffff)%1000000).toString().padStart(6,'0');
}
export async function localCleanupIssueTesting(scenario:LocalIssueScenario='access') {
 if(process.env.NODE_ENV!=='development'||process.env.VERCEL||process.env.NEXT_PUBLIC_CLEANUP_ISSUES_ENABLED!=='true'||!process.env.LITTERBUGS_LOCAL_TEST_USERS)return null;
 try{
  const backend=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??'');
  const host=(await headers()).get('host')??'';
  if(!['localhost','127.0.0.1','[::1]'].includes(backend.hostname)||!['localhost','127.0.0.1','[::1]'].includes(new URL(`http://${host}`).hostname))return null;
  const config=JSON.parse(await readFile(process.env.LITTERBUGS_LOCAL_TEST_USERS,'utf8')) as {reportId:string;reporter:TestUser;cleaner:TestUser;outsider:TestUser;admin:TestUser&{totp?:{factorId:string;secret:string}};scenarios?:Partial<Record<LocalIssueScenario,string>>};
  return {...config,scenario,reportId:config.scenarios?.[scenario]??config.reportId};
 }catch{return null;}
}
