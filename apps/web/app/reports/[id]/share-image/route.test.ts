import { expect, it, vi } from 'vitest';
const { loadReport } = vi.hoisted(() => ({ loadReport: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/public-report-share', () => ({ loadPublicReportShare: loadReport }));
vi.mock('@/lib/social-card-logo', () => ({ loadSocialCardLogo: async () => '/logo.png' }));
vi.mock('@/lib/social-card-fonts', () => ({ loadSocialCardFonts: async () => [] }));
vi.mock('next/og', () => ({ ImageResponse: class extends Response { constructor() { super('image bytes'); } } }));
import { GET } from './route';

it('does not retain publicly cached report images after publication can change', async () => {
  loadReport.mockResolvedValue({ id: 'report-id', title: 'Litter report' });
  const response = await GET(new Request('http://localhost/reports/report-id/share-image'), { params: Promise.resolve({ id: 'report-id' }) });
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  expect(response.headers.get('Content-Type')).toBe('image/png');
});
it('returns an uncached 404 when a report is no longer public', async () => {
  loadReport.mockResolvedValue(null);
  const response = await GET(new Request('http://localhost/reports/report-id/share-image'), { params: Promise.resolve({ id: 'report-id' }) });
  expect(response.status).toBe(404);
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
