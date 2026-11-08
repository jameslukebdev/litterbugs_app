// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Report } from '@litterbugs/report-contract';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FundingContributionAction } from './funding-contribution-action';

const { loadFlags, createContribution, quote, stripeMock } = vi.hoisted(() => ({ loadFlags: vi.fn(), createContribution: vi.fn(), quote: vi.fn(), stripeMock: { ready: false, confirmPayment: vi.fn() } }));

vi.mock('@/lib/payment-attempt', () => ({ resumeOrCreatePayment: (_user: string, report: string, amount: number) => createContribution(report, amount).then((intent: unknown) => ({ intent, amount })) }));

vi.mock('@/lib/funding', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/funding')>(),
  loadCleanupFeatureFlags: loadFlags,
  loadContributionQuote: quote,
  createCleanupContribution: createContribution,
}));

vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn().mockResolvedValue(null) }));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => children,
  PaymentElement: () => <div>Secure card form</div>,
  useElements: () => stripeMock.ready ? {} : null,
  useStripe: () => stripeMock.ready ? { confirmPayment: stripeMock.confirmPayment } : null,
}));

const report: Report = {
  is_published: true,
  cancelled_at: null,
  cleanup_state: 'available',
  created_at: '2026-08-28T12:00:00.000Z',
  expired_at: null,
  expires_at: '2026-09-27T12:00:00.000Z',
  funded_amount_cents: 0,
  funding_eligibility: 'eligible',
  funding_frozen_at: null,
  funding_hold_reason: null,
  funding_locked_at: null,
  id: 'bdbd817a-b007-4cc3-8668-c648ae170b4a',
  is_sample: false,
  latitude: 36.2,
  litter_types: ['Bottles'],
  longitude: -81.7,
  notes_other: null,
  notes_presets: null,
  original_photo_reviewed_at: '2026-08-28T12:01:00.000Z',
  photo_paths: ['member/report/photo.jpg'],
  renewal_decision_due_at: null,
  renewal_status: 'active',
  severity: 'Medium',
  status: 'active',
  title: 'Roadside bottles',
  types: null,
  user_id: 'reporter-id',
};

