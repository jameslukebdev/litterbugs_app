import { describe, expect, it } from 'vitest';

import {
  canEditOrDeleteReport,
  canManageReport,
  isPermanentUser,
  permanentUserId,
} from './reportAccess';

describe('permanent user identity', () => {
  it('accepts permanent Supabase users', () => {
    const user = { id: 'permanent-user', is_anonymous: false };

    expect(isPermanentUser(user)).toBe(true);
    expect(permanentUserId(user)).toBe('permanent-user');
  });

  it('keeps signed-out and anonymous users outside profile ownership', () => {
    expect(isPermanentUser(null)).toBe(false);
    expect(isPermanentUser({ id: 'anonymous-user', is_anonymous: true })).toBe(false);
    expect(permanentUserId({ id: 'anonymous-user', is_anonymous: true })).toBeNull();
  });

  it('allows only the permanent report owner to manage a report', () => {
    const report = { user_id: 'owner' };

    expect(canManageReport(report, { id: 'owner', is_anonymous: false })).toBe(true);
    expect(canManageReport(report, { id: 'other', is_anonymous: false })).toBe(false);
    expect(canManageReport(report, { id: 'owner', is_anonymous: true })).toBe(false);
  });

  it('allows owner controls only while a report is available', () => {
    const owner = { id: 'owner', is_anonymous: false };
    const availableReport = {
      user_id: 'owner',
      cleanup_state: 'available',
      expired_at: null,
      cancelled_at: null,
    };

    expect(canEditOrDeleteReport(availableReport, owner)).toBe(true);

    for (const cleanupState of [
      'claimed',
      'completion_submitted',
      'changes_requested',
      'completed',
    ]) {
      expect(
        canEditOrDeleteReport(
          { ...availableReport, cleanup_state: cleanupState },
          owner
        )
      ).toBe(false);
    }

    expect(
      canEditOrDeleteReport({ ...availableReport, expired_at: '2026-08-25T12:00:00Z' }, owner)
    ).toBe(false);
    expect(
      canEditOrDeleteReport({ ...availableReport, cancelled_at: '2026-08-25T12:00:00Z' }, owner)
    ).toBe(false);
    expect(
      canEditOrDeleteReport(availableReport, { id: 'other', is_anonymous: false })
    ).toBe(false);
    expect(
      canEditOrDeleteReport(availableReport, { id: 'owner', is_anonymous: true })
    ).toBe(false);
  });
});
