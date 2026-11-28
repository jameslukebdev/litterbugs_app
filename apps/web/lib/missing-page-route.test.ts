import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./supabase/public', () => ({ createPublicClient: () => { throw new Error('no network in tests'); } }));

import { liveLookups, resolveMissingPage, type MissingPageLookups } from './missing-page-route';

const ID = '506c0324-c69d-4d46-be07-1d2d4692ef3b';
const lookups = (overrides: Partial<MissingPageLookups> = {}): MissingPageLookups => ({
  tipRecipient: vi.fn(async () => ({ name: 'Maya R.' })),
  memberExists: vi.fn(async () => true),
  siteHasReports: vi.fn(async () => true),
  communityPaths: vi.fn(async () => ['/communities/us/nc/boone', '/communities/us/nc/avery-county', '/communities/pe/lima/chorrillos']),
  ...overrides,
});
const verdict = (path: string, l = lookups()) => resolveMissingPage(new URL(`https://litterbugs.app${path}`), l);

describe('reports', () => {
  it('answers a malformed report address as missing, leaving real ids and known pages alone', async () => {
    expect(await verdict('/reports/does-not-exist')).toBe('missing');
    expect(await verdict(`/reports/${ID}`)).toBe('pass');
    expect(await verdict('/reports/history')).toBe('pass');
    expect(await verdict('/reports')).toBe('pass');
    expect(await verdict(`/reports/${ID}/photo/1`)).toBe('pass');
  });
});

describe('tips, members and sites', () => {
  it('answers a bad id or a person/site that does not exist as missing', async () => {
    expect(await verdict('/tip/not-a-uuid')).toBe('missing');
    expect(await verdict(`/tip/${ID}`, lookups({ tipRecipient: async () => null }))).toBe('missing');
    expect(await verdict(`/tip/${ID}`)).toBe('pass');
    expect(await verdict('/members/nope')).toBe('missing');
    expect(await verdict(`/members/${ID}`, lookups({ memberExists: async () => false }))).toBe('missing');
    expect(await verdict(`/members/${ID}`)).toBe('pass');
    expect(await verdict('/sites/nope')).toBe('missing');
    expect(await verdict(`/sites/${ID}`, lookups({ siteHasReports: async () => false }))).toBe('missing');
    expect(await verdict(`/sites/${ID}`)).toBe('pass');
  });

  it('never turns a page into a 404 when a lookup fails', async () => {
    const failing = lookups({
      tipRecipient: async () => { throw new Error('down'); },
      memberExists: async () => { throw new Error('down'); },
      siteHasReports: async () => { throw new Error('down'); },
      communityPaths: async () => { throw new Error('down'); },
    });
    for (const path of [`/tip/${ID}`, `/members/${ID}`, `/sites/${ID}`, '/communities/us/nc/boone', '/communities/us']) {
      expect(await verdict(path, failing)).toBe('pass');
    }
  });

  it('passes when the database cannot be reached at all', async () => {
    expect(await resolveMissingPage(new URL(`https://litterbugs.app/tip/${ID}`), liveLookups)).toBe('pass');
  });
});

describe('communities', () => {
  it('finds towns, states and countries that have a public town', async () => {
    expect(await verdict('/communities/us/nc/boone')).toBe('pass');
    expect(await verdict('/communities/us/nc')).toBe('pass');
    expect(await verdict('/communities/us')).toBe('pass');
    expect(await verdict('/communities/pe/lima/chorrillos')).toBe('pass');
  });

  it('answers places without a public town, and malformed segments, as missing', async () => {
    expect(await verdict('/communities/us/zz/nowhere')).toBe('missing');
    expect(await verdict('/communities/us/zz')).toBe('missing');
    expect(await verdict('/communities/zz')).toBe('missing');
    expect(await verdict('/communities/usa')).toBe('missing');
    expect(await verdict('/communities/us/NC')).toBe('missing');
    expect(await verdict('/communities/us/nc/boo')).toBe('missing');
  });

  it('leaves the directory, the finder and rank cards alone', async () => {
    expect(await verdict('/communities')).toBe('pass');
    expect(await verdict('/communities/find?q=boone')).toBe('pass');
    expect(await verdict('/communities/rank-card?board=clean')).toBe('pass');
  });
});

describe('cleanup archive', () => {
  it('accepts page 1 to 1000 and answers other page numbers as missing', async () => {
    expect(await verdict('/cleanups')).toBe('pass');
    expect(await verdict('/cleanups?page=2')).toBe('pass');
    expect(await verdict('/cleanups?page=1000')).toBe('pass');
    expect(await verdict('/cleanups?page=abc')).toBe('missing');
    expect(await verdict('/cleanups?page=0')).toBe('missing');
    expect(await verdict('/cleanups?page=1001')).toBe('missing');
    expect(await verdict('/cleanups?page=2&page=3')).toBe('missing');
  });
});

it('leaves every other address alone', async () => {
  for (const path of ['/', '/map', '/support', '/account/payments', '/litter-reports/x', '/totally-made-up']) {
    expect(await verdict(path)).toBe('pass');
  }
});
