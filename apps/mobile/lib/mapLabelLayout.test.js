import { describe, expect, it } from 'vitest';
import { layoutMapLabels, reportsNearMapTap } from './mapLabelLayout';
const point = (id, x, y, label = '$6') => ({ id, x, y, label });
describe('map label collision and discovery', () => {
  it('keeps separated reports labelled and downgrades close labels without dropping reports', () => {
    const result = layoutMapLabels([point('a', 100, 100), point('b', 115, 100), point('c', 300, 300)]);
    expect(result.map(p => [p.id, p.labelled])).toEqual([['a', true], ['b', false], ['c', true]]);
    expect(reportsNearMapTap(result, 'b').map(p => p.id)).toEqual(['a', 'b']);
  });
  it('makes every identical-coordinate report available through the chooser', () => {
    const result = layoutMapLabels(Array.from({ length: 30 }, (_, i) => point(`report-${i}`, 100, 100)));
    expect(result.filter(p => p.labelled)).toHaveLength(1);
    expect(reportsNearMapTap(result, 'report-2')).toHaveLength(30);
  });
  it('keeps label allocation stable when fetch order changes and does not prioritize reward', () => {
    const input = [point('a', 100, 100, null), point('b', 115, 100, '$1000')];
    expect(layoutMapLabels(input)).toEqual(layoutMapLabels([...input].reverse()));
    expect(layoutMapLabels(input)[0].labelled).toBe(true);
  });
  it('promotes a selected dot and leaves adjacent reports accessible', () => {
    const result = layoutMapLabels([point('a', 100, 100), point('b', 115, 100)], 'b');
    expect(result.find(p => p.id === 'b').labelled).toBe(true);
    expect(result.find(p => p.id === 'a').labelled).toBe(false);
    expect(reportsNearMapTap(result, 'b')).toHaveLength(2);
  });
  it('allows more labels after zoom separates points and accounts for larger text', () => {
    expect(layoutMapLabels([point('a', 100, 100), point('b', 180, 100)]).every(p => p.labelled)).toBe(true);
    expect(layoutMapLabels([point('a', 100, 100), point('b', 180, 100)], null, 3).filter(p => p.labelled)).toHaveLength(1);
  });
  it('does not treat missing projections as an overlap', () => {
    expect(reportsNearMapTap([point('a', undefined, undefined), point('b', undefined, undefined)], 'a').map(p => p.id)).toEqual(['a']);
  });
});
