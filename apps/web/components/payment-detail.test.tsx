// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaymentDetail } from './payment-detail';
const { getUser, from, invoke, eq, record } = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), invoke: vi.fn(), eq: vi.fn(), record: { status: 'payment_pending' } }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getUser }, from, functions: { invoke } }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('payment status confirmation', () => {
  it('shows pending honestly and confirms ownership before showing a receipt', async () => {
    record.status = 'payment_pending';
    getUser.mockResolvedValue({ data: { user: { id: 'member-1' } } });
    const query = { select: () => query, eq, maybeSingle: async () => ({ data: { id: 'payment-1', report_id: 'report-1', status: record.status, total_amount_cents: 2750, principal_amount_cents: 2500, platform_fee_cents: 250, created_at: '2026-09-24' }, error: null }) };
    eq.mockReturnValue(query); from.mockReturnValue(query);
    invoke.mockImplementation(async () => { record.status = 'succeeded'; return { data: {}, error: null }; });
    render(<PaymentDetail contributionId="payment-1" onOpenReport={vi.fn()} />);
    await screen.findByText(/haven’t confirmed this payment yet/);
    expect(eq).toHaveBeenCalledWith('contributor_id', 'member-1');
    expect(screen.queryByText('Your contribution is in the cleanup fund.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Check payment status' }));
    await screen.findByText('Your contribution is in the cleanup fund.');
    expect(invoke).toHaveBeenCalledWith('check-contribution-status', { body: { contributionId: 'payment-1' } });
  });
  it('does not query payment data for a signed-out visitor', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    render(<PaymentDetail contributionId="payment-1" onOpenReport={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Sign in to view your payment details.')).toBeTruthy());
    expect(from).not.toHaveBeenCalled();
  });
});
