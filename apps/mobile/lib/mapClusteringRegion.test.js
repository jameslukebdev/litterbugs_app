import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const source = readFileSync(require.resolve('react-native-map-clustering/lib/ClusteredMapView.js'), 'utf8');
// Exercise the installed dependency's actual event handler without native UI.
const handlerSource = source.slice(
  source.indexOf('const _onRegionChangeComplete ='),
  source.indexOf('const _onClusterPress ='),
);

function harness(superCluster = null) {
  const updateRegion = vi.fn();
  const onRegionChangeComplete = vi.fn();
  const updateMarkers = vi.fn();
  const handler = runInNewContext(`${handlerSource}; _onRegionChangeComplete`, {
    superCluster, updateRegion, onRegionChangeComplete, updateMarkers,
    calculateBBox: () => [-82, 36, -81, 37],
    returnMapZoom: () => 10, minZoom: 1,
    animationEnabled: false, spiralEnabled: false,
    onMarkersChange: vi.fn(), clusterChildren: null,
  });
  return { handler, updateRegion, onRegionChangeComplete, updateMarkers };
}

describe('clustering viewport transitions', () => {
  it('remembers town recentering while clustering is disabled at close zoom', () => {
    const { handler, updateRegion, onRegionChangeComplete } = harness();
    const town = { latitude: 36.2, longitude: -81.6, latitudeDelta: 0.3, longitudeDelta: 0.3 };
    handler(town, { isGesture: false });
    expect(updateRegion).toHaveBeenCalledWith(town);
    expect(onRegionChangeComplete).toHaveBeenCalledWith(town, { isGesture: false });
  });

  it('still updates markers and the viewport when clustering is enabled', () => {
    const markers = [{ id: 4 }];
    const { handler, updateRegion, updateMarkers } = harness({ getClusters: () => markers });
    const town = { latitudeDelta: 0.3 };
    handler(town, {});
    expect(updateRegion).toHaveBeenCalledExactlyOnceWith(town);
    expect(updateMarkers).toHaveBeenCalledWith(markers);
  });

  it('does not replace the last viewport with a missing event region', () => {
    const { handler, updateRegion } = harness();
    handler(null, {});
    expect(updateRegion).not.toHaveBeenCalled();
  });
});
