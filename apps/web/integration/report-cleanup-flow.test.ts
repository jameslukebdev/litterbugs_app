import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createClient as makeClient,type SupabaseClient} from '@supabase/supabase-js';
import sharp from 'sharp';
import {EMPTY_REPORT_DRAFT,reportInsertFromDraft,type Database,type ReportDraft} from '@litterbugs/report-contract';

const state=vi.hoisted(()=>({client:null as unknown as SupabaseClient<Database>,config:null as unknown as {url:string;anon:string;service:string},journal:new Map<string,unknown>(),rejectPublish:false,losePublishResponse:false}));
vi.mock('server-only',()=>({}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()}),notFound:()=>{throw new Error('Not found');}}));
vi.mock('@/components/public-site-header',()=>({PublicSiteHeader:()=>null}));
vi.mock('@/components/public-account-action',()=>({PublicAccountAction:()=>null}));
vi.mock('@/lib/env',()=>({getSupabaseEnv:()=>({url:state.config.url,publishableKey:state.config.anon}),getSiteUrl:()=> 'http://localhost:3000',getGoogleMapsKey:()=>'',getGoogleMapsMapId:()=>''}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>state.client}));
vi.mock('@/lib/website-analytics',()=>({trackParticipationFailure:vi.fn()}));
vi.mock('@/lib/geolocation',()=>({requireReportLocation:async(destination:object)=>({...destination,capturedAt:new Date().toISOString()})}));
vi.mock('@/lib/saved-report-draft',()=>({loadSiteReportPublication:async(source:string,user:string)=>state.journal.get(`${source}:${user}`),saveSiteReportPublication:async(row:{userId:string;sourceId:string})=>state.journal.set(`${row.sourceId}:${row.userId}`,structuredClone(row)),clearSiteReportPublication:async(source:string,user:string)=>state.journal.delete(`${source}:${user}`)}));
// Only external verdict providers are fixtures. Actual quarantine, decoder,
// sanitization, promotion, Auth, Storage, REST, RPCs and RLS run locally.
vi.mock('@/lib/media-security',async original=>({...await original<typeof import('@/lib/media-security')>(),requireCleanMalwareScan:vi.fn(async()=>{})}));
vi.mock('@/lib/photo-content-review',()=>({requireGooglePhotoReview:vi.fn(async()=>{})}));
import {POST as processMedia} from '@/app/api/media/process/route';
import {uploadSecureBrowserMedia} from '@/lib/secure-media-upload';
import {submitCleanupEvidence} from '@/lib/cleanup-submission';
import {submitSiteReport} from '@/lib/submit-site-report';

