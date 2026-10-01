'use client';
import { createCloudDraftSync, accountDraftPayload, accountDraftJson, type CloudDraft, type Json } from '@litterbugs/report-contract';
import { createClient } from './supabase/client';
import { loadLocalReportDraft, saveLocalReportDraft, clearLocalReportDraft, type SavedReportDraft } from './saved-report-draft';
import { loadLocalCleanupDraft, saveLocalCleanupDraft, clearLocalCleanupDraft, type CleanupDraft } from './saved-cleanup-draft';
type Draft = SavedReportDraft | CleanupDraft;
const bucket = 'customer_draft_photos';
const photoCache = new Map<string,{path:string;until:number}>();
const rememberPhoto = (owner:string,digest:string,path:string) => { if(photoCache.size>=100) photoCache.delete(photoCache.keys().next().value!);photoCache.set(`${owner}:${digest}`,{path,until:Date.now()+10*60_000}); };
const metaKey = (owner: string,key: string) => `litterbugs.cloud-draft.${owner}.${key}`;
const photos = (draft: Draft) => 'draft' in draft ? draft.draft.photos : draft.photos;
function payload(draft: Draft): Json {
  if ('draft' in draft) {
    const { photos: _photos, ...fields } = draft.draft; void _photos;
    return { version:1, kind:'report', coordinates:draft.coordinates, step:draft.step, fundingChoice:draft.fundingChoice, customAmount:draft.customAmount, draft:fields } as Json;
  }
  return { version:1, kind:'cleanup', description:draft.description, bagsOrItems:draft.bagsOrItems, weightPounds:draft.weightPounds, correctionDueAt:draft.correctionDueAt??null };
}
async function hash(bytes: BufferSource) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join(''); }
export const cloudDrafts = createCloudDraftSync<Draft>({
  readLocal: (owner,key) => key==='report' ? loadLocalReportDraft(owner) : loadLocalCleanupDraft(owner,key.slice(8)),
  writeLocal: (owner,key,value) => key==='report' ? saveLocalReportDraft(owner,value as SavedReportDraft) : saveLocalCleanupDraft(owner,key.slice(8),value as CleanupDraft),
  clearLocal: (owner,key) => key==='report' ? clearLocalReportDraft(owner) : clearLocalCleanupDraft(owner,key.slice(8)),
  readMeta: async (owner,key) => localStorage.getItem(metaKey(owner,key)),
  writeMeta: async (owner,key,value) => localStorage.setItem(metaKey(owner,key),value),
  id: () => crypto.randomUUID(),
  fingerprint: async draft => hash(new TextEncoder().encode(JSON.stringify({payload:payload(draft), photos:await Promise.all(photos(draft).map(async photo=>hash(await photo.arrayBuffer())))}))),
  upload: async (owner,_key,draft) => {
    const paths:string[]=[];
    for(const photo of photos(draft)) {
      if(photo.size>5*1024*1024) throw new Error('Prepare photos before syncing this draft.');
      const extension=photo.type==='image/jpeg'?'jpg':photo.type.split('/')[1];
      if(!['jpg','png','webp','heic','heif'].includes(extension)) throw new Error('Unsupported draft photo.');
      const digest=await hash(await photo.arrayBuffer());
      const cached=photoCache.get(`${owner}:${digest}`);
      if(cached && cached.until>Date.now()) {paths.push(cached.path);continue;}
      const path=`${owner}/${crypto.randomUUID()}.${extension}`;
      const {error}=await createClient().storage.from(bucket).upload(path,photo,{contentType:photo.type,upsert:false,cacheControl:'0'});
      if(error) throw error; paths.push(path); rememberPhoto(owner,digest,path);
    }
    return { payload:accountDraftJson(payload(draft),_key), paths };
  },
  download: async (owner,key,record) => {
    const p=accountDraftPayload(record.payload,key);
    const files:File[]=[];
    for(const path of record.photo_paths) {
      if(!path.startsWith(`${owner}/`)) throw new Error('Draft photo ownership could not be verified.');
      const {data,error}=await createClient().storage.from(bucket).download(path);
      if(error||!data) throw error??new Error('Draft photo unavailable.');
      rememberPhoto(owner,await hash(await data.arrayBuffer()),path);
      files.push(new File([data],path.split('/').pop()!,{type:data.type||'image/jpeg'}));
    }
    if(p.kind==='report') return { coordinates:p.coordinates,step:p.step,fundingChoice:p.fundingChoice,customAmount:p.customAmount,draft:{...p.draft as object,photos:files} } as SavedReportDraft;
    return { description:p.description,bagsOrItems:p.bagsOrItems,weightPounds:p.weightPounds,correctionDueAt:p.correctionDueAt,photos:files,submissionId:record.submission_id } as CleanupDraft;
  },
  loadRemote: async (owner,key) => {
    const {data,error}=await createClient().from('customer_drafts').select('*').eq('user_id',owner).eq('draft_key',key).abortSignal(AbortSignal.timeout(8000)).maybeSingle();
    if(error) throw error; return data as CloudDraft|null;
  },
  writeRemote: async operation => {
    const {data,error}=await createClient().rpc('write_customer_draft',operation).abortSignal(AbortSignal.timeout(10000));
    if(error) throw error; if(!data) throw new Error('Draft save could not be confirmed.'); return data;
  },
});
