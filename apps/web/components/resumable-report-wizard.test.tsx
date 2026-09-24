// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT } from '@litterbugs/report-contract';
import { ResumableReportWizard } from './resumable-report-wizard';

const storage = vi.hoisted(() => ({ load: vi.fn(), journal: vi.fn(), save: vi.fn(), clear: vi.fn() }));
vi.mock('@/lib/saved-report-draft', () => ({ loadReportDraft: storage.load, loadReportPublication: storage.journal, saveReportDraft: storage.save, clearReportDraft: storage.clear }));
beforeEach(() => {
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
  expect(screen.getByText('Step 5 of 5')).toBeTruthy();
  expect(screen.getByDisplayValue('12.34')).toBeTruthy();
  expect(storage.save).toHaveBeenCalledWith('owner', expect.objectContaining({ draft: expect.objectContaining({ title: 'Saved bottles' }) }));
});
it('prevents starting over when a submission needs recovery', async () => {
  storage.load.mockResolvedValue(saved());storage.journal.mockResolvedValue({ userId: 'owner', reportId: 'report', paths: [] });
  const props=open();await screen.findByRole('button', { name: 'Resume draft' });
  expect(screen.queryByRole('button', { name: 'Start new' })).toBeNull();
  expect(props.onRestorePublication).toHaveBeenCalledWith(expect.objectContaining({ reportId: 'report' }));
});
it('keeps the form open and reports an explicit save failure', async () => {
  storage.save.mockRejectedValue(new Error('Quota exceeded'));const props=open();
  await screen.findByText(/Draft could not be saved on this browser/);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save for later' }));
  await screen.findByText('Draft could not be saved. Keep this screen open and try again.');
  expect(props.onClose).not.toHaveBeenCalled();
});
it('checks the journal again before discarding and keeps uncertain submissions recoverable', async () => {
  const props=open();await screen.findByLabelText('Report title (optional)');
  storage.journal.mockResolvedValue({ userId: 'owner', reportId: 'report', paths: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
  await waitFor(() => expect(screen.getByText(/Your previous submission needs checking/)).toBeTruthy());
  expect(storage.clear).not.toHaveBeenCalled();expect(props.onClose).not.toHaveBeenCalled();
});
it('does not overwrite a draft when loading storage fails', async () => {
  storage.load.mockRejectedValue(new Error('Unavailable'));open();
  await screen.findByText('Draft unavailable');expect(storage.save).not.toHaveBeenCalled();
});
