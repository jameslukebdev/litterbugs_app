import type { Coordinates } from '@litterbugs/report-contract';

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
