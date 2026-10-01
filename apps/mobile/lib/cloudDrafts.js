import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { createCloudDraftSync, accountDraftPayload, accountDraftJson } from '@litterbugs/report-contract';
import { supabase } from './supabase';
import { loadLocalReportDraft, saveLocalReportDraft, clearLocalReportDraft } from './savedReportDraft';
import { loadLocalCleanupDraft, saveLocalCleanupDraft, clearLocalCleanupDraft } from './savedCleanupDraft';
import { preparePhotoForSafetyScan } from './photoSafetyPreparation';
const bucket='customer_draft_photos';
const photoCache=new Map();
const rememberPhoto=(owner,digest,path)=>{if(photoCache.size>=100)photoCache.delete(photoCache.keys().next().value);photoCache.set(`${owner}:${digest}`,{path,until:Date.now()+10*60_000});};
const metaKey=(owner,key)=>`litterbugs.cloud-draft.${owner}.${key}`;
const photoUris=draft=>draft.form ? draft.form.photos : draft.photos.map(photo=>photo.uri);
function payload(draft) {
  if(draft.form) {
    const {photos,startingFundingChoice,startingFundingOther,...fields}=draft.form; void photos;
    return {version:1,kind:'report',coordinates:draft.coordinate,step:draft.step,fundingChoice:startingFundingChoice||'none',customAmount:startingFundingOther||'',draft:fields};
  }
  return {version:1,kind:'cleanup',description:draft.description,bagsOrItems:draft.bagsOrItemsRemoved||'',weightPounds:draft.weightPounds||'',correctionDueAt:draft.correctionDueAt??null};
}
const hash=value=>Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,value);
async function timedQuery(query) {
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),10000);
  try { return await query.abortSignal(controller.signal); } finally {clearTimeout(timer);}
}
export const cloudDrafts=createCloudDraftSync({
  readLocal:(owner,key)=>key==='report'?loadLocalReportDraft(owner):loadLocalCleanupDraft(owner,key.slice(8)),
  writeLocal:(owner,key,value)=>key==='report'?saveLocalReportDraft(owner,value):saveLocalCleanupDraft(owner,key.slice(8),value),
  clearLocal:(owner,key)=>key==='report'?clearLocalReportDraft(owner):clearLocalCleanupDraft(owner,key.slice(8)),
  readMeta:(owner,key)=>AsyncStorage.getItem(metaKey(owner,key)),
  writeMeta:(owner,key,value)=>AsyncStorage.setItem(metaKey(owner,key),value),
  id:()=>Crypto.randomUUID(),
  fingerprint:async draft=>hash(JSON.stringify({payload:payload(draft),photos:await Promise.all(photoUris(draft).map(async uri=>hash(await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64}))))})),
  upload:async(owner,_key,draft)=>{
    const paths=[];
    for(const uri of photoUris(draft)) {
      const digest=await hash(await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64}));
      const cached=photoCache.get(`${owner}:${digest}`);
      if(cached&&cached.until>Date.now()){paths.push(cached.path);continue;}
      const prepared=await preparePhotoForSafetyScan(uri);
      const raw=atob(await FileSystem.readAsStringAsync(prepared.uri,{encoding:FileSystem.EncodingType.Base64}));
      const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
      const mime=prepared.mimeType||(/\.hei[cf]$/i.test(uri)?'image/heic':/\.png$/i.test(uri)?'image/png':/\.webp$/i.test(uri)?'image/webp':'image/jpeg');
      const path=`${owner}/${Crypto.randomUUID()}.${mime==='image/jpeg'?'jpg':mime.split('/')[1]}`;
      const {error}=await supabase.storage.from(bucket).upload(path,bytes,{contentType:mime,upsert:false,cacheControl:'0'});
      if(error)throw error; paths.push(path);rememberPhoto(owner,digest,path);
    }
    return {payload:accountDraftJson(payload(draft),_key),paths};
  },
  download:async(owner,key,record)=>{
    const p=accountDraftPayload(record.payload,key);
    const folder=`${FileSystem.documentDirectory}${key==='report'?'report-drafts/'+owner:'cleanup-drafts/'+owner+'/'+key.slice(8)}/`;
    await FileSystem.makeDirectoryAsync(folder,{intermediates:true});
    const photos=[];
    for(const path of record.photo_paths) {
      if(!path.startsWith(`${owner}/`))throw new Error('Draft photo ownership could not be verified.');
      const {data,error}=await supabase.storage.from(bucket).createSignedUrl(path,60);
      if(error||!data?.signedUrl)throw error||new Error('Draft photo unavailable.');
      const uri=folder+path.split('/').pop();
      const result=await FileSystem.downloadAsync(data.signedUrl,uri);
      if(result.status!==200)throw new Error('Draft photo could not be downloaded.');
      rememberPhoto(owner,await hash(await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64})),path);
      photos.push(uri);
    }
    if(key==='report')return {coordinate:p.coordinates,step:p.step,workflowVersion:2,form:{...p.draft,photos,startingFundingChoice:p.fundingChoice,startingFundingOther:p.customAmount}};
    return {description:p.description,bagsOrItemsRemoved:p.bagsOrItems,weightPounds:p.weightPounds,correctionDueAt:p.correctionDueAt,submissionId:record.submission_id,photos:photos.map(uri=>({uri}))};
  },
  loadRemote:async(owner,key)=>{
    const {data,error}=await timedQuery(supabase.from('customer_drafts').select('*').eq('user_id',owner).eq('draft_key',key));
    if(error)throw error; return data?.[0]||null;
  },
  writeRemote:async operation=>{const {data,error}=await timedQuery(supabase.rpc('write_customer_draft',operation));if(error)throw error;if(!data)throw new Error('Draft save could not be confirmed.');return data;},
});
