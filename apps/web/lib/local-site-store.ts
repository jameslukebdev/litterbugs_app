import 'server-only';
import { mkdir,readFile,writeFile,rename,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { headers } from 'next/headers';

export type LocalSiteOccurrence = {
  id:string;siteId:string;sourceReportId:string;reporterId:string;createdAt:string;
  title:string;litterTypes:string[];severity:string;notes:string;photoCount:number;
};
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const enabled=()=>process.env.NODE_ENV==='development'&&!process.env.VERCEL;
const directory=()=>process.env.LITTERBUGS_LOCAL_SITE_DIR||join(tmpdir(),'litterbugs-local-website-sites');
const file=()=>join(directory(),'occurrences.json');
export async function isLocalWebsite() {
  if(!enabled())return false;
  try {const host=(await headers()).get('host');return !!host&&['localhost','127.0.0.1','[::1]'].includes(new URL(`http://${host}`).hostname);}
  catch{return false;}
}
export async function readLocalOccurrences():Promise<LocalSiteOccurrence[]> {
  if(!enabled())return [];
  try {
    const value=JSON.parse(await readFile(file(),'utf8'));
    if(value.version!==1||!Array.isArray(value.reports)||value.reports.some((r:LocalSiteOccurrence)=>!uuid.test(r.id)||!uuid.test(r.siteId)||!uuid.test(r.sourceReportId)||!uuid.test(r.reporterId)||r.id===r.sourceReportId))throw new Error('Local report storage could not be read.');
    return value.reports;
  } catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
}
export async function localOccurrence(id:string) {
  return uuid.test(id)?(await readLocalOccurrences()).find(row=>row.id===id)??null:null;
}
/** Exclusive file lock also serializes Next's independent route/server bundles. */
async function withLocalWrite<T>(operation:()=>Promise<T>) {
  if(!enabled())throw new Error('Local report storage is unavailable.');
  await mkdir(directory(),{recursive:true,mode:0o700});
  const lock=join(directory(),'write.lock');
  let acquired=false;
  for(let attempt=0;attempt<100;attempt++) {
    try{await mkdir(lock,{mode:0o700});acquired=true;break;}
    catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;await new Promise(done=>setTimeout(done,25));}
  }
  if(!acquired)throw new Error('Another report is being saved. Try again.');
  try{return await operation();}finally{await rm(lock,{recursive:true,force:true});}
}
export async function saveLocalOccurrence(record:LocalSiteOccurrence,photos:Buffer[]) {
  if(!uuid.test(record.id)||!uuid.test(record.siteId)||!uuid.test(record.sourceReportId)||!uuid.test(record.reporterId)||record.id===record.sourceReportId||photos.length<1||photos.length>3)throw new Error('Invalid report.');
  return withLocalWrite(async()=>{
    const reports=await readLocalOccurrences();
    const existing=reports.find(row=>row.id===record.id);
    if(existing){if(existing.reporterId!==record.reporterId||existing.siteId!==record.siteId)throw new Error('Report unavailable.');return {reportId:existing.id,alreadyReported:false};}
    const current=reports.find(row=>row.siteId===record.siteId&&Date.parse(row.createdAt)+30*86400000>Date.now());
    if(current)return {reportId:current.id,alreadyReported:true};
    const photoDirectory=join(directory(),'photos');await mkdir(photoDirectory,{recursive:true,mode:0o700});
    const written:string[]=[];
    const temporary=join(directory(),`occurrences-${crypto.randomUUID()}.json`);
    try {
      for(let index=0;index<photos.length;index++) {
        const path=join(photoDirectory,`${record.id}-${index}.jpg`);
        await writeFile(path,photos[index],{mode:0o600,flag:'wx'});
        written.push(path);
      }
      await writeFile(temporary,JSON.stringify({version:1,reports:[...reports,{...record,photoCount:photos.length}]}),{mode:0o600});
      await rename(temporary,file());
    } catch(error) {
      await Promise.all([...written,temporary].map(path=>rm(path,{force:true})));
      throw error;
    }
    return {reportId:record.id,alreadyReported:false};
  });
}
export async function localOccurrencePhoto(id:string,index:number) {
  const record=await localOccurrence(id);
  if(!record||!Number.isInteger(index)||index<0||index>=record.photoCount)return null;
  return readFile(join(directory(),'photos',`${id}-${index}.jpg`));
}
