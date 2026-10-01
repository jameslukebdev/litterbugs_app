// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT } from '@litterbugs/report-contract';
import { ResumeDrafts } from './resume-drafts';
const mocks = vi.hoisted(() => ({ remote: vi.fn(), local: vi.fn() }));
vi.mock('@/lib/use-data-refresh', () => ({ useDataRefresh: () => 0 }));
vi.mock('@/lib/saved-report-draft', () => ({ loadLocalReportDraft: mocks.local }));
vi.mock('@/lib/saved-cleanup-draft', () => ({ loadLocalCleanupDraft: async () => undefined }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: () => { const chain = { select: () => chain, eq: () => chain, in: () => chain, gt: mocks.remote }; return chain; } }) }));
const attempts: [] = [];
beforeEach(() => { mocks.local.mockResolvedValue({ draft: { ...EMPTY_REPORT_DRAFT, title: 'Older device copy' }, coordinates: { latitude: 1, longitude: 2 }, step: 0, fundingChoice: '', customAmount: '', savedAt: 100 }); });
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('retains readable device work when the account request throws', async () => {
  mocks.remote.mockRejectedValue(new Error('network'));
  render(<ResumeDrafts userId="owner" attempts={attempts} />);
  expect(await screen.findByText('Older device copy')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Resume report' }).getAttribute('href')).toBe('/report');
  expect(screen.getByRole('status').textContent).toContain('Some saved versions');
});
it('isolates malformed remote records instead of hiding device work', async () => {
  mocks.remote.mockResolvedValue({ data: [{ draft_key: 'report', state: 'editing', expires_at: '2099-01-01', payload: { version: 99 } }], error: null });
  render(<ResumeDrafts userId="owner" attempts={attempts} />);
  expect(await screen.findByText('Older device copy')).toBeTruthy();
});
it('shows the account copy alongside an older local summary', async () => {
  mocks.remote.mockResolvedValue({ data: [{ draft_key: 'report', state: 'editing', expires_at: '2099-01-01', updated_at: '2026-10-01T12:00:00Z', photo_paths: [], payload: { version: 1, kind: 'report', coordinates: { latitude: 2, longitude: 3 }, step: 1, fundingChoice: '', customAmount: '', draft: { ...EMPTY_REPORT_DRAFT, title: 'Newer account copy' } } }], error: null });
  render(<ResumeDrafts userId="owner" attempts={attempts} />);
  expect(await screen.findByText('Newer account copy')).toBeTruthy();
  expect(screen.getByText('Older device copy')).toBeTruthy();
});
