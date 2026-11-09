// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { CompletedCleanup, afterPhotoUrl } from './completed-cleanup';

const createSignedUrl = vi.fn();
const rows: Record<string, unknown> = {};
function query(table: string) {
  const q: Record<string, unknown> = {};
  for (const name of ['select', 'eq', 'not', 'order', 'limit']) q[name] = vi.fn(() => q);
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
  pending.length = 0; loaded.clear(); failing.clear(); createSignedUrl.mockReset();
  rows.cleanup_attempts = { id: 'attempt', cleaner_id: 'cleaner', completed_at: '2026-11-08T12:00:00Z', final_submission_id: 'final', is_paid: true, reward_amount_cents: 2500 };
  rows.cleanup_submissions = { description: 'Two bags of bottles', bags_or_items_removed: 1, weight_pounds: 5 };
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
  expect(screen.getByText(/bag or item removed/)).toBeTruthy();
  expect(screen.getByText('Cleaned by')).toBeTruthy();
  expect(createSignedUrl).not.toHaveBeenCalled();
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
