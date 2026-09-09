export function mapCenterCoordinate(region) {
  if (region?.latitude == null || region?.longitude == null || region.latitude === '' || region.longitude === '') return null;
  const latitude = Number(region?.latitude);
  const longitude = Number(region?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  return { latitude, longitude };
}
