// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT } from '@litterbugs/report-contract';
import { ReportWizard } from './report-wizard';
import { ReportStarter } from './public-website/report-starter';
const store = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), clear: vi.fn() }));
vi.mock('@/lib/report-photo-start', () => ({ loadReportStartPhoto: store.load, saveReportStartPhoto: store.save, clearReportStartPhoto: store.clear }));
vi.mock('@/lib/prepare-browser-photo', () => ({ prepareBrowserPhotos: async (files: File[]) => files }));
const incoming = () => new File(['photo'], 'homepage.jpg', { type: 'image/jpeg' });
beforeEach(() => {
  vi.clearAllMocks(); store.load.mockResolvedValue(null); store.save.mockResolvedValue(undefined); store.clear.mockResolvedValue(undefined);
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});
afterEach(cleanup);
it('offers continuation only after the photo is saved locally, and allows removal', async () => {
  render(<ReportStarter />);
  fireEvent.change(screen.getByLabelText('Choose a litter photo'), { target: { files: [incoming()] } });
  const link = await screen.findByRole('link', { name: 'Continue report' });
  expect(link.getAttribute('href')).toBe('/report'); expect(store.save).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Continue report' })).toBeNull());
  expect(store.clear).toHaveBeenCalled();
});
it('keeps storage failures recoverable without pretending the photo was saved', async () => {
  store.save.mockRejectedValue(new Error('Storage is full'));
  render(<ReportStarter />);
  fireEvent.change(screen.getByLabelText('Choose a litter photo'), { target: { files: [incoming()] } });
  await screen.findByRole('alert');
  expect(screen.queryByRole('link', { name: 'Continue report' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Start a report' }).getAttribute('href')).toBe('/report');
});
it('imports into existing draft without replacing fields or publishing, and returns to photos for review', async () => {
  store.load.mockResolvedValue(incoming());
  const submit=vi.fn(); const changed=vi.fn();
  const draft={ ...EMPTY_REPORT_DRAFT, title:'Existing draft', photos:[new File(['old'], 'existing.jpg', {type:'image/jpeg'})], selectedTypes:['Bottles'], severity:'Low' as const };
  render(<ReportWizard initialDraft={draft} initialState={{draft,step:4,fundingChoice:'none',customAmount:''}} onStateChange={changed} isEditing={false} onClose={vi.fn()} onSubmit={submit} />);
  fireEvent.click(await screen.findByRole('button', {name:'Use this photo'}));
  await waitFor(()=>expect(store.clear).toHaveBeenCalled());
  expect(screen.getByText('Step 1 of 5')).toBeTruthy();
  await waitFor(() => expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({draft:expect.objectContaining({title:'Existing draft', photos:[draft.photos[0],expect.objectContaining({name:'homepage.jpg'})]})})));
  expect(submit).not.toHaveBeenCalled();
});
it('retains the incoming photo when the existing draft is full', async () => {
  store.load.mockResolvedValue(incoming());
  render(<ReportWizard initialDraft={{...EMPTY_REPORT_DRAFT,photos:[incoming(),incoming(),incoming()]}} isEditing={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button',{name:'Use this photo'}));
  await screen.findByText('Choose no more than 3 photos.');
  expect(store.clear).not.toHaveBeenCalled(); expect(screen.getByRole('button',{name:'Use this photo'})).toBeTruthy();
});
