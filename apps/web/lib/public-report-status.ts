import type { PublicReportShareModel } from './public-report-share-model';

export type PublicStatusTone = 'open' | 'busy' | 'done' | 'muted';

/** Same words, bugs and colours as the map pins and the report sheet. Expired reports have no bug. */
export function publicReportStatus(state: PublicReportShareModel['state']): { label: string; short: string; bug: string | null; tone: PublicStatusTone } {
  if (state === 'completed') return { label: 'Cleanup complete', short: 'Cleaned up', bug: '/brand/bugs/flower.png', tone: 'done' };
  if (state === 'in_progress') return { label: 'Cleanup in progress', short: 'In progress', bug: '/brand/ranks/caterpillar.svg', tone: 'busy' };
  if (state === 'expired') return { label: 'Report expired', short: 'Expired', bug: null, tone: 'muted' };
  return { label: 'Available to clean', short: 'Available', bug: '/brand/bugs/ladybug.png', tone: 'open' };
}
