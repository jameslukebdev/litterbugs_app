'use client';
import {useEffect,useState} from 'react';
import type {Database,Report} from '@litterbugs/report-contract';
import {cleanupIssuesEnabled,issueClient} from './cleanup-issues';
import {createClient} from './supabase/client';
import {getReportCardPhotoUrl} from './report-photo';
type Attempt=Database['public']['Tables']['cleanup_attempts']['Row'];
export function useClaimedReportPhoto(report:Report,attempt:Attempt|null,userId:string|null){
 const revision=(attempt as Attempt&{report_content_revision?:number}|null)?.report_content_revision??1;
 const key=`${report.id}:${attempt?.id??''}:${revision}:${userId??''}`;
 const [snapshot,setSnapshot]=useState<{key:string;path:string|null}>();
 useEffect(()=>{
  if(!cleanupIssuesEnabled||!attempt)return;
  let active=true;
  void issueClient(createClient()).from('report_content_revisions').select('photo_paths').eq('report_id',report.id).eq('revision',revision).maybeSingle().then(({data,error})=>{if(active&&!error)setSnapshot({key,path:data?.photo_paths[0]??null});});
  return()=>{active=false;};
 },[key,report.id,attempt,revision]);
 if(!cleanupIssuesEnabled||!attempt)return report.photo_paths?.[0]?getReportCardPhotoUrl(report.photo_paths[0]):null;
 const path=snapshot?.key===key?snapshot.path??report.photo_paths?.[0]:null;
 return path?getReportCardPhotoUrl(path,report.id):null;
}
