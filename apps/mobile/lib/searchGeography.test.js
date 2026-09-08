import { describe, expect, it } from 'vitest';
import { inBoundary, inViewport, matchesGeography, regionForGeometry } from './searchGeography';
const square = [[0,0],[4,0],[4,4],[0,4],[0,0]];
const hole = [[1,1],[2,1],[2,2],[1,2],[1,1]];
const geometry = { type: 'Polygon', coordinates: [square, hole] };
describe('one geographic result set for map and list', () => {
  it('excludes holes and outside points but includes outer boundary edges', () => {
    expect(inBoundary({ latitude: 3, longitude: 3 }, geometry)).toBe(true);
    expect(inBoundary({ latitude: 1.5, longitude: 1.5 }, geometry)).toBe(false);
    expect(inBoundary({ latitude: 5, longitude: 3 }, geometry)).toBe(false);
    expect(inBoundary({ latitude: 3, longitude: 4 }, geometry)).toBe(true);
  });
  it('retains disconnected parts of a municipal boundary', () => {
    const multi = { type: 'MultiPolygon', coordinates: [[square], [[[10,10],[11,10],[11,11],[10,11],[10,10]]]] };
    expect(inBoundary({ latitude: 10.5, longitude: 10.5 }, multi)).toBe(true);
    expect(inBoundary({ latitude: 6, longitude: 6 }, multi)).toBe(false);
  });
  it('uses half spans, not the larger fetch buffer, and handles the dateline', () => {
    const region = { latitude: 0, longitude: 179, latitudeDelta: 4, longitudeDelta: 6 };
    expect(inViewport({ latitude: 0, longitude: -179 }, region)).toBe(true);
    expect(inViewport({ latitude: 3, longitude: 179 }, region)).toBe(false);
    expect(inViewport({ latitude: null, longitude: 179 }, region)).toBe(false);
  });
  it('intersects viewport and boundary; clearing the place removes only boundary restriction', () => {
    const region = { latitude: 3, longitude: 3, latitudeDelta: 4, longitudeDelta: 4 };
    const outsideCity = { latitude: 4.5, longitude: 3 };
    expect(matchesGeography(outsideCity, region, { geometry })).toBe(false);
    expect(matchesGeography(outsideCity, region, null)).toBe(true);
    expect(matchesGeography({ latitude: 0.5, longitude: 0.5 }, region, { geometry })).toBe(false);
  });
  it('fits the entire boundary with padding for map controls', () => {
    const region = regionForGeometry(geometry);
    square.forEach(([longitude, latitude]) => expect(inViewport({ latitude, longitude }, region)).toBe(true));
  });
});