const configPath=process.env.LITTERBUGS_LOCAL_FLOW_CONFIG;
describe.skipIf(!configPath)('actual isolated report → cleanup → recurrence lifecycle',()=>{
 let admin:SupabaseClient<Database>;let reporter:SupabaseClient<Database>;let cleaner:SupabaseClient<Database>;let nextReporter:SupabaseClient<Database>;
 let reporterId:string;let cleanerId:string;let nextReporterId:string;let photo:File;
 const coordinates={latitude:36.2185,longitude:-81.655};
 const originalId=crypto.randomUUID();
 const realFetch=globalThis.fetch;
 async function member(label:string){
  const email=`flow-${label}-${crypto.randomUUID()}@example.test`;const password=crypto.randomUUID()+'Aa1!';
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:`QA ${label}`}});if(error)throw error;
  const profile=await admin.from('profiles').update({display_name:`QA ${label}`}).eq('id',data.user!.id);if(profile.error)throw profile.error;
  const client=makeClient<Database>(state.config.url,state.config.anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const result=await client.auth.signInWithPassword({email,password});if(result.error)throw result.error;
  return {client,id:data.user!.id};
 }
 async function row(id:string){const {data,error}=await admin.from('reports').select('*').eq('id',id).single();if(error)throw error;return data;}
 async function complete(client:SupabaseClient<Database>,reportId:string,owner:SupabaseClient<Database>){
  state.client=client;const {data:{user}}=await client.auth.getUser();
  const {data:waiver,error:waiverError}=await client.from('cleanup_waiver_versions').select('*').eq('is_active',true).is('retired_at',null).single();if(waiverError)throw waiverError;
  const acceptance=await client.rpc('accept_cleanup_waiver',{accepted_waiver_version:waiver.waiver_version,accepted_guidelines_version:waiver.guidelines_version});if(acceptance.error)throw acceptance.error;
  const claim=await client.rpc('claim_cleanup',{target_report_id:reportId});if(claim.error)throw claim.error;
  expect((await row(reportId)).cleanup_state).toBe('claimed');
  // The actual web evidence helper uploads and promotes a new after photo.
  const submissionId=crypto.randomUUID();
  await submitCleanupEvidence({cleanupId:claim.data.id,userId:user!.id,submissionId,photos:[photo],description:'Removed litter from the site.',bagsOrItems:2,weightPounds:4,durationMinutes:30,isPaid:false});
  expect((await row(reportId)).cleanup_state).toBe('completion_submitted');
  const outsiderClient=owner===nextReporter?reporter:nextReporter;
  const outsider=await outsiderClient.rpc('review_cleanup',{target_cleanup_id:claim.data.id,target_submission_id:submissionId,review_decision:'approved'});
  expect(outsider.error).toBeTruthy();
  const decision=await owner.rpc('review_cleanup',{target_cleanup_id:claim.data.id,target_submission_id:submissionId,review_decision:'approved'});if(decision.error)throw decision.error;
  expect(decision.data.status).toBe('completed');expect((await row(reportId)).cleanup_state).toBe('completed');
  const {data:submission,error}=await admin.from('cleanup_submissions').select('*').eq('id',submissionId).single();if(error)throw error;
  expect(submission.submitted_by).toBe(user!.id);expect(submission.duration_minutes).toBe(30);expect(Number(submission.weight_pounds)).toBe(4);
  return claim.data.id;
 }
 beforeAll(async()=>{
  state.config=JSON.parse(readFileSync(configPath!,'utf8'));
  const url=new URL(state.config.url);if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.port!=='62331')throw new Error('Only the named loopback test stack is allowed.');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY',state.config.service);
  vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
   const address=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
   if(address==='/api/media/process')return processMedia(new Request('http://localhost:3000'+address,init));
   if(new URL(address).origin!==url.origin)throw new Error('External network denied in local lifecycle test.');
   if (address.endsWith('/rest/v1/rpc/publish_report') && state.rejectPublish) { state.rejectPublish=false; return Response.json({message:'Simulated connection failure'}, {status:503}); }
   const response=await realFetch(input,init);
   if (address.endsWith('/rest/v1/rpc/publish_report') && state.losePublishResponse && response.ok) { state.losePublishResponse=false; return Response.json({message:'Simulated lost publication response'}, {status:503}); }
   return response;
  });
  admin=makeClient<Database>(url.toString(),state.config.service,{auth:{persistSession:false,autoRefreshToken:false}});
  ({client:reporter,id:reporterId}=await member('reporter'));({client:cleaner,id:cleanerId}=await member('cleaner'));({client:nextReporter,id:nextReporterId}=await member('next-reporter'));
  const bytes=await sharp({create:{width:20,height:20,channels:3,background:'#b9e9dd'}}).jpeg().toBuffer();
  photo=new File([new Uint8Array(bytes)],'fresh-evidence.jpg',{type:'image/jpeg'});
 },30000);
 afterAll(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
 it('publishes a fresh report, completes it, preserves history, and cleans a new reporter’s recurrence',async()=>{
  state.client=reporter;
  const draft:ReportDraft={...EMPTY_REPORT_DRAFT,title:'Local lifecycle verification',selectedTypes:['Cans'],severity:'Low',photos:[photo]};
  const reserved=await reporter.from('reports').insert({...reportInsertFromDraft(draft,coordinates,reporterId),id:originalId,is_published:false,photo_paths:[]}).select().single();if(reserved.error)throw reserved.error;
  const anon=makeClient<Database>(state.config.url,state.config.anon,{auth:{persistSession:false}});
  expect((await anon.from('reports').select('id').eq('id',originalId)).data).toEqual([]);
  const path=await uploadSecureBrowserMedia({supabase:reporter,userId:reporterId,kind:'report',file:photo,subjectId:originalId});
  const denied=await reporter.storage.from('report_photos').upload(`${reporterId}/${originalId}/unscanned.jpg`,photo,{contentType:'image/jpeg'});expect(denied.error).toBeTruthy();
  const stale=await reporter.rpc('publish_report',{target_report_id:originalId,target_photo_paths:[path],current_latitude:coordinates.latitude,current_longitude:coordinates.longitude,location_captured_at:'2000-01-01T00:00:00Z'});expect(stale.error).toBeTruthy();
  const published=await reporter.rpc('publish_report',{target_report_id:originalId,target_photo_paths:[path],current_latitude:coordinates.latitude,current_longitude:coordinates.longitude,location_captured_at:new Date().toISOString()});if(published.error)throw published.error;
  expect((await row(originalId)).user_id).toBe(reporterId);
  const publicBefore=await anon.storage.from('report_photos').download(path);expect(publicBefore.error).toBeNull();expect(publicBefore.data?.size).toBeGreaterThan(0);
  const firstAttempt=await complete(cleaner,originalId,reporter);
  const {data:completedAttempt}=await anon.from('cleanup_attempts').select('final_submission_id').eq('id',firstAttempt).single();
  const {data:afterPaths}=await anon.from('cleanup_submission_photos').select('storage_path').eq('submission_id',completedAttempt!.final_submission_id!);
  expect(afterPaths?.length).toBe(1);
  const publicAfter=await anon.storage.from('cleanup_photos').download(afterPaths![0].storage_path);expect(publicAfter.error).toBeNull();expect(publicAfter.data?.size).toBeGreaterThan(0);
  state.client=nextReporter;
  state.rejectPublish=true;
  await expect(submitSiteReport(originalId,{...draft,title:'Before an interruption'},coordinates,false,()=>{})).rejects.toThrow('Publication is not confirmed');
  const saved=state.journal.get(`${originalId}:${nextReporterId}`) as {reportId:string};
  const interruptedId=saved.reportId;
  expect((await row(interruptedId)).is_published).toBe(false);
  state.losePublishResponse=true;
  const edited={...draft,title:'Litter returned',photos:[new File([await photo.arrayBuffer()],'edited-evidence.jpg',{type:'image/jpeg'})]};
  await expect(submitSiteReport(originalId,edited,coordinates,false,()=>{})).rejects.toThrow('Publication is not confirmed');
  const renewal=await submitSiteReport(originalId,edited,coordinates,false,()=>{});
  expect(renewal.reportId).not.toBe(interruptedId);
  expect((await row(renewal.reportId)).title).toBe('Litter returned');
  expect((await row(interruptedId)).is_published).toBe(false);
  expect((await anon.from('reports').select('id').eq('id',interruptedId)).data).toEqual([]);
  expect(renewal.alreadyReported).toBe(false);expect(renewal.reportId).not.toBe(originalId);
  const next=await row(renewal.reportId);const original=await row(originalId);
  expect(next.user_id).toBe(nextReporterId);expect(next.previous_report_id).toBe(originalId);expect(next.cleanup_site_id).toBe(original.cleanup_site_id);
  expect(next.funded_amount_cents).toBe(0);expect(next.photo_paths).not.toEqual(original.photo_paths);
  expect(original.user_id).toBe(reporterId);expect(original.cleanup_state).toBe('completed');
  const duplicate=await submitSiteReport(originalId,{...draft,title:'Duplicate'},coordinates,false,()=>{});expect(duplicate).toEqual({reportId:next.id,alreadyReported:true});
  const directory=await anon.rpc('cleanup_site_directory',{feed_kind:'completed',page_size:12,page_offset:0});if(directory.error)throw directory.error;
  expect(directory.data.find(site=>site.cleanup_site_id===original.cleanup_site_id)).toMatchObject({report_id:originalId,current_report_id:next.id,completed_count:1,report_count:2});
  const {loadDiscoveryReports,DEFAULT_DISCOVERY_FILTERS}=await import('@/lib/report-discovery');
  const map=await loadDiscoveryReports(anon,{filters:DEFAULT_DISCOVERY_FILTERS});
  expect(map.reports.filter(report=>report.cleanup_site_id===original.cleanup_site_id).map(report=>report.id)).toEqual([next.id]);
  const completedMap=await loadDiscoveryReports(anon,{filters:{...DEFAULT_DISCOVERY_FILTERS,status:'completed'}});
  expect(completedMap.reports.filter(report=>report.cleanup_site_id===original.cleanup_site_id).map(report=>report.id)).toEqual([originalId]);
  const history=await anon.rpc('cleanup_site_reports',{target_site_id:original.cleanup_site_id!});expect(history.error).toBeNull();expect(history.data).toHaveLength(2);
  await complete(cleaner,next.id,nextReporter);
  const finished=await anon.rpc('cleanup_site_directory',{feed_kind:'completed',page_size:12,page_offset:0});if(finished.error)throw finished.error;
  expect(finished.data.find(site=>site.cleanup_site_id===original.cleanup_site_id)).toMatchObject({report_id:next.id,current_report_id:null,completed_count:2,report_count:2});
  // Render the real website overview from the local database, not a mocked model.
  const {default:SitePage}=await import('@/app/sites/[id]/page');
  const {renderToStaticMarkup}=await import('react-dom/server');
  const html=renderToStaticMarkup(await SitePage({params:Promise.resolve({id:original.cleanup_site_id!})}));
  expect(html).toContain('2 cleanups');expect(html.match(/>Timeline<\/h2>/g)).toHaveLength(1);
  expect(html).toContain('QA reporter');expect(html).toContain('QA next-reporter');expect(html).toContain(nextReporterId);
  expect(html).toContain(originalId);expect(html).toContain(next.id);
  const prior=await admin.from('cleanup_attempts').select('*').eq('id',firstAttempt).single();expect(prior.data?.status).toBe('completed');expect(prior.data?.cleaner_id).toBe(cleanerId);
 },60000);
});
