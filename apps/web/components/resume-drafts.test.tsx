// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT } from '@litterbugs/report-contract';
import { ResumeDrafts } from './resume-drafts';
const mocks = vi.hoisted(() => ({ remote: vi.fn(), local: vi.fn(), revision: 0 }));
vi.mock('@/lib/use-data-refresh', () => ({ useDataRefresh: () => mocks.revision }));
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

const accountDraft = () => ({ draft_key: 'report', state: 'editing', expires_at: '2099-01-01', updated_at: '2026-10-01T12:00:00Z', photo_paths: [], payload: { version: 1, kind: 'report', coordinates: { latitude: 2, longitude: 3 }, step: 1, fundingChoice: '', customAmount: '', draft: { ...EMPTY_REPORT_DRAFT, title: 'Phone draft' } } });
it('retains account-only work on refresh failure, then removes it on a confirmed empty retry', async () => {
  mocks.local.mockResolvedValue(undefined);
  mocks.remote.mockResolvedValue({ data: [accountDraft()], error: null });
  const view = render(<ResumeDrafts userId="owner" attempts={attempts} />);
  await screen.findByText('Phone draft');
  mocks.remote.mockResolvedValue({ data: null, error: new Error('offline') });
  mocks.revision++;
  view.rerender(<ResumeDrafts userId="owner" attempts={attempts} />);
  await screen.findByText('Last known account copy — could not refresh.');
  expect(screen.getByText('Phone draft')).toBeTruthy();
  mocks.remote.mockResolvedValue({ data: [], error: null });
  fireEvent.click(screen.getByRole('button', { name: 'Retry saved drafts' }));
  await waitFor(() => expect(screen.queryByText('Phone draft')).toBeNull());
});
it('never retains another account’s draft when the next account fails to load', async () => {
  mocks.local.mockResolvedValue(undefined);
  mocks.remote.mockResolvedValue({ data: [accountDraft()], error: null });
  const view = render(<ResumeDrafts userId="owner" attempts={attempts} />);
  await screen.findByText('Phone draft');
  mocks.remote.mockRejectedValue(new Error('offline'));
  view.rerender(<ResumeDrafts userId="other" attempts={attempts} />);
  expect(screen.queryByText('Phone draft')).toBeNull();
  await screen.findByRole('button', { name: 'Retry saved drafts' });
  expect(screen.queryByText('Phone draft')).toBeNull();
});
it('does not keep an expired account copy during an outage', async () => {
  const draft = accountDraft();
  draft.expires_at = new Date(Date.now() + 10000).toISOString();
  mocks.local.mockResolvedValue(undefined);
  mocks.remote.mockResolvedValue({ data: [draft], error: null });
  const view = render(<ResumeDrafts userId="owner" attempts={attempts} />);
  await screen.findByText('Phone draft');
  const now = vi.spyOn(Date, 'now').mockReturnValue(Date.parse(draft.expires_at) + 1);
  mocks.remote.mockRejectedValue(new Error('offline')); mocks.revision++;
  view.rerender(<ResumeDrafts userId="owner" attempts={attempts} />);
  await screen.findByRole('button', { name: 'Retry saved drafts' });
  expect(screen.queryByText('Phone draft')).toBeNull(); now.mockRestore();
});

it('signals readiness only after both draft sources settle, including an empty result', async () => {
  let resolve!: (result: unknown) => void;
  mocks.local.mockResolvedValue(undefined);
  mocks.remote.mockReturnValue(new Promise(done => { resolve = done; }));
  const ready = vi.fn();
  render(<ResumeDrafts userId="owner" attempts={attempts} onReady={ready} />);
  expect(ready).not.toHaveBeenCalled();
  resolve({ data: [], error: null });
  await waitFor(() => expect(ready).toHaveBeenCalledWith(true));
  expect(screen.queryByRole('region', { name: 'Resume your work' })).toBeNull();
});
it('signals readiness on a source failure so activity is not hidden by an error', async () => {
  mocks.local.mockRejectedValue(new Error('device unavailable'));
  mocks.remote.mockRejectedValue(new Error('offline'));
  const ready = vi.fn();
  render(<ResumeDrafts userId="owner" attempts={attempts} onReady={ready} />);
  expect(await screen.findByRole('button', { name: 'Retry saved drafts' })).toBeTruthy();
  await waitFor(() => expect(ready).toHaveBeenCalledWith(true));
});
