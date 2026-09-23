import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, download, from, convert, sharp, rotate, resize, webp, toBuffer } = vi.hoisted(() => ({
  rpc: vi.fn(),
  download: vi.fn(),
  from: vi.fn(),
  convert: vi.fn(),
  sharp: vi.fn(),
  rotate: vi.fn(),
  resize: vi.fn(),
  webp: vi.fn(),
  toBuffer: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    rpc,
    from,
    storage: { from: () => ({ download }) },
  }),
}));

vi.mock('heic-convert', () => ({ default: convert }));
vi.mock('sharp', () => ({ default: sharp }));

import { GET } from './route';

const caseId = '11111111-1111-4111-8111-111111111111';
const photoPath = 'cleaner/report/before.heic';

beforeEach(() => {
  rpc.mockReset();
  download.mockReset();
  from.mockReset();
  convert.mockReset();
  sharp.mockReset();
  rotate.mockReset();
  resize.mockReset();
  webp.mockReset();
  toBuffer.mockReset();
  download.mockResolvedValue({
    data: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/heic' }),
    error: null,
  });
  convert.mockResolvedValue(new Uint8Array([4, 5, 6]));
  toBuffer.mockResolvedValue(Buffer.from([7, 8, 9]));
  webp.mockReturnValue({ toBuffer });
  resize.mockReturnValue({ webp });
  rotate.mockReturnValue({ resize });
  sharp.mockReturnValue({ rotate });
});

describe('administrator report photo compatibility route', () => {
  it('converts a case-linked HEIC photo only after the admin RPC authorizes it', async () => {
    rpc.mockResolvedValue({
      data: { report: { photo_paths: [photoPath] } },
      error: null,
    });

    const response = await GET(new Request(
      `http://localhost/api/report-photo?path=${encodeURIComponent(photoPath)}&caseId=${caseId}`,
    ));

    expect(rpc).toHaveBeenCalledWith('get_cleanup_admin_case', { target_case_id: caseId });
    expect(download).toHaveBeenCalledWith(photoPath);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('does not download a photo when the admin session lacks access', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'cleanup_admin_mfa_required' } });

    const response = await GET(new Request(
      `http://localhost/api/report-photo?path=${encodeURIComponent(photoPath)}&caseId=${caseId}`,
    ));

    expect(response.status).toBe(403);
    expect(download).not.toHaveBeenCalled();
  });

  it('does not download a photo that is not evidence for the requested case', async () => {
    rpc.mockResolvedValue({
      data: { report: { photo_paths: ['cleaner/report/other.heic'] } },
      error: null,
    });

    const response = await GET(new Request(
      `http://localhost/api/report-photo?path=${encodeURIComponent(photoPath)}&caseId=${caseId}`,
    ));

    expect(response.status).toBe(404);
    expect(download).not.toHaveBeenCalled();
  });
});

function mockPublicReport(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), is: vi.fn(() => chain), contains: vi.fn(() => chain), or: vi.fn(() => chain), limit: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: { expires_at: '2099-01-01T00:00:00.000Z', cleanup_state: 'available', is_published: true, is_sample: false, cancelled_at: null, expired_at: null, ...overrides }, error: null })),
  };
  from.mockReturnValue(chain);return chain;
}

describe('public report card photos', () => {
  it('serves completed history after the old expiration, with publication and cancellation gates', async () => {
    const query = mockPublicReport({ cleanup_state: 'completed', expires_at: '2020-01-01' });
    const response = await GET(new Request('http://localhost/api/report-photo?path=user/report/photo.jpg&variant=card'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600, s-maxage=3600');
    expect(query.eq).toHaveBeenCalledWith('is_published', true);
    expect(query.is).toHaveBeenCalledWith('cancelled_at', null);
    expect(query.is).toHaveBeenCalledWith('expired_at', null);
    expect(query.or).toHaveBeenCalledWith(expect.stringContaining('cleanup_state.eq.completed,expires_at.gt.'));
  });
  it.each([{ is_published: false }, { cancelled_at: '2020-01-01' }, { expired_at: '2020-01-01' }, { is_sample: true }])('does not download excluded completed evidence: %j', async overrides => {
    mockPublicReport({ cleanup_state: 'completed', ...overrides });
    const response = await GET(new Request('http://localhost/api/report-photo?path=user/report/photo.jpg&variant=card'));
    expect(response.status).toBe(404);expect(download).not.toHaveBeenCalled();
  });

  it('serves a small cached WebP thumbnail without HEIC conversion for a browser image', async () => {
    mockPublicReport();
    download.mockResolvedValueOnce({
      data: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
      error: null,
    });

    const response = await GET(new Request(
      'http://localhost/api/report-photo?path=user%2Freport%2Fphoto.png&variant=card',
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(Number(response.headers.get('content-length'))).toBeGreaterThan(0);
    expect(response.headers.get('cache-control')).toMatch(/^public, max-age=/);
    expect(convert).not.toHaveBeenCalled();
  });

  it('serves a bounded cached WebP for the report detail viewer', async () => {
    mockPublicReport();
    download.mockResolvedValueOnce({
      data: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
      error: null,
    });

    const response = await GET(new Request(
      'http://localhost/api/report-photo?path=user%2Freport%2Fphoto.jpg&variant=detail',
    ));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(resize).toHaveBeenCalledWith({
      width: 1600,
      height: 1200,
      fit: 'inside',
      withoutEnlargement: true,
    });
    expect(webp).toHaveBeenCalledWith({ quality: 82 });
  });
});
