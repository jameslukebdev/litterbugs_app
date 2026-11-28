import { OperationTimeoutError, withTimeout } from './asyncTimeout';

export class ReportLocationError extends Error {
  constructor(message, reason) { super(message); this.name = 'ReportLocationError'; this.reason = reason; }
}

export function reportLocationFailureReason(error) {
  return error instanceof ReportLocationError ? error.reason : null;
}

export const MAX_REPORT_DISTANCE_MILES = 50;

export function withinReportingDistance(origin, destination) {
  const valid = (point) => point && Number.isFinite(point.latitude)
    && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90
    && Math.abs(point.longitude) <= 180;
  if (!valid(origin) || !valid(destination)) return false;
  const radians = value => value * Math.PI / 180;
  const a = Math.sin(radians(destination.latitude - origin.latitude) / 2) ** 2
    + Math.cos(radians(origin.latitude)) * Math.cos(radians(destination.latitude))
    * Math.sin(radians(destination.longitude - origin.longitude) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a)))) <= MAX_REPORT_DISTANCE_MILES;
}

export async function requireReportLocation(locationApi, destination) {
  let permission;
  try {
    permission = await locationApi.getForegroundPermissionsAsync();
    if (!permission.granted) permission = await locationApi.requestForegroundPermissionsAsync();
  } catch { throw new ReportLocationError('Your location permission could not be checked. Please try again.', 'location_unavailable'); }
  if (!permission.granted) throw new ReportLocationError('Allow location access to post a report within 50 miles of your current location.', 'location_denied');
  let position;
  try {
    position = await withTimeout(
      locationApi.getCurrentPositionAsync({ accuracy: locationApi.Accuracy.High }),
      20_000,
      'Your current location could not be found. Move somewhere with a GPS signal and try again.',
    );
  } catch (error) {
    throw new ReportLocationError('Your current location could not be found. Move somewhere with a GPS signal and try again.', error instanceof OperationTimeoutError ? 'location_timeout' : 'location_unavailable');
  }
  if (!Number.isFinite(position?.timestamp) || Math.abs(Date.now() - position.timestamp) > 60_000) {
    throw new ReportLocationError('A fresh location is required. Please try again.', 'location_stale');
  }
  if (!withinReportingDistance(position.coords, destination)) {
    throw new ReportLocationError('Reports must be within 50 miles of your current location. Move the report pin closer and try again.', 'location_out_of_range');
  }
  return { latitude: position.coords.latitude, longitude: position.coords.longitude, capturedAt: new Date(position.timestamp).toISOString() };
}
