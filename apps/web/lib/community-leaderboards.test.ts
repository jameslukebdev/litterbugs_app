import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('./supabase/public', () => ({ createPublicClient: () => ({ rpc: vi.fn() }) }));
import { communityAreaPhrase, communityLabel, communityStatsSentence, groupCommunities, monthInfo, placeTrail, townActivity, type CommunityRecord } from './community-leaderboards';

const boone: CommunityRecord = {
  slug: 'us-nc-boone', path: '/communities/us/nc/boone', name: 'Boone', kind: 'county', areaName: 'Watauga County',
  countryCode: 'US', countryName: 'United States', regionCode: 'US-NC', regionName: 'North Carolina',
  latitude: 36.2, longitude: -81.7, timeZone: 'America/New_York',
  acceptedReports: 30, cleanups: 17, monthReports: 23, monthCleanups: 9,
  firstReportAt: '2026-08-01T12:00:00Z', lastActivityAt: '2026-11-14T12:00:00Z', isIndexable: true,
};

describe('community labels', () => {
  it('uses the state code in the US and the country elsewhere', () => {
    expect(communityLabel(boone)).toBe('Boone, NC');
    expect(communityLabel({ name: 'Chorrillos', countryCode: 'PE', countryName: 'Peru', regionCode: 'PE-LIM' })).toBe('Chorrillos, Peru');
  });

  it('calls a county named after its town "the town area", and leaves other places as they are', () => {
    expect(communityAreaPhrase(boone)).toBe('the Boone area');
    expect(communityAreaPhrase({ name: 'Avery County', kind: 'county', areaName: 'Avery County' })).toBe('Avery County');
    expect(communityAreaPhrase({ name: 'Greensboro', kind: 'city', areaName: 'Greensboro' })).toBe('Greensboro');
  });
});

describe('stats sentence for search and answer engines', () => {
  it('reports this month when there was activity', () => {
    expect(communityStatsSentence(boone, new Date('2026-11-15T12:00:00Z')))
      .toBe('In November 2026, Litterbugs members in the Boone area reported 23 spots and cleaned up 9.');
  });

  it('falls back to totals in a quiet month', () => {
    expect(communityStatsSentence({ ...boone, monthReports: 0, monthCleanups: 0, acceptedReports: 1, cleanups: 0 }))
      .toBe('Litterbugs members in the Boone area have reported 1 spot and cleaned up 0 so far.');
  });
});

describe('month countdown', () => {
  it('counts the days left in the community’s own time zone', () => {
    expect(monthInfo('America/New_York', new Date('2026-11-14T15:00:00Z'))).toEqual({ monthName: 'November', monthEnds: 'November 30', daysLeft: 16 });
    // 02:00 UTC on December 1 is still November 30 in North Carolina.
    expect(monthInfo('America/New_York', new Date('2026-12-01T02:00:00Z'))).toEqual({ monthName: 'November', monthEnds: 'November 30', daysLeft: 0 });
  });
});

describe('browsing towns by place', () => {
  const town = (path: string, name: string, extra: Partial<CommunityRecord> = {}): CommunityRecord =>
    ({ ...boone, path, slug: path.slice(13).replaceAll('/', '-'), name, isIndexable: false, monthCleanups: 0, monthReports: 0, cleanups: 0, acceptedReports: 1, lastActivityAt: null, ...extra });
  const towns = [
    town('/communities/us/nc/greensboro', 'Greensboro', { monthReports: 2, lastActivityAt: '2026-11-02T00:00:00Z' }),
    town('/communities/us/nc/boone', 'Boone', { monthCleanups: 4, isIndexable: true, lastActivityAt: '2026-11-10T00:00:00Z' }),
    town('/communities/pe/lim/chorrillos', 'Chorrillos', { countryCode: 'PE', countryName: 'Peru', regionCode: 'PE-LIM', regionName: 'Lima' }),
  ];

  it('groups towns by country and by state, busiest town first', () => {
    const countries = groupCommunities(towns, 'country');
    expect(countries.map(c => [c.path, c.name, c.towns.map(t => t.name)])).toEqual([
      ['/communities/us', 'United States', ['Boone', 'Greensboro']],
      ['/communities/pe', 'Peru', ['Chorrillos']],
    ]);
    expect(countries[0]).toMatchObject({ isIndexable: true, lastActivityAt: '2026-11-10T00:00:00Z' });
    expect(countries[1].isIndexable).toBe(false);
    expect(groupCommunities(towns, 'region').map(r => [r.path, r.name])).toEqual([['/communities/us/nc', 'North Carolina'], ['/communities/pe/lim', 'Lima']]);
  });

  it('builds the trail above a town', () => {
    expect(placeTrail(boone)).toEqual([{ name: 'United States', path: '/communities/us' }, { name: 'North Carolina', path: '/communities/us/nc' }]);
    expect(placeTrail({ ...boone, path: '/communities/xk/all/pristina', countryName: 'Kosovo', regionName: null })).toEqual([{ name: 'Kosovo', path: '/communities/xk' }]);
  });

  it('describes a town by its most recent activity', () => {
    expect(townActivity({ monthCleanups: 1, monthReports: 3, cleanups: 5, acceptedReports: 9 })).toBe('1 cleanup this month');
    expect(townActivity({ monthCleanups: 0, monthReports: 3, cleanups: 5, acceptedReports: 9 })).toBe('3 reports this month');
    expect(townActivity({ monthCleanups: 0, monthReports: 0, cleanups: 0, acceptedReports: 1 })).toBe('1 report so far');
  });
});
