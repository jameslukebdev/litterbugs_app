import { expect, it } from 'vitest';
import { projectMapPoints, PROJECTION_BATCH_SIZE } from './mapWorkBudget';
import { layoutMapLabels } from './mapLabelLayout';
it('bounds simultaneous native requests and cancels obsolete batches', async () => {
  let calls = 0, active = true;
  const result = await projectMapPoints(Array.from({length: 1000}, (_, id) => ({id, coordinate:{}})), async () => {
    calls++; active = false; return {x:0,y:0};
  }, () => active);
  expect(calls).toBe(PROJECTION_BATCH_SIZE);
  expect(result).toEqual([]);
});
for (const count of [1000, 5000, 10000]) it(`benchmarks ${count} deterministic report labels without dropping identity`, () => {
  const points = Array.from({length:count}, (_, id) => ({id:String(id),x:(id*97)%1200,y:(id*71)%900,label:'$6'}));
  const start = performance.now();
  const output = layoutMapLabels(points,'0');
  console.log(`${count} reports: ${(performance.now()-start).toFixed(1)}ms label layout`);
  expect(output).toHaveLength(count);
  expect(output.find(p=>p.id==='0').labelled).toBe(true);
});
