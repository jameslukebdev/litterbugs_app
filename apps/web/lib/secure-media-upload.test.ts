import { beforeEach, describe, expect, it, vi } from 'vitest';

import { uploadSecureBrowserMedia } from './secure-media-upload';

const userId = '11111111-1111-4111-8111-111111111111';
const reportId = '22222222-2222-4222-8222-222222222222';

describe('secure browser media upload', () => {
  const upload = vi.fn();
  const remove = vi.fn();
  const getSession = vi.fn();
  const from = vi.fn(() => ({ upload, remove }));
  const supabase = {
    storage: { from },
    auth: { getSession },
  } as never;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('33333333-3333-4333-8333-333333333333');
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
    getSession.mockResolvedValue({
      data: { session: { access_token: 'signed-user-token' } },
      error: null,
    });
  });

  it('uses private quarantine and returns only the server-generated JPEG path', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      path: `${userId}/${reportId}/checked.jpg`,
      contentType: 'image/jpeg',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const path = await uploadSecureBrowserMedia({
      supabase,
      userId,
      kind: 'report',
      file: new File(['image'], 'photo.png', { type: 'image/png' }),
      subjectId: reportId,
    });
    expect(from).toHaveBeenCalledWith('media_quarantine');
    expect(upload).toHaveBeenCalledWith(
      `${userId}/report/33333333-3333-4333-8333-333333333333.png`,
      expect.any(File),
      { contentType: 'image/png', cacheControl: '0', upsert: false },
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/media/process', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer signed-user-token' }),
    }));
    expect(path).toBe(`${userId}/${reportId}/checked.jpg`);
  });

  it('removes the quarantined file after a rejected scan', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      error: { message: 'This photo did not pass the safety check.' },
    }), { status: 422, headers: { 'Content-Type': 'application/json' } }));
    await expect(uploadSecureBrowserMedia({
      supabase,
      userId,
      kind: 'avatar',
      file: new File(['image'], 'avatar.jpg', { type: 'image/jpeg' }),
    })).rejects.toThrow(/did not pass/i);
    expect(remove).toHaveBeenCalledWith([
      `${userId}/avatar/33333333-3333-4333-8333-333333333333.jpg`,
    ]);
  });
});
