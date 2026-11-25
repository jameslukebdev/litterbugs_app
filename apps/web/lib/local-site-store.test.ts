import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('next/headers',()=>({headers:async()=>new Headers({host:'localhost:3000'})}));
import {saveLocalOccurrence,readLocalOccurrences,localOccurrencePhoto,isLocalWebsite} from './local-site-store';
const record={id:'10000000-0000-4000-8000-000000000001',siteId:'10000000-0000-4000-8000-000000000002',sourceReportId:'10000000-0000-4000-8000-000000000002',reporterId:'20000000-0000-4000-8000-000000000001',createdAt:new Date().toISOString(),title:'Litter again',litterTypes:['Cans'],severity:'Low',notes:'',photoCount:1};
let directory:string;
afterEach(async()=>{vi.unstubAllEnvs();if(directory)await rm(directory,{recursive:true,force:true});});
async function setup(){directory=await mkdtemp(join(tmpdir(),'litterbugs-local-store-test-'));vi.stubEnv('NODE_ENV','development');vi.stubEnv('VERCEL','');vi.stubEnv('LITTERBUGS_LOCAL_SITE_DIR',directory);}
it('serializes competing reports, preserves authors/photos and recovers an uncertain save',async()=>{
 await setup();
 const other={...record,id:'10000000-0000-4000-8000-000000000003',reporterId:'20000000-0000-4000-8000-000000000003'};
 const results=await Promise.all([saveLocalOccurrence(record,[Buffer.from('first')]),saveLocalOccurrence(other,[Buffer.from('second')])]);
 expect(results.filter(row=>!row.alreadyReported)).toHaveLength(1);
 const [stored]=await readLocalOccurrences();
 expect(await saveLocalOccurrence(stored,[Buffer.from('retry')])).toEqual({reportId:stored.id,alreadyReported:false});
 expect(await readLocalOccurrences()).toEqual([stored]);
 expect((await localOccurrencePhoto(stored.id,0))?.toString()).toBe(stored.id===record.id?'first':'second');
 expect(await localOccurrencePhoto(stored.id,99)).toBeNull();
 await expect(saveLocalOccurrence({...stored,reporterId:crypto.randomUUID()},[Buffer.from('bad')])).rejects.toThrow('unavailable');
});
it('cannot read or write local occurrences on a deployed environment',async()=>{
 await setup();vi.stubEnv('VERCEL','1');
 expect(await isLocalWebsite()).toBe(false);
 expect(await readLocalOccurrences()).toEqual([]);
 await expect(saveLocalOccurrence(record,[Buffer.from('a')])).rejects.toThrow('unavailable');
});
it('uses the actual lifecycle when the website is connected to a loopback Supabase stack',async()=>{
 await setup();vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','http://127.0.0.1:62331');
 expect(await isLocalWebsite()).toBe(false);
});
