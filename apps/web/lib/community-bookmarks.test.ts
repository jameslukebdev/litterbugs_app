import { expect, it } from 'vitest';
import { communityIsSaved, setCommunitySaved } from './community-bookmarks';
function storage() {
  const values = new Map<string, string>();
  return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
}
it('preserves old Follow bookmarks and can remove them without resurrection', () => {
  const local = storage();
  local.setItem('litterbugs:community-follow-preview:v1:us-nc-boone', 'saved');
  expect(communityIsSaved(local, 'us-nc-boone')).toBe(true);
  setCommunitySaved(local, 'us-nc-boone', false);
  expect(communityIsSaved(local, 'us-nc-boone')).toBe(false);
  setCommunitySaved(local, 'us-nc-boone', true);
  expect(communityIsSaved(local, 'us-nc-boone')).toBe(true);
  expect(communityIsSaved(local, 'other-city')).toBe(false);
});
it('propagates failed storage writes so the UI cannot claim a successful save', () => {
  const local = storage();
  local.setItem = () => { throw new Error('Storage disabled'); };
  expect(() => setCommunitySaved(local, 'us-nc-boone', true)).toThrow('Storage disabled');
  expect(communityIsSaved(local, 'us-nc-boone')).toBe(false);
});
