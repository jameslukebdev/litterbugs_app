// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Report } from '@litterbugs/report-contract';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CleanupAction } from './cleanup-action';

const { from, rpc, state } = vi.hoisted(() => ({
  from: vi.fn(), rpc: vi.fn(), state: { accepted: true, error: false, claimed: false },
}));
const { loadDraft, saveDraft } = vi.hoisted(() => ({ loadDraft: vi.fn(), saveDraft: vi.fn() }));
vi.mock('@/lib/saved-cleanup-draft', () => ({ loadCleanupDraft: loadDraft, saveCleanupDraft: saveDraft, clearCleanupDraft: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from, rpc }) }));
vi.mock('@/components/modal-shell', () => ({ ModalShell: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div> }));
const report = { id: 'report-1', cleanup_state: 'available', funded_amount_cents: 0 } as Report;
beforeEach(() => {
  state.claimed = false;
  loadDraft.mockResolvedValue(undefined);
  saveDraft.mockResolvedValue(undefined);
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:evidence') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  state.accepted = true;
  state.error = false;
  rpc.mockResolvedValue({ data: {}, error: null });
  from.mockImplementation((table: string) => {
    const chain = {
      select: vi.fn(), eq: vi.fn(), in: vi.fn(), is: vi.fn(), order: vi.fn(), limit: vi.fn(),
      maybeSingle: vi.fn().mockImplementation(async () => table === 'cleanup_waiver_versions'
        ? { data: { waiver_version: 'v4', guidelines_version: 'v2', body: 'Full versioned agreement', published_at: '2026-09-23' }, error: null }
        : table === 'cleanup_waiver_acceptances'
          ? { data: state.accepted ? { waiver_version: 'v4' } : null, error: state.error ? new Error('offline') : null }
          : { data: state.claimed ? { id: 'attempt-1', cleaner_id: 'cleaner-1', status: 'claimed', claim_expires_at: '2026-09-30' } : null, error: null }),
    };
    for (const method of ['select', 'eq', 'in', 'is', 'order', 'limit'] as const) chain[method].mockReturnValue(chain);
    return chain;
  });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('cleanup agreement and site confirmation', () => {
  it('skips an already accepted document but still requires this site confirmation', async () => {
    render(<CleanupAction report={report} userId="cleaner-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Claim cleanup' }));
    await screen.findByRole('dialog');
    expect(screen.queryByText('Full versioned agreement')).toBeNull();
    const confirm = screen.getByRole('button', { name: 'Confirm and claim cleanup' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(confirm);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('claim_cleanup', { target_report_id: 'report-1' }));
    expect(rpc).not.toHaveBeenCalledWith('accept_cleanup_waiver', expect.anything());
  });
  it('requires both the new agreement and a site confirmation', async () => {
    state.accepted = false;
    render(<CleanupAction report={report} userId="cleaner-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Claim cleanup' }));
    await screen.findByText('Full versioned agreement');
    const boxes = screen.getAllByRole('checkbox');
    const confirm = screen.getByRole('button', { name: 'Confirm and claim cleanup' }) as HTMLButtonElement;
    fireEvent.click(boxes[0]);
    expect(confirm.disabled).toBe(true);
    fireEvent.click(boxes[1]);
    fireEvent.click(confirm);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('accept_cleanup_waiver', { accepted_waiver_version: 'v4', accepted_guidelines_version: 'v2' }));
    expect(rpc).toHaveBeenCalledWith('claim_cleanup', { target_report_id: 'report-1' });
  });
  it('does not claim when saved acceptance cannot be checked', async () => {
    state.error = true;
    render(<CleanupAction report={report} userId="cleaner-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Claim cleanup' }));
    await screen.findByText('Your saved agreement could not be checked. Try again.');
    expect(rpc).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('cleanup evidence recovery', () => {
  it('restores photos and text and requires review before sending evidence', async () => {
    state.claimed = true;
    loadDraft.mockResolvedValue({ photos: [new File(['photo'], 'after.jpg', { type: 'image/jpeg' })], description: 'Removed roadside bottles', bagsOrItems: '2', weightPounds: '4' });
    render(<CleanupAction report={report} userId="cleaner-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Submit cleanup photos' }));
    await waitFor(() => expect((screen.getByLabelText(/Cleanup description/) as HTMLTextAreaElement).value).toBe('Removed roadside bottles'));
    expect(screen.queryByRole('button', { name: 'Submit cleanup', exact: true })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Review cleanup' }));
    expect(screen.getByRole('heading', { name: 'Review your cleanup' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit cleanup', exact: true })).toBeTruthy();
    expect(rpc).not.toHaveBeenCalledWith('submit_cleanup', expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Edit cleanup' }));
    expect((screen.getByLabelText(/Cleanup description/) as HTMLTextAreaElement).value).toBe('Removed roadside bottles');
  });
  it('does not overwrite an unreadable saved draft', async () => {
    state.claimed = true;
    loadDraft.mockRejectedValue(new Error('unreadable'));
    render(<CleanupAction report={report} userId="cleaner-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Submit cleanup photos' }));
    await screen.findByText(/Draft storage is unavailable/);
    fireEvent.change(screen.getByLabelText(/Cleanup description/), { target: { value: 'New text' } });
    expect(saveDraft).not.toHaveBeenCalled();
  });
});
