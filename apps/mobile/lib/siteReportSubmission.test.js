import { beforeEach, describe, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({storage:new Map(),rpc:vi.fn(),row:null,saved:null,photoBytes:new Map(),save:vi.fn(),user:{id:'member',is_anonymous:false},uuid:0}));
vi.mock('@react-native-async-storage/async-storage',()=>({default:{getItem:async k=>m.storage.get(k),setItem:async(k,v)=>m.storage.set(k,v),removeItem:async k=>m.storage.delete(k)}}));
vi.mock('expo-crypto',()=>({randomUUID:()=>`new-${++m.uuid}`,CryptoDigestAlgorithm:{SHA256:'sha'},digestStringAsync:async(_,v)=>v}));
vi.mock('expo-location',()=>({}));
vi.mock('expo-file-system/legacy',()=>({EncodingType:{Base64:'base64'},readAsStringAsync:async u=>m.photoBytes.get(u)||u}));
vi.mock('./reportLocationCheck',()=>({requireReportLocation:async(_,c)=>({...c,capturedAt:'2026-11-25T12:00:00Z'})}));
vi.mock('./siteReportDraft',()=>({saveSiteReportDraft:async(source,user,draft)=>{m.save(source,user,draft);m.saved=draft;},loadSiteReportDraft:async()=>m.saved}));
vi.mock('./supabase',()=>({supabase:{auth:{getUser:async()=>({data:{user:m.user}})},rpc:(...args)=>m.rpc(...args),from:()=>{const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:m.row}),single:async()=>({data:m.row})};return chain;}}}));
import { publishSiteReport } from './siteReportSubmission';
const coord={latitude:36.2,longitude:-81.6};
const options=()=>({sourceId:'source',userId:'member',payload:{title:'Litter returned',severity:'Low',litter_types:null,types:'Packaging',notes_presets:null},form:{photos:['new-photo.jpg']},coordinate:coord,upload:vi.fn(async(_,id)=>[`member/${id}/sanitized.jpg`])});
beforeEach(()=>{m.storage.clear();m.uuid=0;m.row=null;m.saved=null;m.user={id:'member',is_anonymous:false};m.save.mockReset();m.rpc.mockReset();m.rpc.mockImplementation(async(name,args)=>({data:name==='reserve_site_report'?{id:args.new_report_id,is_published:false}:{id:args.target_report_id,is_published:true}}));});
describe('native recurrence publication and recovery',()=>{
 it('reserves linked ownership, uploads fresh evidence and uses ordinary GPS publication',async()=>{
  const o=options();const result=await publishSiteReport(o);expect(result.report.id).toBe('new-1');expect(result.alreadyReported).toBe(false);
  expect(m.rpc.mock.calls[0]).toEqual(['reserve_site_report',{source_report_id:'source',new_report_id:'new-1',draft:o.payload}]);
  expect(m.rpc).toHaveBeenLastCalledWith('publish_report',expect.objectContaining({target_photo_paths:['member/new-1/sanitized.jpg'],current_latitude:36.2}));expect(o.upload).toHaveBeenCalledOnce();
  expect([...m.storage.keys()]).toEqual(['litterbugs.site-report-submission.source.member']);expect(m.save).toHaveBeenCalledWith('source','member',expect.anything());
 });
 it('rejects guest or wrong-owner sessions before creating a draft',async()=>{
  m.user={id:'guest',is_anonymous:true};await expect(publishSiteReport(options())).rejects.toThrow('Sign in');expect(m.save).not.toHaveBeenCalled();expect(m.rpc).not.toHaveBeenCalled();
 });
 it('resolves a lost successful response using the same ID and never uploads twice',async()=>{
  const o=options();m.rpc.mockImplementation(async(name,args)=>{if(name==='reserve_site_report')return{data:{id:args.new_report_id,is_published:false}};m.row={id:args.target_report_id,is_published:true};throw Error('lost response');});
  await expect(publishSiteReport(o)).rejects.toThrow('lost response');const count=m.rpc.mock.calls.length;
  expect((await publishSiteReport(o)).report.id).toBe('new-1');expect(m.rpc).toHaveBeenCalledTimes(count);expect(o.upload).toHaveBeenCalledOnce();
 });
 it('uses a fresh reservation for edited uncommitted metadata and evidence',async()=>{
  const o=options();let fail=true;m.rpc.mockImplementation(async(name,args)=>{if(name==='reserve_site_report')return{data:{id:args.new_report_id,is_published:false}};if(fail)throw Error('offline');return{data:{id:args.target_report_id,is_published:true}};});
  await expect(publishSiteReport(o)).rejects.toThrow('offline');fail=false;
  const result=await publishSiteReport({...o,payload:{...o.payload,title:'Edited'},form:{photos:['different-photo.jpg']}});expect(result.report.id).toBe('new-2');expect(o.upload).toHaveBeenCalledTimes(2);
 });
 it('continues missing uploads without re-uploading completed photos',async()=>{
  const o=options();o.form.photos=['one','two'];let fail=true;o.upload=vi.fn(async([uri],id)=>{if(uri==='two'&&fail)throw Error('interrupted');return[`member/${id}/${uri}.jpg`];});
  await expect(publishSiteReport(o)).rejects.toThrow('interrupted');fail=false;await publishSiteReport(o);expect(o.upload.mock.calls.filter(([uris])=>uris[0]==='one')).toHaveLength(1);
 });
 it('opens the server-selected current report on a race without posting a duplicate',async()=>{
  const id='10000000-0000-4000-8000-000000000001';m.row={id,is_published:true,user_id:'someone-else'};m.rpc.mockResolvedValue({error:{message:'site_already_reported',details:id}});const o=options();const result=await publishSiteReport(o);expect(result).toEqual({report:m.row,alreadyReported:true});expect(o.upload).not.toHaveBeenCalled();
 });
 it('shares one in-flight submission across repeated taps',async()=>{
  const o=options();const first=publishSiteReport(o);const second=publishSiteReport(o);expect(first).toBe(second);await first;expect(o.upload).toHaveBeenCalledOnce();
 });
});
