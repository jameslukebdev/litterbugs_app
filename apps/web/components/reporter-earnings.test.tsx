// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReporterEarnings } from './reporter-earnings';
const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/lib/account-reports', () => ({ loadAccountPages: load }));
vi.mock('@/lib/use-data-refresh', () => ({ useDataRefresh: () => 0 }));
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }));
vi.mock('@/components/icon', () => ({ Icon: () => null }));
afterEach(cleanup);
beforeEach(() => { load.mockReset(); });
describe('reporter earnings', () => {
  it('explains the reward without requiring payment to report', async () => {
    load.mockResolvedValue({ data: [], error: null });
    render(<ReporterEarnings userId="reporter" />);
    expect(await screen.findByText(/No reporter earnings yet/)).toBeTruthy();
    expect(screen.getByText(/Earn 5% of eligible contributions/)).toBeTruthy();
  });
  it('distinguishes a transfer to Stripe from bank arrival', async () => {
    load.mockResolvedValue({ data: [{ cleanup_attempt_id: 'reward', report_id: 'report', amount_cents: 500,
      status: 'transferred', created_at: '2026-10-21T12:00:00Z', report: { title: 'Riverside' } }] });
    render(<ReporterEarnings userId="reporter" />);
    expect(await screen.findByText('$5.00 · Sent to Stripe')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Riverside/ }).getAttribute('href')).toBe('/account/reports/report?from=payments');
    expect(screen.getByText(/Bank arrival follows/)).toBeTruthy();
  });
  it('offers a retry instead of showing an empty account on errors', async () => {
    load.mockResolvedValueOnce({ data: [], error: new Error('offline') }).mockResolvedValue({ data: [], error: null });
    render(<ReporterEarnings userId="reporter" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry loading reporter earnings' }));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/No reporter earnings yet/)).toBeTruthy();
  });
});
