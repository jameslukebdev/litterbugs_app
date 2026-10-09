// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CommunityRank } from './community-rank';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc }) }));
vi.mock('@/lib/use-data-refresh', () => ({ useDataRefresh: () => 0 }));
afterEach(() => { cleanup(); rpc.mockReset(); });
it('reserves rank artwork and progress without visible loading copy', async () => {
  let resolve!: (value: { data: number; error: null }) => void;
  rpc.mockReturnValue(new Promise(done => { resolve = done; }));
  const { container, rerender } = render(<CommunityRank userId="" />);
  expect(rpc).not.toHaveBeenCalled();
  expect(screen.getByRole('status', { name: 'Loading rank' })).toBeTruthy();
  expect(screen.queryByText('Loading…')).toBeNull();
  expect(container.querySelector('.community-rank-artwork')).toBeTruthy();
  expect(container.querySelector('.community-rank-progress')?.getAttribute('aria-hidden')).toBe('true');
  rerender(<CommunityRank userId="rank-member" />);
  resolve({ data: 12, error: null });
  expect(await screen.findByRole('heading', { name: 'Honeybee' })).toBeTruthy();
  expect(container.querySelector('.community-rank-progress')?.getAttribute('aria-hidden')).toBe('false');
});
it('keeps a retry available when the rank request fails', async () => {
  rpc.mockResolvedValue({ data: null, error: new Error('offline') });
  render(<CommunityRank userId="failed-rank-member" />);
  expect(await screen.findByRole('button', { name: 'Retry loading rank' })).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('region', { name: 'Community rank' }).getAttribute('aria-busy')).toBe('false'));
});
