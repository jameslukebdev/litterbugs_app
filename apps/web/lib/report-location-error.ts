type LocationReason = 'location_denied' | 'location_timeout' | 'location_unavailable' | 'location_stale' | 'location_out_of_range';
export class ReportLocationError extends Error {
  constructor(message: string, readonly reason: LocationReason) { super(message); }
}
export function reportLocationFailureReason(error: unknown): LocationReason {
  return error instanceof ReportLocationError ? error.reason : 'location_unavailable';
}
