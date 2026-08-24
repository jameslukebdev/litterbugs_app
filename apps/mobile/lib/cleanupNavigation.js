export const CLEANUP_NAVIGATION_SAFETY_REMINDER =
  'Travel safely. Park in a safe and legal location before using Litterbugs or beginning a cleanup.';

export function cleanupNavigationUrls(report) {
  const latitude = Number(report?.latitude);
  const longitude = Number(report?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const destination = `${latitude},${longitude}`;
  const encodedDestination = encodeURIComponent(destination);

  return {
    apple: `http://maps.apple.com/?daddr=${encodedDestination}&dirflg=d`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=driving`,
    android: `geo:${destination}?q=${encodedDestination}`,
  };
}
