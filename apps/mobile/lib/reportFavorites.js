import AsyncStorage from '@react-native-async-storage/async-storage';
const key = owner => `litterbugs.report-favorites.v1.${owner || 'guest'}`;
let queue = Promise.resolve();
export const waitForFavoriteWrites = () => queue.catch(() => {});
export async function loadReportFavorites(owner) {
  const raw = await AsyncStorage.getItem(key(owner));
  if (!raw) return [];
  try {
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? [...new Set(ids.filter(id => typeof id === 'string'))] : [];
  } catch { return []; }
}
export function saveReportFavorites(owner, ids) {
  const write = queue.catch(() => {}).then(() => AsyncStorage.setItem(key(owner), JSON.stringify(ids)));
  queue = write;
  return write;
}
export const toggleFavoriteId = (ids, id) => ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
