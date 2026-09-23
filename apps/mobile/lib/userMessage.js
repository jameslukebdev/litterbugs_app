// Keep internal service, database and provider diagnostics out of alerts.
export function userMessage(error, fallback = 'Something went wrong. Please try again.') {
  const text = String(error?.message || '');
  if (/report_outside_50_mile_radius|Reports must be within 50 miles/i.test(text)) return 'Reports must be within 50 miles of your current location. Move the report pin closer and try again.';
  if (/fresh_current_location_required|fresh location is required|current location could not be found/i.test(text)) return 'A fresh GPS location is required. Move somewhere with a GPS signal and try again.';
  if (/Allow location access to post/i.test(text)) return 'Allow location access to post a report within 50 miles of your current location.';
  if (/network|fetch failed|offline|connection/i.test(text)) return 'Check your connection and try again.';
  if (/timeout|taking longer|timed out/i.test(text)) return 'This is taking longer than expected. Please try again.';
  if (/session|jwt|not.authenticated|sign.in.required/i.test(text)) return 'Please sign in again to continue.';
  if (/already.claimed|report_not_available|not.eligible|funding.locked/i.test(text)) return 'This report has changed. Reopen it to see your available options.';
  if (/payment.*confirm|previous payment|older attempt/i.test(text)) return 'We haven’t confirmed your payment yet. View payment history before paying again.';
  return fallback;
}
