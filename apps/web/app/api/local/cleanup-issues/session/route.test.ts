import { beforeEach, expect, it, vi } from 'vitest';
import { POST } from './route';
const state=vi.hoisted(()=>({enabled:false,create:vi.fn(),signIn:vi.fn(),signOut:vi.fn()}));
vi.mock('@/lib/local-cleanup-issue-testing',()=>({localTotp:()=>'',localCleanupIssueTesting:async()=>state.enabled?{reportId:'local-report',scenario:'access',cleaner:{email:'cleaner@example.test',password:'test-only'}}:null}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>{state.create();return {auth:{signOut:state.signOut,signInWithPassword:state.signIn}};}}));
beforeEach(()=>{state.enabled=false;vi.clearAllMocks();state.signIn.mockResolvedValue({error:null});});
it('hides the test endpoint before parsing any production request or accessing credentials',async()=>{
 const request=new Request('https://example.test/api/local/cleanup-issues/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 expect((await POST(request)).status).toBe(404);expect(state.create).not.toHaveBeenCalled();
});
it('returns a controlled error for malformed local form data',async()=>{
 state.enabled=true;const request=new Request('http://localhost:3001/api/local/cleanup-issues/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 expect((await POST(request)).status).toBe(400);expect(state.create).not.toHaveBeenCalled();
});
it('does not switch a local account for a cross-origin form',async()=>{
 state.enabled=true;const request=new Request('http://localhost:3001/api/local/cleanup-issues/session',{method:'POST',headers:{Host:'localhost:3001',Origin:'https://example.test','Content-Type':'application/x-www-form-urlencoded'},body:'role=cleaner'});
 expect((await POST(request)).status).toBe(403);expect(state.signIn).not.toHaveBeenCalled();
});
it('keeps the authorized local cleaner switch working',async()=>{
 state.enabled=true;const request=new Request('http://localhost:3001/api/local/cleanup-issues/session',{method:'POST',headers:{Host:'localhost:3001','Content-Type':'application/x-www-form-urlencoded'},body:'role=cleaner'});
 const response=await POST(request);expect(response.status).toBe(303);expect(response.headers.get('Location')).toBe('http://localhost:3001/account/reports/local-report?from=current&task=cleanup');expect(state.signIn).toHaveBeenCalledOnce();
});
