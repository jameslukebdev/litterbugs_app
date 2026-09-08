import { afterEach, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn().mockResolvedValue() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }));
import { loadDiscoveryMemory, markWelcomeSeen, saveMapMemory } from './discoveryMemory';
afterEach(() => vi.clearAllMocks());
const region = { latitude: 36.2, longitude: -81.6, latitudeDelta: 0.2, longitudeDelta: 0.2 };
it('keeps first-time visitors on welcome without a stored preference', async () => {
  storage.getItem.mockResolvedValue(null);
  expect(await loadDiscoveryMemory()).toEqual({ welcomeSeen: false, lastMap: null });
});
it('restores the last map and selected area for returning guests', async () => {
  const place = { label: 'Boone, NC', region, geometry: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,0]]] } };
  storage.getItem.mockImplementation(key => Promise.resolve(key.includes('welcome') ? 'yes' : JSON.stringify({ region, place })));
  expect(await loadDiscoveryMemory()).toEqual({ welcomeSeen: true, lastMap: { region, place } });
});
it('recovers from corrupted map preferences and storage failures', async () => {
  storage.getItem.mockImplementation(key => key.includes('welcome') ? Promise.reject(new Error('unavailable')) : Promise.resolve('{bad'));
  expect(await loadDiscoveryMemory()).toEqual({ welcomeSeen: false, lastMap: null });
});
it('persists welcome completion and ignores invalid map coordinates', async () => {
  await markWelcomeSeen();
  expect(storage.setItem).toHaveBeenCalledWith('litterbugs.welcome-seen.v1', 'yes');
  storage.setItem.mockClear();
  await saveMapMemory({ ...region, latitude: NaN }, null);
  expect(storage.setItem).not.toHaveBeenCalled();
  await saveMapMemory(region, null);
  expect(storage.setItem).toHaveBeenCalledWith('litterbugs.last-map.v1', JSON.stringify({ region, place: null }));
});
