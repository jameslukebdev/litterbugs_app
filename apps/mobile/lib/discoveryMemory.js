import AsyncStorage from '@react-native-async-storage/async-storage';
const WELCOME_KEY = 'litterbugs.welcome-seen.v1';
const MAP_KEY = 'litterbugs.last-map.v1';
export function validRegion(region) {
  return region && ['latitude', 'longitude', 'latitudeDelta', 'longitudeDelta'].every(key => Number.isFinite(region[key]))
    && Math.abs(region.latitude) <= 90 && Math.abs(region.longitude) <= 180
    && region.latitudeDelta > 0 && region.latitudeDelta <= 180 && region.longitudeDelta > 0 && region.longitudeDelta <= 360;
}
export async function loadDiscoveryMemory() {
  const [welcome, map] = await Promise.allSettled([AsyncStorage.getItem(WELCOME_KEY), AsyncStorage.getItem(MAP_KEY)]);
  let lastMap = null;
  try {
    const value = map.status === 'fulfilled' ? JSON.parse(map.value) : null;
    if (validRegion(value?.region)) lastMap = { region: value.region, place: null };
    if (lastMap && value.place && validRegion(value.place.region) && typeof value.place.label === 'string') {
      const geometry = value.place.geometry;
      if (!geometry || (['Polygon', 'MultiPolygon'].includes(geometry.type) && Array.isArray(geometry.coordinates))) lastMap.place = value.place;
    }
  } catch { /* A damaged local preference must not prevent launch. */ }
  return { welcomeSeen: welcome.status === 'fulfilled' && welcome.value === 'yes', lastMap };
}
export const markWelcomeSeen = () => AsyncStorage.setItem(WELCOME_KEY, 'yes').catch(() => {});
export const saveMapMemory = (region, place) => validRegion(region)
  ? AsyncStorage.setItem(MAP_KEY, JSON.stringify({ region, place })).catch(() => {}) : Promise.resolve();
