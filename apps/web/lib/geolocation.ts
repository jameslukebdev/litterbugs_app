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
    if (!geolocation) { reject(new Error('Location access is required to post a report.')); return; }
    geolocation.getCurrentPosition(resolve, () => reject(new Error('Allow location access and try again. Reports must be within 50 miles of your current location.')), {
      enableHighAccuracy: true, timeout: 20000, maximumAge: 0,
    });
  });
  if (!Number.isFinite(position.timestamp) || Math.abs(Date.now() - position.timestamp) > 60000) {
    throw new Error('A fresh location is required. Please try again.');
  }
  const origin = { latitude: position.coords.latitude, longitude: position.coords.longitude };
  if (!isWithinReportDistance(origin, destination)) {
    throw new Error('Reports must be within 50 miles of your current location. Move the report pin closer and try again.');
  }
  return { ...origin, capturedAt: new Date(position.timestamp).toISOString() };
}
