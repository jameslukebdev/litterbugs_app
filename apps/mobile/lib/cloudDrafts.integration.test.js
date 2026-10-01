// Runs only against the explicit loopback parity fixture. Never production.
import { expect, it, vi } from 'vitest';
const fixture = await vi.hoisted(async () => {
  const fs=await import('node:fs/promises'); const crypto=await import('node:crypto'); const os=await import('node:os');
  const enabled=process.env.LITTERBUGS_DRAFT_INTEGRATION==='1';
  const config=enabled?JSON.parse(await fs.readFile('/tmp/litterbugs-parity/config.json','utf8')):null;
  const directory=enabled?await fs.mkdtemp(os.tmpdir()+'/litterbugs-native-draft-'):'';
  return {fs,crypto,enabled,config,directory,storage:new Map()};
});
vi.mock('@react-native-async-storage/async-storage',()=>({default:{getItem:async key=>fixture.storage.get(key)??null,setItem:async(key,value)=>{fixture.storage.set(key,value);},removeItem:async key=>{fixture.storage.delete(key);}}}));
vi.mock('expo-crypto',()=>({randomUUID:()=>fixture.crypto.randomUUID(),CryptoDigestAlgorithm:{SHA256:'sha256'},digestStringAsync:async(_algorithm,value)=>fixture.crypto.createHash('sha256').update(value).digest('hex')}));
vi.mock('expo-file-system/legacy',()=>{
  const path=uri=>uri.replace(/^file:\/\//,'');
  return {documentDirectory:'file://'+fixture.directory+'/',EncodingType:{Base64:'base64'},makeDirectoryAsync:async uri=>fixture.fs.mkdir(path(uri),{recursive:true}),getInfoAsync:async uri=>{try{const s=await fixture.fs.stat(path(uri));return {exists:true,size:s.size};}catch{return {exists:false};}},copyAsync:async({from,to})=>fixture.fs.copyFile(path(from),path(to)),deleteAsync:async uri=>fixture.fs.rm(path(uri),{recursive:true,force:true}),readAsStringAsync:async(uri,{encoding})=>fixture.fs.readFile(path(uri),encoding),downloadAsync:async(url,uri)=>{const res=await fetch(url);if(res.ok)await fixture.fs.writeFile(path(uri),Buffer.from(await res.arrayBuffer()));return {status:res.status,uri};}};
});
vi.mock('./photoSafetyPreparation',()=>({preparePhotoForSafetyScan:async uri=>({uri,mimeType:'image/jpeg'})}));
vi.mock('./supabase',async()=>{
  if(!fixture.enabled)return {supabase:{}};
  const {createClient}=await import('@supabase/supabase-js');const user=fixture.config.users[1];
  return {supabase:createClient('http://127.0.0.1:62421',fixture.config.anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${user.token}`}}})};
});
import {cloudDrafts} from './cloudDrafts';
import {saveReportDraft,clearReportDraft} from './savedReportDraft';
import {supabase} from './supabase';
it.skipIf(!fixture.enabled)('restores a browser-format photo draft into native storage, syncs an edit, and discards the account draft',async()=>{
  const owner=fixture.config.users[1].id;
  try {
    const before=await supabase.from('customer_drafts').select('revision').eq('user_id',owner).eq('draft_key','report').maybeSingle();if(before.error)throw before.error;
    const bytes=await fixture.fs.readFile('/tmp/litterbugs-parity/photo-fixture.jpg');const path=`${owner}/${fixture.crypto.randomUUID()}.jpg`;
    const upload=await supabase.storage.from('customer_draft_photos').upload(path,bytes,{contentType:'image/jpeg'});if(upload.error)throw upload.error;
    const remote=await supabase.rpc('write_customer_draft',{target_user_id:owner,target_key:'report',expected_revision:before.data?.revision??0,operation_id:fixture.crypto.randomUUID(),action:'save',draft_payload:{version:1,kind:'report',coordinates:{latitude:36,longitude:-81},step:4,fundingChoice:'5',customAmount:'',draft:{title:'From browser',types:'',selectedTypes:['Bottles'],severity:'Low',notes:'Shared fields',selectedNotes:['Near roadside']}},draft_photos:[path]});if(remote.error)throw remote.error;
    const native=await cloudDrafts.load(owner,'report');
    expect(native.form.title).toBe('From browser');expect(native.form.startingFundingChoice).toBe('5');expect(native.form.photos).toHaveLength(1);
    expect(await fixture.fs.readFile(native.form.photos[0].replace(/^file:\/\//,''))).toEqual(bytes);
    await saveReportDraft(owner,{...native,form:{...native.form,title:'Edited on native client'}});await cloudDrafts.save(owner,'report');
    const updated=await supabase.from('customer_drafts').select('*').eq('user_id',owner).eq('draft_key','report').single();if(updated.error)throw updated.error;
    expect(updated.data.payload.draft.title).toBe('Edited on native client');expect(updated.data.photo_paths).toEqual([path]);
    await clearReportDraft(owner);
    const deleted=await supabase.from('customer_drafts').select('state,payload').eq('user_id',owner).eq('draft_key','report').single();
    expect(deleted.data).toEqual({state:'deleted',payload:null});
  } finally {await cloudDrafts.retire(owner);await fixture.fs.rm(fixture.directory,{recursive:true,force:true});}
},20000);
