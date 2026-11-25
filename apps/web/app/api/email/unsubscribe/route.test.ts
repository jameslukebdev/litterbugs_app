import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ rpc: vi.fn(), create: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: state.create }));
vi.mock('@/lib/env', () => ({ getSupabaseEnv: () => ({ url: 'http://127.0.0.1:55439', publishableKey: 'public-test' }), getSiteUrl: () => 'https://litterbugs.app' }));
import { POST } from './route';
const request = (body: unknown, headers: Record<string,string> = {}) => new Request('https://litterbugs.app/api/email/unsubscribe', { method: 'POST', headers: { origin: 'https://litterbugs.app', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
beforeEach(() => { vi.stubEnv('SUPABASE_SECRET_KEY','server-test-secret'); state.create.mockReturnValue({ rpc: state.rpc }); state.rpc.mockResolvedValue({ error: null }); });
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it('allows withdrawal without login and exposes no account existence or email', async () => {
  for (const email of [' ALEX@Example.com ', 'unknown@example.com']) {
    const response = await POST(request({ email }));
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ ok: true });
  }
  expect(state.rpc.mock.calls[0][1]).toEqual({ target_email: 'alex@example.com', target_request_key: expect.stringMatching(/^[a-f0-9]{64}$/) });
});
it('rejects cross-origin, malformed, injected, and oversized requests before backend access', async () => {
  expect((await POST(request({ email:'a@example.com' },{origin:'https://other.example'}))).status).toBe(403);
  expect((await POST(request({ email:'a@example.com' },{'sec-fetch-site':'cross-site'}))).status).toBe(403);
  expect((await POST(request({ email:'a@example.com' },{'content-type':'text/plain'}))).status).toBe(415);
  expect((await POST(request({ email:'a@example.com, b@example.com' }))).status).toBe(400);
  expect((await POST(request({ email:'a@example.com',padding:'x'.repeat(2100) }))).status).toBe(413);
  expect(state.create).not.toHaveBeenCalled();
});
it('does not pretend an unavailable backend saved a withdrawal', async () => {
  state.rpc.mockResolvedValue({ error:{code:'PGRST202',message:'secret backend detail'} });
  const response=await POST(request({email:'a@example.com'}));
  expect(response.status).toBe(503); expect(await response.text()).not.toContain('secret');
});
it('enforces the durable backend rate limit and does not mutate bot-trap submissions', async () => {
  state.rpc.mockResolvedValue({ error:{code:'P0001'} });
  const response=await POST(request({email:'a@example.com'}));
  expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('3600');
  state.rpc.mockClear();
  expect((await POST(request({email:'a@example.com',website:'bot'}))).status).toBe(200);
  expect(state.rpc).not.toHaveBeenCalled();
});

it('accepts the configured public origin behind a reverse proxy and rejects arbitrary host origins', async () => {
  const valid = new Request('http://internal:3000/api/email/unsubscribe', { method:'POST', headers:{origin:'https://litterbugs.app','content-type':'application/json'}, body:JSON.stringify({email:'a@example.com'}) });
  expect((await POST(valid)).status).toBe(200);
  state.rpc.mockClear();
  const foreign = new Request('https://other.example/api/email/unsubscribe', { method:'POST', headers:{origin:'https://other.example','content-type':'application/json'}, body:JSON.stringify({email:'a@example.com'}) });
  expect((await POST(foreign)).status).toBe(403); expect(state.rpc).not.toHaveBeenCalled();
});
