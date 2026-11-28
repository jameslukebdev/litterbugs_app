import { cleanupPushMessage, notificationContent, tipPushContent } from './cleanup-push-content.ts';
const assert = (c: unknown, m = 'Assertion failed') => { if (!c) throw new Error(m); };
const base = { delivery_id: 'd', notification_id: 'n', push_device_id: 'p', expo_push_token: 'ExponentPushToken[x]', event_type: 'tip_received',
  report_id: null, cleanup_attempt_id: null, review_id: null, submission_id: null };
Deno.test('tip push names the sender, amount and note', () => {
  const content = tipPushContent({ tip_amount_cents: 500, tipper_name: 'Sarah', note: 'Thanks for cleaning the creek!' });
  assert(content.title === 'Sarah tipped you $5.00', content.title);
  assert(content.body === '“Thanks for cleaning the creek!”', content.body);
  const anon = tipPushContent({ tip_amount_cents: 1250, tipper_name: null, note: '  ' });
  assert(anon.title === 'Someone tipped you $12.50' && anon.body.startsWith('Thank you'));
});
Deno.test('tip push falls back to plain wording and links to Updates', () => {
  assert(notificationContent('tip_received')?.title === 'You got a tip');
  const plain = cleanupPushMessage({ ...base, tip: null });
  assert(plain.title === 'You got a tip' && plain.data.url === 'https://litterbugs.app/account/notifications');
  const full = cleanupPushMessage({ ...base, tip: { tip_amount_cents: 300, tipper_name: 'Jo', note: null } });
  assert(full.title === 'Jo tipped you $3.00');
  assert(cleanupPushMessage({ ...base, event_type: 'report_claimed', report_id: 'r' }).title === 'Report claimed');
});
