import { describe, expect, it } from 'vitest';
import { layoutMapLabels, reportsNearMapTap, STATUS_MARKER_SIZE } from './mapLabelLayout';
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
  it('keeps an available reward visible ahead of a nearby completed report', () => {
    const completed = { ...point('a', 100, 100, null), report: { cleanup_state: 'completed' } };
    const available = { ...point('b', 110, 125, '$6'), report: { cleanup_state: 'available' } };
    const result = layoutMapLabels([completed, available]);
    expect(result.find(p => p.id === 'b').labelled).toBe(true);
    expect(result.find(p => p.id === 'a').labelled).toBe(false);
    expect(reportsNearMapTap(result, 'b').map(p => p.id)).toEqual(['a', 'b']);
    expect(layoutMapLabels([available, completed])).toEqual(result);
    expect(layoutMapLabels([completed, available], 'a').find(p => p.id === 'a').labelled).toBe(true);
  });
  it('prioritizes in-progress work over completed work without removing either report', () => {
    const result = layoutMapLabels([
      { ...point('a', 100, 100), report: { cleanup_state: 'completed' } },
      { ...point('b', 100, 100), report: { cleanup_state: 'claimed' } },
    ]);
    expect(result.map(p => [p.id, p.labelled])).toEqual([['b', true], ['a', false]]);
  });
  it('promotes a selected dot and leaves adjacent reports accessible', () => {
    const result = layoutMapLabels([point('a', 100, 100), point('b', 115, 100)], 'b');
    expect(result.find(p => p.id === 'b').labelled).toBe(true);
    expect(result.find(p => p.id === 'a').labelled).toBe(false);
    expect(reportsNearMapTap(result, 'b')).toHaveLength(2);
  });
  it('allows more labels after zoom separates points and accounts for larger text', () => {
    expect(layoutMapLabels([point('a', 100, 100), point('b', 160, 100)]).every(p => p.labelled)).toBe(true);
    expect(layoutMapLabels([point('a', 100, 100), point('b', 160, 100)], null, 3).filter(p => p.labelled)).toHaveLength(1);
  });
  it('keeps unfunded status geometry constant across overlap, selection, zoom and text size', () => {
    for (const cleanup_state of ['completed', 'claimed']) {
      for (const [x, y, selectedId, fontScale] of [[110, 125, null, 1], [300, 300, null, 1], [110, 125, 'status', 1], [110, 125, null, 3]]) {
        const result = layoutMapLabels([
          point('available', 100, 100),
          { ...point('status', x, y, null), report: { cleanup_state } },
        ], selectedId, fontScale);
        const status = result.find(p => p.id === 'status');
        expect([status.width, status.height]).toEqual([STATUS_MARKER_SIZE, STATUS_MARKER_SIZE]);
        expect(result).toHaveLength(2);
      }
    }
  });
  it('does not treat missing projections as an overlap', () => {
    expect(reportsNearMapTap([point('a', undefined, undefined), point('b', undefined, undefined)], 'a').map(p => p.id)).toEqual(['a']);
  });
});

it('changes funded status label visibility with separation, never the amount', () => {
  const close = [point('a', 100, 100), { ...point('b', 110, 110, '$25'), report: { cleanup_state: 'claimed', funded_amount_cents: 2500 } }];
  const far = [close[0], { ...close[1], x: 300, y: 300 }];
  expect(layoutMapLabels(close).find(p => p.id === 'b').labelled).toBe(false);
  expect(layoutMapLabels(far).find(p => p.id === 'b').labelled).toBe(true);
  for (const result of [layoutMapLabels(close), layoutMapLabels(far), layoutMapLabels(close, 'b')]) {
    const status = result.find(p => p.id === 'b');
    expect(status.label).toBe('$25');
    expect(status.report.funded_amount_cents).toBe(2500);
    expect(status.width).toBeGreaterThan(STATUS_MARKER_SIZE);
  }
});

 it('reserves selection space without resizing the native host or changing funding', () => {
  const input = [point('a',100,100,'$0'), point('b',141,100,'$6')];
  const normal = layoutMapLabels(input);
  const selected = layoutMapLabels(input,'a');
  expect(normal.filter(p => p.labelled)).toHaveLength(2);
  expect(selected.filter(p => p.labelled)).toHaveLength(1);
  expect(selected[0].label).toBe('$0');
  expect([selected[0].width,selected[0].height]).toEqual([normal[0].width,normal[0].height]);
});
