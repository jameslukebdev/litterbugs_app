import { NOTIFICATION_EVENT_TYPES, notificationChannel, notificationContent } from './notification-content.ts';
const assert = (value: unknown, message = 'Assertion failed') => { if (!value) throw new Error(message); };

Deno.test('every notification the database can create has words to push', () => {
  for (const eventType of NOTIFICATION_EVENT_TYPES) {
    const content = notificationContent(eventType);
    assert(content?.title && content.body, `${eventType} has no push text`);
    assert(!/gemini|stripe account|administrator review/i.test(`${content!.title} ${content!.body}`), `${eventType} names an internal service`);
  }
  assert(notificationContent('not_a_real_event') === null, 'Unknown events must not be pushed');
});

Deno.test('the nearby alerts say what was asked and use their own Android channel', () => {
  assert(notificationContent('nearby_reports_daily')?.body === 'New litter reports are available in your area for funding and cleanup.');
  assert(notificationContent('cleanup_completed_nearby')?.body === 'A cleanup has been completed in your area. Help celebrate the impact!');
  assert(notificationChannel('nearby_reports_daily') === 'nearby-reports');
  assert(notificationChannel('cleanup_completed_nearby') === 'nearby-reports');
  assert(notificationChannel('report_claimed') === 'cleanup-updates');
});
