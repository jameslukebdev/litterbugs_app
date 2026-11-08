import { ReportLocationError } from './report-location-error';
import { isWithinReportDistance, type Coordinates } from '@litterbugs/report-contract';

export const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 12000,
  maximumAge: 60000,
};

export function getBrowserLocation(
  geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined =
    typeof navigator === 'undefined' ? undefined : navigator.geolocation,
): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!geolocation) {
      reject(new Error('unavailable'));
      return;
    }

    geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      reject,
      GEOLOCATION_OPTIONS,
    );
  });
}

export async function requireReportLocation(
  destination: Coordinates,
  geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined =
    typeof navigator === 'undefined' ? undefined : navigator.geolocation,
): Promise<Coordinates & { capturedAt: string }> {
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    if (!geolocation) { reject(new ReportLocationError('Turn on location access to continue.', 'location_unavailable')); return; }
    geolocation.getCurrentPosition(resolve, (error) => reject(new ReportLocationError(error.code === 1 ? 'Allow location access in your browser, then try again.' : error.code === 3 ? 'Location took too long. Try again.' : 'Your location is unavailable. Try again.', error.code === 1 ? 'location_denied' : error.code === 3 ? 'location_timeout' : 'location_unavailable')), {
      enableHighAccuracy: true, timeout: 20000, maximumAge: 0,
    });
  });
  if (!Number.isFinite(position.timestamp) || Math.abs(Date.now() - position.timestamp) > 60000) {
    throw new ReportLocationError('Please try your location again.', 'location_stale');
  }
  const origin = { latitude: position.coords.latitude, longitude: position.coords.longitude };
  if (!isWithinReportDistance(origin, destination)) {
    throw new ReportLocationError('Choose a spot within 50 miles of you.', 'location_out_of_range');
  }
  return { ...origin, capturedAt: new Date(position.timestamp).toISOString() };
}
