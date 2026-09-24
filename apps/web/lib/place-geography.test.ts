import { describe, expect, it } from 'vitest';
import { boundsForGeometry, inBoundary, type BoundaryGeometry } from './place-geography';
import { DEFAULT_DISCOVERY_FILTERS, matchesDiscovery } from './report-discovery';
import type { MappableReport } from '@litterbugs/report-contract';
const square = [[0,0],[4,0],[4,4],[0,4],[0,0]], hole = [[1,1],[2,1],[2,2],[1,2],[1,1]];
const geometry: BoundaryGeometry = { type: 'Polygon', coordinates: [square, hole] };
describe('selected place boundary', () => {
  it('includes outer edges, excludes holes, and preserves disconnected areas', () => {
    expect(inBoundary({latitude:3,longitude:4}, geometry)).toBe(true);
    expect(inBoundary({latitude:1.5,longitude:1.5}, geometry)).toBe(false);
    expect(inBoundary({latitude:5,longitude:3}, geometry)).toBe(false);
    const multi: BoundaryGeometry = {type:'MultiPolygon',coordinates:[[square],[[[10,10],[11,10],[11,11],[10,11],[10,10]]]]};
    expect(inBoundary({latitude:10.5,longitude:10.5},multi)).toBe(true);
    expect(boundsForGeometry(multi)).toEqual({north:11,south:0,west:0,east:11});
  });
  it('uses the same geometry in result filtering and removes only that restriction when cleared', () => {
    const report = {id:'test',title:'Bottles',latitude:5,longitude:3,cleanup_state:'available',funded_amount_cents:0} as MappableReport;
    expect(matchesDiscovery(report,DEFAULT_DISCOVERY_FILTERS,null,undefined,undefined,geometry)).toBe(false);
    expect(matchesDiscovery(report,DEFAULT_DISCOVERY_FILTERS)).toBe(true);
  });
});
