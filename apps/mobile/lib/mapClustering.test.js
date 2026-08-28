import { describe, expect, it } from 'vitest';

import {
  REPORT_CLUSTERING_MIN_LATITUDE_DELTA,
  shouldClusterReports,
} from './mapClustering';

describe('map clustering visibility', () => {
  it('clusters reports when the map is zoomed out', () => {
    expect(shouldClusterReports({ latitudeDelta: 0.08 })).toBe(true);
  });

  it('renders reports directly at close zoom', () => {
    expect(shouldClusterReports({ latitudeDelta: 0.02 })).toBe(false);
    expect(shouldClusterReports({
      latitudeDelta: REPORT_CLUSTERING_MIN_LATITUDE_DELTA,
    })).toBe(false);
  });

  it('uses direct rendering when the map region is unavailable', () => {
    expect(shouldClusterReports(null)).toBe(false);
    expect(shouldClusterReports({})).toBe(false);
  });
});
