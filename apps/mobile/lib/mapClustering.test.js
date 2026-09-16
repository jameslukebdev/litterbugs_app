import { describe, expect, it } from 'vitest';

import {
  REPORT_CLUSTERING_MIN_LATITUDE_DELTA,
  shouldClusterReports,
} from './mapClustering';
import { readFileSync } from 'node:fs';

const mapSource = readFileSync(new URL('../MapScreen.js', import.meta.url), 'utf8');

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

  it('keeps newly separated iOS marker artwork visible', () => {
    expect(mapSource.match(/tracksViewChanges=\{Platform\.OS === 'ios' \? true : tracksReportMarkers\}/g)).toHaveLength(2);
    expect(mapSource.match(/collapsable=\{false\} style=\{styles\.report(?:Cluster|Marker)/g)).toHaveLength(2);
  });
});
