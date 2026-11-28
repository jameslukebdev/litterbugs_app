import { expect, it } from 'vitest';
import { notificationHref, notificationPresentation } from './cleanup-notifications';

it('shows who tipped, how much and their note, and opens Payments', () => {
  expect(notificationPresentation({ event_type: 'tip_received', tip: { tip_amount_cents: 500, tipper_name: 'Sarah', note: 'Thanks!' } }))
    .toEqual({ title: 'Sarah tipped you $5.00', message: '“Thanks!”' });
  expect(notificationPresentation({ event_type: 'tip_received', tip: { tip_amount_cents: 1250, tipper_name: null, note: null } }).title)
    .toBe('Someone tipped you $12.50');
  expect(notificationPresentation({ event_type: 'tip_received' }).title).toBe('You got a tip');
  expect(notificationHref({ event_type: 'tip_received', contribution_id: null, report_id: null })).toBe('/account/payments');
});

it('tells a reporter their payout is waiting and opens Payments', () => {
  expect(notificationPresentation({ event_type: 'reporter_payout_waiting' }).title).toBe('A payout is waiting for you');
  expect(notificationHref({ event_type: 'reporter_payout_waiting', contribution_id: null, report_id: 'r' })).toBe('/account/payments');
});
