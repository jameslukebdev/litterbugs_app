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
    if (!geolocation) { reject(new Error('Turn on location access to continue.')); return; }
    geolocation.getCurrentPosition(resolve, (error) => reject(new Error(error.code === 1 ? 'Allow location access in your browser, then try again.' : error.code === 3 ? 'Location took too long. Try again.' : 'Your location is unavailable. Try again.')), {
      enableHighAccuracy: true, timeout: 20000, maximumAge: 0,
    });
  });
  if (!Number.isFinite(position.timestamp) || Math.abs(Date.now() - position.timestamp) > 60000) {
    throw new Error('Please try your location again.');
  }
  const origin = { latitude: position.coords.latitude, longitude: position.coords.longitude };
  if (!isWithinReportDistance(origin, destination)) {
    throw new Error('Choose a spot within 50 miles of you.');
  }
  return { ...origin, capturedAt: new Date(position.timestamp).toISOString() };
}
