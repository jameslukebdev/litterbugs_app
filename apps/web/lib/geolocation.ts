import { ReportLocationError } from './report-location-error';
import { isWithinReportDistance, MAX_REPORT_DISTANCE_MILES, type Coordinates } from '@litterbugs/report-contract';

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

    // Some browsers do not start their timeout while a permission prompt is open.
    // Bound the whole interaction too, and ignore callbacks after it has expired.
    let settled = false;
    const finish = (work: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      work();
    };
    const timer = setTimeout(() => finish(() => reject(new Error('Location took too long. Please try again.'))), GEOLOCATION_OPTIONS.timeout);
    try {
      geolocation.getCurrentPosition(
        ({ coords }) => finish(() => resolve({ latitude: coords.latitude, longitude: coords.longitude })),
        error => finish(() => reject(error)),
        GEOLOCATION_OPTIONS,
      );
    } catch (error) { finish(() => reject(error)); }
  });
}

export async function requireReportLocation(
  destination: Coordinates,
  geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined =
    typeof navigator === 'undefined' ? undefined : navigator.geolocation,
): Promise<Coordinates & { capturedAt: string }> {
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    if (!geolocation) { reject(new ReportLocationError('Turn on location access to continue.', 'location_unavailable')); return; }
    let settled = false;
    const finish = (work: () => void) => { if (settled) return; settled = true; clearTimeout(timer); work(); };
    // Browser timeouts can pause while the permission prompt is open. Bound the
    // complete attempt so Retry becomes available even if no callback arrives.
    const timer = setTimeout(() => finish(() => reject(new ReportLocationError('Location took too long. Try again.', 'location_timeout'))), 20000);
    try {
      geolocation.getCurrentPosition(position => finish(() => resolve(position)), error => finish(() => reject(new ReportLocationError(error.code === 1 ? 'Allow location access in your browser, then try again.' : error.code === 3 ? 'Location took too long. Try again.' : 'Your location is unavailable. Try again.', error.code === 1 ? 'location_denied' : error.code === 3 ? 'location_timeout' : 'location_unavailable'))), {
        enableHighAccuracy: true, timeout: 20000, maximumAge: 0,
      });
    } catch { finish(() => reject(new ReportLocationError('Your location is unavailable. Try again.', 'location_unavailable'))); }
  });
  if (!Number.isFinite(position.timestamp) || Math.abs(Date.now() - position.timestamp) > 60000) {
    throw new ReportLocationError('Please try your location again.', 'location_stale');
  }
  const origin = { latitude: position.coords.latitude, longitude: position.coords.longitude };
  if (!isWithinReportDistance(origin, destination)) {
    throw new ReportLocationError(`You must be within ${MAX_REPORT_DISTANCE_MILES} miles of the pin to post. Try again when you’re closer.`, 'location_out_of_range');
  }
  return { ...origin, capturedAt: new Date(position.timestamp).toISOString() };
}
