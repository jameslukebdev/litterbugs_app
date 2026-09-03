import { beforeEach, describe, expect, it, vi } from 'vitest';

const { convert, sharp, rotate, resize, jpeg, toBuffer } = vi.hoisted(() => ({
  convert: vi.fn(),
  sharp: vi.fn(),
  rotate: vi.fn(),
  resize: vi.fn(),
  jpeg: vi.fn(),
  toBuffer: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('heic-convert', () => ({ default: convert }));
vi.mock('sharp', () => ({ default: sharp }));

import { embedSocialCardPhoto } from './social-card-photo';

beforeEach(() => {
  vi.clearAllMocks();
  convert.mockResolvedValue(new Uint8Array([4, 5, 6]));
  toBuffer.mockResolvedValue(Buffer.from([7, 8, 9]));
  jpeg.mockReturnValue({ toBuffer });
  resize.mockReturnValue({ jpeg });
  rotate.mockReturnValue({ resize });
  sharp.mockReturnValue({ rotate });
});

describe('social card photo embedding', () => {
  it('converts an iPhone HEIC upload before passing it to the card renderer', async () => {
    const download = vi.fn().mockResolvedValue({
      data: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/heic' }),
      error: null,
    });
    const client = { storage: { from: () => ({ download }) } };

    const url = await embedSocialCardPhoto(client, 'report_photos', 'owner/report/photo.heic');

    expect(convert).toHaveBeenCalledOnce();
    expect(resize).toHaveBeenCalledWith(expect.objectContaining({ width: 720, height: 720 }));
    expect(jpeg).toHaveBeenCalledWith({ quality: 82, mozjpeg: true });
    expect(url).toBe('data:image/jpeg;base64,BwgJ');
  });

  it('falls back to a card without a photo when storage cannot deliver it', async () => {
    const client = {
      storage: {
        from: () => ({ download: vi.fn().mockResolvedValue({ data: null, error: new Error('missing') }) }),
      },
    };

    await expect(embedSocialCardPhoto(client, 'cleanup_photos', 'missing.heic'))
      .resolves.toBeNull();
  });
});
