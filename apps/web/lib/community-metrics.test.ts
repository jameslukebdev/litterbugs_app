import { expect, it } from 'vitest';
import { communityClick, communityForEntry, communityForPath, communityProperties } from './community-metrics';
const origin = 'https://litterbugs.app';
const slug = 'us-nc-boone';
it('uses only a published community for page and entry context', () => {
  expect(communityForPath('/communities/us/nc/boone/cleanups')?.slug).toBe(slug);
  expect(communityForPath('/communities/us/nc/boone/private')).toBeUndefined();
  expect(communityForEntry('?returnTo=%2Fcommunities%2Fus%2Fnc%2Fboone')).toBe(slug);
  expect(communityForEntry('?community=secret&returnTo=https://evil.example')).toBeNull();
});
it('discards raw URLs, report IDs, identity, unknown actions, and unreviewed resources', () => {
  expect(communityProperties({ community_id: slug, report_id: 'private', email: 'private', url: 'secret', action: 'private', resource_id: 'secret' })).toEqual({ community_id: slug });
  expect(communityProperties({ community_id: 'secret' })).toBeNull();
});
it('separates discovery clicks and participation intent from confirmed outcomes', () => {
  expect(communityClick('/communities/us/nc/boone', origin, null)?.event).toBe('community_opened');
  expect(communityClick('/reports/private-id', origin, slug)).toEqual({ event: 'community_report_opened', properties: { community_id: slug } });
  expect(communityClick('/map?report=private-id&intent=fund', origin, slug)).toEqual({ event: 'community_action_started', properties: { community_id: slug, action: 'fund' } });
  expect(communityClick('/report', origin, slug)?.properties.action).toBe('report');
  expect(communityClick('/support', origin, slug)).toBeNull();
});
it('measures only exact reviewed resource destinations', () => {
  expect(communityClick('https://www.townofboone.net/214/Adopt-a-Street-Program', origin, slug, 'adopt-a-street')?.event).toBe('community_resource_opened');
  expect(communityClick('https://evil.example/?email=secret', origin, slug, 'adopt-a-street')).toBeNull();
});

it('counts intent through sign-in while discarding private destination data', () => {
  const signIn = (next: string) => '/sign-in?' + new URLSearchParams({ next });
  expect(communityClick(signIn('/map?report=private-id&intent=fund'), origin, slug)).toEqual({
    event: 'community_action_started', properties: { community_id: slug, action: 'fund' },
  });
  expect(communityClick(signIn('/report?community=us-nc-boone'), origin, slug)?.properties.action).toBe('report');
  expect(communityClick(signIn('/account'), origin, slug)).toBeNull();
  expect(communityClick(signIn('/\t/elsewhere.example/report'), origin, slug)).toBeNull();
});
