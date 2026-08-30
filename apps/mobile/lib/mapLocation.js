export async function centerMapFromExistingLocationPermission({
  getForegroundPermissions,
  getCurrentPosition,
  commitMapRegion,
}) {
  const { status } = await getForegroundPermissions();
  if (status !== 'granted') return { status: 'skipped' };

  const location = await getCurrentPosition({});
  commitMapRegion({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  return { status: 'centered' };
}
