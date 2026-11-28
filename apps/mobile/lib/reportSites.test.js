import { afterEach, describe, expect, it, vi } from 'vitest';
import { alreadyReportedId, loadReportSite, sitePhotoUrl, siteRepresentatives, siteTimeline } from './reportSites';
import { collectReportMatches } from './collectReportMatches';
const id = '10000000-0000-4000-8000-000000000001';
afterEach(() => vi.unstubAllGlobals());
describe('site history contracts', () => {
 it('reads only published production history and rejects local fixture models', async () => {
  const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ id, reports: [{ id }], local: true }) })); vi.stubGlobal('fetch', fetch);
  await expect(loadReportSite(id)).rejects.toThrow(); expect(await loadReportSite('fixture-old')).toBeNull(); expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('keeps evidence on the public photo route and never opens arbitrary URLs', () => {
  expect(sitePhotoUrl(`/reports/${id}/photo/after`)).toBe(`https://litterbugs.app/reports/${id}/photo/after`);
  for(const path of ['https://evil.test/pic','http://litterbugs.app/reports/'+id+'/photo/after','/api/private/data','javascript:alert(1)'])expect(sitePhotoUrl(path)).toBeNull();
 });
 it('retains dated donation privacy, report ownership and completed evidence', () => {
  const events=siteTimeline({reportDate:'2026-11-01',reporterName:'Riley',claimedDate:'2026-11-03',completionDate:'2026-11-04',state:'completed',cleanerName:'Morgan',contributorCredit:{donations:[{name:null,amountCents:3500,donatedAt:'2026-11-02'}]}});
  expect(events.map(e=>e.label)).toEqual(['Reported by Riley','$35.00 donated anonymously','Cleanup claimed','Cleaned up by Morgan']);expect(events.at(-1).cleanup).toBe(true);
 });
 it('groups explicit links, never nearby coordinates or old matching severity', async () => {
  const rows=[{id:'new',cleanup_site_id:id,created_at:'2026-11-24',severity:'High'},{id:'old',cleanup_site_id:id,created_at:'2026-11-01',severity:'Low'},{id:'nearby',created_at:'2026-11-02',severity:'Low'}];
  expect(siteRepresentatives(rows).map(r=>r.id)).toEqual(['new','nearby']);
  const result=await collectReportMatches(async(o,n)=>rows.slice(o,o+n),r=>r.severity==='Low',{pageSize:1,identity:r=>r.cleanup_site_id||r.id});expect(result.reports.map(r=>r.id)).toEqual(['nearby']);
 });
 it('accepts only a valid duplicate result from the server', () => {
  expect(alreadyReportedId({message:'site_already_reported',details:id})).toBe(id);expect(alreadyReportedId({message:'permission_denied',details:id})).toBeNull();expect(alreadyReportedId({message:'site_already_reported',details:'not-an-id'})).toBeNull();
 });
});