beforeEach(() => {
  stripeMock.ready = false;
  quote.mockImplementation(async (principalAmountCents: number) => ({ principalAmountCents, platformFeeCents: Math.floor((principalAmountCents + 5) / 10) + 50, totalAmountCents: principalAmountCents + Math.floor((principalAmountCents + 5) / 10) + 50, pricingVersion: 2, currency: 'usd' }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('FundingContributionAction', () => {
  it('continues a guest Fund link to auth once after availability loads, without starting payment', async () => {
    loadFlags.mockResolvedValue({ payments_enabled: true, gemini_financial_review_enabled: true });
    const signIn = vi.fn();
    const view = render(<FundingContributionAction report={report} userId={null} autoOpen onRequireSignIn={signIn} />);
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    view.rerender(<FundingContributionAction report={{ ...report }} userId={null} autoOpen onRequireSignIn={() => signIn()} />);
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(createContribution).not.toHaveBeenCalled();
    expect(quote).not.toHaveBeenCalled();
  });

  it('does not open auth for a Fund link when funding is disabled or unavailable', async () => {
    loadFlags.mockResolvedValue({ payments_enabled: false, gemini_financial_review_enabled: false });
    const signIn = vi.fn();
    const view = render(<FundingContributionAction report={report} userId={null} autoOpen onRequireSignIn={signIn} />);
    await waitFor(() => expect(loadFlags).toHaveBeenCalled());
    expect(signIn).not.toHaveBeenCalled();
    loadFlags.mockResolvedValue({ payments_enabled: true, gemini_financial_review_enabled: true });
    view.unmount();
    render(<FundingContributionAction report={{ ...report, cleanup_state: 'completed' }} userId={null} autoOpen onRequireSignIn={signIn} />);
    await waitFor(() => expect(loadFlags).toHaveBeenCalledTimes(2));
    expect(signIn).not.toHaveBeenCalled();
  });

  it('stays hidden while the production funding flags are off', async () => {
    loadFlags.mockResolvedValue({ payments_enabled: false, gemini_financial_review_enabled: false });
    render(<FundingContributionAction report={report} userId="member-id" />);
    await waitFor(() => expect(loadFlags).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Fund' })).toBeNull();
  });

  it('shows the exact reward, fee, and total before opening Stripe', async () => {
    loadFlags.mockResolvedValue({ payments_enabled: true, gemini_financial_review_enabled: true });
    render(<FundingContributionAction report={report} userId="member-id" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Fund' }));
    expect(await screen.findByText('Goes to the cleaner')).toBeTruthy();
    expect(screen.getByText('$25.00')).toBeTruthy();
    expect(screen.getByText('$3.00')).toBeTruthy();
    expect(screen.getByText('$28.00')).toBeTruthy();
    expect(screen.getByText(/full charge—including the fee—is refunded/i)).toBeTruthy();
  });
});


describe('report creation handoff', () => {
  it('opens with the chosen amount and requires an explicit action before creating payment', async () => {
    loadFlags.mockResolvedValue({ payments_enabled: true, gemini_financial_review_enabled: true });
    createContribution.mockResolvedValue({ publishableKey: null });
    render(<FundingContributionAction report={report} userId="member-id" initialAmountCents={500} startOpen />);
    const amount = await screen.findByLabelText('Cleanup fund contribution amount');
    expect((amount as HTMLInputElement).value).toBe('5.00');
    expect(await screen.findByText('$6.00')).toBeTruthy();
    expect(createContribution).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(createContribution).toHaveBeenCalledWith(report.id, 500));
  });

  it('waits for eligibility without creating a payment or replacing the selected amount', async () => {
    loadFlags.mockResolvedValue({ payments_enabled: true, gemini_financial_review_enabled: true });
    const { rerender } = render(<FundingContributionAction report={{ ...report, funding_eligibility: 'pending' }} userId="member-id" initialAmountCents={100} startOpen />);
    await screen.findByText(/Its photos are being reviewed/);
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    expect(createContribution).not.toHaveBeenCalled();
    rerender(<FundingContributionAction report={report} userId="member-id" initialAmountCents={100} startOpen />);
    expect((await screen.findByLabelText('Cleanup fund contribution amount') as HTMLInputElement).value).toBe('1.00');
  });
});

describe('server-confirmed pricing', () => {
  it.each([
    [2, 100, 600, '$1.00', 'Pay $6.00'],
    [1, 50, 550, '$0.50', 'Pay $5.50'],
  ])('shows the stored version %s fee before payment confirmation', async (pricingVersion, platformFeeCents, totalAmountCents, feeText, buttonText) => {
    loadFlags.mockResolvedValue({ payments_enabled: true, gemini_financial_review_enabled: true });
    createContribution.mockResolvedValue({ contributionId: 'saved-payment', publishableKey: 'pk_test_fixture', paymentIntentClientSecret: 'test_secret', principalAmountCents: 500, platformFeeCents, totalAmountCents, pricingVersion });
    render(<FundingContributionAction report={report} userId="member-id" initialAmountCents={500} startOpen />);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText('Secure card form');
    expect(screen.getByText(feeText)).toBeTruthy();
    expect(screen.getByRole('button', { name: buttonText })).toBeTruthy();
    expect(screen.getByText('Service fee')).toBeTruthy();
  });
  it('shows the update instruction when an old checkout is rejected', async () => {
    loadFlags.mockResolvedValue({ payments_enabled: true, gemini_financial_review_enabled: true });
    createContribution.mockRejectedValue(new Error('Contribution pricing has changed. Refresh the website or update the app before starting a new payment. No payment has been made.'));
    render(<FundingContributionAction report={report} userId="member-id" initialAmountCents={100} startOpen />);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Refresh the website');
    expect(screen.queryByText('Secure card form')).toBeNull();
  });
});


it('blocks new payment creation while pricing is unavailable', async () => {
  loadFlags.mockResolvedValue({ payments_enabled: true, gemini_financial_review_enabled: true });
  quote.mockRejectedValue(new Error('Pricing is unavailable.'));
  render(<FundingContributionAction report={report} userId="member-id" startOpen />);
  await screen.findByText('Pricing is unavailable.');
  expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true);
  expect(createContribution).not.toHaveBeenCalled();
});

it('reserves the funding action while flags load without enabling payment prematurely', async () => {
  let resolve!: (flags: { payments_enabled: boolean; gemini_financial_review_enabled: boolean }) => void;
  loadFlags.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const signIn = vi.fn();
  render(<FundingContributionAction report={report} userId={null} onRequireSignIn={signIn} />);
  expect(screen.getByRole('status', { name: 'Checking funding availability' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Fund' })).toBeNull();
  await act(async () => resolve({ payments_enabled: true, gemini_financial_review_enabled: true }));
  expect(screen.queryByRole('status', { name: 'Checking funding availability' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Fund' }));
  expect(signIn).toHaveBeenCalledTimes(1);
});

it('preserves only the canonical community return in the Stripe confirmation URL', async () => {
  stripeMock.ready = true;
  stripeMock.confirmPayment.mockResolvedValue({ error: { message: 'Mock confirmation stopped' } });
  loadFlags.mockResolvedValue({ payments_enabled: true, gemini_financial_review_enabled: true });
  createContribution.mockResolvedValue({ contributionId: 'receipt', publishableKey: 'pk_test_fixture', paymentIntentClientSecret: 'test_secret', principalAmountCents: 500, platformFeeCents: 100, totalAmountCents: 600, pricingVersion: 2 });
  window.history.replaceState({}, '', '/map?report=report&returnTo=%2Fcommunities%2Fus%2Fnc%2Fboone&payment_intent_client_secret=ignored');
  render(<FundingContributionAction report={report} userId="member" initialAmountCents={500} startOpen />);
  await waitFor(() => expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Pay $6.00' }));
  await waitFor(() => expect(stripeMock.confirmPayment).toHaveBeenCalled());
  const url = new URL(stripeMock.confirmPayment.mock.calls[0][0].confirmParams.return_url);
  expect(url.pathname).toBe('/payment-return');
  expect(url.searchParams.get('report')).toBe(report.id);
  expect(url.searchParams.get('contribution')).toBe('receipt');
  expect(url.searchParams.get('returnTo')).toBe('/communities/us/nc/boone');
  expect(url.searchParams.has('payment_intent_client_secret')).toBe(false);
  window.history.replaceState({}, '', '/');
});

it('opens amount review after sign-in and eligibility, without starting payment or reopening after dismissal', async () => {
  loadFlags.mockResolvedValue({ payments_enabled: true, gemini_financial_review_enabled: true });
  const view = render(<FundingContributionAction report={report} userId={null} autoOpen />);
  await screen.findByRole('button', { name: 'Fund' });
  expect(screen.queryByRole('dialog')).toBeNull();
  view.rerender(<FundingContributionAction report={report} userId="member" autoOpen />);
  expect(await screen.findByRole('dialog')).toBeTruthy();
  expect(screen.getByText('Roadside bottles')).toBeTruthy();
  expect(createContribution).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  view.rerender(<FundingContributionAction report={{ ...report }} userId="member" autoOpen />);
  expect(screen.queryByRole('dialog')).toBeNull();
});
