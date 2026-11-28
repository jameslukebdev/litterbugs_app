import { createClient } from '@/lib/supabase/client';
import { participationMeasurementAllowed, trackParticipationFailure, trackWebsiteOutcome } from './website-analytics';

/** Observe the existing server reconciliation result; never infer success from a tap. */
export async function observeContributionConfirmation(contributionId: string) {
  if (!participationMeasurementAllowed()) return;
  try {
    const { data, error } = await createClient().functions.invoke('check-contribution-status', { body: { contributionId } });
    if (error || data?.error) throw new Error('unavailable');
    if (data?.providerState === 'succeeded') trackWebsiteOutcome('contribution_confirmed', contributionId);
    // Processing is not a failed payment. The existing receipt can observe it later.
  } catch {
    trackParticipationFailure('fund', 'payment_submitted', 'payment_confirmation_unavailable');
  }
}
