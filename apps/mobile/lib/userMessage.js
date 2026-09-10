// Keep internal service, database and provider diagnostics out of alerts.
export function userMessage(error, fallback = 'Something went wrong. Please try again.') {
  const text = String(error?.message || '');
  if (/network|fetch failed|offline|connection/i.test(text)) return 'Check your connection and try again.';
  if (/timeout|taking longer|timed out/i.test(text)) return 'This is taking longer than expected. Please try again.';
  if (/session|jwt|not.authenticated|sign.in.required/i.test(text)) return 'Please sign in again to continue.';
  if (/already.claimed|report_not_available|not.eligible|funding.locked/i.test(text)) return 'This report has changed. Reopen it to see your available options.';
  if (/payment.*confirm|previous payment|older attempt/i.test(text)) return 'We haven’t confirmed your payment yet. View payment history before paying again.';
  return fallback;
}
