'use client';
/* eslint-disable @next/next/no-img-element -- Report photos and local previews. */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { Report } from '@litterbugs/report-contract';
import { IoArrowBack,IoClose,IoImageOutline } from 'react-icons/io5';
import { createClient } from '@/lib/supabase/client';
import { issueClient,issueError } from '@/lib/cleanup-issues';
import { getReportDetailPhotoUrl } from '@/lib/report-photo';
import { prepareBrowserPhotos } from '@/lib/prepare-browser-photo';
import { uploadSecureBrowserMedia } from '@/lib/secure-media-upload';
import { usePhotoPreviews } from '@/lib/use-photo-previews';
import { notifyDataChanged } from '@/lib/use-data-refresh';
import s from './cleanup-issues.module.css';
export function ReportContentEditor({report,userId,back}:{report:Report&{content_revision:number;additional_information:string|null};userId:string;back:string}) {
 const router=useRouter(),[description,setDescription]=useState(report.notes_other??''),[information,setInformation]=useState(report.additional_information??'');
 const [kept,setKept]=useState(report.photo_paths??[]),[files,setFiles]=useState<File[]>([]),[busy,setBusy]=useState(''),[error,setError]=useState(''),[uploadsLocked,setUploadsLocked]=useState(false);
 const request=useRef(crypto.randomUUID()),uploaded=useRef<string[]>([]),previews=usePhotoPreviews(files);
 const changed=description!==(report.notes_other??'')||information!==(report.additional_information??'')||files.length>0||kept.length!==(report.photo_paths??[]).length;
 async function add(selected:File[]){if(busy||uploaded.current.length)return;setBusy('Preparing photo…');setError('');try{const prepared=await prepareBrowserPhotos(selected.slice(0,3-kept.length-files.length));setFiles(value=>[...value,...prepared]);}catch(failure){setError(failure instanceof Error?failure.message:'The photo could not be prepared.');}finally{setBusy('');}}
 async function save(){if(busy||!changed)return;setBusy('Saving…');setError('');try{
  for(let index=uploaded.current.length;index<files.length;index++){setBusy('Checking photo…');uploaded.current.push(await uploadSecureBrowserMedia({supabase:createClient(),userId,kind:'report',file:files[index],subjectId:report.id}));setUploadsLocked(true);}
  const {error:failure}=await issueClient(createClient()).rpc('update_report_content',{target_report_id:report.id,expected_revision:report.content_revision,update_id:request.current,new_description:description,new_information:information,new_photo_paths:[...kept,...uploaded.current]});
  if(failure)throw failure;notifyDataChanged();router.push(back);router.refresh();
 }catch(failure){setError(issueError(failure));}finally{setBusy('');}}
 return <main className={s.page}><Link href={back} className={s.back}><IoArrowBack/>Back</Link><header className={s.header}><span className={s.tag}>Public report</span><h1>Edit report</h1><p>{report.title||'Litter report'}</p></header>
  <div className={s.field}><span>Photos</span><div className={s.editorPhotos}>{kept.map(path=><div key={path}><img src={getReportDetailPhotoUrl(path,report.id)??''} alt="Current report photo"/><button aria-label="Remove report photo" disabled={!!busy||uploadsLocked} onClick={()=>setKept(value=>value.filter(item=>item!==path))}><IoClose/></button></div>)}{files.map((file,index)=><div key={`${file.name}-${index}`}>{previews[index]&&<img src={previews[index]} alt={file.name}/>}<button aria-label={`Remove ${file.name}`} disabled={!!busy||uploadsLocked} onClick={()=>setFiles(value=>value.filter((_,i)=>i!==index))}><IoClose/></button></div>)}</div>
  {kept.length+files.length<3&&<label className={s.photoUtility}><IoImageOutline/>Add photos<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple disabled={!!busy||uploadsLocked} onChange={event=>{void add(Array.from(event.target.files??[]));event.target.value='';}}/></label>}</div>
  <label className={s.field}>Description<textarea value={description} maxLength={3000} onChange={event=>setDescription(event.target.value)} disabled={!!busy}/></label>
  <label className={s.field}><span className={s.fieldTitle}>Additional information<small>Optional</small></span><textarea value={information} maxLength={3000} onChange={event=>setInformation(event.target.value)} disabled={!!busy}/></label>
  {error&&<p className={s.error} role="alert">{error}</p>}<div className={s.actions}><button className={s.primary} disabled={!!busy||!changed||kept.length+files.length===0} onClick={()=>void save()}>{busy||'Save changes'}</button></div>
 </main>;
}
