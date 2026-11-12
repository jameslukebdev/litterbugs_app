// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Report } from '@litterbugs/report-contract';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { CleanupAction } from './cleanup-action';
import { cloudDrafts } from '@/lib/cloud-drafts';

const submitEvidence = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/cleanup-submission', () => ({ submitCleanupEvidence: submitEvidence }));

const telemetry = vi.hoisted(() => ({ step: vi.fn(), failure: vi.fn() }));
vi.mock('@/lib/website-analytics', async original => ({ ...await original<object>(), trackParticipation: telemetry.step, trackParticipationFailure: telemetry.failure }));
const payout = vi.hoisted(() => ({ status: vi.fn() }));
vi.mock('@/lib/funding', async original => ({ ...await original<object>(), loadPayoutStatus: payout.status }));
vi.mock('@/components/payout-setup-action', () => ({ PayoutSetupAction: ({ onReady, onDismiss }: { onReady: () => void; onDismiss: (reason: 'closed') => void }) => <div role="dialog" aria-label="Payout setup"><button onClick={onReady}>Finish payout fixture</button><button onClick={() => onDismiss('closed')}>Close payout setup</button></div> }));

const { from, rpc, state } = vi.hoisted(() => ({
  from: vi.fn(), rpc: vi.fn(), state: { accepted: true, error: false, claimed: false, attemptError: false, revision: 0 },
}));
const { loadDraft, saveDraft } = vi.hoisted(() => ({ loadDraft: vi.fn(), saveDraft: vi.fn() }));
vi.mock('@/lib/saved-cleanup-draft', () => ({ loadCleanupDraft: loadDraft, saveCleanupDraft: saveDraft, clearCleanupDraft: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from, rpc }) }));
vi.mock('@/components/modal-shell', () => ({ ModalShell: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div> }));
vi.mock('@/lib/use-data-refresh', () => ({ useDataRefresh: () => state.revision, notifyDataChanged: vi.fn() }));
const report = { id: 'report-1', cleanup_state: 'available', funded_amount_cents: 0 } as Report;
beforeEach(() => {
  state.claimed = false; state.attemptError = false; state.revision = 0;
  payout.status.mockResolvedValue({ onboardingStatus: 'not_started', payoutsEnabled: false, requirementsDue: [] });
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
          : { data: state.attemptError ? null : state.claimed ? { id: 'attempt-1', cleaner_id: 'cleaner-1', status: 'claimed', claim_expires_at: '2026-09-30' } : null, error: state.attemptError ? new Error('offline') : null }),
    };
    for (const method of ['select', 'eq', 'in', 'is', 'order', 'limit'] as const) chain[method].mockReturnValue(chain);
    return chain;
  });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('cleanup agreement and site confirmation', () => {
  it('skips an already accepted document but still requires this site confirmation', async () => {
    render(<CleanupAction report={report} userId="cleaner-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clean' }));
    await screen.findByRole('dialog');
    expect(screen.queryByText('Full versioned agreement')).toBeNull();
    const confirm = screen.getByRole('button', { name: 'Claim this cleanup' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(confirm);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('claim_cleanup', { target_report_id: 'report-1' }));
    expect(rpc).not.toHaveBeenCalledWith('accept_cleanup_waiver', expect.anything());
    expect(payout.status).not.toHaveBeenCalled();
    expect(telemetry.step).toHaveBeenCalledWith('clean', 'safety_review');
    await waitFor(() => expect(telemetry.step).toHaveBeenCalledWith('clean', 'claim_confirmed'));
  });
  it('requires both the new agreement and a site confirmation', async () => {
    state.accepted = false;
    render(<CleanupAction report={report} userId="cleaner-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clean' }));
    await screen.findByText('Full versioned agreement');
    const boxes = screen.getAllByRole('checkbox');
    const confirm = screen.getByRole('button', { name: 'Claim this cleanup' }) as HTMLButtonElement;
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
    fireEvent.click(await screen.findByRole('button', { name: 'Clean' }));
    await screen.findByText('Your saved agreement could not be checked. Try again.');
    expect(rpc).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(telemetry.failure).toHaveBeenCalledWith('clean', 'safety_review', 'safety_load_failed');
  });
});

describe('cleanup evidence recovery', () => {
  it('converts entered hours for submission and keeps the original hours in the draft', async () => {
    state.claimed = true;
    loadDraft.mockResolvedValue({ photos: [new File(['photo'], 'after.jpg', { type: 'image/jpeg' })], description: 'Removed roadside bottles', bagsOrItems: '2', weightPounds: '4' });
    const begin = vi.spyOn(cloudDrafts, 'begin').mockResolvedValue('stable-submission');
    try {
      render(<CleanupAction report={report} userId="cleaner-1" />);
      fireEvent.click(await screen.findByRole('button', { name: 'Submit cleanup photos' }));
      await waitFor(() => expect((screen.getByLabelText(/What did you clean up/) as HTMLTextAreaElement).value).toBe('Removed roadside bottles'));
      fireEvent.change(screen.getByLabelText('How long did it take? (hrs)'), { target: { value: '1.5' } });
      fireEvent.click(screen.getByRole('button', { name: 'Check before sending' }));
      fireEvent.click(screen.getByRole('button', { name: 'Send cleanup' }));
      await waitFor(() => expect(submitEvidence).toHaveBeenCalledWith(expect.objectContaining({ durationMinutes: 90, weightPounds: 4, bagsOrItems: 2, submissionId: 'stable-submission' })));
      expect(saveDraft).toHaveBeenCalledWith('cleaner-1', 'attempt-1', expect.objectContaining({ hoursSpent: '1.5' }));
      await screen.findByText('Photos sent');
    } finally { begin.mockRestore(); }
  });
  it('restores photos and text and requires review before sending evidence', async () => {
    state.claimed = true;
    loadDraft.mockResolvedValue({ photos: [new File(['photo'], 'after.jpg', { type: 'image/jpeg' })], description: 'Removed roadside bottles', bagsOrItems: '2', weightPounds: '4', hoursSpent: '1.5' });
    render(<CleanupAction report={report} userId="cleaner-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Submit cleanup photos' }));
    await waitFor(() => expect((screen.getByLabelText(/What did you clean up/) as HTMLTextAreaElement).value).toBe('Removed roadside bottles'));
    expect(screen.queryByRole('button', { name: 'Send cleanup' })).toBeNull();
    expect((screen.getByLabelText('How long did it take? (hrs)') as HTMLInputElement).value).toBe('1.5');
    fireEvent.click(screen.getByRole('button', { name: 'Check before sending' }));
    expect(screen.getByRole('heading', { name: 'Ready to send?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send cleanup' })).toBeTruthy();
    expect(screen.getByText('1.5 hrs spent')).toBeTruthy();
    expect(rpc).not.toHaveBeenCalledWith('submit_cleanup', expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect((screen.getByLabelText(/What did you clean up/) as HTMLTextAreaElement).value).toBe('Removed roadside bottles');
    fireEvent.change(screen.getByLabelText('How long did it take? (hrs)'), { target: { value: '2' } });
    await waitFor(() => expect(saveDraft).toHaveBeenCalledWith('cleaner-1', 'attempt-1', expect.objectContaining({ hoursSpent: '2' })));
  });
  it('opens an older draft with empty time and rejects invalid hours before review', async () => {
    state.claimed = true;
    loadDraft.mockResolvedValue({ photos: [new File(['photo'], 'after.jpg', { type: 'image/jpeg' })], description: 'Removed roadside bottles', bagsOrItems: '', weightPounds: '' });
    render(<CleanupAction report={report} userId="cleaner-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Submit cleanup photos' }));
    const hours = await screen.findByLabelText('How long did it take? (hrs)') as HTMLInputElement;
    await waitFor(() => expect((screen.getByLabelText(/What did you clean up/) as HTMLTextAreaElement).value).toBe('Removed roadside bottles'));
    expect(hours.value).toBe('');
    fireEvent.change(hours, { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check before sending' }));
    expect(screen.getByRole('alert').textContent).toMatch(/24 hours/);
    expect(screen.queryByRole('button', { name: 'Send cleanup' })).toBeNull();
    fireEvent.change(hours, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check before sending' }));
    expect(screen.getByRole('button', { name: 'Send cleanup' })).toBeTruthy();
    expect(screen.queryByText(/hrs spent/)).toBeNull();
  });
  it('does not overwrite an unreadable saved draft', async () => {
    state.claimed = true;
    loadDraft.mockRejectedValue(new Error('unreadable'));
    render(<CleanupAction report={report} userId="cleaner-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Submit cleanup photos' }));
    await screen.findByText(/Draft storage is unavailable/);
    fireEvent.change(screen.getByLabelText(/What did you clean up/), { target: { value: 'New text' } });
    expect(saveDraft).not.toHaveBeenCalled();
  });
});


it('never offers a claim when the initial task check fails, and recovers with Retry', async () => {
  state.attemptError = true;
  render(<CleanupAction report={report} userId="cleaner-1" />);
  await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: 'Clean' })).toBeNull();
  state.attemptError = false; state.claimed = true;
  fireEvent.click(screen.getByRole('button', { name: 'Retry cleanup status' }));
  await screen.findByRole('button', { name: 'Submit cleanup photos' });
  expect(screen.queryByRole('alert')).toBeNull();
});

it('keeps entered evidence through refresh failure and restores submission after retry', async () => {
  state.claimed = true;
  loadDraft.mockResolvedValue({ photos: [new File(['photo'], 'after.jpg', { type: 'image/jpeg' })], description: 'Initial notes', bagsOrItems: '2', weightPounds: '' });
  const view = render(<CleanupAction report={report} userId="cleaner-1" workspace />);
  const description = await screen.findByLabelText(/What did you clean up/);
  await waitFor(() => expect((description as HTMLTextAreaElement).value).toBe('Initial notes'));
  fireEvent.change(description, { target: { value: 'My latest evidence' } });
  state.attemptError = true; state.revision++;
  view.rerender(<CleanupAction report={report} userId="cleaner-1" workspace />);
  await screen.findByRole('alert');
  expect((screen.getByLabelText(/What did you clean up/) as HTMLTextAreaElement).value).toBe('My latest evidence');
  expect(screen.queryByRole('button', { name: 'Clean' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Check before sending' }));
  expect((screen.getByRole('button', { name: 'Send cleanup' }) as HTMLButtonElement).disabled).toBe(true);
  state.attemptError = false;
  fireEvent.click(screen.getByRole('button', { name: 'Retry cleanup status' }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect((screen.getByRole('button', { name: 'Send cleanup' }) as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getByText('My latest evidence', { selector: 'p' })).toBeTruthy();
});

it('opens safety review after sign-in without accepting an agreement or claiming', async () => {
  const view = render(<CleanupAction report={report} userId={null} autoOpen />);
  expect(screen.queryByRole('dialog')).toBeNull();
  view.rerender(<CleanupAction report={report} userId="cleaner-1" autoOpen />);
  const confirm = await screen.findByRole('button', { name: 'Claim this cleanup' }) as HTMLButtonElement;
  expect(confirm.disabled).toBe(true);
  expect(rpc).not.toHaveBeenCalled();
});

it('asks on the page before giving a cleanup back, and Keep it cancels', async () => {
  state.claimed = true;
  render(<CleanupAction report={report} userId="cleaner-1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'I can’t do this cleanup' }));
  expect(screen.getByText(/Give this cleanup back\?/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
  expect(rpc).not.toHaveBeenCalledWith('release_cleanup', expect.anything());
  fireEvent.click(screen.getByRole('button', { name: 'I can’t do this cleanup' }));
  fireEvent.click(screen.getByRole('button', { name: 'Give it back' }));
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('release_cleanup', { target_cleanup_id: 'attempt-1' }));
  await screen.findByText('Cleanup given back');
});

it.each(['returned', 'thrown'])('records a %s claim failure without a confirmed-claim event', async mode => {
  if (mode === 'returned') rpc.mockResolvedValue({ error: new Error('private backend message') });
  else rpc.mockRejectedValue(new Error('private backend message'));
  render(<CleanupAction report={report} userId="cleaner-1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Clean' }));
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Claim this cleanup' }));
  await waitFor(() => expect(telemetry.failure).toHaveBeenCalledWith('clean', 'safety_review', 'claim_failed'));
  expect(telemetry.step).not.toHaveBeenCalledWith('clean', 'claim_confirmed');
});

const fundedReport = { ...report, funded_amount_cents: 100 } as Report;
const readyPayout = { onboardingStatus: 'enabled', payoutsEnabled: true, age18Confirmed: true, requirementsDue: [] };

it('opens payout setup before safety for a funded cleanup, then rechecks readiness before returning', async () => {
  render(<CleanupAction report={fundedReport} userId="cleaner-1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Clean' }));
  await screen.findByRole('dialog', { name: 'Payout setup' });
  expect(screen.queryByRole('button', { name: 'Claim this cleanup' })).toBeNull();
  expect(from.mock.calls.some(([table]) => table === 'cleanup_waiver_versions')).toBe(false);
  expect(rpc).not.toHaveBeenCalled();
  payout.status.mockResolvedValue(readyPayout);
  fireEvent.click(screen.getByRole('button', { name: 'Finish payout fixture' }));
  await screen.findByRole('button', { name: 'Claim this cleanup' });
  expect(payout.status).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('dialog', { name: 'Payout setup' })).toBeNull();
  expect(rpc).not.toHaveBeenCalled();
  expect(telemetry.step).toHaveBeenCalledWith('clean', 'payout_setup');
  expect(telemetry.step).toHaveBeenCalledWith('clean', 'payout_ready');
});

it('goes straight to safety when the funded cleaner already has enabled payouts', async () => {
  payout.status.mockResolvedValue(readyPayout);
  render(<CleanupAction report={fundedReport} userId="cleaner-1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Clean' }));
  await screen.findByRole('button', { name: 'Claim this cleanup' });
  expect(screen.queryByRole('dialog', { name: 'Payout setup' })).toBeNull();
  expect(rpc).not.toHaveBeenCalled();
});

it('keeps the claim closed when payout status fails and allows another check', async () => {
  payout.status.mockRejectedValue(new Error('private Stripe detail'));
  render(<CleanupAction report={fundedReport} userId="cleaner-1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Clean' }));
  await screen.findByText('Your payout setup could not be checked. Please try Clean again.');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(rpc).not.toHaveBeenCalled();
  expect(telemetry.failure).toHaveBeenCalledWith('clean', 'payout_check', 'payout_status_load_failed');
  payout.status.mockResolvedValue(readyPayout);
  fireEvent.click(screen.getByRole('button', { name: 'Clean' }));
  await screen.findByRole('button', { name: 'Claim this cleanup' });
});

it('cancels payout setup without opening safety or claiming and checks again on the next Clean', async () => {
  render(<CleanupAction report={fundedReport} userId="cleaner-1" autoOpen />);
  fireEvent.click(await screen.findByRole('button', { name: 'Close payout setup' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(rpc).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Clean' }));
  await screen.findByRole('dialog', { name: 'Payout setup' });
  expect(payout.status).toHaveBeenCalledTimes(2);
});

it('does not open a stale funded flow after switching reports', async () => {
  let finish!: (value: typeof readyPayout) => void;
  payout.status.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const view = render(<CleanupAction report={fundedReport} userId="cleaner-1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Clean' }));
  await waitFor(() => expect(payout.status).toHaveBeenCalledOnce());
  view.rerender(<CleanupAction report={{ ...report, id: 'different-report' }} userId="cleaner-1" />);
  const { act } = await import('@testing-library/react');
  await act(async () => finish(readyPayout));
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(await screen.findByRole('button', { name: 'Clean' }));
  await screen.findByRole('button', { name: 'Claim this cleanup' });
  expect(payout.status).toHaveBeenCalledOnce();
});

it('returns to payout setup if readiness changes between safety and the server claim', async () => {
  payout.status.mockResolvedValue(readyPayout);
  rpc.mockResolvedValue({ error: new Error('cleaner_payout_onboarding_required') });
  render(<CleanupAction report={fundedReport} userId="cleaner-1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Clean' }));
  fireEvent.click(await screen.findByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Claim this cleanup' }));
  await screen.findByRole('dialog', { name: 'Payout setup' });
  expect(screen.queryByRole('button', { name: 'Claim this cleanup' })).toBeNull();
  expect(telemetry.step).not.toHaveBeenCalledWith('clean', 'claim_confirmed');
});

it('opens the funded sign-in continuation under the development Strict Mode lifecycle', async () => {
  render(<StrictMode><CleanupAction report={fundedReport} userId="cleaner-1" autoOpen /></StrictMode>);
  await screen.findByRole('dialog', { name: 'Payout setup' });
  expect(screen.queryByRole('button', { name: 'Claim this cleanup' })).toBeNull();
  expect(rpc).not.toHaveBeenCalled();
});
