// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Report } from '@litterbugs/report-contract';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CleanupReviewAction } from './cleanup-review-action';

const { rpc, state } = vi.hoisted(() => ({ rpc: vi.fn(), state: { paid: false, attemptError: false, revision: 0 } }));
vi.mock('@/lib/use-data-refresh', () => ({ useDataRefresh: () => state.revision, notifyDataChanged: vi.fn() }));
vi.mock('@/components/modal-shell', () => ({ ModalShell: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div> }));
vi.mock('@/lib/report-photo', () => ({ getWebCompatibleReportPhotoUrl: () => 'before.jpg' }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({
  rpc,
  storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'after.jpg' } }) }) },
  from: (table: string) => {
    const result = { data: table === 'cleanup_attempts'
      ? state.attemptError ? null : { id: 'cleanup', is_paid: state.paid, financial_review_status: 'passed', dispute_status: 'none' }
      : table === 'cleanup_submissions'
        ? { id: 'submission', description: 'Litter removed' }
        : table === 'profiles' ? { display_name: 'Cleaner' }
          : [{ storage_path: 'after.jpg' }], error: table === 'cleanup_attempts' && state.attemptError ? new Error('offline') : null };
    const chain = {
      select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
      maybeSingle: async () => result,
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    };
    return chain;
  },
}) }));

beforeEach(() => {
  localStorage.clear();
  state.paid = false; state.attemptError = false; state.revision = 0;
  rpc.mockResolvedValue({ data: { status: 'changes_requested' }, error: null });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

async function openReview() {
  render(<CleanupReviewAction report={{ id: 'report', photo_paths: ['before.jpg'] } as Report} userId="owner" isOwner />);
  fireEvent.click(await screen.findByRole('button', { name: state.paid ? 'Review or dispute' : 'Review cleanup' }));
  await screen.findByRole('dialog');
}

it('sends a valid change-request reason and a bounded note', async () => {
  await openReview();
  const input = screen.getByRole('textbox') as HTMLTextAreaElement;
  expect(input.maxLength).toBe(500);
  fireEvent.change(input, { target: { value: 'Please show the remaining area.' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Need another photo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('review_cleanup', expect.objectContaining({
    review_decision: 'changes_requested', request_change_reasons: ['additional_photo_needed'], reviewer_note: 'Please show the remaining area.',
  })));
  await screen.findByText('The cleaner has been asked for updated evidence.');
});

it('keeps feedback when a response has not actually transitioned the cleanup', async () => {
  rpc.mockResolvedValue({ data: { status: 'completion_submitted' }, error: null });
  await openReview();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Saved feedback' } });
  fireEvent.click(screen.getByRole('button', { name: 'Approve cleanup' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('alert').textContent).toContain('still awaiting review');
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Saved feedback');
  expect(screen.queryByText('Cleanup approved.')).toBeNull();
});

it('reports actual completion if the deadline passed during a change request', async () => {
  rpc.mockResolvedValue({ data: { status: 'completed' }, error: null });
  await openReview();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Please check this area.' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Need another photo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
  await screen.findByText('Cleanup approved.');
  expect(screen.queryByText('The cleaner has been asked for updated evidence.')).toBeNull();
});

it('keeps the separate 1000-character dispute allowance', async () => {
  state.paid = true;
  await openReview();
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).maxLength).toBe(1000);
});


it('shows a retry state instead of a blank review on initial failure', async () => {
  state.attemptError = true;
  render(<CleanupReviewAction report={{ id: 'report' } as Report} userId="owner" isOwner />);
  await screen.findByRole('alert');
  state.attemptError = false;
  fireEvent.click(screen.getByRole('button', { name: 'Retry cleanup review' }));
  await screen.findByRole('button', { name: 'Review cleanup' });
});

it('retains unsent feedback through a failed poll and retry', async () => {
  const props = { report: { id: 'report', photo_paths: ['before.jpg'] } as Report, userId: 'owner', isOwner: true };
  const view = render(<CleanupReviewAction {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Review cleanup' }));
  await screen.findByRole('dialog');
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Please photograph the far side' } });
  state.attemptError = true; state.revision++;
  view.rerender(<CleanupReviewAction {...props} />);
  await screen.findByRole('alert');
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Please photograph the far side');
  expect((screen.getByRole('button', { name: 'Approve cleanup' }) as HTMLButtonElement).disabled).toBe(true);
  state.attemptError = false;
  fireEvent.click(screen.getByRole('button', { name: 'Retry cleanup review' }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect((screen.getByRole('button', { name: 'Approve cleanup' }) as HTMLButtonElement).disabled).toBe(false);
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Please photograph the far side');
});
