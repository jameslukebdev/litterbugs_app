// Only discard a saved checkout after Stripe confirms it cannot currently charge.
// Submitted, processing, or unknown outcomes retain their recovery identity.
export async function replaceUnpaidContribution({ attempt, principalCents, retrieveIntent, clearAttempt }) {
  if (!attempt || attempt.principalAmountCents === principalCents) return attempt;
  if (attempt.phase === 'submitted' || !attempt.intent) {
    throw new Error('Your previous payment needs to be checked before changing the amount. Return to the report and try again.');
  }
  const result = await retrieveIntent(attempt.intent);
  if (result.error || !['RequiresPaymentMethod', 'RequiresConfirmation', 'Canceled'].includes(result.paymentIntent?.status)) {
    throw new Error('Your previous payment may still be in progress. Check Payment activity before starting another payment.');
  }
  await clearAttempt(attempt.clientRequestId);
  return null;
}
