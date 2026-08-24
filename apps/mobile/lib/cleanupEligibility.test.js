import { describe, expect, it } from 'vitest';

import {
  canOfferCleanup,
  cleanupActionMessage,
  cleanupExpirationNoticeMessage,
  cleanupMapTone,
  cleanupStatusPresentation,
  isCleanupInProgress,
  isCurrentCleaner,
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
    expect(cleanupActionMessage({ message: 'cleanup_not_cleaner' })).toContain('Only the cleaner');
  });

  it('distinguishes the active cleaner from other report viewers', () => {
    const attempt = { cleaner_id: permanentUser.id };

    expect(isCleanupInProgress({ cleanup_state: 'claimed' })).toBe(true);
    expect(isCleanupInProgress({ cleanup_state: 'available' })).toBe(false);
    expect(isCurrentCleaner(attempt, permanentUser)).toBe(true);
    expect(isCurrentCleaner(attempt, { id: 'other', is_anonymous: false })).toBe(false);
    expect(isCurrentCleaner(attempt, { id: permanentUser.id, is_anonymous: true })).toBe(false);
  });

  it('describes one or multiple expired reservations', () => {
    expect(cleanupExpirationNoticeMessage(1)).toContain('24-hour');
    expect(cleanupExpirationNoticeMessage(2)).toContain('2 cleanup reservations');
  });

  it('maps every public cleanup state to the intended marker tone', () => {
    expect(cleanupMapTone({ cleanup_state: 'available' })).toBe('available');
    expect(cleanupMapTone({ cleanup_state: 'claimed' })).toBe('active');
    expect(cleanupMapTone({ cleanup_state: 'completion_submitted' })).toBe('active');
    expect(cleanupMapTone({ cleanup_state: 'changes_requested' })).toBe('active');
    expect(cleanupMapTone({ cleanup_state: 'completed' })).toBe('completed');
    expect(cleanupMapTone({ cleanup_state: 'released' })).toBe('available');
    expect(cleanupMapTone({ cleanup_state: 'expired' })).toBe('available');
  });

  it('shows actions only for the cleaner while a report is claimed', () => {
    expect(cleanupStatusPresentation({ cleanup_state: 'claimed' }, true)).toMatchObject({
      title: 'Cleanup in Progress',
      showClaimActions: true,
    });
    expect(cleanupStatusPresentation({ cleanup_state: 'claimed' }, false)).toMatchObject({
      title: 'Cleanup in Progress',
      showClaimActions: false,
    });
    expect(cleanupStatusPresentation({ cleanup_state: 'completion_submitted' }, true)).toMatchObject({
      title: 'Awaiting Cleanup Review',
      showClaimActions: false,
    });
    expect(cleanupStatusPresentation({ cleanup_state: 'changes_requested' }, true).title).toBe('Changes Requested');
    expect(cleanupStatusPresentation({ cleanup_state: 'completed' }, true).title).toBe('Cleanup Complete');
    expect(cleanupStatusPresentation({ cleanup_state: 'available' }, true)).toBeNull();
  });
});
