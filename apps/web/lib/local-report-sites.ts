import 'server-only';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PublicReportShareModel } from './public-report-share-model';
import { reportSite } from './report-site-model';
export { isLocalSiteReport } from './local-report-site-ids';

export const LOCAL_SITE_REPORT = 'f0000000-0000-4000-8000-000000000002';
const directory = join(tmpdir(), 'litterbugs-recurring-cleanups-local');
const file = join(directory, 'reports.json');
const prefix = 'f0000000-0000-4000-8000-';
const base: PublicReportShareModel = {
  id: LOCAL_SITE_REPORT, title: 'Litter along Greenway Trail', state: 'completed',
  generalLocation: 'Boone, North Carolina', location: { latitude: 36.2185, longitude: -81.655 },
  notes: 'Bottles and paper along the wooded edge of the trail.', litterTypes: ['Bottles', 'Paper products'], severity: 'Medium',
  reporterName: 'Riley', reporterId: null, reportDate: '2026-11-15T15:00:00Z',
  cleanerName: 'Morgan', cleanerId: null, claimedDate: '2026-11-16T15:00:00Z', completionDate: '2026-11-17T16:00:00Z',
  cleanupDescription: 'Picked up bottles, cans and litter along the wooded edge.', bagsOrItemsRemoved: 4, weightPounds: 27, cleanupMinutes: 60,
  beforePhotoUrl: '/dev-review-preview/site-history/before.jpg', afterPhotoUrl: '/dev-review-preview/site-history/after.jpg', photoCount: 1, afterPhotoCount: 1,
  rewardCents: 0, fundingEligible: false, canonicalUrl: `http://localhost:3000/reports/${LOCAL_SITE_REPORT}`,
  contributorCredit: { report_id: LOCAL_SITE_REPORT, names: ['Alex', 'Taylor'], anonymous_count: 1, donations: [
    { name: 'Alex', amountCents: 1000, donatedAt: '2026-11-15T15:12:00Z' },
    { name: null, amountCents: 2000, donatedAt: '2026-11-15T16:40:00Z' },
    { name: 'Taylor', amountCents: 500, donatedAt: '2026-11-15T19:08:00Z' },
  ] },
};
type StoredReport = PublicReportShareModel & { localPhotos?: string[] };
function seed(): StoredReport[] {
  const id = `${prefix}000000000001`;
  return [{ ...base, id, reporterName: 'Alex', cleanerName: 'Casey', contributorCredit: null, reportDate: '2026-09-10T14:00:00Z', claimedDate: '2026-09-11T14:00:00Z', completionDate: '2026-09-12T15:00:00Z', bagsOrItemsRemoved: 2, weightPounds: 12, cleanupMinutes: 45, canonicalUrl: `http://localhost:3000/reports/${id}` }, base];
}
async function storedReports(): Promise<StoredReport[]> {
  if (process.env.NODE_ENV !== 'development' || process.env.VERCEL) throw new Error('Local test unavailable');
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return seed(); throw error; }
}
export async function readLocalSite() {
  return reportSite((await storedReports()).map(({ localPhotos, ...report }) => ({ ...report, ...(localPhotos?.length ? { beforePhotoUrl: `/api/local/report-sites/${report.id}/photo` } : {}) })), true);
}
export async function readLocalSitePhoto(id: string, index: number) {
  return (await storedReports()).find(report => report.id === id)?.localPhotos?.[index] ?? null;
}
// Shared by Next's separate server bundles and retained during Fast Refresh.
const state = globalThis as typeof globalThis & { litterbugsLocalSiteWrite?: Promise<unknown> };
export async function saveLocalSiteReport(input: { id: string; title: string; litterTypes: string[]; severity: string; notes: string; photos: string[] }) {
  const operation = (state.litterbugsLocalSiteWrite ?? Promise.resolve()).catch(() => undefined).then(async () => {
    const stored = await storedReports();
    const site = reportSite(stored, true);
    const existing = site.reports.find(report => report.id === input.id);
    if (existing) return { reportId: existing.id, alreadyReported: false };
    if (site.currentReportId) return { reportId: site.currentReportId, alreadyReported: true };
    const report: StoredReport = {
      ...base, id: input.id, title: input.title || base.title, reporterName: 'Jamie', state: 'available',
      reportDate: new Date().toISOString(), notes: input.notes || null, litterTypes: input.litterTypes, severity: input.severity,
      cleanerName: null, claimedDate: null, completionDate: null, cleanupDescription: null,
      bagsOrItemsRemoved: null, weightPounds: null, cleanupMinutes: null, contributorCredit: null,
      beforePhotoUrl: input.photos[0], photoCount: input.photos.length, afterPhotoUrl: null, afterPhotoCount: 0,
      localPhotos: input.photos,
      canonicalUrl: `http://localhost:3000/reports/${input.id}`,
    };
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = join(directory, `${crypto.randomUUID()}.json`);
    await writeFile(temporary, JSON.stringify([...site.reports, report]), { mode: 0o600 });
    await rename(temporary, file);
    return { reportId: report.id, alreadyReported: false };
  });
  state.litterbugsLocalSiteWrite = operation;
  return operation;
}
