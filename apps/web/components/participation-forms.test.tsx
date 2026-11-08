// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT, type Report } from '@litterbugs/report-contract';
import { ReportWizard } from './report-wizard';
import { CleanupAction } from './cleanup-action';
const f = vi.hoisted(() => ({ step: vi.fn(), failure: vi.fn(), submit: vi.fn(), begin: vi.fn(), prepare: vi.fn() }));
vi.mock('@/lib/website-analytics', async original => ({ ...await original<object>(), trackParticipation: f.step, trackParticipationFailure: f.failure }));
vi.mock('@/lib/prepare-browser-photo', () => ({ prepareBrowserPhotos: f.prepare }));
vi.mock('@/lib/use-draft-editor-lock', () => ({ useDraftEditorLock: () => 'ready' }));
vi.mock('@/lib/cloud-drafts', () => ({ cloudDrafts: { begin: f.begin, subscribe: () => () => {}, status: () => 'saved' } }));
vi.mock('@/components/cloud-draft-status', () => ({ CloudDraftStatus: () => null }));
vi.mock('@/lib/cleanup-submission', () => ({ submitCleanupEvidence: f.submit }));
vi.mock('@/lib/saved-cleanup-draft', () => ({
  loadCleanupDraft: async () => ({ photos: [new File(['photo'], 'after.jpg', { type: 'image/jpeg' })], description: 'Cleaned up bottles', submissionId: 'saved-submission', bagsOrItems: '', weightPounds: '' }),
  saveCleanupDraft: async () => {}, clearCleanupDraft: async () => {},
}));
vi.mock('@/lib/use-cleanup-attempt', () => ({ useCleanupAttempt: () => ({ attempt: { id: 'claim', cleaner_id: 'member', status: 'claimed', is_paid: false }, loading: false, failed: false, refresh: async () => {}, clear: () => {} }) }));
beforeEach(() => {
  vi.clearAllMocks();
  f.begin.mockResolvedValue('saved-submission'); f.submit.mockResolvedValue(undefined);
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:test' });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => {} });
});
afterEach(cleanup);
const draft = () => ({ ...EMPTY_REPORT_DRAFT, selectedTypes: ['Bottles'], severity: 'Low' as const, photos: [new File(['photo'], 'before.jpg', { type: 'image/jpeg' })] });

it('tracks all five redesigned report steps in order without calling review a publication', async () => {
  const submit = vi.fn().mockResolvedValue(null);
  render(<ReportWizard initialDraft={draft()} isEditing={false} onClose={() => {}} onSubmit={submit} />);
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: /^Next$/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
  await waitFor(() => expect(submit).toHaveBeenCalledOnce());
  expect(f.step.mock.calls).toEqual(['photos', 'litter_type', 'severity', 'details', 'review'].map(stage => ['report', stage]));
  expect(f.step).not.toHaveBeenCalledWith('report', 'published');
});
it('tracks preparation failure while leaving the report photo step usable', async () => {
  f.prepare.mockRejectedValue(new Error('private filename detail'));
  render(<ReportWizard initialDraft={EMPTY_REPORT_DRAFT} isEditing={false} onClose={() => {}} onSubmit={async () => null} />);
  fireEvent.change(document.querySelector('input[type=file]')!, { target: { files: [new File(['photo'], 'private.jpg', { type: 'image/jpeg' })] } });
  await waitFor(() => expect(f.failure).toHaveBeenCalledExactlyOnceWith('report', 'photos', 'photo_prepare_failed'));
  expect(screen.getByRole('heading', { name: 'Add photos' })).toBeTruthy();
});
it('tracks evidence submitted only after the cleanup submission resolves, even if the later UI refresh fails', async () => {
  const changed = vi.fn().mockRejectedValue(new Error('refresh unavailable'));
  render(<CleanupAction report={{ id: 'report', cleanup_state: 'claimed', photo_paths: [] } as unknown as Report} userId="member" workspace onChanged={changed} />);
  await waitFor(() => expect(screen.getByLabelText(/What did you clean up/)).toHaveProperty('value', 'Cleaned up bottles'));
  expect(f.step).toHaveBeenCalledWith('clean', 'evidence_form');
  expect(f.step).not.toHaveBeenCalledWith('clean', 'evidence_submitted');
  fireEvent.click(screen.getByRole('button', { name: 'Check before sending' }));
  fireEvent.click(screen.getByRole('button', { name: 'Send cleanup' }));
  await waitFor(() => expect(f.step).toHaveBeenCalledWith('clean', 'evidence_submitted'));
  expect(f.submit).toHaveBeenCalledOnce();
  expect(f.failure).not.toHaveBeenCalled();
});
it('records a draft-sync block before sending cleanup evidence and preserves the form', async () => {
  f.begin.mockRejectedValue(new Error('private storage detail'));
  render(<CleanupAction report={{ id: 'report', cleanup_state: 'claimed', photo_paths: [] } as unknown as Report} userId="member" workspace />);
  await waitFor(() => expect(screen.getByLabelText(/What did you clean up/)).toHaveProperty('value', 'Cleaned up bottles'));
  fireEvent.click(screen.getByRole('button', { name: 'Check before sending' }));
  fireEvent.click(screen.getByRole('button', { name: 'Send cleanup' }));
  await waitFor(() => expect(f.failure).toHaveBeenCalledWith('clean', 'evidence_form', 'draft_save_failed'));
  expect(f.submit).not.toHaveBeenCalled();
  expect(f.step).not.toHaveBeenCalledWith('clean', 'evidence_submitted');
});
