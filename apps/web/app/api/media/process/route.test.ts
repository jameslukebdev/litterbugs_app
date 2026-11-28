import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

vi.mock('server-only', () => ({}));
const { createSupabaseClient } = vi.hoisted(() => ({
  createSupabaseClient: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: createSupabaseClient }));
vi.mock('@/lib/env', () => ({
  getSupabaseEnv: () => ({
    url: 'https://project.supabase.co',
    publishableKey: 'public-test-key',
  }),
}));

import { POST } from './route';

function request(headers: Record<string, string> = {}) {
  return new Request('https://litterbugs.app/api/media/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ kind: 'avatar', quarantinePath: 'invalid' }),
  });
}

describe('secure media processing route admission', () => {
  const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalSecretKey = process.env.SUPABASE_SECRET_KEY;
  const originalScannerEnabled = process.env.REPORT_MEDIA_MALWARE_SCANNER_ENABLED;
  const originalScannerProvider = process.env.REPORT_MEDIA_MALWARE_SCANNER_PROVIDER;
  const originalScannerKey = process.env.REPORT_MEDIA_MALWARE_SCANNER_API_KEY;
  const originalRelayUrl = process.env.GEMINI_RELAY_URL;
  const originalRelaySecret = process.env.GEMINI_RELAY_SHARED_SECRET;

  afterEach(() => {
    if (originalRelayUrl === undefined) delete process.env.GEMINI_RELAY_URL; else process.env.GEMINI_RELAY_URL = originalRelayUrl;
    if (originalRelaySecret === undefined) delete process.env.GEMINI_RELAY_SHARED_SECRET; else process.env.GEMINI_RELAY_SHARED_SECRET = originalRelaySecret;
    vi.restoreAllMocks();
    createSupabaseClient.mockReset();
    if (originalServiceRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole;
    if (originalSecretKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalSecretKey;
    if (originalScannerEnabled === undefined) delete process.env.REPORT_MEDIA_MALWARE_SCANNER_ENABLED;
    else process.env.REPORT_MEDIA_MALWARE_SCANNER_ENABLED = originalScannerEnabled;
    if (originalScannerProvider === undefined) delete process.env.REPORT_MEDIA_MALWARE_SCANNER_PROVIDER;
    else process.env.REPORT_MEDIA_MALWARE_SCANNER_PROVIDER = originalScannerProvider;
    if (originalScannerKey === undefined) delete process.env.REPORT_MEDIA_MALWARE_SCANNER_API_KEY;
    else process.env.REPORT_MEDIA_MALWARE_SCANNER_API_KEY = originalScannerKey;
  });

  it('requires a signed-in Supabase bearer token', async () => {
    const response = await POST(request());
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'MEDIA_AUTH_REQUIRED' },
    });
  });

  it('fails closed when the privileged processor is not configured', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    const response = await POST(request({ Authorization: 'Bearer signed-user-token' }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'MEDIA_PROCESSOR_UNAVAILABLE' },
    });
  });

  it('rejects non-JSON request bodies before authentication or processing', async () => {
    const response = await POST(new Request('https://litterbugs.app/api/media/process', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'photo',
    }));
    expect(response.status).toBe(415);
  });

  it('rejects anonymous Supabase sessions', async () => {
    process.env.SUPABASE_SECRET_KEY = 'server-secret-key';
    createSupabaseClient.mockReturnValueOnce({
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: {
              id: '11111111-1111-4111-8111-111111111111',
              is_anonymous: true,
            },
          },
          error: null,
        })),
      },
    });

    const response = await POST(request({ Authorization: 'Bearer anonymous-token' }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'MEDIA_AUTH_REQUIRED' },
    });
  });

  it.each(['report', 'legacy-avatar', 'approved-avatar'].flatMap(kind => ['clean', 'rejected', 'unavailable'].map(outcome => [kind, outcome])))('keeps photos private until both checks pass: %s %s', async (kind, outcome) => {
    process.env.SUPABASE_SECRET_KEY = 'server-secret-key';
    process.env.REPORT_MEDIA_MALWARE_SCANNER_ENABLED = 'true';
    process.env.REPORT_MEDIA_MALWARE_SCANNER_PROVIDER = 'cloudmersive';
    process.env.REPORT_MEDIA_MALWARE_SCANNER_API_KEY = 'cloudmersive-test-key';
    process.env.GEMINI_RELAY_URL = 'https://relay.example';
    process.env.GEMINI_RELAY_SHARED_SECRET = 'test-only-relay-secret-with-at-least-32-characters';
    const userId = '11111111-1111-4111-8111-111111111111';
    const reportId = '22222222-2222-4222-8222-222222222222';
    const uploadId = '33333333-3333-4333-8333-333333333333';
    const image = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#228833' },
    }).png().toBuffer();
    const finalUpload = vi.fn(async () => ({ error: null }));
    const quarantineRemove = vi.fn(async () => ({ error: null }));
    const userClient = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: userId } }, error: null })) },
    };
    const admin = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: reportId, user_id: userId, status: 'active' },
              error: null,
            }),
          }),
        }),
      })),
      storage: {
        from: vi.fn((bucket: string) => bucket === 'media_quarantine'
          ? {
              download: async () => ({
                data: new Blob([image], { type: 'image/png' }),
                error: null,
              }),
              remove: quarantineRemove,
            }
          : { upload: finalUpload }),
      },
    };
    const audit = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({ gte: async () => ({ count: 0, error: null }) }),
        }),
        insert: () => ({
          select: () => ({ single: async () => ({ data: { id: 'attempt-id' }, error: null }) }),
        }),
        update: () => ({ eq: async () => ({ error: null }) }),
      })),
    };
    createSupabaseClient
      .mockReturnValueOnce(userClient)
      .mockReturnValueOnce(admin)
      .mockReturnValueOnce(audit);
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ CleanResult: true, FoundViruses: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify(kind === 'legacy-avatar' ? { Successful: true, Score: outcome === 'rejected' ? 0.95 : 0.05, ClassificationOutcome: outcome === 'rejected' ? 'UnsafeContent_HighProbability' : 'SafeContent_HighProbability' } : { decision: outcome === 'rejected' ? 'reject' : 'allow' }), { status: outcome === 'unavailable' ? 429 : 200 }));

    const response = await POST(new Request('https://litterbugs.app/api/media/process', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer signed-user-token',
        'Content-Type': 'application/json',
        ...(kind === 'approved-avatar' ? { 'X-Litterbugs-Photo-Review': 'approved-v1' } : {}),
      },
      body: JSON.stringify({
        kind: kind === 'report' ? 'report' : 'avatar',
        quarantinePath: `${userId}/${kind === 'report' ? 'report' : 'avatar'}/${uploadId}.png`,
        ...(kind === 'report' ? { subjectId: reportId } : {}),
      }),
    }));

    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain(kind === 'legacy-avatar' ? '/image/nsfw/classify' : '/v1/content-check');
    if (outcome !== 'clean') {
      expect(response.status).toBe(outcome === 'rejected' ? 422 : 503);
      expect(finalUpload).not.toHaveBeenCalled();
      expect(quarantineRemove).toHaveBeenCalledWith([`${userId}/${kind === 'report' ? 'report' : 'avatar'}/${uploadId}.png`]);
      return;
    }
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({ contentType: 'image/jpeg' });
    if (kind === 'report') expect(payload.path).toMatch(new RegExp(`^${userId}/${reportId}/[0-9a-f-]+\\.jpg$`));
    else expect(payload.path).toBe(`${userId}/avatar`);
    expect(finalUpload).toHaveBeenCalledWith(
      payload.path,
      expect.any(Uint8Array),
      { contentType: 'image/jpeg', cacheControl: '3600', upsert: kind !== 'report' },
    );
    expect(quarantineRemove).toHaveBeenCalledWith([
      `${userId}/${kind === 'report' ? 'report' : 'avatar'}/${uploadId}.png`,
    ]);
  });
});
