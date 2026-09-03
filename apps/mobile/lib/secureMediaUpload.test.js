import { beforeEach, describe, expect, it, vi } from 'vitest';

const { upload, remove, getSession, randomUUID } = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  getSession: vi.fn(),
  randomUUID: vi.fn(),
}));

vi.mock('expo-crypto', () => ({ randomUUID }));
vi.mock('./supabase', () => ({
  supabase: {
    auth: { getSession },
    storage: { from: () => ({ upload, remove }) },
  },
}));

import { MEDIA_PROCESSING_URL, uploadSecureMedia } from './secureMediaUpload';

describe('secure mobile media upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    randomUUID.mockReturnValue('33333333-3333-4333-8333-333333333333');
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
    getSession.mockResolvedValue({
      data: { session: { access_token: 'signed-user-token' } },
      error: null,
    });
  });

  it('uploads only to quarantine before requesting a server-checked destination', async () => {
    const fetchImpl = vi.fn(async (_url, init) => new Response(JSON.stringify({
      path: '11111111-1111-4111-8111-111111111111/report/final.jpg',
      contentType: 'image/jpeg',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const path = await uploadSecureMedia({
      userId: '11111111-1111-4111-8111-111111111111',
      kind: 'report',
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: 'image/png',
      subjectId: '22222222-2222-4222-8222-222222222222',
      fetchImpl,
    });

    expect(upload).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111/report/33333333-3333-4333-8333-333333333333.png',
      expect.any(Uint8Array),
      { contentType: 'image/png', cacheControl: '0', upsert: false },
    );
    expect(fetchImpl).toHaveBeenCalledWith(MEDIA_PROCESSING_URL, expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer signed-user-token' }),
    }));
    const request = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(request).toEqual({
      kind: 'report',
      quarantinePath: '11111111-1111-4111-8111-111111111111/report/33333333-3333-4333-8333-333333333333.png',
      subjectId: '22222222-2222-4222-8222-222222222222',
    });
    expect(path).toContain('final.jpg');
    expect(remove).not.toHaveBeenCalled();
  });

  it('deletes the quarantined candidate when processing fails', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      error: { code: 'MEDIA_SCAN_INFECTED', message: 'Choose a different image.' },
    }), { status: 422, headers: { 'Content-Type': 'application/json' } }));
    await expect(uploadSecureMedia({
      userId: '11111111-1111-4111-8111-111111111111',
      kind: 'avatar',
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: 'image/jpeg',
      fetchImpl,
    })).rejects.toThrow('Choose a different image.');
    expect(remove).toHaveBeenCalledWith([
      '11111111-1111-4111-8111-111111111111/avatar/33333333-3333-4333-8333-333333333333.jpg',
    ]);
  });

  it('never uploads unsupported client-declared content types', async () => {
    await expect(uploadSecureMedia({
      userId: '11111111-1111-4111-8111-111111111111',
      kind: 'report',
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: 'text/html',
      subjectId: '22222222-2222-4222-8222-222222222222',
    })).rejects.toThrow(/not supported/i);
    expect(upload).not.toHaveBeenCalled();
  });
});
