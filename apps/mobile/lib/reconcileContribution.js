import { paymentRecoveryState } from './contributionRecovery';
// Read-only reconciliation never creates a PaymentIntent. All retry decisions use
// the saved request identity and the server's current state.
export async function reconcileContribution({
  attempt,
  findContribution,
  retrieveIntent,
  saveAttempt,
  clearAttempt,
}) {
  if (!attempt) return { state: 'none', attempt: null };
  const contribution = await findContribution(attempt.clientRequestId);
  const state = paymentRecoveryState(contribution?.status);
  if (['received', 'refund', 'failed'].includes(state)) {
    await clearAttempt();
    return { state, attempt: null, contribution };
  }
  let next = attempt;
  if (attempt.phase === 'submitted' && attempt.intent) {
    const result = await retrieveIntent(attempt.intent);
    if (
      !result.error &&
      [
        'RequiresPaymentMethod',
        'RequiresConfirmation',
        'RequiresAction',
      ].includes(result.paymentIntent?.status)
    ) {
      next = { ...attempt, phase: 'ready' };
      await saveAttempt(next);
    }
  }
  return { state: 'pending', attempt: next, contribution };
}
