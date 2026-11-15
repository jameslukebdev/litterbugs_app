// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT } from '@litterbugs/report-contract';
import { ResumeDrafts } from './resume-drafts';
const mocks = vi.hoisted(() => ({ remote: vi.fn(), local: vi.fn(), clearReport: vi.fn(), clearCleanup: vi.fn(), revision: 0 }));
vi.mock('@/lib/use-data-refresh', () => ({ useDataRefresh: () => mocks.revision }));
vi.mock('@/lib/saved-report-draft', () => ({ loadLocalReportDraft: mocks.local, clearReportDraft: mocks.clearReport }));
vi.mock('@/lib/saved-cleanup-draft', () => ({ loadLocalCleanupDraft: async () => undefined, clearCleanupDraft: mocks.clearCleanup }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: () => { const chain = { select: () => chain, eq: () => chain, in: () => chain, gt: mocks.remote }; return chain; } }) }));
const attempts: [] = [];
beforeEach(() => { mocks.local.mockResolvedValue({ draft: { ...EMPTY_REPORT_DRAFT, title: 'Older device copy' }, coordinates: { latitude: 1, longitude: 2 }, step: 0, fundingChoice: '', customAmount: '', savedAt: 100 }); });
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('retains readable device work when the account request throws', async () => {
  mocks.remote.mockRejectedValue(new Error('network'));
  render(<ResumeDrafts userId="owner" attempts={attempts} />);
  expect(await screen.findByText('Older device copy')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Resume report' }).getAttribute('href')).toBe('/report');
  expect(screen.getByRole('status').textContent).toContain('Some saved reports');
});
it('isolates malformed remote records instead of hiding device work', async () => {
  mocks.remote.mockResolvedValue({ data: [{ draft_key: 'report', state: 'editing', expires_at: '2099-01-01', payload: { version: 99 } }], error: null });
  render(<ResumeDrafts userId="owner" attempts={attempts} />);
  expect(await screen.findByText('Older device copy')).toBeTruthy();
});
it('shows one compact summary while keeping the existing resume destination', async () => {
  mocks.remote.mockResolvedValue({ data: [{ draft_key: 'report', state: 'editing', expires_at: '2099-01-01', updated_at: '2026-10-01T12:00:00Z', photo_paths: [], payload: { version: 1, kind: 'report', coordinates: { latitude: 2, longitude: 3 }, step: 1, fundingChoice: '', customAmount: '', draft: { ...EMPTY_REPORT_DRAFT, title: 'Newer account copy' } } }], error: null });
  render(<ResumeDrafts userId="owner" attempts={attempts} />);
  expect(await screen.findByText('Older device copy')).toBeTruthy();
  expect(screen.queryByText('Account copy')).toBeNull();
  expect(screen.queryByText('Saved version details')).toBeNull();
  expect(screen.getAllByRole('link', { name: 'Resume report' })).toHaveLength(1);
});

const accountDraft = () => ({ revision: 7, draft_key: 'report', state: 'editing', expires_at: '2099-01-01', updated_at: '2026-10-01T12:00:00Z', photo_paths: [], payload: { version: 1, kind: 'report', coordinates: { latitude: 2, longitude: 3 }, step: 1, fundingChoice: '', customAmount: '', draft: { ...EMPTY_REPORT_DRAFT, title: 'Phone draft' } } });
it('retains account-only work on refresh failure, then removes it on a confirmed empty retry', async () => {
  mocks.local.mockResolvedValue(undefined);
  mocks.remote.mockResolvedValue({ data: [accountDraft()], error: null });
  const view = render(<ResumeDrafts userId="owner" attempts={attempts} />);
  await screen.findByText('Phone draft');
  mocks.remote.mockResolvedValue({ data: null, error: new Error('offline') });
  mocks.revision++;
  view.rerender(<ResumeDrafts userId="owner" attempts={attempts} />);
  await screen.findByText('Some saved reports couldn’t be refreshed. Please try again.');
  expect(screen.getByText('Phone draft')).toBeTruthy();
  mocks.remote.mockResolvedValue({ data: [], error: null });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh saved reports' }));
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
  await screen.findByRole('button', { name: 'Refresh saved reports' });
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
  await screen.findByRole('button', { name: 'Refresh saved reports' });
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
  expect(await screen.findByRole('button', { name: 'Refresh saved reports' })).toBeTruthy();
  await waitFor(() => expect(ready).toHaveBeenCalledWith(true));
});

it('keeps a draft until deletion is confirmed, then removes it after success', async () => {
  mocks.local.mockResolvedValue(undefined);
  mocks.remote.mockResolvedValue({ data: [accountDraft()], error: null });
  mocks.clearReport.mockResolvedValue(undefined);
  render(<ResumeDrafts userId="owner" attempts={attempts} />);
  await screen.findByText('Phone draft');
  fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
  expect(mocks.clearReport).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Keep draft' }));
  expect(screen.getByText('Phone draft')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
  await waitFor(() => expect(screen.queryByText('Phone draft')).toBeNull());
  expect(mocks.clearReport).toHaveBeenCalledWith('owner', { expectedRevision: 7 });
});
it('retains the draft and offers refresh if deletion cannot be confirmed', async () => {
  mocks.local.mockResolvedValue(undefined);
  mocks.remote.mockResolvedValue({ data: [accountDraft()], error: null });
  mocks.clearReport.mockRejectedValue(new Error('draft_conflict'));
  render(<ResumeDrafts userId="owner" attempts={attempts} />);
  await screen.findByText('Phone draft');
  fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByText('Phone draft')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Refresh saved reports' })).toBeTruthy();
});
it('discards only cleanup evidence for the selected attempt', async () => {
  mocks.local.mockResolvedValue(undefined);
  const draft = { ...accountDraft(), draft_key: 'cleanup:attempt-a', payload: { version: 1, kind: 'cleanup', description: 'Saved cleanup', bagsOrItems: '', weightPounds: '', hoursSpent: '' } };
  mocks.remote.mockResolvedValue({ data: [draft], error: null });
  mocks.clearCleanup.mockResolvedValue(undefined);
  render(<ResumeDrafts userId="owner" attempts={[{ id: 'attempt-a', report_id: 'report-a' }]} />);
  await screen.findByRole('link', { name: 'Continue cleanup' });
  fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
  expect(screen.getByText(/Your cleanup will stay active/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
  await waitFor(() => expect(mocks.clearCleanup).toHaveBeenCalledWith('owner', 'attempt-a', { expectedRevision: 7 }));
  expect(mocks.clearReport).not.toHaveBeenCalled();
});
it('does not interrupt a different account loading while an earlier deletion completes', async () => {
  let finishDelete!: () => void;
  let finishLoad!: (value: unknown) => void;
  mocks.local.mockResolvedValue(undefined);
  mocks.remote.mockResolvedValue({ data: [accountDraft()], error: null });
  mocks.clearReport.mockReturnValue(new Promise<void>(resolve => { finishDelete = resolve; }));
  const view = render(<ResumeDrafts userId="owner" attempts={attempts} />);
  await screen.findByText('Phone draft');
  fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }));
  mocks.remote.mockReturnValue(new Promise(resolve => { finishLoad = resolve; }));
  view.rerender(<ResumeDrafts userId="other" attempts={attempts} />);
  await waitFor(() => expect(finishLoad).toBeDefined());
  finishDelete();
  await waitFor(() => expect(screen.queryByText('Phone draft')).toBeNull());
  const other = accountDraft();
  other.payload.draft.title = 'Other account report';
  finishLoad({ data: [other], error: null });
  expect(await screen.findByText('Other account report')).toBeTruthy();
  expect(mocks.clearReport).toHaveBeenCalledWith('owner', { expectedRevision: 7 });
});
