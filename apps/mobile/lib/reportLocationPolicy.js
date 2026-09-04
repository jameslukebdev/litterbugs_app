export const NEARBY_REPORT_DISTANCE_MILES = 10;
export const MAX_REPORT_DISTANCE_MILES = 50;

export function evaluateReportLocationDistance(distanceMiles) {
  const distance = Number(distanceMiles);

  if (!Number.isFinite(distance) || distance < 0) {
    return { status: 'invalid', distanceMiles: null };
  }

  if (distance > MAX_REPORT_DISTANCE_MILES) {
    return { status: 'blocked', distanceMiles: distance };
  }

  if (distance > NEARBY_REPORT_DISTANCE_MILES) {
    return { status: 'remote_confirmation_required', distanceMiles: distance };
  }

  return { status: 'nearby', distanceMiles: distance };
}

export function roundedDistanceLabel(distanceMiles) {
  return `${Math.max(0, Math.round(Number(distanceMiles) || 0))} miles`;
}
