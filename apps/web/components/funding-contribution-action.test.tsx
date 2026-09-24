// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Report } from '@litterbugs/report-contract';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FundingContributionAction } from './funding-contribution-action';

const { loadFlags, createContribution } = vi.hoisted(() => ({ loadFlags: vi.fn(), createContribution: vi.fn() }));

vi.mock('@/lib/payment-attempt', () => ({ resumeOrCreatePayment: (_user: string, report: string, amount: number) => createContribution(report, amount).then((intent: unknown) => ({ intent, amount })) }));

vi.mock('@/lib/funding', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/funding')>(),
  loadCleanupFeatureFlags: loadFlags,
  createCleanupContribution: createContribution,
}));

vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn() }));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => children,
  PaymentElement: () => <div>Secure card form</div>,
  useElements: () => null,
  useStripe: () => null,
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('FundingContributionAction', () => {
  it('stays hidden while the production funding flags are off', async () => {
    loadFlags.mockResolvedValue({ payments_enabled: false, gemini_financial_review_enabled: false });
    render(<FundingContributionAction report={report} userId="member-id" />);
    await waitFor(() => expect(loadFlags).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Add funds' })).toBeNull();
  });

  it('shows the exact reward, fee, and total before opening Stripe', async () => {
    loadFlags.mockResolvedValue({ payments_enabled: true, gemini_financial_review_enabled: true });
    render(<FundingContributionAction report={report} userId="member-id" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add funds' }));
    expect(screen.getByText('Cleaner reward')).toBeTruthy();
    expect(screen.getByText('$25.00')).toBeTruthy();
    expect(screen.getByText('$2.50')).toBeTruthy();
    expect(screen.getByText('$27.50')).toBeTruthy();
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
    expect(screen.getByText('$5.50')).toBeTruthy();
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
