export function cleanupLoadErrorPresentation(error) {
  const message = error?.message || '';
  if (/cleanup_claim_expired/i.test(message)) return { retryable: false, message: 'This cleanup claim has expired. Return to the report to check whether it is available again. Your saved evidence has not been deleted.' };
  if (/cleanup_correction_expired/i.test(message)) return { retryable: false, message: 'The time to update this cleanup has expired. Return to the report for its current status. Your saved evidence has not been deleted.' };
  if (/cleanup_submission_(not_allowed|invalid_state)/i.test(message)) return { retryable: false, message: 'This cleanup is no longer available for you to submit. Return to the report for its current status.' };
  return { retryable: true, message: 'Check your connection and try again. Retrying will keep your draft and photos.' };
}
