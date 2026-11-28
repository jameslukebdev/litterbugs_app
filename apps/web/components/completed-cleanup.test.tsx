// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useState } from 'react';

import { AfterPhotos, CompletedCleanup, afterPhotoUrl } from './completed-cleanup';

const createSignedUrl = vi.fn();
const selectColumns = vi.fn();
const rows: Record<string, unknown> = {};
function query(table: string) {
  const q: Record<string, unknown> = {};
  for (const name of ['select', 'eq', 'not', 'order', 'limit']) q[name] = vi.fn(() => q);
  q.select = (columns: string) => { selectColumns(table, columns); return q; };
  q.maybeSingle = vi.fn(async () => ({ data: rows[table], error: null }));
  q.then = (resolve: (value: unknown) => void) => resolve({ data: rows[table], error: null });
  return q;
}
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: (table: string) => query(table), storage: { from: () => ({ createSignedUrl }) } }),
}));
vi.mock('@/components/report-author', () => ({ ReportAuthor: () => <span className="report-author">Nevan</span> }));

// Test images: "load" when the test says so, or fail for URLs in `failing`.
const pending: Array<{ src: string; onload: (() => void) | null; onerror: (() => void) | null }> = [];
const failing = new Set<string>();
class TestImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  decoding = 'auto';
  decode() { return Promise.resolve(); }
  set src(value: string) { const entry = { src: value, onload: () => this.onload?.(), onerror: () => this.onerror?.() }; pending.push(entry); if (failing.has(value)) queueMicrotask(() => entry.onerror()); }
}
const loaded = new Set<string>();
async function loadAll() { await act(async () => { for (const entry of pending.splice(0)) { loaded.add(entry.src); entry.onload?.(); } await new Promise(r => setTimeout(r, 300)); }); }
/** Under a busy test run the next photo may start loading a little later, so keep going until it has. */
async function loadUntil(src: string) { for (let i = 0; i < 10 && !loaded.has(src); i++) await loadAll(); }

