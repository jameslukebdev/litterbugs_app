import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
const { updateSession, resolveRoute } = vi.hoisted(() => ({ updateSession: vi.fn(), resolveRoute: vi.fn() }));
vi.mock('@/lib/supabase/proxy', () => ({ updateSession }));
vi.mock('@/lib/public-report-route', () => ({ resolvePublicReportRoute: resolveRoute }));
import { proxy } from './proxy';
beforeEach(() => {
  vi.clearAllMocks();
  updateSession.mockImplementation(async () => NextResponse.next());
  resolveRoute.mockResolvedValue({ kind: 'pass' });
});

it.each(['https://litterbugs.app/reports', 'https://www.litterbugs.app/reports/history'])(
  'does not apply preview noindex to the actual production URL %s', async url => {
    expect((await proxy(new NextRequest(url))).headers.get('X-Robots-Tag')).toBeNull();
  },
);
it.each(['http://localhost:3000/reports', 'http://127.0.0.1:3000/reports', 'https://preview.vercel.app/reports'])(
  'keeps the preview URL %s out of search', async url => {
    expect((await proxy(new NextRequest(url))).headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  },
);

it('redirects an id or outdated report address to the readable one, keeping the query', async () => {
  resolveRoute.mockResolvedValue({ kind: 'redirect', path: '/litter-reports/creek-cleanup-boone-id' });
  const response = await proxy(new NextRequest('https://litterbugs.app/reports/id?photo=2'));
  expect(response.status).toBe(307);
  expect(response.headers.get('location')).toBe('https://litterbugs.app/litter-reports/creek-cleanup-boone-id?photo=2');
  expect(response.headers.get('X-Robots-Tag')).toBeNull();
  expect(updateSession).not.toHaveBeenCalled();
});

it('answers a report that is not public with a real 404 that search engines must not index', async () => {
  resolveRoute.mockResolvedValue({ kind: 'missing' });
  const response = await proxy(new NextRequest('https://litterbugs.app/litter-reports/gone-id'));
  expect(response.status).toBe(404);
  expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
});

it('leaves form posts and other non-read requests to the page', async () => {
  await proxy(new NextRequest('https://litterbugs.app/reports/id', { method: 'POST' }));
  expect(resolveRoute).not.toHaveBeenCalled();
});
