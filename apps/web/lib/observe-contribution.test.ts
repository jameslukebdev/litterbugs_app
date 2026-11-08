import { beforeEach, expect, it, vi } from 'vitest';
import { observeContributionConfirmation } from './observe-contribution';
const f = vi.hoisted(() => ({ invoke: vi.fn(), allowed: vi.fn(), outcome: vi.fn(), failure: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ functions: { invoke: f.invoke } }) }));
vi.mock('./website-analytics', () => ({ participationMeasurementAllowed: f.allowed, trackWebsiteOutcome: f.outcome, trackParticipationFailure: f.failure }));
beforeEach(() => { vi.resetAllMocks(); f.allowed.mockReturnValue(true); });
it('counts only the backend-confirmed succeeded state', async () => {
  f.invoke.mockResolvedValue({ data: { providerState: 'succeeded' }, error: null });
  await observeContributionConfirmation('receipt');
  expect(f.outcome).toHaveBeenCalledWith('contribution_confirmed', 'receipt');
  expect(f.failure).not.toHaveBeenCalled();
});
it.each(['processing', 'requires_action', 'requires_payment_method'])('does not call %s a success or a failure', async providerState => {
  f.invoke.mockResolvedValue({ data: { providerState }, error: null });
  await observeContributionConfirmation('receipt');
  expect(f.outcome).not.toHaveBeenCalled(); expect(f.failure).not.toHaveBeenCalled();
});
it('records unavailable confirmation without throwing or treating it as a declined payment', async () => {
  f.invoke.mockRejectedValue(new Error('sensitive provider response'));
  await expect(observeContributionConfirmation('receipt')).resolves.toBeUndefined();
  expect(f.failure).toHaveBeenCalledWith('fund', 'payment_submitted', 'payment_confirmation_unavailable');
  expect(f.outcome).not.toHaveBeenCalled();
});
it('does no reconciliation or analytics for local or excluded browsers', async () => {
  f.allowed.mockReturnValue(false);
  await observeContributionConfirmation('receipt');
  expect(f.invoke).not.toHaveBeenCalled(); expect(f.outcome).not.toHaveBeenCalled();
});
