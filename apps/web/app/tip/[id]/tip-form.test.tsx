// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TipForm } from './tip-form';

const { startCleanerTip, getUser } = vi.hoisted(() => ({ startCleanerTip: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/tips', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/tips')>()), startCleanerTip }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getUser } }) }));
vi.mock('@stripe/stripe-js/pure', () => ({ loadStripe: vi.fn(async () => ({})) }));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div>Stripe card form</div>,
  useStripe: () => null, useElements: () => null,
}));

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: null } });
  startCleanerTip.mockResolvedValue({ tipId: 't', clientSecret: 'pi_secret', publishableKey: 'pk_test_x',
    tipAmountCents: 1000, platformFeeCents: 100, totalAmountCents: 1100 });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const cleanerId = '91000000-0000-4000-8000-000000000001';

it('shows what the cleaner gets and what the tipper pays, then opens Stripe on the page', async () => {
  render(<TipForm cleanerId={cleanerId} name="Jordan R." backHref="/communities?board=cleaners" />);
  fireEvent.click(screen.getByRole('button', { name: '$10' }));
  expect(screen.getByText('Jordan R. gets').nextSibling?.textContent).toBe('$10.00');
  expect(screen.getByRole('button', { name: 'Continue to pay $11.00' })).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Continue to pay $11.00' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Enter an email for your receipt.');
  expect(startCleanerTip).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText('Email for your receipt'), { target: { value: 'guest@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to pay $11.00' }));
  await waitFor(() => expect(startCleanerTip).toHaveBeenCalledOnce());
  expect(startCleanerTip.mock.calls[0][0]).toMatchObject({ cleanerId, tipAmountCents: 1000, receiptEmail: 'guest@example.com' });
  expect(await screen.findByText('Stripe card form')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Pay $11.00' })).toBeTruthy();
});

it('uses a signed-in member’s account email and rejects amounts under $3', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'u', email: 'member@example.com', is_anonymous: false } } });
  render(<TipForm cleanerId={cleanerId} name="Jordan R." backHref="/communities" />);
  await waitFor(() => expect(screen.queryByLabelText('Email for your receipt')).toBeNull());
  fireEvent.change(screen.getByLabelText('Other amount'), { target: { value: '2' } });
  expect(screen.getByText('Enter $3 to $1,000.')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Continue to pay' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Other amount'), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to pay $5.75' }));
  await waitFor(() => expect(startCleanerTip).toHaveBeenCalledOnce());
  expect(startCleanerTip.mock.calls[0][0]).not.toHaveProperty('receiptEmail');
});

it('shows the backend’s message when the tip can’t start', async () => {
  startCleanerTip.mockRejectedValue(new Error('They can’t receive tips right now'));
  render(<TipForm cleanerId={cleanerId} name="Jordan R." backHref="/communities" />);
  fireEvent.change(screen.getByLabelText('Email for your receipt'), { target: { value: 'guest@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to pay $5.75' }));
  expect(await screen.findByText('They can’t receive tips right now')).toBeTruthy();
});
