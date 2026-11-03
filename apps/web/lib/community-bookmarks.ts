type BookmarkStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const COMMUNITY_SAVED_EVENT = 'litterbugs:community-saved-change';
const key = (slug: string) => `litterbugs:community-saved:v1:${slug}`;
const legacyKey = (slug: string) => `litterbugs:community-follow-preview:v1:${slug}`;

export function communityIsSaved(storage: BookmarkStorage, slug: string) {
  // Preserve preferences saved before the Follow -> Save community rename.
  return storage.getItem(key(slug)) === 'saved' || storage.getItem(legacyKey(slug)) === 'saved';
}
export function setCommunitySaved(storage: BookmarkStorage, slug: string, saved: boolean) {
  if (saved) storage.setItem(key(slug), 'saved');
  else {
    storage.removeItem(key(slug));
    storage.removeItem(legacyKey(slug));
  }
}
