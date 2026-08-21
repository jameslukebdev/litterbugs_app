import { describe, expect, it } from 'vitest';

import { canManageReport, realUserId, realUserIdFromClaims } from './report-access';

describe('web report access boundary', () => {
  it('requires a real signed-in identity for all writes', () => {
    expect(realUserId(null)).toBeNull();
    expect(realUserId({ id: 'guest', is_anonymous: true })).toBeNull();
    expect(realUserId({ id: 'member', is_anonymous: false })).toBe('member');
  });

  it('rejects anonymous and malformed server claims as web writers', () => {
    expect(realUserIdFromClaims(null)).toBeNull();
    expect(realUserIdFromClaims({ sub: 'guest', is_anonymous: true })).toBeNull();
    expect(realUserIdFromClaims({ sub: 123, is_anonymous: false })).toBeNull();
    expect(realUserIdFromClaims({ sub: 'member', is_anonymous: false })).toBe('member');
  });

  it('allows edit and delete controls only for the report owner', () => {
    expect(canManageReport({ user_id: 'user-a' }, 'user-a')).toBe(true);
    expect(canManageReport({ user_id: 'user-a' }, 'user-b')).toBe(false);
    expect(canManageReport({ user_id: null }, 'user-a')).toBe(false);
    expect(canManageReport({ user_id: 'user-a' }, null)).toBe(false);
  });
});
