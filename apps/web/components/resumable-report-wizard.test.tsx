// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT } from '@litterbugs/report-contract';
import { ResumableReportWizard } from './resumable-report-wizard';

const decisions = vi.hoisted(() => vi.fn());
vi.mock('@/lib/website-analytics', async original => ({ ...await original<object>(), trackParticipationExit: decisions }));
const storage = vi.hoisted(() => ({ load: vi.fn(), journal: vi.fn(), save: vi.fn(), clear: vi.fn() }));
vi.mock('@/lib/saved-report-draft', () => ({ loadReportDraft: storage.load, loadReportPublication: storage.journal, saveReportDraft: storage.save, clearReportDraft: storage.clear }));
const sync = vi.hoisted(() => ({
  status: 'unsaved',
  listeners: new Set<(owner: string, key: string, status: string) => void>(),
}));
vi.mock('@/lib/cloud-drafts', () => ({ cloudDrafts: {
  status: () => sync.status,
  subscribe: (listener: (owner: string, key: string, status: string) => void) => {
    sync.listeners.add(listener); return () => sync.listeners.delete(listener);
  },
} }));
function syncStatus(status: string) {
  sync.status = status;
  sync.listeners.forEach(listener => listener('owner', 'report', status));
}
beforeEach(() => {
  sync.status = 'unsaved';
  vi.resetAllMocks();
  storage.load.mockResolvedValue(undefined); storage.journal.mockResolvedValue(undefined);
  storage.save.mockResolvedValue(undefined); storage.clear.mockResolvedValue(undefined);
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});
afterEach(cleanup);
const saved = () => ({ draft: { ...EMPTY_REPORT_DRAFT, title: 'Saved bottles', selectedTypes: ['Bottles'], severity: 'Low', photos: [new File(['evidence'], 'photo.jpg', { type: 'image/jpeg' })] }, coordinates: { latitude: 36, longitude: -81 }, step: 4, fundingChoice: 'other', customAmount: '12.34' });
function open() {
  const props = { userId: 'owner', coordinates: { latitude: 36, longitude: -81 }, selectingLocation: false, fundingEnabled: true, onCoordinatesChange: vi.fn(), onRestorePublication: vi.fn(), onClose: vi.fn(), onSubmit: vi.fn() };
  render(<ResumableReportWizard {...props} />);return props;
}
it('restores the saved review and custom contribution without saving over it during loading', async () => {
  storage.load.mockResolvedValue(saved());const props=open();
  fireEvent.click(await screen.findByRole('button', { name: 'Resume draft' }));
  expect(props.onCoordinatesChange).toHaveBeenCalledWith(saved().coordinates);
  expect(decisions).toHaveBeenCalledExactlyOnceWith('report', 'review', 'draft_resumed');
  expect(screen.getByText('Step 5 of 5')).toBeTruthy();
  expect(screen.getByDisplayValue('12.34')).toBeTruthy();
  expect(storage.save).toHaveBeenCalledWith('owner', expect.objectContaining({ draft: expect.objectContaining({ title: 'Saved bottles' }) }));
});
it('prevents starting over when a submission needs recovery', async () => {
  storage.load.mockResolvedValue(saved());storage.journal.mockResolvedValue({ userId: 'owner', reportId: 'report', paths: [] });
  const props=open();await screen.findByRole('button', { name: 'Resume draft' });
  expect(screen.queryByRole('button', { name: 'Start over' })).toBeNull();
  expect(props.onRestorePublication).toHaveBeenCalledWith(expect.objectContaining({ reportId: 'report' }));
});
it('keeps the form open and reports an explicit save failure', async () => {
  storage.save.mockRejectedValue(new Error('Quota exceeded'));const props=open();
  fireEvent.change(await screen.findByLabelText('Report title (optional)'), { target: { value: 'Keep this draft' } });
  await screen.findByText(/Draft could not be saved on this browser/);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save for later' }));
  await screen.findByText('Draft could not be saved. Keep this screen open and try again.');
  expect(props.onClose).not.toHaveBeenCalled();
  expect(decisions).not.toHaveBeenCalledWith('report', expect.anything(), 'saved_for_later');
});
it('keeps the recovery draft open when server cancellation cannot be confirmed', async () => {
  storage.clear.mockRejectedValue(new Error('Offline'));
  const props=open();await screen.findByLabelText('Report title (optional)');
  storage.journal.mockResolvedValue({ userId: 'owner', reportId: 'report', paths: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
  await screen.findByText('Draft could not be discarded. It is still available; keep this screen open and try again.');
  expect(storage.clear).toHaveBeenCalled();expect(props.onClose).not.toHaveBeenCalled();
});
it('does not overwrite a draft when loading storage fails', async () => {
  storage.load.mockRejectedValue(new Error('Unavailable'));open();
  await screen.findByText('Draft unavailable');expect(storage.save).not.toHaveBeenCalled();
});
it('reads the recovery journal after retiring a completed phone submission', async () => {
  storage.journal.mockResolvedValue({ userId: 'owner', reportId: 'completed', paths: ['owner/photo.jpg'] });
  storage.load.mockImplementation(async () => {
    storage.journal.mockResolvedValue(undefined);
    return undefined;
  });
  const props = open();
  await screen.findByRole('heading', { name: 'Add photos' });
  expect(screen.queryByRole('button', { name: 'Resume draft' })).toBeNull();
  expect(props.onRestorePublication).toHaveBeenCalledWith(undefined);
  expect(storage.save).not.toHaveBeenCalled();
});

it('clears a pending publication only after confirmed server cancellation', async () => {
  storage.load.mockResolvedValue(saved());storage.journal.mockResolvedValue({ userId:'owner',reportId:'report',paths:[] });
  let confirm!:()=>void;
  storage.clear.mockImplementation(()=>new Promise<void>(resolve=>{confirm=resolve;}));
  const props=open();fireEvent.click(await screen.findByRole('button',{name:'Resume draft'}));
  fireEvent.click(screen.getByRole('button',{name:'Close'}));fireEvent.click(screen.getByRole('button',{name:'Discard draft'}));
  expect(props.onClose).not.toHaveBeenCalled();
  confirm();
  await waitFor(()=>expect(props.onClose).toHaveBeenCalled());
  expect(props.onRestorePublication).toHaveBeenLastCalledWith(undefined);
});

const photos = vi.hoisted(() => ({ prepare: vi.fn() }));
vi.mock('@/lib/prepare-browser-photo', () => ({ prepareBrowserPhotos: photos.prepare }));
it('persists prepared photo bytes even if browser navigation unmounts the editor', async () => {
  let finish!: (files: File[]) => void;
  photos.prepare.mockImplementationOnce(() => new Promise<File[]>(resolve => { finish = resolve; }));
  open();
  await screen.findByLabelText('Report title (optional)');
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  const selected = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
  fireEvent.change(input, { target: { files: [selected] } });
  await waitFor(() => expect(photos.prepare).toHaveBeenCalled());
  cleanup();
  finish([selected]);
  await waitFor(() => expect(storage.save).toHaveBeenCalledWith('owner', expect.objectContaining({ draft: expect.objectContaining({ photos: [selected] }) })));
});
it('keeps a prepared photo visible if saving its device copy fails', async () => {
  const selected = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
  photos.prepare.mockResolvedValueOnce([selected]);
  open();
  await screen.findByLabelText('Report title (optional)');
  storage.save.mockRejectedValue(new Error('Device storage is full'));
  fireEvent.change(document.querySelector<HTMLInputElement>('input[type="file"]')!, { target: { files: [selected] } });
  expect(await screen.findByAltText('Selected report photo 1')).toBeTruthy();
  await screen.findByText('Device storage is full');
});

// Publishing deletes the cloud draft before the parent closes the form. The
// resulting unlock must not autosave the still-mounted submitted form again.
it('does not resurrect a submitted draft when cloud cleanup unlocks the editor', async () => {
  storage.load.mockResolvedValue({ ...saved(), fundingChoice: 'none' });
  const props = open();
  fireEvent.click(await screen.findByRole('button', { name: 'Resume draft' }));
  let finish!: (error: string | null) => void;
  props.onSubmit.mockImplementation(() => new Promise<string | null>(resolve => { finish = resolve; }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
  await waitFor(() => expect(props.onSubmit).toHaveBeenCalled());
  await act(async () => syncStatus('submitting'));
  storage.save.mockClear();
  await act(async () => syncStatus('local'));
  expect(storage.save).not.toHaveBeenCalled();
  await act(async () => finish(null));
  expect(storage.save).not.toHaveBeenCalled();
});

it.each(['returned error', 'thrown error'])('continues saving edits after a submission fails with a %s', async failure => {
  storage.load.mockResolvedValue({ ...saved(), fundingChoice: 'none' });
  const props = open();
  fireEvent.click(await screen.findByRole('button', { name: 'Resume draft' }));
  if (failure === 'thrown error') props.onSubmit.mockRejectedValue(new Error('Lost response'));
  else props.onSubmit.mockResolvedValue('Please try again.');
  fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
  await screen.findByText(failure === 'thrown error' ? 'Your report could not be confirmed. Check your connection and try again.' : 'Please try again.');
  for (let step = 4; step > 0; step--) fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  storage.save.mockClear();
  fireEvent.change(screen.getByLabelText('Report title (optional)'), { target: { value: 'Updated report' } });
  await waitFor(() => expect(storage.save).toHaveBeenCalledWith('owner', expect.objectContaining({ draft: expect.objectContaining({ title: 'Updated report' }) })));
});

it('starts a blank report after clearing the old draft and omits the removed subheading', async () => {
  storage.load.mockResolvedValue(saved());
  const props = open();
  await screen.findByRole('button', { name: 'Resume draft' });
  expect(screen.queryByText('Starting new replaces this draft.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
  await screen.findByRole('heading', { name: 'Add photos' });
  expect(storage.clear).toHaveBeenCalledExactlyOnceWith('owner');
  expect((screen.getByLabelText('Report title (optional)') as HTMLInputElement).value).toBe('');
  expect(screen.queryByAltText('Selected report photo 1')).toBeNull();
  expect(props.onSubmit).not.toHaveBeenCalled();
});

const blank = () => ({ draft: { ...EMPTY_REPORT_DRAFT }, coordinates: { latitude: 36, longitude: -81 }, step: 0, fundingChoice: 'none', customAmount: '' });
it('does not save an untouched form, including when Save for later is clicked', async () => {
  const props = open();
  await screen.findByLabelText('Report title (optional)');
  expect(storage.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save for later' }));
  await waitFor(() => expect(props.onClose).toHaveBeenCalled());
  expect(storage.save).not.toHaveBeenCalled();
});
it('opens an old empty draft without a resume prompt or rewriting it', async () => {
  storage.load.mockResolvedValue(blank());
  open();
  await screen.findByRole('heading', { name: 'Add photos' });
  expect(screen.queryByRole('button', { name: 'Resume draft' })).toBeNull();
  expect(storage.save).not.toHaveBeenCalled();
  expect(storage.clear).not.toHaveBeenCalled();
});
it.each(['journal', 'conflict', 'submitting'])('preserves recovery for an empty draft with %s', async recovery => {
  storage.load.mockResolvedValue(blank());
  if (recovery === 'journal') storage.journal.mockResolvedValue({ userId: 'owner', reportId: 'report', paths: [] });
  else sync.status = recovery;
  open();
  await screen.findByRole('button', { name: 'Resume draft' });
  expect(storage.save).not.toHaveBeenCalled();
  expect(storage.clear).not.toHaveBeenCalled();
});
it('saves the first entered detail and still saves when the user clears it', async () => {
  open();
  const title = await screen.findByLabelText('Report title (optional)');
  fireEvent.change(title, { target: { value: 'Draft title' } });
  await waitFor(() => expect(storage.save).toHaveBeenCalledWith('owner', expect.objectContaining({ draft: expect.objectContaining({ title: 'Draft title' }) })));
  fireEvent.change(title, { target: { value: '' } });
  await waitFor(() => expect(storage.save).toHaveBeenLastCalledWith('owner', expect.objectContaining({ draft: expect.objectContaining({ title: '' }) })));
});

it('records Save for later only after the explicit save succeeds', async () => {
  storage.load.mockResolvedValue({ ...saved(), fundingChoice: 'none' });
  const props = open();
  fireEvent.click(await screen.findByRole('button', { name: 'Resume draft' }));
  expect(decisions).toHaveBeenCalledWith('report', 'review', 'draft_resumed');
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(decisions).not.toHaveBeenCalledWith('report', 'review', 'saved_for_later');
  fireEvent.click(screen.getByRole('button', { name: 'Save for later' }));
  await waitFor(() => expect(props.onClose).toHaveBeenCalledOnce());
  expect(decisions).toHaveBeenCalledWith('report', 'review', 'saved_for_later');
});
