'use client';
/* eslint-disable @next/next/no-img-element -- Local image previews. */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IoChevronForward, IoClose, IoChevronDown, IoHelpCircleOutline, IoFlagOutline, IoImageOutline, IoLockClosedOutline, IoReturnUpBackOutline } from 'react-icons/io5';
import { ModalShell } from '@/components/modal-shell';
import { cleanupIssuesEnabled, issueClient, issueError, issueHref, issueReasons, issueStatus, type CleanupIssue, type IssueMessage, type IssueReason } from '@/lib/cleanup-issues';
import { createClient } from '@/lib/supabase/client';
import { notifyDataChanged, useDataRefresh } from '@/lib/use-data-refresh';
import { prepareBrowserPhotos } from '@/lib/prepare-browser-photo';
import { uploadSecureBrowserMedia } from '@/lib/secure-media-upload';
import { usePhotoPreviews } from '@/lib/use-photo-previews';
import s from './cleanup-issues.module.css';

export function useReportCleanupIssue(reportId:string,userId:string|null) {
 const revision=useDataRefresh(10_000),[retry,setRetry]=useState(0);
 const [snapshot,setSnapshot]=useState<{key:string;issue:CleanupIssue|null;message:IssueMessage|null;failed:boolean}>();
 const key=`${reportId}:${userId}`;
 useEffect(()=>{
  if(!cleanupIssuesEnabled||!userId)return;
  let active=true;
  void (async()=>{
   const client=issueClient(createClient());
   const row=await client.from('cleanup_issues').select('*').eq('report_id',reportId).order('created_at',{ascending:false}).limit(1).maybeSingle();
   if(row.error)throw row.error;
   const message=row.data?await client.from('cleanup_issue_messages').select('*').eq('issue_id',row.data.id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1).maybeSingle():{data:null,error:null};
   if(message.error)throw message.error;
   if(active)setSnapshot({key,issue:row.data,message:message.data,failed:false});
  })().catch(()=>{if(active)setSnapshot(previous=>({key,issue:previous?.key===key?previous.issue:null,message:previous?.key===key?previous.message:null,failed:true}));});
  return()=>{active=false;};
 },[key,reportId,userId,revision,retry]);
 const current=snapshot?.key===key?snapshot:undefined;
 return {issue:current?.issue??null,message:current?.message??null,loading:cleanupIssuesEnabled&&!!userId&&!current,failed:!!current?.failed,retry:()=>setRetry(v=>v+1)};
}
export function CleanupIssueShortcut({issue,message,userId}:{issue:CleanupIssue;message?:IssueMessage|null;userId:string}) {
 return <Link className={s.shortcut} data-resolved={issue.status==='resolved'} href={issueHref(issue.id)}><strong><IoLockClosedOutline />{issueStatus(issue,userId)}</strong>{message&&issue.status!=='resolved'&&<p>{message.body}</p>}<small>{issue.status==='resolved'?'View conversation':issue.status==='awaiting_cleaner'?'View response':'View conversation'}<IoChevronForward /></small></Link>;
}
export function ReportIssueAccess({reportId,userId}:{reportId:string;userId:string|null}) {
 const state=useReportCleanupIssue(reportId,userId);
 if(!cleanupIssuesEnabled||!userId)return null;
 return <>{state.issue&&<CleanupIssueShortcut issue={state.issue} message={state.message} userId={userId}/ >}{state.failed&&<p className={s.error}>Cleanup updates could not be loaded. <button className={s.utility} onClick={state.retry}>Try again</button></p>}</>;
}
export function CleanupIssueTools({attemptId,reporterId,userId,onGiveBack,disabled=false}:{attemptId:string;reporterId:string|null;userId:string;onGiveBack:()=>void;disabled?:boolean}) {
 const [menu,setMenu]=useState(false),[request,setRequest]=useState(false);
 const anchor=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!menu)return;
  const close=(event:PointerEvent)=>{if(!anchor.current?.contains(event.target as Node))setMenu(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenu(false);};
  document.addEventListener('pointerdown',close);window.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',close);window.removeEventListener('keydown',escape);};
 },[menu]);
 if(!cleanupIssuesEnabled)return null;
 return <><div className={s.utilityMenu} ref={anchor}><button className={s.optionsButton} aria-label="Cleanup options" aria-haspopup="menu" aria-expanded={menu} disabled={disabled} onClick={()=>setMenu(v=>!v)}><IoHelpCircleOutline/><span>Cleanup options</span><IoChevronDown/></button>{menu&&<div className={s.menu} role="menu">{reporterId!==userId&&<button role="menuitem" onClick={()=>{setMenu(false);setRequest(true);}}><IoFlagOutline/>Report an issue</button>}<button role="menuitem" onClick={()=>{setMenu(false);onGiveBack();}}><IoReturnUpBackOutline/>Give back cleanup</button></div>}</div>{request&&<CleanupIssueRequest key={attemptId} attemptId={attemptId} userId={userId} onClose={()=>setRequest(false)}/>}</>;
}
function CleanupIssueRequest({attemptId,userId,onClose}:{attemptId:string;userId:string;onClose:()=>void}) {
 const router=useRouter(),[reason,setReason]=useState<IssueReason>('access'),[body,setBody]=useState(''),[keep,setKeep]=useState(true);
 const [files,setFiles]=useState<File[]>([]),[busy,setBusy]=useState(''),[error,setError]=useState(''),[uploadsLocked,setUploadsLocked]=useState(false);
 const needsReview=['unsafe','moved','missing'].includes(reason);
 const requestId=useRef(crypto.randomUUID()),paths=useRef<string[]>([]),previews=usePhotoPreviews(files);
 async function addFiles(selected:File[]){if(busy||paths.current.length)return;setBusy('Preparing photo…');setError('');try{const prepared=await prepareBrowserPhotos(selected.slice(0,3-files.length));setFiles(value=>[...value,...prepared]);}catch(failure){setError(failure instanceof Error?failure.message:'The photo could not be prepared.');}finally{setBusy('');}}
 async function send(){
  if(busy||!body.trim())return;setBusy('Sending…');setError('');
  try{
   for(let index=paths.current.length;index<files.length;index++){setBusy('Checking photo…');paths.current.push(await uploadSecureBrowserMedia({supabase:createClient(),userId,kind:'issue',file:files[index],subjectId:attemptId}));setUploadsLocked(true);}
   const result=await issueClient(createClient()).rpc('open_cleanup_issue',{target_cleanup_id:attemptId,request_id:requestId.current,issue_reason:reason,message_body:body.trim(),keeps_claim:keep,message_photos:paths.current});
   if(result.error)throw result.error;
   notifyDataChanged();onClose();router.push(issueHref(result.data.id));router.refresh();
  }catch(failure){setError(issueError(failure));}finally{setBusy('');}
 }
 return <ModalShell onClose={onClose} label="Report a cleanup issue" closeDisabled={!!busy} className={s.request}>
  <h2>Report an issue</h2><div className={s.privacy}><IoLockClosedOutline/><strong>Private</strong><small>Cleaner, reporter &amp; Litterbugs</small></div>
  <fieldset disabled={!!busy}><legend className="sr-only">Issue type</legend>{issueReasons.map(([value,label])=><label className={s.reason} key={value}><span>{label}</span><input type="radio" name="cleanup-issue-reason" checked={reason===value} onChange={()=>{setReason(value);if(value==='unsafe'||value==='missing')setKeep(false);}}/></label>)}</fieldset>
  <label className={s.field}>Details<textarea aria-label="Issue details" value={body} maxLength={2000} onChange={event=>setBody(event.target.value)} disabled={!!busy}/></label>
  <label className={s.photoUtility}><IoImageOutline/>Add photo<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple disabled={!!busy||files.length>=3||uploadsLocked} onChange={event=>{void addFiles(Array.from(event.target.files??[]));event.target.value='';}}/></label>
  {!!files.length&&<div className={s.photoPreviews}>{files.map((file,index)=><div key={`${file.name}-${index}`}>{previews[index]&&<img src={previews[index]} alt={file.name}/>}<button disabled={!!busy||uploadsLocked} aria-label={`Remove ${file.name}`} onClick={()=>setFiles(value=>value.filter((_,i)=>i!==index))}><IoClose/></button></div>)}</div>}
  <fieldset disabled={!!busy}><legend>Your cleanup</legend><div className={s.choice}><label><input type="radio" name="keep-claim" checked={keep} onChange={()=>setKeep(true)}/>Keep it</label><label><input type="radio" name="keep-claim" checked={!keep} onChange={()=>setKeep(false)}/>Give it back</label></div></fieldset>
  <p className={s.status}>{needsReview?'Litterbugs review required.':keep?'Claim clock pauses until the issue is resolved.':'The site stays paused until the issue is resolved.'}</p>
  {error&&<p className={s.error} role="alert">{error}</p>}
  <div className={s.actions}><button className={s.primary} onClick={()=>void send()} disabled={!body.trim()||!!busy}>{busy||(needsReview?'Send for review':'Notify reporter')}</button></div>
 </ModalShell>;
}
