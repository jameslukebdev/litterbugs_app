import { findResponsiveUserLocation } from './responsiveLocation';

// Each focus/retry owns its results. A late GPS fix must not restore distances
// after leaving the screen, revoking permission, or starting another request.
export function createReportsLocationLoader(locationApi, onChange, locate = findResponsiveUserLocation) {
  let sequence = 0;
  let lastOrigin = null;
  return {
    cancel() { sequence += 1; },
    async refresh({ requestPermission = false } = {}) {
      const request = ++sequence;
      const current = () => request === sequence;
      const publish = (status, origin = null) => {
        if (!current()) return;
        if (status !== 'loading') lastOrigin = origin;
        onChange({ status, origin: status === 'loading' ? lastOrigin : origin });
      };
      publish('loading');
      try {
        let permission = await locationApi.getForegroundPermissionsAsync();
        if (!current()) return;
        if (permission.status !== 'granted' && requestPermission && permission.canAskAgain) {
          permission = await locationApi.requestForegroundPermissionsAsync();
        }
        if (!current()) return;
        if (permission.status !== 'granted') {
          publish(permission.canAskAgain ? 'permission-needed' : 'denied');
          return;
        }
        const enabled = await locationApi.hasServicesEnabledAsync();
        if (!current()) return;
        if (!enabled) { publish('services-disabled'); return; }
        await locate({
          locationApi,
          onPosition: (position, metadata) => publish(metadata?.cached ? 'cached' : 'ready', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        });
      } catch { publish('unavailable'); }
    },
  };
}

export function reportsLocationPresentation(status) {
  return {
    loading: { text: 'Newest first · checking your location…' },
    ready: { text: 'Closest to your current location' },
    cached: { text: 'Closest to your last known location' },
    'permission-needed': { text: 'Newest first · use location to sort by distance', action: 'Enable location' },
    denied: { text: 'Newest first · location access is off', action: 'Open settings' },
    'services-disabled': { text: 'Newest first · turn on Location Services in device settings', action: 'Retry location' },
    unavailable: { text: 'Newest first · your location is temporarily unavailable', action: 'Retry location' },
  }[status];
}
