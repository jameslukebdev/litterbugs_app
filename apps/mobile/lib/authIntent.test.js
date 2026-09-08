import { describe, expect, it } from 'vitest';
import { authenticatedActionDestination } from './authIntent';
describe('resuming guest intent after authentication', () => {
  const intent = { kind: 'cleanup', reportId: 'original-report' };
  it('waits for permanent sign-in and profile completion', () => {
    expect(
      authenticatedActionDestination({
        permanent: false,
        profileComplete: true,
        intent,
      }),
    ).toBeNull();
    expect(
      authenticatedActionDestination({
        permanent: true,
        profileComplete: false,
        intent,
      }),
    ).toBeNull();
  });
  it('returns to the original cleanup so the user can review it before claiming', () => {
    expect(
      authenticatedActionDestination({
        permanent: true,
        profileComplete: true,
        intent,
      }),
    ).toEqual({
      name: 'App',
      params: { screen: 'Map', params: { reportId: 'original-report' } },
    });
  });
  it('resumes funding without opening a competing report modal over checkout', () => {
    expect(
      authenticatedActionDestination({
        permanent: true,
        profileComplete: true,
        intent: { ...intent, kind: 'fund' },
      }),
    ).toEqual({
      name: 'FundingContribution',
      params: { reportId: 'original-report' },
    });
  });
});
