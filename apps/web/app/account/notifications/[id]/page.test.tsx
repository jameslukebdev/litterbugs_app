import { beforeEach, expect, it, vi } from 'vitest';
import Page from './page';

const mocks = vi.hoisted(() => ({ from: vi.fn(), authenticate: vi.fn(), load: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(`redirect:${url}`); },
  notFound: () => { throw new Error('not-found'); },
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getClaims: mocks.authenticate }, from: mocks.from }),
}));
vi.mock('@/lib/nearby-alert-reports', () => ({ loadNearbyAlertReports: mocks.load }));

const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const report = { id: 'bbbbbbbb-aaaa-4ccc-8ddd-eeeeeeeeeeee', title: 'Litter behind the store' };
const alert = { id, user_id: 'owner', event_type: 'nearby_reports_daily', created_at: '2026-11-17T22:00:00Z' };
const open = () => Page({ params: Promise.resolve({ id }), searchParams: Promise.resolve({ filter: 'unread', page: '2' }) });
const filter = vi.fn();
const find = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticate.mockResolvedValue({ data: { claims: { sub: 'owner' } } });
  const query = { select: () => query, eq: filter.mockImplementation(() => query), maybeSingle: find };
  mocks.from.mockReturnValue(query);
  find.mockResolvedValue({ data: alert, error: null });
});

it('preserves the alert as the return destination through sign-in', async () => {
  mocks.authenticate.mockResolvedValue({ data: { claims: null } });
  await expect(open()).rejects.toThrow(`redirect:/sign-in?next=${encodeURIComponent(`/account/notifications/${id}?filter=unread&page=2`)}`);
  expect(mocks.from).not.toHaveBeenCalled();
});

it('looks up only a nearby alert belonging to the signed-in user', async () => {
  find.mockResolvedValue({ data: null, error: null });
  await expect(open()).rejects.toThrow('not-found');
  expect(filter.mock.calls).toEqual([['id', id], ['user_id', 'owner'], ['event_type', 'nearby_reports_daily']]);
  expect(mocks.load).not.toHaveBeenCalled();
});

it.each([{ exact: true, sameArea: false }, { exact: false, sameArea: true }])('opens the map with the alert report selected (%j)', async flags => {
  mocks.load.mockResolvedValue({ reports: [report], ...flags, hasArea: flags.sameArea });
  await expect(open()).rejects.toThrow(`redirect:/map?view=map&browse=1&report=${report.id}`);
  expect(mocks.load).toHaveBeenCalledWith(expect.anything(), 'owner', alert);
});

it('renders a list for alerts with several visible reports', async () => {
  mocks.load.mockResolvedValue({ reports: [report, { id: 'another', title: 'Litter by the bridge' }], exact: true });
  expect(await open()).toMatchObject({ type: 'main' });
});
