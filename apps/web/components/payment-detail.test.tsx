// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PaymentDetail } from './payment-detail';
const { getUser, from, invoke, rpc, eq, record } = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), invoke: vi.fn(), rpc: vi.fn(), eq: vi.fn(), record: { status: 'payment_pending' } }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getUser }, from, rpc, functions: { invoke } }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('payment status confirmation', () => {
  it.each([null, true, false])('lets the donor change name visibility from %s, including older donations', async visibility => {
    getUser.mockResolvedValue({ data: { user: { id: 'member-1' } } });
    const receipt = { id: 'payment-1', report_id: 'report-1', status: 'succeeded', show_contributor_name: visibility,
      total_amount_cents: 600, principal_amount_cents: 500, platform_fee_cents: 100, created_at: '2026-11-19' };
    const query = { select: () => query, eq, maybeSingle: async () => ({ data: { ...receipt }, error: null }) };
    eq.mockReturnValue(query); from.mockReturnValue(query);
    rpc.mockImplementation(async (_name, input) => { receipt.show_contributor_name = input.show_name; return { data: true, error: null }; });
    render(<PaymentDetail contributionId="payment-1" onOpenReport={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: visibility === false ? 'Show my name' : 'Hide my name' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('set_cleanup_contributor_visibility', {
      contribution_id: 'payment-1', show_name: visibility === false,
    }));
    await screen.findByRole('button', { name: visibility === false ? 'Hide my name' : 'Show my name' });
    const status = screen.getByRole('status');
    expect(status.textContent).toBe(visibility === false ? 'Your name is shown.' : 'You’re listed as Anonymous.');
    expect(screen.queryByText('Your name is now shown.')).toBeNull();
    expect(screen.queryByText('Your contribution is now anonymous.')).toBeNull();
    expect(receipt.total_amount_cents).toBe(600);
    expect(receipt.status).toBe('succeeded');
  });
  it('keeps the current choice while saving and when the save fails', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'member-1' } } });
    const receipt = { id: 'payment-1', report_id: 'report-1', status: 'succeeded', show_contributor_name: true,
      total_amount_cents: 600, principal_amount_cents: 500, platform_fee_cents: 100, created_at: '2026-11-19' };
    const query = { select: () => query, eq, maybeSingle: async () => ({ data: receipt, error: null }) };
    eq.mockReturnValue(query); from.mockReturnValue(query);
    let failSave!: (result: { data: null; error: { message: string } }) => void;
    rpc.mockReturnValue(new Promise(resolve => { failSave = resolve; }));
    render(<PaymentDetail contributionId="payment-1" onOpenReport={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Hide my name' }));
    expect((screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toBe('Your name is shown.');
    failSave({ data: null, error: { message: 'Unavailable' } });
    expect((await screen.findByRole('alert')).textContent).toBe('Couldn’t save your choice. Try again.');
    expect(screen.getByRole('status').textContent).toBe('Your name is shown.');
    expect((screen.getByRole('button', { name: 'Hide my name' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('shows pending honestly and confirms ownership before showing a receipt', async () => {
    record.status = 'payment_pending';
    getUser.mockResolvedValue({ data: { user: { id: 'member-1' } } });
    const query = { select: () => query, eq, maybeSingle: async () => ({ data: { id: 'payment-1', report_id: 'report-1', status: record.status, total_amount_cents: 2750, principal_amount_cents: 2500, platform_fee_cents: 250, created_at: '2026-09-24' }, error: null }) };
    eq.mockReturnValue(query); from.mockReturnValue(query);
    invoke.mockImplementation(async () => { record.status = 'succeeded'; return { data: {}, error: null }; });
    render(<PaymentDetail contributionId="payment-1" onOpenReport={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Payment details' })).toBeTruthy();
    await screen.findByText(/haven’t confirmed this payment yet/);
    expect(eq).toHaveBeenCalledWith('contributor_id', 'member-1');
    await screen.findByText('Your contribution is in the cleanup fund.');
    expect(invoke).toHaveBeenCalledWith('check-contribution-status', { body: { contributionId: 'payment-1' } });
  });
  it('does not query payment data for a signed-out visitor', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    render(<PaymentDetail standalone contributionId="payment-1" onOpenReport={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Payment details' })).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Sign in to view your payment details.')).toBeTruthy());
    expect(from).not.toHaveBeenCalled();
  });
});