beforeEach(() => {
  vi.stubGlobal('Image', TestImage);
  pending.length = 0; loaded.clear(); failing.clear(); createSignedUrl.mockReset(); selectColumns.mockClear();
  rows.cleanup_attempts = { id: 'attempt', cleaner_id: 'cleaner', completed_at: '2026-11-08T12:00:00Z', final_submission_id: 'final', is_paid: true, reward_amount_cents: 2500 };
  rows.cleanup_submissions = { description: 'Two bags of bottles', bags_or_items_removed: 1, weight_pounds: 5, duration_minutes: null };
  rows.cleanup_submission_photos = [{ storage_path: 'a.jpg' }, { storage_path: 'b.jpg' }];
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('shows each resized photo only once it has fully loaded, with arrows between them', async () => {
  render(<CompletedCleanup reportId="report-1" />);
  expect(await screen.findByRole('status', { name: 'Loading photo' })).toBeTruthy();
  expect(screen.queryByRole('img', { name: /After-cleanup photo/ })).toBeNull();
  await waitFor(() => expect(pending.map(entry => entry.src)).toContain(afterPhotoUrl('report-1', 0)));

  await loadUntil(afterPhotoUrl('report-1', 0));
  const first = screen.getByRole('img', { name: 'After-cleanup photo 1 of 2' });
  expect(first.getAttribute('src')).toBe('/reports/report-1/photo/after?photo=0&width=640');
  expect(screen.getByText('1/2')).toBeTruthy();

  await loadUntil(afterPhotoUrl('report-1', 1));
  fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
  expect(screen.getByRole('img', { name: 'After-cleanup photo 2 of 2' }).getAttribute('src')).toBe('/reports/report-1/photo/after?photo=1&width=640');
  expect(screen.getByText('$25.00 paid from the cleanup fund')).toBeTruthy();
  expect(screen.getByLabelText('1 bag or item removed')).toBeTruthy();
  expect(screen.getByText('Cleaned by')).toBeTruthy();
  expect(createSignedUrl).not.toHaveBeenCalled();
});

it.each([[90, '1.5', 'hrs'], [60, '1', 'hr'], [5, '0.1', 'hrs']])('loads %i minutes and shows %s %s spent like the app', async (minutes, value, unit) => {
  rows.cleanup_submissions = { description: null, bags_or_items_removed: 4, weight_pounds: 35, duration_minutes: minutes };
  render(<CompletedCleanup reportId="report-1" showPhotos={false} />);
  const stats = await screen.findByRole('group', { name: 'Cleanup stats' });
  expect(selectColumns).toHaveBeenCalledWith('cleanup_submissions', 'description,bags_or_items_removed,weight_pounds,duration_minutes');
  expect(within(stats).getByText(value)).toBeTruthy();
  expect(within(stats).getByText(`${unit} spent`)).toBeTruthy();
  expect(within(stats).getByLabelText('4 bags or items removed')).toBeTruthy();
  expect(within(stats).getByLabelText('35 pounds removed')).toBeTruthy();
  expect(within(stats).queryByText('time not recorded')).toBeNull();
});

it('shows an honest placeholder when an older cleanup has no duration', async () => {
  render(<CompletedCleanup reportId="report-1" showPhotos={false} />);
  const stat = await screen.findByLabelText('Time spent was not recorded');
  expect(within(stat).getByText('–')).toBeTruthy();
  expect(within(stat).getByText('time not recorded')).toBeTruthy();
});

it('shows recorded time even when bags and weight were not recorded', async () => {
  rows.cleanup_submissions = { description: null, bags_or_items_removed: null, weight_pounds: null, duration_minutes: 120 };
  render(<CompletedCleanup reportId="report-1" showPhotos={false} />);
  expect(await screen.findByLabelText('2 hours spent')).toBeTruthy();
});

it('falls back to the signed original when the resized photo is unavailable', async () => {
  rows.cleanup_submission_photos = [{ storage_path: 'a.jpg' }];
  failing.add(afterPhotoUrl('report-1', 0));
  createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.test/a.jpg?token=1' } });
  render(<CompletedCleanup reportId="report-1" />);
  await screen.findByRole('status', { name: 'Loading photo' });
  await act(async () => { await new Promise(r => setTimeout(r, 20)); });
  await loadAll();
  expect(createSignedUrl).toHaveBeenCalledWith('a.jpg', 3600);
  expect(screen.getByRole('img', { name: 'After-cleanup photo 1 of 1' }).getAttribute('src')).toBe('https://storage.test/a.jpg?token=1');
  expect(screen.queryByRole('button', { name: 'Next photo' })).toBeNull();
});

it('retains the previous photo and announces loading when navigating in the expanded after gallery', async () => {
  const paths = ['a.jpg', 'b.jpg'];
  function Gallery() {
    const [open, setOpen] = useState(false);
    return <AfterPhotos reportId="report-1" paths={paths} viewer={{
      open, onOpen: () => setOpen(true), onClose: () => setOpen(false),
    }} />;
  }
  render(<Gallery />);
  await loadUntil(afterPhotoUrl('report-1', 0));
  fireEvent.click(screen.getByRole('button', { name: 'View full photo' }));
  const dialog = screen.getByRole('dialog', { name: 'Report photo viewer' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Next photo' }));
  expect(within(dialog).getByText('Loading photo…')).toBeTruthy();
  expect(dialog.querySelector('.photo-viewer-retained')?.getAttribute('src')).toBe(afterPhotoUrl('report-1', 0));
  await loadUntil(afterPhotoUrl('report-1', 1));
  await within(dialog).findByRole('img', { name: 'After-cleanup photo 2' });
  expect(within(dialog).queryByText('Loading photo…')).toBeNull();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  expect(screen.getByRole('img', { name: 'After-cleanup photo 2 of 2' })).toBeTruthy();
});
