import { describe, expect, it } from 'vitest';

import {
  canOfferCleanup,
  cleanupActionMessage,
} from './cleanupEligibility';

const permanentUser = { id: 'cleaner', is_anonymous: false };
const future = '2026-08-26T12:00:00.000Z';
const now = new Date('2026-08-24T12:00:00.000Z');

describe('cleanup eligibility', () => {
  it('offers cleanup only to permanent users for available active reports', () => {
    const report = {
      cleanup_state: 'available',
      expires_at: future,
      expired_at: null,
      cancelled_at: null,
    };

    expect(canOfferCleanup(report, permanentUser, now)).toBe(true);
    expect(canOfferCleanup(report, null, now)).toBe(false);
    expect(canOfferCleanup(report, { id: 'guest', is_anonymous: true }, now)).toBe(false);
  });

  it('allows a reporter to clean their own available report', () => {
    const report = {
      user_id: permanentUser.id,
      cleanup_state: 'available',
      expires_at: future,
      expired_at: null,
      cancelled_at: null,
    };

    expect(canOfferCleanup(report, permanentUser, now)).toBe(true);
  });

  it('hides cleanup for unavailable, expired, or cancelled reports', () => {
    expect(canOfferCleanup({ cleanup_state: 'claimed' }, permanentUser, now)).toBe(false);
    expect(canOfferCleanup({ cleanup_state: 'available', expires_at: '2026-08-23T12:00:00.000Z' }, permanentUser, now)).toBe(false);
    expect(canOfferCleanup({ cleanup_state: 'available', expired_at: future }, permanentUser, now)).toBe(false);
    expect(canOfferCleanup({ cleanup_state: 'available', cancelled_at: future }, permanentUser, now)).toBe(false);
  });

  it('maps secure backend transition failures to useful messages', () => {
    expect(cleanupActionMessage({ message: 'This cleanup was just claimed' })).toContain('just claimed');
    expect(cleanupActionMessage({ message: 'cleanup_waiver_outdated' })).toContain('changed');
    expect(cleanupActionMessage({ message: 'cleanup_requires_permanent_account' })).toContain('permanent account');
  });
});
