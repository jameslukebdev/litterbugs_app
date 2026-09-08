import { withTimeout } from './asyncTimeout';

export const USER_LOCATION_REGION_DELTA = 0.02;
export const REPORT_LOCATION_REGION_DELTA = 0.0015;

export function userLocationRegion(location) {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: USER_LOCATION_REGION_DELTA,
    longitudeDelta: USER_LOCATION_REGION_DELTA,
  };
}

export function reportLocationRegion(location) {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: REPORT_LOCATION_REGION_DELTA,
    longitudeDelta: REPORT_LOCATION_REGION_DELTA,
  };
}

export function mapRegionsAreEquivalent(first, second, tolerance = 0.000001) {
  if (!first || !second) return false;
  return ['latitude', 'longitude', 'latitudeDelta', 'longitudeDelta']
    .every((key) => Math.abs(Number(first[key]) - Number(second[key])) <= tolerance);
}

export async function findResponsiveUserLocation({
  locationApi,
  onPosition,
  accuracy = locationApi.Accuracy.Balanced,
  freshLocationTimeoutMs = 8_000,
}) {
  const cached = await withTimeout(
    locationApi.getLastKnownPositionAsync({
      maxAge: 5 * 60 * 1000,
      requiredAccuracy: 2_000,
    }),
    1_500,
    'Cached location lookup timed out.',
  ).catch(() => null);

  if (cached) onPosition(cached, { cached: true });

  try {
    const fresh = await withTimeout(
      locationApi.getCurrentPositionAsync({
        accuracy,
      }),
      freshLocationTimeoutMs,
      'Finding your current location is taking too long. Please try again.',
    );
    onPosition(fresh, { cached: false });
    return { location: fresh, usedCachedLocation: Boolean(cached), refreshTimedOut: false };
  } catch (error) {
    if (!cached) throw error;
    return { location: cached, usedCachedLocation: true, refreshTimedOut: true };
  }
}
