'use client';
/* eslint-disable @next/next/no-img-element -- Authenticated private media endpoint. */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IoArrowBack, IoChevronDown, IoClose, IoImageOutline, IoLockClosedOutline } from 'react-icons/io5';
import { createClient } from '@/lib/supabase/client';
import { issueClient, issueError, issueReasons, issueStatus, type CleanupIssue, type IssueMessage, type ReportContentRevision } from '@/lib/cleanup-issues';
import { notifyDataChanged, useDataRefresh } from '@/lib/use-data-refresh';
import { getReportDetailPhotoUrl } from '@/lib/report-photo';
import { usePhotoPreviews } from '@/lib/use-photo-previews';
import { prepareBrowserPhotos } from '@/lib/prepare-browser-photo';
import { uploadSecureBrowserMedia } from '@/lib/secure-media-upload';
import s from './cleanup-issues.module.css';

export function CleanupIssueConversation({initialIssue,initialMessages,userId,title,names,isAdmin}:{
 initialIssue:CleanupIssue;initialMessages:IssueMessage[];userId:string;title:string;names:Record<string,string>;isAdmin:boolean;
}) {
 const router=useRouter(), revision=useDataRefresh(10_000);
 const [issue,setIssue]=useState(initialIssue),[messages,setMessages]=useState(initialMessages);
 const [reportUpdate,setReportUpdate]=useState<ReportContentRevision|null>(null);
 const [body,setBody]=useState(''),[files,setFiles]=useState<File[]>([]),[busy,setBusy]=useState(''),[error,setError]=useState(''),[uploadsLocked,setUploadsLocked]=useState(false);
 const [failed,setFailed]=useState(false),[retry,setRetry]=useState(0),[followUp,setFollowUp]=useState(false);
 const requestId=useRef(crypto.randomUUID()),paths=useRef<string[]>([]),previewUrls=usePhotoPreviews(files);
 const cleaner=userId===issue.cleaner_id, reporter=userId===issue.reporter_id;
 const latest=messages[messages.length-1];
 const earlier=messages.slice(0,-1);
 const resolved=issue.status==='resolved';
 const ready=cleaner&&issue.status==='awaiting_cleaner'&&!issue.requires_team_review&&!resolved;
 const canReply=(cleaner||reporter)&&!resolved;
 const back=`/account/reports/${issue.report_id}${cleaner?'?from=current&task=cleanup':''}`;
 useEffect(()=>{
  let active=true;
  const client=issueClient(createClient());
  void Promise.all([
   client.from('cleanup_issues').select('*').eq('id',initialIssue.id).single(),
   client.from('cleanup_issue_messages').select('*').eq('issue_id',initialIssue.id).order('created_at').order('id'),
   client.from('report_content_revisions').select('*').eq('report_id',initialIssue.report_id).gte('created_at',initialIssue.created_at).order('revision',{ascending:false}).limit(1).maybeSingle(),
  ]).then(([thread,rows,update])=>{
   if(!active)return;
   if(thread.error||rows.error||update.error){setFailed(true);return;}
   setIssue(thread.data);setMessages(rows.data);setReportUpdate(update.data);setFailed(false);
  },()=>{if(active)setFailed(true);});
  return()=>{active=false;};
 },[initialIssue.id,initialIssue.report_id,initialIssue.created_at,revision,retry]);
 useEffect(()=>{
  // Read receipt is separate from the durable thread; missing a notification never
  // removes the report's response shortcut.
  void createClient().from('cleanup_notifications').update({read_at:new Date().toISOString()})
   .eq('user_id',userId).filter('issue_id','eq',initialIssue.id).is('read_at',null).then(()=>{});
 },[initialIssue.id,userId]);
 async function send() {
  if(busy||!body.trim())return;setBusy('Sending…');setError('');
  try {
   for(let index=paths.current.length;index<files.length;index++){
    setBusy('Checking photo…');
    paths.current.push(await uploadSecureBrowserMedia({supabase:createClient(),userId,kind:'issue',file:files[index],subjectId:issue.cleanup_attempt_id}));setUploadsLocked(true);
   }
   setBusy('Sending…');
   const result=await issueClient(createClient()).rpc('reply_cleanup_issue',{
    target_issue_id:issue.id,message_id:requestId.current,expected_version:issue.version,message_body:body.trim(),message_photos:paths.current,
   });
   if(result.error)throw result.error;
   setIssue(result.data);setBody('');setFiles([]);paths.current=[];setUploadsLocked(false);requestId.current=crypto.randomUUID();setFollowUp(false);setRetry(v=>v+1);notifyDataChanged();
  } catch(failure){setError(issueError(failure));}finally{setBusy('');}
 }
 async function resolve(admin=false) {
  if(busy)return;setBusy(admin?'Saving…':'Resuming…');setError('');
  try{
   const client=issueClient(createClient());
   const result=admin?await client.rpc('review_cleanup_issue',{target_issue_id:issue.id,expected_version:issue.version})
    :await client.rpc('resolve_cleanup_issue',{target_issue_id:issue.id,expected_version:issue.version});
   if(result.error)throw result.error;
   setIssue(result.data);notifyDataChanged();
   if(!admin){router.push(back);router.refresh();}
  }catch(failure){setError(issueError(failure));}finally{setBusy('');}
 }
 async function addFiles(selected:File[]) {
  if(busy||paths.current.length)return;setBusy('Preparing photo…');setError('');
  try{const next=await prepareBrowserPhotos(selected.slice(0,3-files.length));setFiles(value=>[...value,...next]);}
  catch(failure){setError(failure instanceof Error?failure.message:'The photo could not be prepared.');}finally{setBusy('');}
 }
 const message=(row:IssueMessage)=><article className={s.message} data-reporter={row.author_id===issue.reporter_id} key={row.id}>
  <div className={s.author}><span className={s.avatar}>{((row.author_id?names[row.author_id]:'')||'M')[0]}</span><div><strong>{(row.author_id?names[row.author_id]:null)||'Former member'}</strong><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time></div></div>
  <p>{row.body}</p>{!!row.photo_paths.length&&<div className={s.photos}>{row.photo_paths.map(path=><img key={path} src={`/api/cleanup-issues/${issue.id}/photos?${new URLSearchParams({path})}`} alt="Photo attached to private cleanup message" />)}</div>}
 </article>;
 return <main className={s.page}>
  <Link className={s.back} href={back}><IoArrowBack />Back to report</Link>
  <header className={s.header}><div className={s.headerActions}><span className={s.tag} data-resolved={resolved}>{issueStatus(issue,userId)}</span>{reporter&&!resolved&&<Link className={s.utility} href={`/account/reports/${issue.report_id}/edit?issue=${issue.id}`}>Edit public report</Link>}</div><h1>{issueReasons.find(([value])=>value===issue.reason)?.[1]||'Cleanup issue'}</h1><p>{title}</p></header>
  <div className={s.privacy}><IoLockClosedOutline /><strong>Private</strong><small>{names[issue.cleaner_id??'']||'Cleaner'}, {names[issue.reporter_id??'']||'Reporter'} &amp; Litterbugs</small></div>
  {failed&&<p className={s.error} role="alert">Updates could not be refreshed. <button className={s.utility} onClick={()=>setRetry(v=>v+1)}>Try again</button></p>}
  {latest&&<><p className={s.latestLabel}>{latest.author_id===userId?'Your latest message':'Latest reply'}</p>{message(latest)}</>}
  {!!earlier.length&&<details className={s.earlier}><summary>Earlier messages ({earlier.length})<IoChevronDown /></summary>{earlier.map(message)}</details>}
  {reportUpdate&&<details className={s.earlier} key={reportUpdate.revision} open={!latest||Date.parse(reportUpdate.created_at)>Date.parse(latest.created_at)}><summary>Public report updated<IoChevronDown/></summary><div className={s.information}>{reportUpdate.notes_other&&<p>{reportUpdate.notes_other}</p>}{reportUpdate.additional_information&&<><h3>Additional information</h3><p>{reportUpdate.additional_information}</p></>}<div className={s.photos}>{reportUpdate.photo_paths.map(path=><img key={path} src={getReportDetailPhotoUrl(path,issue.report_id)??undefined} alt="Updated public report photo"/>)}</div></div></details>}
  {canReply&&(!ready||followUp)&&<section className={s.composer}>
   <label htmlFor="issue-reply">Reply to {names[(cleaner?issue.reporter_id:issue.cleaner_id)??'']||'member'}</label>
   <textarea id="issue-reply" value={body} onChange={event=>setBody(event.target.value)} maxLength={2000} disabled={!!busy} />
   <label className={s.photoUtility}><IoImageOutline />Add photo<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple disabled={!!busy||files.length>=3||uploadsLocked} onChange={event=>{void addFiles(Array.from(event.target.files??[]));event.target.value='';}} /></label>
   {!!files.length&&<div className={s.photoPreviews}>{files.map((file,index)=><div key={`${file.name}-${index}`}>{previewUrls[index]&&<img src={previewUrls[index]} alt={file.name}/>}<button disabled={!!busy||uploadsLocked} aria-label={`Remove ${file.name}`} onClick={()=>setFiles(value=>value.filter((_,i)=>i!==index))}><IoClose /></button></div>)}</div>}
   <div className={s.actions}><button className={s.primary} disabled={!body.trim()||!!busy||failed} onClick={()=>void send()}>{busy||'Send reply'}</button>{followUp&&<button className={s.utility} disabled={!!busy} onClick={()=>setFollowUp(false)}>Cancel</button>}</div>
  </section>}
  {ready&&!followUp&&<div className={s.reviewBar}><div className={s.actions}><button className={s.primary} disabled={!!busy||failed} onClick={()=>void resolve()}>{busy||(issue.keeps_claim?'Resume cleanup':'Confirm update')}</button><button className={s.utility} disabled={!!busy} onClick={()=>setFollowUp(true)}>Still an issue</button></div></div>}
  {isAdmin&&issue.requires_team_review&&!resolved&&<div className={s.actions}><button className={s.primary} disabled={!!busy||failed} onClick={()=>void resolve(true)}>{busy||'Approve site for cleanup'}</button></div>}
  {error&&<p className={s.error} role="alert">{error}</p>}
 </main>;
}
