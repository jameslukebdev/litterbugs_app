import { expect, it } from 'vitest';
import { mergeAreaReports } from './mergeAreaReports';

const area = { latitude: 36.2, longitude: -81.67, latitudeDelta: 0.06, longitudeDelta: 0.06 };
const at = (id, latitude, longitude, extra = {}) => ({ id, latitude, longitude, ...extra });
const inside = (id, extra) => at(id, 36.2, -81.67, extra);
const outside = (id) => at(id, 36.4, -81.67);

it('keeps reports outside the new view, so groups at the edge are not reshuffled', () => {
  const merged = mergeAreaReports([inside('a'), outside('far')], [inside('a')], area);
  expect(merged.map(r => r.id)).toEqual(['a', 'far']);
});

it('removes a report inside the view that the new load no longer returns', () => {
  expect(mergeAreaReports([inside('a'), inside('gone')], [inside('a')], area).map(r => r.id)).toEqual(['a']);
});

it('keeps everything when the load was cut short, since a missing report may be past the limit', () => {
  expect(mergeAreaReports([inside('a'), inside('maybe')], [inside('a')], area, { truncated: true }).map(r => r.id)).toEqual(['a', 'maybe']);
});

it('takes the newest copy of a report and keeps the existing order', () => {
  const merged = mergeAreaReports([inside('a', { v: 1 }), inside('b', { v: 1 })], [inside('b', { v: 2 }), inside('c')], area);
  expect(merged.map(r => [r.id, r.v])).toEqual([['b', 2], ['c', undefined]]);
  const kept = mergeAreaReports([outside('x'), inside('b', { v: 1 })], [inside('b', { v: 2 })], area);
  expect(kept.map(r => [r.id, r.v])).toEqual([['x', undefined], ['b', 2]]);
});

it('drops the reports farthest from the view when the list is too long', () => {
  const merged = mergeAreaReports([outside('far'), at('near', 36.25, -81.67)], [inside('a')], area, { limit: 2 });
  expect(merged.map(r => r.id).sort()).toEqual(['a', 'near']);
});
