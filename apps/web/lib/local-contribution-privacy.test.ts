import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { localDonationCredits, readLocalDonationCredits, writeLocalNameChoice } from './local-contribution-privacy';
import { POST } from '@/app/api/local/contributions/name/route';

const fixture = vi.hoisted(() => ({ directory: '', user: { id: 'owner', is_anonymous: false } as { id: string; is_anonymous: boolean } | null,
  receipt: { id: '91000000-0000-4000-8000-000000000001', contributor_id: 'owner', status: 'paid_out', refunded_at: null as string | null }, rpc: vi.fn() }));
vi.mock('node:os', () => ({ tmpdir: () => fixture.directory }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: fixture.user }, error: null }) }, rpc: fixture.rpc,
  from: () => {
    const filters = new Map<string, string>();
    const query = { select: () => query, eq: (key: string, value: string) => { filters.set(key, value); return query; },
      maybeSingle: async () => ({ error: null, data: filters.get('id') === fixture.receipt.id && filters.get('contributor_id') === fixture.receipt.contributor_id ? fixture.receipt : null }) };
    return query;
  },
}) }));
const request = (action = 'save', shown: unknown = false, headers = {}) => new Request('http://localhost:3000/api/local/contributions/name', {
  method: 'POST', headers: { host: 'localhost:3000', origin: 'http://localhost:3000', 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify({ contributionId: fixture.receipt.id, action, shown }),
});
beforeEach(async () => {
  fixture.directory = await mkdtemp('/tmp/litterbugs-privacy-unit-');
  fixture.user = { id: 'owner', is_anonymous: false }; fixture.receipt.status = 'paid_out'; fixture.receipt.refunded_at = null;
  vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('VERCEL', ''); vi.clearAllMocks();
});
afterEach(async () => { await rm(fixture.directory, { recursive: true, force: true }); vi.unstubAllEnvs(); });

it('saves the owner’s choice durably on localhost and updates the public donor data without a Supabase write', async () => {
  const directory = join(fixture.directory, 'litterbugs-contributor-credits');
  await mkdir(directory);
  await writeFile(join(directory, 'donations.json'), JSON.stringify([
    { id: fixture.receipt.id, reportId: 'report', contributorId: 'owner', name: 'Actual donor', amountCents: 500, donatedAt: '2026-11-19T12:00:00Z', showName: true },
  ]));
  expect((await POST(request())).status).toBe(200);
  expect(await (await POST(request('read'))).json()).toEqual({ shown: false });
  const credit = (await readLocalDonationCredits())[0];
  expect(credit.names).toEqual([]);
  expect(credit.donations).toEqual([{ name: null, amountCents: 500, donatedAt: '2026-11-19T12:00:00Z' }]);
  expect(JSON.stringify(credit)).not.toContain('Actual donor');
  expect((await POST(request('save', true))).status).toBe(200);
  expect((await readLocalDonationCredits())[0].names).toEqual(['Actual donor']);
  expect(fixture.rpc).not.toHaveBeenCalled();
});

it('rejects signed-out users, guest accounts, and another donor', async () => {
  for (const user of [null, { id: 'owner', is_anonymous: true }, { id: 'someone-else', is_anonymous: false }]) {
    fixture.user = user;
    expect((await POST(request())).status).toBe(user?.is_anonymous === false ? 404 : 401);
  }
});

it('rejects invalid choices and pending or refunded contributions', async () => {
  expect((await POST(request('save', 'false'))).status).toBe(400);
  fixture.receipt.status = 'payment_pending';
  expect((await POST(request())).status).toBe(409);
  fixture.receipt.status = 'paid_out'; fixture.receipt.refunded_at = '2026-11-19';
  expect((await POST(request())).status).toBe(409);
});

it('blocks deployments, forged hosts, forwarded hosts, and cross-site requests', async () => {
  vi.stubEnv('NODE_ENV', 'production'); expect((await POST(request())).status).toBe(404);
  vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('VERCEL', '1'); expect((await POST(request())).status).toBe(404);
  vi.stubEnv('VERCEL', '');
  for (const headers of [{ host: 'litterbugs.app' }, { 'x-forwarded-host': 'litterbugs.app' }]) expect((await POST(request('save', false, headers))).status).toBe(404);
  expect((await POST(request('save', false, { origin: 'https://elsewhere.example' }))).status).toBe(403);
});

it('keeps simultaneous edits to different donations and leaves the other donation public', async () => {
  await Promise.all([writeLocalNameChoice('one', false), writeLocalNameChoice('two', true)]);
  expect(JSON.parse(await readFile(join(fixture.directory, 'litterbugs-contributor-credits/name-choices.json'), 'utf8'))).toEqual({ one: false, two: true });
  const gifts = ['one', 'two'].map(id => ({ id, reportId: 'report', contributorId: 'owner', name: 'Donor', amountCents: 500, donatedAt: '2026-11-19T12:00:00Z', showName: true }));
  expect(localDonationCredits(gifts, { one: false })[0]).toMatchObject({ names: ['Donor'], anonymous_count: 1 });
});
