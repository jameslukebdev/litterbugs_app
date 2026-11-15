// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT } from '@litterbugs/report-contract';
import { ReportLocationError } from '@/lib/report-location-error';
vi.mock('@/lib/use-photo-previews', () => ({ usePhotoPreviews: () => [] }));
vi.mock('./report-start-photo-import', () => ({ ReportStartPhotoImport: () => null }));
vi.mock('./modal-shell', () => ({ ModalShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
import { ReportWizard } from './report-wizard';

afterEach(cleanup);
describe('report location recovery', () => {
  it('keeps the report inputs through settings help, dismissal and retry', async () => {
    const draft = { ...EMPTY_REPORT_DRAFT, title: 'Bottles by the trail', selectedTypes: ['Bottles'], severity: 'Low' as const, photos: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] };
    const onSubmit = vi.fn().mockResolvedValueOnce(new ReportLocationError('Denied', 'location_denied')).mockResolvedValueOnce(new ReportLocationError('Unavailable', 'location_timeout')).mockResolvedValue(null);
    const onClose = vi.fn();
    const changeLocation = vi.fn();
    render(<ReportWizard initialDraft={draft} initialState={{ draft, step: 4, fundingChoice: 'none', customAmount: '' }} coordinates={{ latitude: 36.2, longitude: -81.6 }} isEditing={false} draftLocked onSubmit={onSubmit} onClose={onClose} onChangeLocation={changeLocation} />);
    expect(screen.getByRole('button', { name: 'Change report location' }).matches(':disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Submit report' }).matches(':disabled')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
    await screen.findByRole('heading', { name: 'Allow location to confirm your spot.' });
    expect(screen.getByText(/site controls beside the address bar/)).toBeTruthy();
    expect(screen.getByText(/Your report pin and answers are kept/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to report' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(changeLocation).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
    await screen.findByRole('heading', { name: 'We couldn’t check your location.' });
    expect(screen.getByRole('button', { name: 'Try again' }).closest('fieldset')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(3));
    for (const call of onSubmit.mock.calls) expect(call).toEqual([draft, null]);
    expect(onClose).not.toHaveBeenCalled();
  });
});
