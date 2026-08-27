import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, download, from, convert } = vi.hoisted(() => ({
  rpc: vi.fn(),
  download: vi.fn(),
  from: vi.fn(),
  convert: vi.fn(),
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

import { GET } from './route';

const caseId = '11111111-1111-4111-8111-111111111111';
const photoPath = 'cleaner/report/before.heic';

beforeEach(() => {
  rpc.mockReset();
  download.mockReset();
  from.mockReset();
  convert.mockReset();
  download.mockResolvedValue({
    data: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/heic' }),
    error: null,
  });
  convert.mockResolvedValue(new Uint8Array([4, 5, 6]));
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
