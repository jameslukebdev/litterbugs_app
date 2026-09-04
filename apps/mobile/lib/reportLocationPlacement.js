export function mapCenterCoordinate(region) {
  const latitude = Number(region?.latitude);
  const longitude = Number(region?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { latitude, longitude };
}
