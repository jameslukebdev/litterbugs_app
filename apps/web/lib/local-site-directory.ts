import 'server-only';
import type { Report } from '@litterbugs/report-contract';
import { createPublicClient } from './supabase/public';
import { readLocalOccurrences } from './local-site-store';
import { loadPublicReportShare } from './public-report-share';
import { isPubliclyShareableReport,isExpiredPublicReport } from './public-report-share-model';
import { collectReportPage,reportFeedStateMatches } from './public-report-feed-page';
import { publicReportHref } from './public-report-url';
import { sitePath } from './report-site-model';

export type DirectoryEntry={id:string;siteId:string;createdAt:string|null;completedAt:string|null;state:'available'|'in_progress'|'completed'|'expired'};
/** Group identities before pagination. Nearby coordinates never merge unrelated reports. */
const timestamp=(value:string|null)=>value&&Number.isFinite(Date.parse(value))?Date.parse(value):0;
export function groupLocalDirectory(entries:DirectoryEntry[],kind:'open'|'completed') {
  const groups=new Map<string,DirectoryEntry[]>();
  for(const entry of entries) groups.set(entry.siteId,[...(groups.get(entry.siteId)??[]),entry]);
  return [...groups.entries()].flatMap(([siteId,reports])=>{
    const completed=reports.filter(row=>row.state==='completed').sort((a,b)=>timestamp(b.completedAt??b.createdAt)-timestamp(a.completedAt??a.createdAt)||b.id.localeCompare(a.id));
    const current=reports.filter(row=>row.state==='available'||row.state==='in_progress').sort((a,b)=>timestamp(b.createdAt)-timestamp(a.createdAt)||b.id.localeCompare(a.id))[0];
    const report=kind==='completed'?completed[0]:current;
    return report?[{siteId,reportId:report.id,completedCount:completed.length,reportCount:reports.length,hasActiveReport:!!current,at:kind==='completed'?report.completedAt??report.createdAt:report.createdAt}]:[];
  }).sort((a,b)=>timestamp(b.at)-timestamp(a.at)||a.siteId.localeCompare(b.siteId));
}

export async function loadLocalSiteDirectory(kind:'open'|'completed',size:number,page:number) {
  const client=createPublicClient();
  const reports:Report[]=[];
  // Anonymous RLS applies to every row. These are read-only requests to the existing backend.
  for(let offset=0;;offset+=500) {
    const {data,error}=await client.from('reports').select('*').eq('is_published',true).eq('is_sample',false).order('id').range(offset,offset+499);
    if(error)throw error;
    reports.push(...(data??[]).filter(row=>row.title?.trim()&&isPubliclyShareableReport(row)));
    if(!data||data.length<500)break;
  }
  const completion=new Map<string,string>();
  const completedIds=reports.filter(row=>row.cleanup_state==='completed').map(row=>row.id);
  for(let start=0;start<completedIds.length;start+=100) {
    const {data,error}=await client.from('cleanup_attempts').select('report_id,completed_at').in('report_id',completedIds.slice(start,start+100)).eq('status','completed').not('final_submission_id','is',null).order('completed_at',{ascending:false});
    if(error)throw error;
    for(const row of data??[])if(row.completed_at&&!completion.has(row.report_id))completion.set(row.report_id,row.completed_at);
  }
  const entries:DirectoryEntry[]=reports.map(row=>({id:row.id,siteId:row.cleanup_site_id??row.id,createdAt:row.created_at,completedAt:completion.get(row.id)??null,state:isExpiredPublicReport(row)?'expired':row.cleanup_state==='completed'?'completed':row.cleanup_state==='available'?'available':'in_progress'}));
  for(const record of await readLocalOccurrences()) {
    const source=entries.find(row=>row.id===record.sourceReportId);
    if(!source||source.state!=='completed'||source.siteId!==record.siteId)continue;
    entries.push({id:record.id,siteId:record.siteId,createdAt:record.createdAt,completedAt:null,state:Date.parse(record.createdAt)+30*86400000>Date.now()?'available':'expired'});
  }
  const groups=groupLocalDirectory(entries,kind);
  const result=await collectReportPage(async(offset,count)=>groups.slice(offset,offset+count),()=>true,async row=>{
    const report=await loadPublicReportShare(row.reportId,'linked');
    return report&&reportFeedStateMatches(kind,report.state)?{...report,siteLink:{id:row.siteId,href:row.reportCount>1?sitePath(row.siteId):publicReportHref(report),completedCount:row.completedCount,reportCount:row.reportCount,hasActiveReport:row.hasActiveReport}}:null;
  },size,page);
  return {...result,unavailable:false};
}
