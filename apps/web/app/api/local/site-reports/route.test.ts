import {beforeEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
const mocks=vi.hoisted(()=>({user:{id:'20000000-0000-4000-8000-000000000001',is_anonymous:false} as {id:string;is_anonymous:boolean}|null,save:vi.fn(),site:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:mocks.user}})}})}));
vi.mock('@/lib/report-site',()=>({loadReportSite:mocks.site}));
vi.mock('@/lib/local-site-store',()=>({saveLocalOccurrence:mocks.save}));
import {POST} from './route';
beforeEach(()=>{vi.stubEnv('NODE_ENV','development');mocks.user={id:'20000000-0000-4000-8000-000000000001',is_anonymous:false};vi.clearAllMocks();});
function request(host='localhost:3000',origin='http://localhost:3000',form?:FormData){return new NextRequest(`http://${host}/api/local/site-reports`,{method:'POST',headers:{host,origin},body:form});}
it('blocks external hosts, cross-origin writes and guests without saving',async()=>{
 expect((await POST(request('litterbugs.app','https://litterbugs.app'))).status).toBe(404);
 expect((await POST(request('localhost:3000','https://evil.example'))).status).toBe(403);
 mocks.user=null;expect((await POST(request())).status).toBe(401);
 mocks.user={id:'guest',is_anonymous:true};expect((await POST(request())).status).toBe(401);
 expect(mocks.save).not.toHaveBeenCalled();
});
it('rejects stale/out-of-range location and a non-completed source',async()=>{
 const form=new FormData();form.set('id','10000000-0000-4000-8000-000000000003');form.set('sourceId','10000000-0000-4000-8000-000000000002');form.set('origin',JSON.stringify({latitude:36.2,longitude:-81.6,capturedAt:'2000-01-01'}));
 mocks.site.mockResolvedValue({id:'site',local:true,reports:[{id:form.get('sourceId'),state:'completed',location:{latitude:36.2,longitude:-81.6}}]});
 expect((await POST(request(undefined,undefined,form))).status).toBe(400);
 mocks.site.mockResolvedValue({local:true,reports:[]});
 expect((await POST(request(undefined,undefined,form))).status).toBe(400);
 expect(mocks.save).not.toHaveBeenCalled();
});

it('saves fresh photos under the verified member, ignoring a supplied author and location',async()=>{
 const sourceId='10000000-0000-4000-8000-000000000002';
 const form=new FormData();form.set('id','10000000-0000-4000-8000-000000000003');form.set('sourceId',sourceId);
 form.set('origin',JSON.stringify({latitude:36.2,longitude:-81.6,capturedAt:new Date().toISOString()}));
 form.set('draft',JSON.stringify({title:'New litter',selectedTypes:['Cans'],severity:'Low',reporterId:'spoofed',latitude:0,longitude:0}));
 const sharp=(await import('sharp')).default;
 const image=await sharp({create:{width:1,height:1,channels:3,background:'#ffffff'}}).png().toBuffer();
 form.set('photos',new File([new Uint8Array(image)],'fresh.png',{type:'image/png'}));
 mocks.site.mockResolvedValue({id:sourceId,local:true,reports:[{id:sourceId,state:'completed',location:{latitude:36.2,longitude:-81.6}}]});
 mocks.save.mockResolvedValue({reportId:form.get('id'),alreadyReported:false});
 const response=await POST(request(undefined,undefined,form));expect(response.status).toBe(200);
 expect(mocks.save.mock.calls[0][0]).toMatchObject({siteId:sourceId,sourceReportId:sourceId,reporterId:mocks.user!.id,title:'New litter'});
 expect(mocks.save.mock.calls[0][1][0]).toBeInstanceOf(Buffer);
});
