import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./supabase/public', () => ({ createPublicClient: () => ({ rpc: vi.fn() }) }));

import { communityMetaDescription } from './community-metadata';
import type { CommunityRecord } from './community-leaderboards';

const now = new Date('2026-11-18T17:00:00Z');
const community: CommunityRecord = {
  slug: 'us-nc-boone', path: '/communities/us/nc/boone', name: 'Boone', kind: 'county', areaName: 'Watauga County',
  countryCode: 'US', countryName: 'United States', regionCode: 'US-NC', regionName: 'North Carolina',
  latitude: null, longitude: null, timeZone: 'America/New_York',
  acceptedReports: 30, cleanups: 17, monthReports: 8, monthCleanups: 7,
  firstReportAt: null, lastActivityAt: null, isIndexable: true,
};

describe('community search descriptions', () => {
  it('keeps Boone’s activity and leaderboard invitation without repeating its name', () => {
    expect(communityMetaDescription(community, now)).toBe(
      'In November 2026, Litterbugs members in the Boone area reported 8 spots and cleaned up 7. View the cleanup leaderboard.',
    );
  });

  it('handles Avery County with singular counts', () => {
    const description = communityMetaDescription({ ...community, name: 'Avery County', areaName: 'Avery County', monthReports: 1, monthCleanups: 1 }, now);
    expect(description).toContain('in Avery County reported 1 spot and cleaned up 1.');
    expect(description.length).toBeLessThanOrEqual(155);
  });

  it('uses all-time totals when there is no activity this month', () => {
    const description = communityMetaDescription({ ...community, monthReports: 0, monthCleanups: 0, acceptedReports: 1, cleanups: 0 }, now);
    expect(description).toContain('reported 1 spot and cleaned up 0 so far.');
    expect(description).not.toContain('November');
  });

  it('uses the community’s local month at a UTC month boundary', () => {
    const description = communityMetaDescription(community, new Date('2026-12-01T02:00:00Z'));
    expect(description).toContain('November 2026');
  });

  it.each([1, 1000, Number.MAX_SAFE_INTEGER])('preserves a long place name with growing counts (%s)', count => {
    const name = 'Taumatawhakatangihangakoauauotamateaturipukakapikimaungahoronukupokaiwhenuakitanatahu';
    const description = communityMetaDescription({ ...community, name, kind: 'city', areaName: name, monthReports: count, monthCleanups: count }, now);
    expect(description).toContain(name);
    expect(description).toContain(String(count));
    expect(description.length).toBeLessThanOrEqual(155);
    expect(description.endsWith('.')).toBe(true);
    expect(description).not.toContain('…');
  });

  it('retains a geographic area rather than cutting an unusually long place name', () => {
    const description = communityMetaDescription({ ...community, name: 'A very long community name '.repeat(10), kind: 'city' }, now);
    expect(description).toBe('Watauga County: 8 reports, 7 cleanups in Nov 2026.');
  });
});
