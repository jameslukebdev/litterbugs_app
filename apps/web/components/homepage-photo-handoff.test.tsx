// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
it('starts the real report flow and sends discovery cards to the map', () => {
  render(<ReportStarter />);
  expect(screen.getByRole('link', { name: 'Report trash' }).getAttribute('href')).toBe('/report');
  expect(screen.getByRole('link', { name: 'Choose a spot' }).getAttribute('href')).toBe('/map?view=map&browse=1&status=available');
  expect(screen.getByRole('link', { name: 'Find a cleanup' }).getAttribute('href')).toBe('/map?view=map&browse=1&status=available');
  expect(screen.queryByLabelText('Choose a litter photo')).toBeNull();
});
it('imports into existing draft without replacing fields or publishing, and returns to photos for review', async () => {
  store.load.mockResolvedValue(incoming());
  const submit=vi.fn(); const changed=vi.fn();
  const draft={ ...EMPTY_REPORT_DRAFT, title:'Existing draft', photos:[new File(['old'], 'existing.jpg', {type:'image/jpeg'})], selectedTypes:['Bottles'], severity:'Low' as const };
  render(<ReportWizard initialDraft={draft} initialState={{draft,step:4,fundingChoice:'none',customAmount:''}} onStateChange={changed} isEditing={false} onClose={vi.fn()} onSubmit={submit} />);
  // Added automatically: no extra tap after choosing the photo on the homepage.
  await waitFor(()=>expect(store.clear).toHaveBeenCalled());
  expect(screen.getByText('Step 1 of 5')).toBeTruthy();
  await waitFor(() => expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({draft:expect.objectContaining({title:'Existing draft', photos:[draft.photos[0],expect.objectContaining({name:'homepage.jpg'})]})})));
  expect(submit).not.toHaveBeenCalled();
});
it('retains the incoming photo when the existing draft is full', async () => {
  store.load.mockResolvedValue(incoming());
  render(<ReportWizard initialDraft={{...EMPTY_REPORT_DRAFT,photos:[incoming(),incoming(),incoming()]}} isEditing={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
  await screen.findByText('Choose no more than 3 photos.');
  expect(store.clear).not.toHaveBeenCalled(); expect(await screen.findByRole('button',{name:'Use this photo'})).toBeTruthy();
});
